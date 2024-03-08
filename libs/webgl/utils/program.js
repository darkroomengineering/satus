import { OrthographicCamera } from 'three/src/cameras/OrthographicCamera'
import { PlaneGeometry } from 'three/src/geometries/PlaneGeometry'
import { Mesh } from 'three/src/objects/Mesh'
import { Scene } from 'three/src/scenes/Scene'

const geometry = new PlaneGeometry(1, 1)

const camera = new OrthographicCamera(1 / -2, 1 / 2, 1 / 2, 1 / -2, 0.001, 1000)

camera.position.z = 1

export default class Program extends Scene {
  constructor(material) {
    super()
    this.material = material
    this.mesh = new Mesh(geometry, this.material)

    this.scene = new Scene()
    this.scene.add(this.mesh)
  }

  get program() {
    return this.material
  }

  render(renderer) {
    renderer.render(this.scene, camera)
  }
}
