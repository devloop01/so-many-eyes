import {
	Vector2,
	Vector3,
	Color,
	Raycaster,
	WebGLRenderer,
	PerspectiveCamera,
	Scene,
	PlaneBufferGeometry,
	MeshBasicMaterial,
	Mesh,
	AmbientLight,
	PointLight,
	DirectionalLight,
	ReinhardToneMapping,
	sRGBEncoding,
} from "three";

import Eye from "./Eye";
import eyeGLTF from "../../public/models/eye_model.glb";

import { loadGLTF } from "./utils";

import gsap from "gsap";

const CAMERA_Z = 12;

const INTERSECTION_PLANE_Z = 1.8;
const INTERSECTION_PLANE_SIZE = CAMERA_Z * 2;

const EYE_AMOUNT = 5; // minimun 2
const EYE_GAP = 5;

const POSITION_OFFSET_FACTOR = 0.8;

const BACKGROUND_COLOR = "#54b3d1";

export default class Gl {
	constructor() {
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.raycaster = new Raycaster();

		this.mouse = new Vector2();
		this.lerpedMouse = new Vector2();

		this.mouse3d = new Vector3();

		this.animationComplete = false;

		this.mouseLerpAmount = 0.175;
	}

	init() {
		this.createScene();
		this.createRenderer();
		this.createCamera();
		this.addIntersectionPlane();
		this.addLights();
		this.render();
		this.initEvents();

		loadGLTF(eyeGLTF)
			.then((gltf) => {
				const model = gltf.scene.children[0];
				model.scale.setScalar(0.5);
				model.traverse((o) => {
					if (o.isMesh) {
						o.castShadow = true;
						o.recieveShadow = true;
						if (o.material) {
						}
					}
				});
				return model;
			})
			.then((model) => {
				this.eyeModel = model;
				this.addEyes();
				this.initAnimation();
			})
			.catch((url) => console.error(`Error loading from ${url}`));
	}

	createScene() {
		this.scene = new Scene();
		this.scene.background = new Color(BACKGROUND_COLOR);
	}

