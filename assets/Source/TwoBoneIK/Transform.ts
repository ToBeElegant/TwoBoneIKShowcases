import { Quat, Vec3 } from "cc";

const CACHE_VECTOR_A = new Vec3();
const CACHE_VECTOR_B = new Vec3();
const CACHE_QUAT_A = new Quat();
const CACHE_QUAT_B = new Quat();

export class Transform {
    get position(): Readonly<Vec3> {
        return this._position;
    }

    set position(value) {
        Vec3.copy(this._position, value);
    }

    get rotation(): Readonly<Quat> {
        return this._rotation;
    }

    set rotation(value) {
        Quat.copy(this._rotation, value);
    }

    get scale(): Readonly<Vec3> {
        return this._scale;
    }

    set scale(value) {
        Vec3.copy(this._scale, value);
    }

    public static clone(src: Transform) {
        const transform = new Transform();
        Transform.copy(transform, src);
        return transform;
    }

    public static setIdentity(out: Transform) {
        Vec3.copy(out._position, Vec3.ZERO);
        Quat.copy(out._rotation, Quat.IDENTITY);
        Vec3.copy(out._scale, Vec3.ONE);
        return out;
    }

    public static copy(out: Transform, src: Transform) {
        Vec3.copy(out._position, src._position);
        Quat.copy(out._rotation, src._rotation);
        Vec3.copy(out._scale, src._scale);
        return out;
    }

    public static lerp(out: Transform, a: Transform, b: Transform, t: number) {
        if (t === 0.0) {
            return Transform.copy(out, a);
        }
        if (t === 1.0) {
            return Transform.copy(out, b);
        }
        Vec3.lerp(out._position, a._position, b._position, t);
        Quat.slerp(out._rotation, a._rotation, b._rotation, t);
        Vec3.lerp(out._scale, a._scale, b._scale, t);
        return out;
    }

    public static multiply(out: Transform, first: Transform, second: Transform) {
        const cacheRotation = Quat.multiply(CACHE_QUAT_A, second._rotation, first._rotation);

        const cacheScale = Vec3.multiply(CACHE_VECTOR_A, first._scale, second._scale);

        // T_p + (R_p * (S_p * T_c))
        const cachePosition = Vec3.multiply(CACHE_VECTOR_B, first._position, second._scale);
        Vec3.transformQuat(cachePosition, cachePosition, second._rotation);
        Vec3.add(cachePosition, cachePosition, second._position);

        Vec3.copy(out._position, cachePosition);
        Quat.copy(out._rotation, cacheRotation);
        Vec3.copy(out._scale, cacheScale);

        return out;
    }

    public static relative(out: Transform, first: Transform, second: Transform) {
        const invSecondRotation = Quat.invert(CACHE_QUAT_A, second._rotation);
        const cacheRotation = Quat.multiply(CACHE_QUAT_B, invSecondRotation, first._rotation);

        const cacheScale = Vec3.divide(CACHE_VECTOR_A, first._scale, second._scale);

        // The inverse process of `T_p + (R_p * (S_p * T_c))`
        const cachePosition = Vec3.subtract(CACHE_VECTOR_B, first._position, second._position);
        Vec3.transformQuat(cachePosition, cachePosition, invSecondRotation);
        Vec3.divide(cachePosition, cachePosition, second._scale);

        Vec3.copy(out._position, cachePosition);
        Quat.copy(out._rotation, cacheRotation);
        Vec3.copy(out._scale, cacheScale);

        return out;
    }

    private readonly _position = new Vec3();

    private readonly _rotation = new Quat();

    private readonly _scale = Vec3.clone(Vec3.ONE);
}