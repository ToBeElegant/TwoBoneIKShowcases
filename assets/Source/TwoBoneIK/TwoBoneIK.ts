import { approx, clamp, clamp01, Node, NodeSpace, Quat, Vec3 } from "cc";
import { DEBUG } from "cc/env";
import { Transform } from "./Transform";

const SANITY_CHECK_ENABLED = true;

/**
 * 解析双骨骼（三关节）的 IK 问题。
 * 三关节分别称为根关节、中间关节和末端关节。例如，分别对应于大腿、膝盖和脚关节。
 * @param root 根关节。
 * @param middle 中间关节。
 * @param end 末端关节。
 * @param target 末端关节要抵达的目标位置（世界空间）。
 * @param hint 中间关节的提示位置（世界空间），用于决定中间关节的朝向。
 */
function solveTwoBoneIKFromNodes(
    root: Node,
    middle: Node,
    end: Node,
    target: Vec3,
    alpha?: number,
    hint?: Vec3,
) {
    alpha ??= 1.0;
    alpha = clamp01(alpha);

    const localToWorldTransform = new Transform();
    if (root.parent) {
        readWorldTransformFromNode(root.parent, localToWorldTransform);
    }

    const inputTransformRootLocal = readLocalTransformFromNode(root, new Transform());
    const inputTransformMiddleLocal = readLocalTransformFromNode(middle, new Transform());
    const inputTransformEndLocal = readLocalTransformFromNode(end, new Transform());

    const transformRoot = Transform.clone(inputTransformRootLocal);
    const transformMiddle = Transform.clone(inputTransformMiddleLocal);
    const transformEnd = Transform.clone(inputTransformEndLocal);

    // Convert into world space.
    const chain = [localToWorldTransform, transformRoot, transformMiddle, transformEnd];
    for (let iTransform = 1; iTransform < chain.length; ++iTransform) {
        const transform = chain[iTransform];
        const parentTransform = chain[iTransform - 1];
        Transform.multiply(transform, transform, parentTransform);
    }

    // Solve.
    solveTwoBoneIK(
        transformRoot,
        transformMiddle,
        transformEnd,
        target,
        hint,
    );

    // Convert back to local space.
    for (let iTransform = chain.length - 1; iTransform >= 1; --iTransform) {
        const transform = chain[iTransform];
        const parentTransform = chain[iTransform - 1];
        Transform.relative(transform, transform, parentTransform);
    }

    // Apply alpha.
    Transform.lerp(transformRoot, inputTransformRootLocal, transformRoot, alpha);
    Transform.lerp(transformMiddle, inputTransformMiddleLocal, transformMiddle, alpha);
    Transform.lerp(transformEnd, inputTransformEndLocal, transformEnd, alpha);

    // Write to nodes.
    writeLocalTransformToNode(root, transformRoot);
    writeLocalTransformToNode(middle, transformMiddle);
    writeLocalTransformToNode(end, transformEnd);
}

function solveTwoBoneIKFromNodesWithSanityCheck(...args: Parameters<typeof solveTwoBoneIKFromNodes>) {
    const [root, middle, end] = args;
    const sanityChecker = new TwoBoneIKNodeSanityChecker(root, middle, end);
    solveTwoBoneIKFromNodes(...args);
    sanityChecker.check();
}

const solveTwoBoneIKFromNodesExported = SANITY_CHECK_ENABLED ? solveTwoBoneIKFromNodesWithSanityCheck : solveTwoBoneIKFromNodes;

export { solveTwoBoneIKFromNodesExported as solveTwoBoneIKFromNodes };

/**
 * 解析双骨骼（三关节）的 IK 问题。
 * 三关节分别称为根关节、中间关节和末端关节。例如，分别对应于大腿、膝盖和脚关节。
 * @param root 根关节转换（世界空间）。
 * @param middle 中间关节转换（世界空间）。
 * @param end 末端关节转换（世界空间）。
 * @param target 末端关节要抵达的目标位置（世界空间）。
 * @param hint 中间关节的提示位置（世界空间），用于决定中间关节的朝向。
 */
export function solveTwoBoneIK(
    root: Transform,
    middle: Transform,
    end: Transform,
    target: Vec3,
    hint?: Vec3,
) {
    hint ??= Vec3.clone(middle.position);

    const pA = Vec3.clone(root.position);
    const pB = Vec3.clone(middle.position);
    const pC = Vec3.clone(end.position);
    const qC = Quat.clone(end.rotation);

    const bSolved = new Vec3();
    const cSolved = new Vec3();
    solveTwoBoneIKPositions(
        pA,
        pB,
        pC,
        target,
        hint,
        bSolved,
        cSolved,
    );

    const qA = Quat.rotationTo(
        new Quat(),
        Vec3.subtract(new Vec3(), pB, pA).normalize(),
        Vec3.subtract(new Vec3(), bSolved, pA).normalize(),
    );
    Quat.multiply(qA, qA, root.rotation);
    root.rotation = qA;

    const qB = Quat.rotationTo(
        new Quat(),
        Vec3.subtract(new Vec3(), pC, pB).normalize(),
        Vec3.subtract(new Vec3(), cSolved, bSolved).normalize(),
    );
    Quat.multiply(qB, qB, middle.rotation);
    middle.rotation = qB;
    middle.position = bSolved;

    end.position = cSolved;

    // End factor's rotation frame might be rotated in IK progress, revert it after all thing done.
    // The reverting does not affect the IK result indeed.
    end.rotation = qC;
}

