import { _decorator, Component, Node, Toggle } from 'cc';
import { CharacterController } from '../CharacterController';
const { ccclass, property } = _decorator;

@ccclass('CharacterControllerUI')
export class CharacterControllerUI extends Component {
    @property(CharacterController)
    public characterController: CharacterController | null = null;
    
    public onToggleMoveInPlace(_toggle: Toggle) {
        if (this.characterController) {
            this.characterController.moveInPlace = !this.characterController.moveInPlace;
        }
    }

    public onToggleDebugView(_toggle: Toggle) {
        if (this.characterController) {
            this.characterController.debugView = !this.characterController.debugView;
        }
    }
}


