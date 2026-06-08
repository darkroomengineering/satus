import {
  type Material,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  type WebGLRenderer,
} from 'three'

export default class Program {
  material: Material
  mesh: Mesh
  scene: Scene
  private camera: OrthographicCamera

  constructor(material: Material) {
    this.material = material

    const geometry = new PlaneGeometry(1, 1)
    this.camera = new OrthographicCamera(
      1 / -2,
      1 / 2,
      1 / 2,
      1 / -2,
      0.001,
      1000
    )
    this.camera.position.z = 1

    this.mesh = new Mesh(geometry, this.material)

    this.scene = new Scene()
    this.scene.add(this.mesh)
  }

  get program() {
    return this.material
  }

  render(renderer: WebGLRenderer) {
    renderer.render(this.scene, this.camera)
  }
}
