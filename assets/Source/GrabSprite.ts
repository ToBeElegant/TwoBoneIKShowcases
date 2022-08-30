import { _decorator, Component, Node, Vec3, Quat } from 'cc';
import { MagicWall } from './MagicWall';
import { solveTwoBoneIKFromNodes } from './TwoBoneIK/TwoBoneIK';
import { getForward } from './Utils/NodeUtils';
const { ccclass, property } = _decorator;

@ccclass('GrabSprite')
export class GrabSprite extends Component {
    @property(Node)
    public hand!: Node;

    @property
    public handBackwardBias = 0.05;

    @property
    public regardlessOfDistance = true;

    @property(Node)
    public head!: Node;

    @property
    public speed = 0.5;

    lateUpdate(deltaTime: number) {
        const magicWall = this.node.getComponent(MagicWall);
        if (!magicWall) {
            return;
        }

        if (!magicWall.spriteExisting) {
            return;
        }

        this._headFollow(magicWall);
        
        // Grab if the sprite resident.
        const {
            _lastGrabbingPosition: lastGrabbingPosition,
        } = this;

        const hand = this.hand;
        const lowerArm = hand.parent!;
        const upperArm = lowerArm.parent!;
        
        let shouldGrabSprite = false;
        if (magicWall.spriteResident) {
            shouldGrabSprite = true;
            if (!this.regardlessOfDistance) {
                const distance = Vec3.distance(upperArm.worldPosition, magicWall.spritePosition);
                const limbLength =
                    Vec3.distance(hand.worldPosition, lowerArm.worldPosition)
                    + Vec3.distance(lowerArm.worldPosition, upperArm.worldPosition);
                if (distance > limbLength) {
                    shouldGrabSprite = false;
                }
            }
        }

        const potentialTarget = new Vec3();
        if (shouldGrabSprite) {
            Vec3.copy(potentialTarget, magicWall.spritePosition);
        } else {
            Vec3.copy(potentialTarget, hand.worldPosition);
        }

        if (!this._previousGrabbed) {
            this._previousGrabbed = true;
            Vec3.copy(lastGrabbingPosition, hand.worldPosition);
        }
        const dir = Vec3.subtract(new Vec3(), potentialTarget, lastGrabbingPosition);
        const d = dir.length();
        dir.normalize();
        const newD = Math.max(d - this.speed * deltaTime, 0.0);
        Vec3.multiplyScalar(dir, dir, newD);
        Vec3.subtract(dir, potentialTarget, dir);
        Vec3.copy(lastGrabbingPosition, dir);

        if (Vec3.distance(lastGrabbingPosition, hand.worldPosition) < 0.00001) {
            return;
        }
        
        solveTwoBoneIKFromNodes(
            upperArm,
            lowerArm,
            hand,
            lastGrabbingPosition,
            1.0,
        );

        hand.setWorldRotationFromEuler(0, 180, 90);
    }

    private _previousGrabbed = false;

    private _lastGrabbingPosition = new Vec3();

    private _headFollow(magicWall: MagicWall) {
        const {
            head,
        } = this;
        const viewDir = Vec3.subtract(new Vec3(), magicWall.spritePosition, head.worldPosition);
        viewDir.normalize();
        const currentDir = getForward(head);
        const q = Quat.rotationTo(new Quat(), currentDir, viewDir);
        head.rotate(q, Node.NodeSpace.WORLD);
    }
}


