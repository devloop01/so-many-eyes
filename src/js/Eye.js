import { Object3D, Vector3, Group } from "three";

export default class Eye extends Object3D {
	constructor(options = {}) {
		super(options);

		this.eyeModel = options.eyeModel || null;

		this.location = options.position || new Vector3(0, 0, 0);
		this.offsetLocation = options.offsetLocation || new Vector3(0, 0, 0);
		this.eyeGroup = new Group();
		this.eye = new Object3D();

		this.init();
	}

	init() {
		this.eye.add(this.eyeModel);
		this.eyeGroup.add(this.eye);
		this.add(this.eyeGroup);
	}

	updatePosition() {
		this.eye.position.set(
			this.location.x + this.offsetLocation.x,
			this.location.y + this.offsetLocation.y,
			this.location.z + this.offsetLocation.z
		);
	}
}
