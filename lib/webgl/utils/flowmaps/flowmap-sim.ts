// https://github.com/alienkitty/alien.js/blob/main/src/three/utils/Flowmap.js

import {
  HalfFloatType,
  NoBlending,
  Texture,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import {
  Fn,
  float,
  length,
  min,
  mix,
  pow,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import type { TextureNode } from 'three/webgpu'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import Program from '../program'

// Shared empty texture used as a placeholder before the first swap
const EMPTY_TEXTURE = new Texture()

export class Flowmap {
  renderer: WebGLRenderer
  // Public output consumed by AnimatedGradientMaterial and others
  uniform: { value: Texture | null } = { value: null }
  mask: {
    read: WebGLRenderTarget | null
    write: WebGLRenderTarget | null
    swap: () => void
  }
  aspect = 1
  lastMouse = new Vector2()
  mouse = new Vector2()
  targetMouse = new Vector2()
  velocity = new Vector2()
  program: Program
  material: MeshBasicNodeMaterial

  // TSL uniform nodes
  private readonly _uFalloff = uniform(0.15)
  private readonly _uAlpha = uniform(1)
  private readonly _uDissipation = uniform(0.98)
  private readonly _uAspect = uniform(1)
  private readonly _uMouse = uniform(new Vector2())
  private readonly _uVelocity = uniform(new Vector2())
  private readonly _tMapNode: TextureNode

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

    // Set initial uniform values from constructor params
    this._uFalloff.value = falloff * 0.5
    this._uAlpha.value = alpha
    this._uDissipation.value = dissipation

    // Keep mouse/velocity uniforms pointing at the live Vector2 instances
    this._uMouse.value = this.mouse
    this._uVelocity.value = this.velocity

    const options = {
      type: HalfFloatType,
      depthBuffer: false,
    }

    const readTarget = new WebGLRenderTarget(size, size, options)
    const writeTarget = new WebGLRenderTarget(size, size, options)

    // Build the TSL texture node — starts with placeholder, swap() updates it
    this._tMapNode = texture(EMPTY_TEXTURE) as TextureNode

    // Capture the node reference so the arrow in mask.swap can update it
    const tMapNode = this._tMapNode
    const uniformRef = this.uniform

    this.mask = {
      read: readTarget,
      write: writeTarget,
      swap: () => {
        const temp = this.mask.read
        this.mask.read = this.mask.write
        this.mask.write = temp
        uniformRef.value = this.mask.read?.texture ?? null
        // Keep the TSL texture node in sync with the ping-pong target
        tMapNode.value = uniformRef.value ?? EMPTY_TEXTURE
      },
    }

    // Perform initial swap to wire up this.uniform.value
    this.mask.swap()

    // -----------------------------------------------------------------------
    // TSL fragment equivalent of the original GLSL:
    //
    //   vec4 color = texture2D(tMap, vUv) * uDissipation;
    //   vec2 cursor = vUv - uMouse;
    //   cursor.x *= uAspect;
    //   vec3 stamp = vec3(uVelocity * vec2(1,-1),
    //                     1.0 - pow(1.0 - min(1.0, length(uVelocity)), 3.0));
    //   float falloff = smoothstep(uFalloff, 0.0, length(cursor)) * uAlpha;
    //   color.rgb = mix(color.rgb, stamp, vec3(falloff));
    //   gl_FragColor = vec4(color.rgb, 1.0);
    // -----------------------------------------------------------------------
    const uFalloff = this._uFalloff
    const uAlpha = this._uAlpha
    const uDissipation = this._uDissipation
    const uAspect = this._uAspect
    const uMouse = this._uMouse
    const uVelocity = this._uVelocity

    const colorNode = Fn(() => {
      const uvCoord = uv()

      // Sample the ping-pong texture and apply dissipation
      const color = tMapNode.sample(uvCoord).mul(uDissipation).toVar()

      // Cursor offset from mouse position, aspect-corrected on X
      // cursor.x *= uAspect → rebuild as vec2(diff.x * aspect, diff.y)
      const diff = uvCoord.sub(uMouse)
      const cursor = vec2(diff.x.mul(uAspect), diff.y)

      // Stamp: xy = velocity with Y-flipped, z = velocity magnitude weight
      // stampZ = 1.0 - pow(1.0 - min(1.0, length(uVelocity)), 3.0)
      const velLen = length(uVelocity)
      const clampedVelLen = min(float(1.0), velLen)
      const stampZ = float(1.0).sub(
        pow(float(1.0).sub(clampedVelLen), float(3.0))
      )
      const stamp = vec3(uVelocity.mul(vec2(1, -1)), stampZ)

      // Radial falloff weight
      const falloffWeight = smoothstep(
        uFalloff,
        float(0.0),
        length(cursor)
      ).mul(uAlpha)

      // Blend color toward stamp
      const blended = mix(color.rgb, stamp, falloffWeight)

      return vec4(blended, float(1.0))
    })()

    this.material = new MeshBasicNodeMaterial({
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    })
    this.material.colorNode = colorNode

    this.program = new Program(this.material)

    const isTouchCapable = 'ontouchstart' in window
    if (isTouchCapable) {
      window.addEventListener('touchstart', this.updateMouse, false)
      window.addEventListener('touchmove', this.updateMouse, false)
    } else {
      window.addEventListener('mousemove', this.updateMouse, false)
    }
  }

  updateMouse = (e: MouseEvent | TouchEvent) => {
    // Normalize touch and mouse events to get x/y coordinates
    let pageX: number
    let pageY: number

    if ('changedTouches' in e && e.changedTouches.length) {
      pageX = e.changedTouches[0]?.pageX ?? 0
      pageY = e.changedTouches[0]?.pageY ?? 0
    } else if ('pageX' in e) {
      pageX = e.pageX
      pageY = e.pageY
    } else {
      return
    }

    const viewportSize = this.renderer.getSize(new Vector2())
    this.aspect = viewportSize.width / viewportSize.height
    this._uAspect.value = this.aspect

    const x = pageX / viewportSize.width
    const y = 1 - pageY / viewportSize.height

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
    if (this.mask.write) {
      this.renderer.setRenderTarget(this.mask.write)
    }

    this.program.render(this.renderer)
    this.mask.swap()

    this.renderer.autoClear = oldAutoClear
    this.renderer.setRenderTarget(null)
  }

  set falloff(value: number) {
    this._uFalloff.value = value
  }

  get falloff(): number {
    return this._uFalloff.value as number
  }

  set dissipation(value: number) {
    this._uDissipation.value = value
  }

  get dissipation(): number {
    return this._uDissipation.value as number
  }

  destroy(): null {
    const isTouchCapable = 'ontouchstart' in window
    if (isTouchCapable) {
      window.removeEventListener('touchstart', this.updateMouse, false)
      window.removeEventListener('touchmove', this.updateMouse, false)
    } else {
      window.removeEventListener('mousemove', this.updateMouse, false)
    }

    this.mask.read?.dispose()
    this.mask.write?.dispose()
    this.material.dispose()
    this.program.mesh.geometry.dispose()
    this.program.scene.clear()

    return null
  }
}
