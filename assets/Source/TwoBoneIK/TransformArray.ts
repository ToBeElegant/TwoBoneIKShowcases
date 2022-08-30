import { Quat, Vec3 } from 'cc';
import { Transform } from './Transform';

const STRIDE = 10;

const ROTATION_OFFSET = 3;

const SCALE_OFFSET = ROTATION_OFFSET + 4;

export class TransformArray {
    constructor (count: number) {
        this._data = new Float64Array(10 * count);
    }

    get length () {
        return this._data.length / STRIDE;
    }

    public get (index: number, out: Transform) {
        const {
            _data: data,
        } = this;
        const {
            position,
            rotation,
            scale,
        } = out;
        const baseOffset = STRIDE * index;
        Vec3.fromArray(position, data, baseOffset);
        Quat.fromArray(rotation, data, baseOffset + ROTATION_OFFSET);
        Vec3.fromArray(scale, data, baseOffset + SCALE_OFFSET);
        return out;
    }

    public getPosition (index: number, out: Vec3) {
        const {
            _data: data,
        } = this;
        const baseOffset = STRIDE * index;
        Vec3.fromArray(out, data, baseOffset);
    }

    public getRotation (index: number, out: Quat) {
        const {
            _data: data,
        } = this;
        const baseOffset = STRIDE * index;
        Quat.fromArray(out, data, baseOffset + ROTATION_OFFSET);
    }

    public getScale (index: number, out: Vec3) {
        const {
            _data: data,
        } = this;
        const baseOffset = STRIDE * index;
        Vec3.fromArray(out, data, baseOffset + SCALE_OFFSET);
    }

    public set (index: number, value: Readonly<Transform>) {
        const {
            _data: data,
        } = this;
        const {
            position,
            rotation,
            scale,
        } = value;
        const baseOffset = STRIDE * index;
        Vec3.toArray(data, position, baseOffset);
        Quat.toArray(data, rotation, baseOffset + ROTATION_OFFSET);
        Vec3.toArray(data, scale, baseOffset + SCALE_OFFSET);
    }

    public setPosition (index: number, value: Readonly<Vec3>) {
        const {
            _data: data,
        } = this;
        const baseOffset = STRIDE * index;
        Vec3.toArray(data, value, baseOffset);
    }

    public setRotation (index: number, value: Readonly<Quat>) {
        const {
            _data: data,
        } = this;
        const baseOffset = STRIDE * index;
        Quat.toArray(data, value, baseOffset + ROTATION_OFFSET);
    }

    public setScale (index: number, value: Readonly<Vec3>) {
        const {
            _data: data,
        } = this;
        const baseOffset = STRIDE * index;
        Vec3.toArray(data, value, baseOffset + SCALE_OFFSET);
    }

    public copyInto (other: TransformArray) {
        // assertIsTrue(this._data.length === other._data.length);
        other._data.set(this._data);
    }

    public __zeroClear () {
        this._data.fill(0.0);
    }

    private _data: Float64Array;
}
