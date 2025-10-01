// https://github.com/alienkitty/alien.js/blob/main/src/three/utils/Flowmap.js

import {
  HalfFloatType,
  NoBlending,
  ShaderMaterial,
  type Texture,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import Program from '../program'

export class Flowmap {
  renderer: WebGLRenderer
  uniform = { value: null as Texture | null }
  mask = {
    read: null as WebGLRenderTarget | null,
    write: null as WebGLRenderTarget | null,

    // Helper function to ping pong the render targets and update the uniform
    swap: () => {
      const temp = this.mask.read
      this.mask.read = this.mask.write
      this.mask.write = temp
      this.uniform.value = this.mask.read?.texture ?? null
    },
  }
  aspect = 1
  lastMouse = new Vector2()
  mouse = new Vector2()
  targetMouse = new Vector2()
  velocity = new Vector2()
  program: Program
  material: ShaderMaterial

  constructor(
    renderer: WebGLRenderer,
    {
      size = 128, // default size of the render targets
      falloff = 0.3, // size of the stamp, percentage of the size
      alpha = 1, // opacity of the stamp
      dissipation = 0.98, // affects the speed that the stamp fades. Closer to 1 is slower
    } = {}
  ) {
    this.renderer = renderer

    const options = {
      type: HalfFloatType,
      depthBuffer: false,
    }

    this.mask.read = new WebGLRenderTarget(size, size, options)
    this.mask.write = new WebGLRenderTarget(size, size, options)
    this.mask.swap()

    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tMap: this.uniform,

        uFalloff: { value: falloff * 0.5 },
        uAlpha: { value: alpha },
        uDissipation: { value: dissipation },

        // User needs to update these
        uAspect: { value: 1 },
        uMouse: { value: this.mouse },
        uVelocity: { value: this.velocity },
      },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    })

    this.program = new Program(this.material)

    const isTouchCapable = 'ontouchstart' in window
    if (isTouchCapable) {
      window.addEventListener('touchstart', this.updateMouse, false)
      window.addEventListener('touchmove', this.updateMouse, false)
    } else {
      window.addEventListener('mousemove', this.updateMouse, false)
    }
  }

  // @ts-expect-error
  updateMouse = (e) => {
    if (e.changedTouches?.length) {
      e.x = e.changedTouches[0].pageX
      e.y = e.changedTouches[0].pageY
    }
    if (e.x === undefined) {
      e.x = e.pageX
      e.y = e.pageY
    }

    const viewportSize = this.renderer.getSize(new Vector2())
    this.aspect = viewportSize.width / viewportSize.height
    this.material.uniforms.uAspect.value = this.aspect

    const x = e.x / viewportSize.width
    const y = 1 - e.y / viewportSize.height

    this.targetMouse.set(x, y)
  }

  update() {
    const lastVelocity = this.velocity.length()

    this.velocity
      .copy(this.targetMouse.clone().sub(this.mouse))
      .multiplyScalar(100)

    this.mouse.lerp(this.targetMouse, lastVelocity === 0 ? 1 : 0.07)

    if (this.velocity.length() < 1) {
      this.targetMouse.set(-1, -1)
      this.mouse.set(-1, -1)
      this.velocity.set(0, 0)
    }

    const oldAutoClear = this.renderer.autoClear
    this.renderer.autoClear = false
    this.renderer.setRenderTarget(this.mask.write)

    this.program.render(this.renderer)
    this.mask.swap()

    this.renderer.autoClear = oldAutoClear
    this.renderer.setRenderTarget(null)
  }

  set falloff(value) {
    this.material.uniforms.uFalloff.value = value
  }

  get falloff() {
    return this.material.uniforms.uFalloff.value
  }

  set dissipation(value) {
    this.material.uniforms.uDissipation.value = value
  }

  get dissipation() {
    return this.material.uniforms.uDissipation.value
  }
}

const vertexShader = /* glsl */ `
    // attribute vec2 uv;
    // attribute vec2 position;

    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`

const fragmentShader = /* glsl */ `
    precision highp float;

    uniform sampler2D tMap;

    uniform float uFalloff;
    uniform float uAlpha;
    uniform float uDissipation;
    
    uniform float uAspect;
    uniform vec2 uMouse;
    uniform vec2 uVelocity;

    varying vec2 vUv;

    void main() {
        vec4 color = texture2D(tMap, vUv) * uDissipation;

        vec2 cursor = vUv - uMouse;
        cursor.x *= uAspect;

        vec3 stamp = vec3(uVelocity * vec2(1, -1), 1.0 - pow(1.0 - min(1.0, length(uVelocity)), 3.0));
        float falloff = smoothstep(uFalloff, 0.0, length(cursor)) * uAlpha;

        color.rgb = mix(color.rgb, stamp, vec3(falloff));

        gl_FragColor = vec4(color.rgb, 1.0);
    }
`
