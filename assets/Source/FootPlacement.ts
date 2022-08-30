import { _decorator, Component, Node, physics, geometry, Vec3, approx } from 'cc';
import { solveTwoBoneIKFromNodes } from './TwoBoneIK/TwoBoneIK';
const { ccclass, property } = _decorator;

@ccclass('FootPlacement')
export class FootPlacement extends Component {
    @property(Node)
    hips!: Node;

    @property(Node)
    leftFoot!: Node;

    @property(Node)
    rightFoot!: Node;

    /**
     * The distance from root position(the bottom center of character) to foot bones.
     */
    @property
    footBoneHeight = 0.0;

    lateUpdate(deltaTime: number) {
        this._updateHeightByBodyRay();
    }

    private _updateHeightByBodyRay() {
        const leftFootHit = this._rayCastDownward(this.leftFoot.worldPosition);
        const rightFootHit = this._rayCastDownward(this.rightFoot.worldPosition);
        if (!leftFootHit || !rightFootHit) {
            return;
        }
        const { hitPoint: leftHitPoint } = leftFootHit;
        const { hitPoint: rightHitPoint } = rightFootHit;
        this._adaptHipsHeight(leftHitPoint.y, rightHitPoint.y);
        this._applyFootIK(this.leftFoot, leftHitPoint);
        this._applyFootIK(this.rightFoot, rightHitPoint);
    }

    private _rayCastDownward(foot: Readonly<Vec3>) {
        const physicsSystem = physics.PhysicsSystem.instance;
        const rayFrom = Vec3.clone(foot);
        rayFrom.y += 0.3;
        const ray = new geometry.Ray(rayFrom.x, rayFrom.y, rayFrom.z, 0, -1, 0);
        const detected = physicsSystem.raycastClosest(ray, 1 << 1, 1.0);
        if (!detected) {
            return;
        }
        const { raycastClosestResult } = physicsSystem;
        return {
            hitPoint: Vec3.clone(raycastClosestResult.hitPoint),
        };
    }

    private _adaptHipsHeight(leftFootHeight: number, rightFootHeight: number) {
        const heightOffset = Math.abs(leftFootHeight - rightFootHeight) / 2;
        this.hips.worldPosition = Vec3.add(new Vec3(), this.hips.worldPosition, new Vec3(0.0, -heightOffset));
    }

    private _applyFootIK(foot: Node, target: Vec3) {
        target.y += this.footBoneHeight;
        const knee = foot.parent!;
        const hintPoint = Vec3.clone(knee.worldPosition);
        const kneeTarget = new Vec3(0.0, 0.0, 0.4);
        Vec3.transformMat4(kneeTarget, kneeTarget, knee.getWorldRS());
        Vec3.add(hintPoint, hintPoint, kneeTarget);
        solveTwoBoneIKFromNodes(
            foot.parent!.parent!,
            knee,
            foot,
            target,
            1.0,
            hintPoint,
        );
    }
}


