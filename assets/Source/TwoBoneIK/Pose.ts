import { Transform } from "./Transform";
import { TransformArray } from "./TransformArray";

const TRANSFORM_CACHE_A = new Transform();
const TRANSFORM_CACHE_B = new Transform();

export class Pose {
    constructor(parentTable: ReadonlyArray<number>) {
        this._transforms = new TransformArray(parentTable.length);
    }

    public toPoseSpace(out: Pose) {
        const nNodes = this._transforms.length;
        for (let iNode = 0; iNode < nNodes; ++iNode) {
            const parent = this._parentTable[iNode];
            if (parent >= 0) {
                const parentTransform = out._transforms.get(parent, TRANSFORM_CACHE_A);
                const localTransform = this._transforms.get(iNode, TRANSFORM_CACHE_B);
                
            }
        }
    }

    public toLocalSpace() {
    }

    private _transforms: TransformArray;

    private readonly _parentTable: ReadonlyArray<number> = [];
}