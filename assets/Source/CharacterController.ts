import { _decorator, Component, Node, input, Input, animation, Camera, Vec3, Quat, NodeSpace, toRadian, EventMouse, physics, geometry } from 'cc';
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

    @property
    public moveInPlace = false;

    @property
    public debugView = false;

    start() {
        input.on(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this._onMouseUp, this);
    }

    update(deltaTime: number) {
        const animationController = this.node.getComponent(animation.AnimationController);
        animationController?.setValue('Move', this._move);

        if (this._move && this.view) {
            const expectedDir = new Vec3();
            if (this.debugView) {
                Vec3.copy(expectedDir, getForward(this.node));
            } else {
                Vec3.copy(expectedDir, this.view.node.forward);
            }
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
            if (!this.moveInPlace) {
                const newDir = getForward(this.node);
                newDir.y = 0.0;
                newDir.normalize();
                const newPosition = Vec3.scaleAndAdd(new Vec3(), this.node.worldPosition, newDir, this.moveSpeed * deltaTime);
                const b = 0.5;
                const forwardHit = this._rayCastForward(new Vec3(newPosition.x + newDir.x * b, newPosition.y + 0.5, newPosition.z + newDir.z * b));
                if (!forwardHit) {
                    this.node.worldPosition = newPosition;
                }
            }
        }
    }

    private _onMouseDown(event: EventMouse) {
        if (event.getButton() === EventMouse.BUTTON_LEFT) {
            this._move = true;
        }
    }

    private _onMouseUp(event: EventMouse) {
        if (event.getButton() === EventMouse.BUTTON_LEFT) {
            this._move = false;
        }
    }

    private _rayCastForward(from: Readonly<Vec3>) {
        const physicsSystem = physics.PhysicsSystem.instance;
        const rayFrom = from;
        const rayDir = getForward(this.node);
        const ray = new geometry.Ray(rayFrom.x, rayFrom.y, rayFrom.z, rayDir.x, rayDir.y, rayDir.z);
        const detected = physicsSystem.raycastClosest(ray, 1 << 1, 0.3);
        if (!detected) {
            return;
        }
        const { raycastClosestResult } = physicsSystem;
        return {
            hitPoint: Vec3.clone(raycastClosestResult.hitPoint),
        };
    }

    private _move = false;
}