	createRenderer() {
		this.renderer = new WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.width, this.height);
		this.renderer.physicallyCorrectLights = true;
		this.renderer.outputEncoding = sRGBEncoding;
		this.renderer.toneMapping = ReinhardToneMapping;
		this.renderer.toneMappingExposure = 2;
		this.renderer.shadowMap.enabled = true;
		document.body.appendChild(this.renderer.domElement);
	}

	createCamera() {
		this.camera = new PerspectiveCamera(50, this.width / this.height, 0.1, 100);
		this.camera.position.set(0, 0, CAMERA_Z);
		this.camera.lookAt(new Vector3());

		this.scene.add(this.camera);
	}

	addIntersectionPlane() {
		const geometry = new PlaneBufferGeometry(INTERSECTION_PLANE_SIZE, INTERSECTION_PLANE_SIZE);
		const material = new MeshBasicMaterial({ visible: false, wireframe: true });
		this.intersectionPlane = new Mesh(geometry, material);
		this.intersectionPlane.position.z = INTERSECTION_PLANE_Z;
		this.scene.add(this.intersectionPlane);
	}

	addLights() {
		this.scene.add(new AmbientLight(BACKGROUND_COLOR, 1.5));

		let l1 = new DirectionalLight(0xffffff, 4.25);
		l1.position.set(2, 15, 5);
		this.scene.add(l1);

		let l2 = new DirectionalLight(0xffffff, 4.15);
		l2.position.set(-5, -2, 10);
		this.scene.add(l2);

		this.pointLight = new PointLight(0xffffff, 4);
		this.pointLight.castShadow = true;
		this.pointLight.shadow.bias = -0.0001;
		this.pointLight.shadow.mapSize.setScalar(1024);
		this.scene.add(this.pointLight);
	}

	addEyes() {
		this.eyes = [];
		this.eyePositions = [];

		const refGeo = new PlaneBufferGeometry(EYE_GAP, EYE_GAP, EYE_AMOUNT - 1, EYE_AMOUNT - 1);
		const points = refGeo.attributes.position.array;

		for (let i = 0; i < points.length; i += 3) {
			const point = new Vector3(points[i], points[i + 1], points[i + 2]);
			const eye = new Eye({ eyeModel: this.eyeModel.clone() });
			eye.position.copy(point);
			this.eyes.push(eye);
			this.eyePositions.push(point);
			this.scene.add(eye);
		}
	}

	initEvents() {
		const onMouseMove = (event) => {
			event.preventDefault();
			this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
		};

		const onResize = () => {
			this.width = window.innerWidth;
			this.height = window.innerHeight;

			this.camera.aspect = this.width / this.height;
			this.camera.updateProjectionMatrix();

			this.renderer.setPixelRatio(window.devicePixelRatio);
			this.renderer.setSize(this.width, this.height);
		};

		window.addEventListener("resize", onResize, { passive: true });
		window.addEventListener("mousemove", onMouseMove, false);
	}

	initAnimation() {
		const getDir = (v) => v.clone().sub(new Vector3(0, 0, INTERSECTION_PLANE_Z)).normalize();

		const tl = gsap.timeline({
			delay: 0.15,
			defaults: {
				duration: 0.8,
				ease: "elastic.out(1, 1)",
			},
			onUpdate: () => {
				this.eyes.forEach((eye) => {
					eye.eyeGroup.lookAt(new Vector3(0, 0, INTERSECTION_PLANE_Z));
					eye.updatePosition();
				});
			},
			onComplete: () => (this.animationComplete = true),
		});
		tl.addLabel("start", 0);

		tl.fromTo(
			this.eyes.map((eye) => eye.offsetLocation),
			{
				x: (i) => getDir(this.eyePositions[i]).x * POSITION_OFFSET_FACTOR * 2,
				y: (i) => getDir(this.eyePositions[i]).y * POSITION_OFFSET_FACTOR * 2,
				z: (i) => getDir(this.eyePositions[i]).z * POSITION_OFFSET_FACTOR * 2,
			},
			{
				x: (i) => getDir(this.eyePositions[i]).x * POSITION_OFFSET_FACTOR,
				y: (i) => getDir(this.eyePositions[i]).y * POSITION_OFFSET_FACTOR,
				z: (i) => getDir(this.eyePositions[i]).z * POSITION_OFFSET_FACTOR,
			},
			"start"
		).fromTo(
			this.eyes.map((eye) => eye.scale),
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 1, z: 1, stagger: { grid: [EYE_AMOUNT, EYE_AMOUNT], from: "center", amount: 0.35 } },
			"start"
		);
	}

	updateLerpedMouse() {
		this.lerpedMouse.lerp(this.mouse, this.mouseLerpAmount);
	}

	updateEyes() {
		this.raycaster.setFromCamera(this.lerpedMouse, this.camera);
		let intersects = this.raycaster.intersectObject(this.intersectionPlane);

		if (intersects.length > 0) {
			this.mouse3d.copy(intersects[0].point);
			this.pointLight.position.copy(this.mouse3d);
		}

		if (this.eyes && this.animationComplete)
			this.eyes.forEach((eye, index) => {
				eye.eyeGroup.lookAt(this.mouse3d);

				let pos = this.eyePositions[index];
				let dir = pos.clone().sub(this.mouse3d).normalize().multiplyScalar(POSITION_OFFSET_FACTOR);

				eye.offsetLocation.lerp(dir, 0.45);
				eye.updatePosition();
			});
	}

	render() {
		this.updateLerpedMouse();
		this.updateEyes();

		this.renderer.render(this.scene, this.camera);

		this.raf = requestAnimationFrame(this.render.bind(this));
	}
}
