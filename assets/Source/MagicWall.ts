import { _decorator, Component, Node, physics, Vec3, geometry, Quat, Prefab, instantiate, approx } from 'cc';
import { solveTwoBoneIKFromNodes } from './TwoBoneIK/TwoBoneIK';
import { getForward } from './Utils/NodeUtils';
const { ccclass, property } = _decorator;

@ccclass('MagicWall')
export class MagicWall extends Component {
    @property(Node)
    public traceSource!: Node;

    @property
    public distance = 0.75;

    @property(Prefab)
    public sprite: Prefab | null = null;

    @property
    public spriteResidentTime = 1.0;

    @property
    public spriteMaxMovementRadius = 1.0;

    @property
    public spriteMoveSpeed = 0.3;

    get spriteExisting() {
        return !!this._spriteInstance;
    }

    get spritePosition() {
        return this._spriteInstance!.worldPosition;
    }

    get spriteResident() {
        return this._spriteState === SpriteState.resident;
    }

    start() {

    }

    update (deltaTime: number) {
        const physicsSystem = physics.PhysicsSystem.instance;
        const rayFrom = Vec3.clone(this.traceSource.worldPosition);
        const rayDir = getForward(this.node);
        const ray = new geometry.Ray(rayFrom.x, rayFrom.y, rayFrom.z, rayDir.x, rayDir.y, rayDir.z);
        const detected = physicsSystem.raycastClosest(ray, 1 << 1, this.distance);

        if (!detected) {
            switch (this._spriteState) {
                case SpriteState.absent:
                case SpriteState.fade:
                    break;
                default:
                    this._fadeSprite();
                    break;
            }
            return;
        }

        switch (this._spriteState) {
            case SpriteState.absent: {
                const {
                    hitPoint,
                    hitNormal,
                } = physicsSystem.raycastClosestResult;
                this._spawnSprite(hitPoint, hitNormal);
                break;
            }
            case SpriteState.resident:
                this._currentSpriteResidentTime -= deltaTime;
                if (this._currentSpriteResidentTime < 0) {
                    this._moveSprite();
                }
                break;
            case SpriteState.moving: {
                const dir = Vec3.subtract(new Vec3(), this._spriteMoveTarget, this._spriteInstance!.worldPosition);
                const d = dir.length();
                if (approx(d, 0.0, 1e-2)) {
                    this._enterIdle();
                } else {
                    dir.normalize();
                    const newD = Math.max(d - deltaTime * this.spriteMoveSpeed, 0.0);
                    Vec3.multiplyScalar(dir, dir, newD);
                    const newP = Vec3.subtract(new Vec3(), this._spriteMoveTarget, dir);
                    this._spriteInstance!.worldPosition = newP;
                }
                break;
            }
        }
    }

    lateUpdate(deltaTime: number) {
        
    }

    private _spriteInstance: Node | null = null;
    private _activityCenter = new Vec3();
    private _activityNormal = new Vec3();
    private _alpha = 0.0;
    private _target = new Vec3();
    private _spriteMoveTarget = new Vec3();
    private _spriteState = SpriteState.absent;
    private _currentSpriteResidentTime = 0.0;

    private _spawnSprite(hitPoint: Readonly<Vec3>, hitNormal: Readonly<Vec3>) {
        Vec3.copy(this._activityCenter, hitPoint);
        Vec3.copy(this._activityNormal, hitNormal);
        const { sprite } = this;
        if (!sprite) {
            return;
        }
        const spriteInstance = instantiate(sprite);
        this.node.scene.addChild(spriteInstance);
        spriteInstance.setWorldPosition(this._activityCenter);
        spriteInstance.forward = pickAnyPerpendicularVector(this._activityNormal);
        this._spriteInstance = spriteInstance;
        this._enterIdle();
    }

    private _fadeSprite() {
        this._spriteInstance?.destroy();
        this._spriteInstance = null;
        this._spriteState = SpriteState.absent;
    }

    private _moveSprite() {
        this._spriteState = SpriteState.moving;
        const other = pickAnyPerpendicularVector(this._activityNormal);
        const q = Quat.fromAxisAngle(new Quat(), this._activityNormal, 2 * Math.PI * Math.random());
        Vec3.transformQuat(other, other, q);
        Vec3.scaleAndAdd(other, this._activityCenter, other, this.spriteMaxMovementRadius * Math.random());
        Vec3.copy(this._spriteMoveTarget, other);
    }

    private _enterIdle() {
        this._spriteState = SpriteState.resident;
        this._currentSpriteResidentTime = this.spriteResidentTime;
    }
}

function pickAnyPerpendicularVector(input: Readonly<Vec3>) {
    // https://math.stackexchange.com/a/413235
    const output = new Vec3();
    if (input.x) {
        output.x = -input.y;
        output.y = input.x;
    } else if (input.y) {
        output.x = -input.y;
        output.y = input.x;
    } else if (input.z) {
        output.x = -input.z;
        output.z = input.x;
    }
    Vec3.normalize(output, output);
    const a = Vec3.angle(output, input);
    if (!approx(a, Math.PI / 2, 1e-5)) {
        debugger;
    }
    return output;
}

enum SpriteState {
    absent,
    spawn,
    resident,
    moving,
    fade,
}
