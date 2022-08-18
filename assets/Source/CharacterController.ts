import { _decorator, Component, Node, input, Input, animation, Camera, Vec3, Quat, NodeSpace, toRadian } from 'cc';
import { getForward } from './Utils/NodeUtils';
const { ccclass, property } = _decorator;

@ccclass('CharacterController')
export class CharacterController extends Component {
    @property(Camera)
    public view: Camera | null = null;

    @property
    public moveSpeed = 1.0;

    @property({
        slide: true,
        min: 90.0,
        max: 360.0,
    })
    public turnSpeed = 180.0;

    start() {
        input.on(Input.EventType.MOUSE_DOWN, this._onTouchOrMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this._onTouchOrMouseUp, this);
    }

    update(deltaTime: number) {
        const animationController = this.node.getComponent(animation.AnimationController);
        animationController?.setValue('Move', this._move);

        if (this._move && this.view) {
            const expectedDir = Vec3.clone(this.view.node.forward);
            expectedDir.y = 0.0;
            expectedDir.normalize();
            const currentDir = getForward(this.node);
            currentDir.y = 0.0;
            currentDir.normalize();
            const angle = Vec3.angle(currentDir, expectedDir);
            const deltaAngle = Math.min(angle, toRadian(this.turnSpeed) * deltaTime);
            const axis = Vec3.cross(new Vec3(), currentDir, expectedDir);
            axis.normalize();
            const deltaRotation = Quat.fromAxisAngle(new Quat(), axis, deltaAngle);
            this.node.rotate(deltaRotation, NodeSpace.WORLD);
            const newDir = getForward(this.node);
            newDir.y = 0.0;
            newDir.normalize();
            const newPosition = Vec3.scaleAndAdd(new Vec3(), this.node.worldPosition, newDir, this.moveSpeed * deltaTime);
            this.node.worldPosition = newPosition;
        }
    }

    private _onTouchOrMouseDown() {
        this._move = true;
    }

    private _onTouchOrMouseUp() {
        this._move = false;
    }

    private _move = false;
}


