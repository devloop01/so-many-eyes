import { LoadingManager } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export function map(n, start1, stop1, start2, stop2) {
	return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2
}

export const lerp = (v0, v1, t) => v0 * (1 - t) + v1 * t

export const loadGLTF = (url) => {
	return new Promise((resolve, reject) => {
		let GLTF
		const manager = new LoadingManager()
		const loader = new GLTFLoader(manager)

		loader.load(url, (gltf) => (GLTF = gltf))
		manager.onLoad = () => resolve(GLTF)
		manager.onError = reject
	})
}

