import {
  type Material,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  type WebGLRenderer,
} from 'three'

const geometry = new PlaneGeometry(1, 1)
const camera = new OrthographicCamera(1 / -2, 1 / 2, 1 / 2, 1 / -2, 0.001, 1000)
camera.position.z = 1

export default class Program extends Scene {
  material: Material
  mesh: Mesh
  scene: Scene

  constructor(material: Material) {
    super()
    this.material = material
    this.mesh = new Mesh(geometry, this.material)

    this.scene = new Scene()
    this.scene.add(this.mesh)
  }

  get program() {
    return this.material
  }

  render(renderer: WebGLRenderer) {
    renderer.render(this.scene, camera)
  }
}
