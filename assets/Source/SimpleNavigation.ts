import { _decorator, Component, Node, physics, Vec3, geometry } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SimpleNavigation')
export class SimpleNavigation extends Component {
    start() {
    }

    update(deltaTime: number) {
        const bodyHit = this._rayCastDownward();
        if (!bodyHit) {
            return;
        }
        this.node.worldPosition = new Vec3(this.node.worldPosition.x, bodyHit.hitPoint.y, this.node.worldPosition.z);
    }

    private _rayCastDownward() {
        const physicsSystem = physics.PhysicsSystem.instance;
        const rayFrom = Vec3.clone(this.node.worldPosition);
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
}