function solveTwoBoneIKPositions(
    a: Readonly<Vec3>,
    b: Readonly<Vec3>,
    c: Readonly<Vec3>,
    target: Readonly<Vec3>,
    middleTarget: Readonly<Vec3>,
    bSolved: Vec3,
    cSolved: Vec3,
) {
    const sanityChecker = new TwoBoneIKPositionSanityChecker(a, b, c);
    const sanityCheck = () => sanityChecker.check(a, bSolved, cSolved);

    const dAB = Vec3.distance(a, b);
    const dBC = Vec3.distance(b, c);
    const dAT = Vec3.distance(a, target);

    const dirAT = Vec3.subtract(new Vec3(), target, a);
    dirAT.normalize();

    const chainLength = dAB + dBC;
    if (dAT >= chainLength) {
        // Target is too far
        Vec3.scaleAndAdd(bSolved, a, dirAT, dAB);
        Vec3.scaleAndAdd(cSolved, a, dirAT, chainLength);
        sanityCheck();
        return;
    }

    // Now we should have a solution with target reached.
    // And then solve the middle joint B as Ḃ.
    Vec3.copy(cSolved, target);
    // Calculate ∠BAC's cosine.
    const cosḂAT = clamp(
        (dAB * dAB + dAT * dAT - dBC * dBC) / (2 * dAB * dAT),
        -1.0,
        1.0,
    );
    // Then use basic trigonometry(instead of rotation) to solve Ḃ.
    // Let D the intersect point of the height line passing Ḃ.
    const dirAB = Vec3.subtract(new Vec3(), middleTarget, a);
    const dirHeightLine = Vec3.projectOnPlane(new Vec3(), dirAB, dirAT);
    dirHeightLine.normalize();
    // const dirHeightLine = Vec3.multiplyScalar(
    //     new Vec3(),
    //     dirAT,
    //     Vec3.dot(dirAT, dirAB),
    // );
    // Vec3.subtract(
    //     dirHeightLine,
    //     dirAB,
    //     dirHeightLine,
    // );
    // dirHeightLine.normalize();
    const dAD = dAB * cosḂAT;
    const hSqr = dAB * dAB - dAD * dAD;
    if (hSqr < 0) {
        'Shall handle this case';
        debugger;
    }
    const h = Math.sqrt(hSqr);
    Vec3.scaleAndAdd(
        bSolved,
        a,
        dirAT,
        dAD,
    );
    Vec3.scaleAndAdd(
        bSolved,
        bSolved,
        dirHeightLine,
        h,
    );
    if (DEBUG) {
        sanityCheck();
    }
}

function readLocalTransformFromNode(node: Node, transform: Transform) {
    Vec3.copy(transform.position, node.position);
    Quat.copy(transform.rotation, node.rotation);
    Vec3.copy(transform.scale, node.scale);
    return transform;
}

function readWorldTransformFromNode(node: Node, transform: Transform) {
    Vec3.copy(transform.position, node.worldPosition);
    Quat.copy(transform.rotation, node.worldRotation);
    Vec3.copy(transform.scale, node.worldScale);
    return transform;
}

function writeLocalTransformToNode(node: Node, transform: Transform) {
    node.setRTS(transform.rotation, transform.position, transform.scale);
}

class TwoBoneIKNodeSanityChecker {
    constructor(private _a: Node, private _b: Node, private _c: Node) {
        const pA = _a.worldPosition;
        const pB = _b.worldPosition;
        const pC = _c.worldPosition;
        this._pA = Vec3.clone(pA);
        this._dAB = Vec3.distance(pA, pB);
        this._dBC = Vec3.distance(pB, pC);
        this._rC = Quat.clone(_c.worldRotation);
    }

    public check() {
        const { _a, _b, _c } = this;
        const pA = _a.worldPosition;
        const pB = _b.worldPosition;
        const pC = _c.worldPosition;
        const CHECK_EPSILON = 1e-3;
        const dAB = Vec3.distance(pA, pB);
        const dBC = Vec3.distance(pB, pC);
        // Root's world position shall not change
        if (!Vec3.equals(pA, this._pA, CHECK_EPSILON)) {
            debugger;
            return false;
        }
        // Joint length shall not change
        if (!approx(dAB, this._dAB, CHECK_EPSILON)) {
            debugger;
            return false;
        }
        if (!approx(dBC, this._dBC, CHECK_EPSILON)) {
            debugger;
            return false;
        }
        // End factor's world rotation shall not change
        if (!Quat.equals(_c.worldRotation, this._rC, CHECK_EPSILON)) {
            debugger;
            return false;
        }
        return true;
    }

    private _pA: Vec3;
    private _dAB: number;
    private _dBC: number;
    private _rC: Quat;
}

class TwoBoneIKPositionSanityChecker {
    constructor(private _a: Readonly<Vec3>, _b: Readonly<Vec3>, _c: Readonly<Vec3>) {
        this._dAB = Vec3.distance(_a, _b);
        this._dBC = Vec3.distance(_b, _c);
    }

    public check(_a: Readonly<Vec3>, _b: Readonly<Vec3>, _c: Readonly<Vec3>) {
        const CHECK_EPSILON = 1e-3;
        const dAB = Vec3.distance(_a, _b);
        const dBC = Vec3.distance(_b, _c);
        if (!approx(Vec3.distance(_a, this._a), 0.0, CHECK_EPSILON)) {
            debugger;
            return false;
        }
        if (!approx(dAB, this._dAB, CHECK_EPSILON)) {
            debugger;
            return false;
        }
        if (!approx(dBC, this._dBC, CHECK_EPSILON)) {
            debugger;
            return false;
        }
        return true;
    }

    private declare _dAB: number;
    private declare _dBC: number;
}
