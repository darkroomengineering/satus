/**
 * @author pschroen / https://ufo.ai/
 *
 * Based on https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
 * Based on https://oframe.github.io/ogl/examples/?src=post-fluid-distortion.html by gordonnl
 *
 * TSL / NodeMaterial port: each GLSL RawShaderMaterial pass has been replaced
 * with a MeshBasicNodeMaterial whose .colorNode is a TSL Fn expression.
 * The public API (constructor, update, destroy, uniform, splatMaterial.uniforms.*)
 * is preserved exactly so callers do not need changes.
 *
 * Neighbour UVs (vL/vR/vT/vB from the original vertex shader) are recomputed
 * per-fragment inside each Fn using two scalar uniforms uTexelSizeX / uTexelSizeY
 * rather than swizzling a vec2 uniform — this avoids TS type-narrowing issues on
 * UniformNode<Vector2> swizzle properties.
 */

import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  HalfFloatType,
  Mesh,
  NearestFilter,
  NoBlending,
  OrthographicCamera,
  RedFormat,
  type RenderTargetOptions,
  RGFormat,
  type Texture,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import {
  abs,
  exp,
  Fn,
  float,
  length,
  select,
  texture,
  uniform,
  uv,
  vec2,
  vec4,
} from 'three/tsl'
import type { TextureNode } from 'three/webgpu'
import { MeshBasicNodeMaterial } from 'three/webgpu'

// uniform()'s exported type isn't directly instantiable as a generic, so derive
// the concrete uniform-node types by sampling its return value with `typeof`
// (the type-query references below count as uses, so these don't trip lint).
const _numUniformSample = uniform(0)
const _colorUniformSample = uniform(new Color())
type NumUniform = typeof _numUniformSample
type ColorUniform = typeof _colorUniformSample

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface DoubleRenderTarget {
  read: WebGLRenderTarget
  write: WebGLRenderTarget
  swap: () => void
  setSize: (width: number, height: number) => void
  dispose: () => void
}

interface Splat {
  x: number
  y: number
  dx: number
  dy: number
}

interface FluidOptions {
  size?: number
  dyeRes?: number
  iterations?: number
  densityDissipation?: number
  velocityDissipation?: number
  pressureDissipation?: number
  curlStrength?: number
  radius?: number
}

// ---------------------------------------------------------------------------
// SplatNodeMaterial — a MeshBasicNodeMaterial augmented with a .uniforms shim
// so external code can still write `splatMaterial.uniforms.uAspect.value = ...`
// (accessed by lib/webgl/utils/fluid/index.tsx)
// ---------------------------------------------------------------------------

interface SplatUniforms {
  uAspect: { value: number }
  uTarget: { value: Texture | null }
  point: { value: Vector2 }
  color: { value: Color }
  radius: { value: number }
}

interface SplatNodeMaterial extends MeshBasicNodeMaterial {
  uniforms: SplatUniforms
}

// ---------------------------------------------------------------------------
// Render-target helpers (unchanged from original)
// ---------------------------------------------------------------------------

function getDoubleRenderTarget(
  width: number,
  height: number,
  options?: RenderTargetOptions
): DoubleRenderTarget {
  const rt: DoubleRenderTarget = {
    read: new WebGLRenderTarget(width, height, options),
    write: new WebGLRenderTarget(width, height, options),
    swap: () => {
      const temp = rt.read
      rt.read = rt.write
      rt.write = temp
    },
    setSize: (w: number, h: number) => {
      rt.read.setSize(w, h)
      rt.write.setSize(w, h)
    },
    dispose: () => {
      rt.read.dispose()
      rt.write.dispose()
    },
  }
  return rt
}

function getFullscreenTriangle(): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3)
  )
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2))
  return geometry
}

// ---------------------------------------------------------------------------
// TSL material factories
//
// Each factory translates one GLSL fragment shader to a MeshBasicNodeMaterial
// colorNode.  Neighbour UVs (vL/vR/vT/vB) are recomputed per-fragment using
// two scalar uniforms (uTsX, uTsY) for texelSize components — this avoids
// relying on swizzle properties (.x/.y) on UniformNode<Vector2>.
//
// uTsX = 1/simWidth,  uTsY = 1/simHeight  (same value for square sims)
// ---------------------------------------------------------------------------

// --- Clear pass ---
// FragColor = value * texture(uTexture, vUv)
function makeClearMaterial(
  uTexture: TextureNode,
  uValue: NumUniform
): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  })
  mat.colorNode = Fn(() => {
    return uTexture.sample(uv()).mul(uValue)
  })()
  return mat
}

// --- Splat pass ---
// Adds a gaussian dye/velocity splat at a mouse point.
// splat = exp(-dot(p,p)/radius) * color  +  base
function makeSplatMaterial(
  uTarget: TextureNode,
  uAspect: NumUniform,
  uColor: ColorUniform,
  uPointX: NumUniform,
  uPointY: NumUniform,
  uRadius: NumUniform
): SplatNodeMaterial {
  const mat = new MeshBasicNodeMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  }) as SplatNodeMaterial

  mat.colorNode = Fn(() => {
    const coord = uv()
    // p = vUv - point; p.x *= aspect
    const px = coord.x.sub(uPointX).mul(uAspect)
    const py = coord.y.sub(uPointY)
    // exp(-dot(p,p)/radius)
    const dot2 = px.mul(px).add(py.mul(py))
    const splatAmt = exp(dot2.div(uRadius).negate())
    // splat = splatAmt * color;  result = base.rgb + splat
    const base = uTarget.sample(coord)
    const splat = uColor.mul(splatAmt)
    return vec4(base.rgb.add(splat), float(1.0))
  })()

  // Shim: expose .uniforms.* so external code (fluid/index.tsx line 87) can
  // still write `splatMaterial.uniforms.uAspect.value = size.width / size.height`
  // The internal storage uses two scalar uniforms (uPointX/uPointY) but the
  // shim exposes a Vector2 interface for the `point` key.
  const pointVec = new Vector2()
  mat.uniforms = {
    uAspect: {
      get value() {
        return uAspect.value as number
      },
      set value(v: number) {
        uAspect.value = v
      },
    },
    uTarget: {
      get value() {
        return uTarget.value as Texture | null
      },
      set value(v: Texture | null) {
        uTarget.value = v ?? uTarget.value
      },
    },
    point: {
      get value() {
        pointVec.set(uPointX.value as number, uPointY.value as number)
        return pointVec
      },
      set value(v: Vector2) {
        uPointX.value = v.x
        uPointY.value = v.y
      },
    },
    color: {
      get value() {
        return uColor.value as Color
      },
      set value(v: Color) {
        ;(uColor.value as Color).copy(v)
      },
    },
    radius: {
      get value() {
        return uRadius.value as number
      },
      set value(v: number) {
        uRadius.value = v
      },
    },
  }

  return mat
}

// --- Advection pass ---
// coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize
// FragColor = dissipation * texture(uSource, coord);  .a = 1
function makeAdvectionMaterial(
  uTsX: NumUniform,
  uTsY: NumUniform,
  uVelocity: TextureNode,
  uSource: TextureNode,
  uDt: NumUniform,
  uDissipation: NumUniform
): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  })
  mat.colorNode = Fn(() => {
    const coord = uv()
    const vel = uVelocity.sample(coord).xy
    const advectedUV = vec2(
      coord.x.sub(uDt.mul(vel.x).mul(uTsX)),
      coord.y.sub(uDt.mul(vel.y).mul(uTsY))
    )
    const sampled = uSource.sample(advectedUV).mul(uDissipation)
    return vec4(sampled.rgb, float(1.0))
  })()
  return mat
}

// --- Divergence pass ---
// div = 0.5 * (R - L + T - B)  with boundary-reflection at edges
function makeDivergenceMaterial(
  uTsX: NumUniform,
  uTsY: NumUniform,
  uVelocity: TextureNode
): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  })
  mat.colorNode = Fn(() => {
    const coord = uv()

    const uvL = vec2(coord.x.sub(uTsX), coord.y)
    const uvR = vec2(coord.x.add(uTsX), coord.y)
    const uvT = vec2(coord.x, coord.y.add(uTsY))
    const uvB = vec2(coord.x, coord.y.sub(uTsY))

    const C = uVelocity.sample(coord).xy
    const Ls = uVelocity.sample(uvL).x
    const Rs = uVelocity.sample(uvR).x
    const Ts = uVelocity.sample(uvT).y
    const Bs = uVelocity.sample(uvB).y

    // Boundary: if neighbour uv leaves [0,1], reflect the centre velocity
    // GLSL: if (vL.x < 0.0) L = -C.x;
    const Lf = select(coord.x.sub(uTsX).lessThan(float(0.0)), C.x.negate(), Ls)
    const Rf = select(
      coord.x.add(uTsX).greaterThan(float(1.0)),
      C.x.negate(),
      Rs
    )
    const Tf = select(
      coord.y.add(uTsY).greaterThan(float(1.0)),
      C.y.negate(),
      Ts
    )
    const Bf = select(coord.y.sub(uTsY).lessThan(float(0.0)), C.y.negate(), Bs)

    const div = Rf.sub(Lf).add(Tf.sub(Bf)).mul(float(0.5))
    return vec4(div, float(0.0), float(0.0), float(1.0))
  })()
  return mat
}

// --- Curl pass ---
// vorticity = R.y - L.y - T.x + B.x
function makeCurlMaterial(
  uTsX: NumUniform,
  uTsY: NumUniform,
  uVelocity: TextureNode
): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  })
  mat.colorNode = Fn(() => {
    const coord = uv()

    const uvL = vec2(coord.x.sub(uTsX), coord.y)
    const uvR = vec2(coord.x.add(uTsX), coord.y)
    const uvT = vec2(coord.x, coord.y.add(uTsY))
    const uvB = vec2(coord.x, coord.y.sub(uTsY))

    const Ls = uVelocity.sample(uvL).y
    const Rs = uVelocity.sample(uvR).y
    const Ts = uVelocity.sample(uvT).x
    const Bs = uVelocity.sample(uvB).x

    const vorticity = Rs.sub(Ls).sub(Ts).add(Bs)
    return vec4(vorticity.mul(float(0.5)), float(0.0), float(0.0), float(1.0))
  })()
  return mat
}

// --- Vorticity confinement pass ---
// force = 0.5 * vec2(abs(T)-abs(B), abs(R)-abs(L)) / (length(force)+0.0001)
// force *= curl * C;  force.y *= -1
// FragColor = vec4(vel + force * dt, 0, 1)
function makeVorticityMaterial(
  uTsX: NumUniform,
  uTsY: NumUniform,
  uVelocity: TextureNode,
  uCurl: TextureNode,
  uCurlStrength: NumUniform,
  uDt: NumUniform
): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  })
  mat.colorNode = Fn(() => {
    const coord = uv()

    const uvL = vec2(coord.x.sub(uTsX), coord.y)
    const uvR = vec2(coord.x.add(uTsX), coord.y)
    const uvT = vec2(coord.x, coord.y.add(uTsY))
    const uvB = vec2(coord.x, coord.y.sub(uTsY))

    const Ls = uCurl.sample(uvL).x
    const Rs = uCurl.sample(uvR).x
    const Ts = uCurl.sample(uvT).x
    const Bs = uCurl.sample(uvB).x
    const Cs = uCurl.sample(coord).x

    const fx = abs(Ts).sub(abs(Bs)).mul(float(0.5))
    const fy = abs(Rs).sub(abs(Ls)).mul(float(0.5))

    const forceLen = length(vec2(fx, fy)).add(float(0.0001))
    const nfx = fx.div(forceLen)
    const nfy = fy.div(forceLen)

    const vel = uVelocity.sample(coord).xy
    return vec4(
      vel.x.add(nfx.mul(uCurlStrength).mul(Cs).mul(uDt)),
      vel.y.add(nfy.mul(uCurlStrength).mul(Cs).negate().mul(uDt)),
      float(0.0),
      float(1.0)
    )
  })()
  return mat
}

// --- Pressure Jacobi iteration pass ---
// pressure = (L + R + B + T - divergence) * 0.25
function makePressureMaterial(
  uTsX: NumUniform,
  uTsY: NumUniform,
  uPressure: TextureNode,
  uDivergence: TextureNode
): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  })
  mat.colorNode = Fn(() => {
    const coord = uv()

    const uvL = vec2(coord.x.sub(uTsX), coord.y)
    const uvR = vec2(coord.x.add(uTsX), coord.y)
    const uvT = vec2(coord.x, coord.y.add(uTsY))
    const uvB = vec2(coord.x, coord.y.sub(uTsY))

    const Ls = uPressure.sample(uvL).x
    const Rs = uPressure.sample(uvR).x
    const Ts = uPressure.sample(uvT).x
    const Bs = uPressure.sample(uvB).x
    const divergence = uDivergence.sample(coord).x

    const pressure = Ls.add(Rs).add(Bs).add(Ts).sub(divergence).mul(float(0.25))
    return vec4(pressure, float(0.0), float(0.0), float(1.0))
  })()
  return mat
}

// --- Gradient-subtract pass ---
// velocity.xy -= vec2(R - L, T - B)
function makeGradientSubtractMaterial(
  uTsX: NumUniform,
  uTsY: NumUniform,
  uPressure: TextureNode,
  uVelocity: TextureNode
): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  })
  mat.colorNode = Fn(() => {
    const coord = uv()

    const uvL = vec2(coord.x.sub(uTsX), coord.y)
    const uvR = vec2(coord.x.add(uTsX), coord.y)
    const uvT = vec2(coord.x, coord.y.add(uTsY))
    const uvB = vec2(coord.x, coord.y.sub(uTsY))

    const Ls = uPressure.sample(uvL).x
    const Rs = uPressure.sample(uvR).x
    const Ts = uPressure.sample(uvT).x
    const Bs = uPressure.sample(uvB).x

    const vel = uVelocity.sample(coord).xy
    return vec4(
      vel.x.sub(Rs.sub(Ls)),
      vel.y.sub(Ts.sub(Bs)),
      float(0.0),
      float(1.0)
    )
  })()
  return mat
}

// ---------------------------------------------------------------------------
// Fluid class
// ---------------------------------------------------------------------------

/**
 * A class for fluid distortion (Navier-Stokes, TSL/NodeMaterial port).
 *
 * Public API is identical to the original GLSL version so no callers need
 * to be updated.
 */
export class Fluid {
  private renderer: WebGLRenderer
  private iterations: number

  // Make these public so they can be edited at runtime via the controller
  public densityDissipation: number
  public velocityDissipation: number
  public pressureDissipation: number
  public curlStrength: number
  public radius: number

  private splats: Splat[]

  // Render targets
  private density: DoubleRenderTarget
  private velocity: DoubleRenderTarget
  private pressure: DoubleRenderTarget
  private divergence: WebGLRenderTarget
  private curl: WebGLRenderTarget

  // TSL uniform nodes — updated each frame in update()
  // Texel size stored as two scalars to avoid swizzle-typing issues on UniformNode<Vector2>
  private _uTsX: NumUniform
  private _uTsY: NumUniform
  private _uClearTexture: TextureNode
  private _uClearValue: NumUniform
  private _uSplatTarget: TextureNode
  private _uSplatAspect: NumUniform
  private _uSplatColor: ColorUniform
  private _uSplatPointX: NumUniform
  private _uSplatPointY: NumUniform
  private _uSplatRadius: NumUniform
  private _uAdvVelocity: TextureNode
  private _uAdvSource: TextureNode
  private _uAdvDt: NumUniform
  private _uAdvDissipation: NumUniform
  private _uDivVelocity: TextureNode
  private _uCurlVelocity: TextureNode
  private _uVortVelocity: TextureNode
  private _uVortCurl: TextureNode
  private _uVortCurlStrength: NumUniform
  private _uVortDt: NumUniform
  private _uPressurePressure: TextureNode
  private _uPressureDivergence: TextureNode
  private _uGradPressure: TextureNode
  private _uGradVelocity: TextureNode

  // Node materials (replacing RawShaderMaterial)
  private clearMaterial: MeshBasicNodeMaterial
  public splatMaterial: SplatNodeMaterial
  private advectionMaterial: MeshBasicNodeMaterial
  private divergenceMaterial: MeshBasicNodeMaterial
  private curlMaterial: MeshBasicNodeMaterial
  private vorticityMaterial: MeshBasicNodeMaterial
  private pressureMaterial: MeshBasicNodeMaterial
  private gradientSubtractMaterial: MeshBasicNodeMaterial

  // Screen rendering
  private screenCamera: OrthographicCamera
  private screenTriangle: BufferGeometry
  private screen: Mesh

  // Output uniform
  public uniform: { value: Texture }

  constructor(
    renderer: WebGLRenderer,
    {
      size = 128,
      dyeRes = 512,
      iterations = 3,
      densityDissipation = 0.97,
      velocityDissipation = 0.98,
      pressureDissipation = 0.8,
      curlStrength = 20,
      radius = 0.2,
    }: FluidOptions = {}
  ) {
    this.renderer = renderer
    this.iterations = iterations
    this.densityDissipation = densityDissipation
    this.velocityDissipation = velocityDissipation
    this.pressureDissipation = pressureDissipation
    this.curlStrength = curlStrength
    this.radius = radius

    this.splats = []

    // Fluid simulation render targets (unchanged from original)
    this.density = getDoubleRenderTarget(dyeRes, dyeRes, {
      type: HalfFloatType,
      depthBuffer: false,
    })

    this.velocity = getDoubleRenderTarget(size, size, {
      type: HalfFloatType,
      format: RGFormat,
      depthBuffer: false,
    })

    this.pressure = getDoubleRenderTarget(size, size, {
      type: HalfFloatType,
      format: RedFormat,
      magFilter: NearestFilter,
      minFilter: NearestFilter,
      depthBuffer: false,
    })

    this.divergence = new WebGLRenderTarget(size, size, {
      type: HalfFloatType,
      format: RedFormat,
      magFilter: NearestFilter,
      minFilter: NearestFilter,
      depthBuffer: false,
    })

    this.curl = new WebGLRenderTarget(size, size, {
      type: HalfFloatType,
      format: RedFormat,
      magFilter: NearestFilter,
      minFilter: NearestFilter,
      depthBuffer: false,
    })

    // Output uniform
    this.uniform = { value: this.density.read.texture }

    // -----------------------------------------------------------------------
    // Build TSL uniform nodes.
    // -----------------------------------------------------------------------

    // Texel size: two scalars (avoids swizzle-typing issues on UniformNode<Vector2>)
    const tsX = 1 / size
    const tsY = 1 / size
    this._uTsX = uniform(tsX)
    this._uTsY = uniform(tsY)

    // Clear
    this._uClearTexture = texture(this.pressure.read.texture) as TextureNode
    this._uClearValue = uniform(pressureDissipation)

    // Splat
    this._uSplatTarget = texture(this.velocity.read.texture) as TextureNode
    this._uSplatAspect = uniform(1)
    this._uSplatColor = uniform(new Color())
    this._uSplatPointX = uniform(0)
    this._uSplatPointY = uniform(0)
    this._uSplatRadius = uniform(1)

    // Advection
    this._uAdvVelocity = texture(this.velocity.read.texture) as TextureNode
    this._uAdvSource = texture(this.velocity.read.texture) as TextureNode
    this._uAdvDt = uniform(1 / 60)
    this._uAdvDissipation = uniform(1)

    // Divergence
    this._uDivVelocity = texture(this.velocity.read.texture) as TextureNode

    // Curl
    this._uCurlVelocity = texture(this.velocity.read.texture) as TextureNode

    // Vorticity
    this._uVortVelocity = texture(this.velocity.read.texture) as TextureNode
    this._uVortCurl = texture(this.curl.texture) as TextureNode
    this._uVortCurlStrength = uniform(curlStrength)
    this._uVortDt = uniform(1 / 60)

    // Pressure Jacobi
    this._uPressurePressure = texture(this.pressure.read.texture) as TextureNode
    this._uPressureDivergence = texture(this.divergence.texture) as TextureNode

    // Gradient subtract
    this._uGradPressure = texture(this.pressure.read.texture) as TextureNode
    this._uGradVelocity = texture(this.velocity.read.texture) as TextureNode

    // -----------------------------------------------------------------------
    // Instantiate all node materials
    // -----------------------------------------------------------------------

    this.clearMaterial = makeClearMaterial(
      this._uClearTexture,
      this._uClearValue
    )

    this.splatMaterial = makeSplatMaterial(
      this._uSplatTarget,
      this._uSplatAspect,
      this._uSplatColor,
      this._uSplatPointX,
      this._uSplatPointY,
      this._uSplatRadius
    )

    this.advectionMaterial = makeAdvectionMaterial(
      this._uTsX,
      this._uTsY,
      this._uAdvVelocity,
      this._uAdvSource,
      this._uAdvDt,
      this._uAdvDissipation
    )

    this.divergenceMaterial = makeDivergenceMaterial(
      this._uTsX,
      this._uTsY,
      this._uDivVelocity
    )

    this.curlMaterial = makeCurlMaterial(
      this._uTsX,
      this._uTsY,
      this._uCurlVelocity
    )

    this.vorticityMaterial = makeVorticityMaterial(
      this._uTsX,
      this._uTsY,
      this._uVortVelocity,
      this._uVortCurl,
      this._uVortCurlStrength,
      this._uVortDt
    )

    this.pressureMaterial = makePressureMaterial(
      this._uTsX,
      this._uTsY,
      this._uPressurePressure,
      this._uPressureDivergence
    )

    this.gradientSubtractMaterial = makeGradientSubtractMaterial(
      this._uTsX,
      this._uTsY,
      this._uGradPressure,
      this._uGradVelocity
    )

    // Fullscreen triangle (same as original)
    this.screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.screenTriangle = getFullscreenTriangle()
    this.screen = new Mesh(this.screenTriangle)
    this.screen.frustumCulled = false
  }

  addSplat(x: number, y: number, dx: number, dy: number): void {
    this.splats.push({ x, y, dx, dy })
  }

  update(delta = 1 / 60): void {
    // Clamp delta to avoid simulation blow-ups on slow frames
    const dt = Math.min(delta, 1 / 30)
    const renderer = this.renderer
    const iterations = this.iterations
    const densityDissipation = this.densityDissipation
    const velocityDissipation = this.velocityDissipation
    const pressureDissipation = this.pressureDissipation
    const curlStrength = this.curlStrength
    const radius = this.radius

    // Renderer state
    const currentRenderTarget = renderer.getRenderTarget()
    const currentAutoClear = renderer.autoClear
    renderer.autoClear = false

    // Render all splats accumulated since the last frame
    for (let i = this.splats.length - 1; i >= 0; i--) {
      const splat = this.splats.splice(i, 1)[0]
      if (!splat) continue
      const { x, y, dx, dy } = splat

      this._uSplatTarget.value = this.velocity.read.texture
      this._uSplatPointX.value = x
      this._uSplatPointY.value = y
      ;(this._uSplatColor.value as Color).set(dx, dy, 1)
      this._uSplatRadius.value = radius / 100
      this.screen.material = this.splatMaterial
      renderer.setRenderTarget(this.velocity.write)
      renderer.render(this.screen, this.screenCamera)
      this.velocity.swap()

      this._uSplatTarget.value = this.density.read.texture
      this.screen.material = this.splatMaterial
      renderer.setRenderTarget(this.density.write)
      renderer.render(this.screen, this.screenCamera)
      this.density.swap()
    }

    // Curl
    this._uCurlVelocity.value = this.velocity.read.texture
    this.screen.material = this.curlMaterial
    renderer.setRenderTarget(this.curl)
    renderer.render(this.screen, this.screenCamera)

    // Vorticity
    this._uVortVelocity.value = this.velocity.read.texture
    this._uVortCurl.value = this.curl.texture
    this._uVortCurlStrength.value = curlStrength
    this._uVortDt.value = dt
    this.screen.material = this.vorticityMaterial
    renderer.setRenderTarget(this.velocity.write)
    renderer.render(this.screen, this.screenCamera)
    this.velocity.swap()

    // Divergence
    this._uDivVelocity.value = this.velocity.read.texture
    this.screen.material = this.divergenceMaterial
    renderer.setRenderTarget(this.divergence)
    renderer.render(this.screen, this.screenCamera)

    // Clear pressure
    this._uClearTexture.value = this.pressure.read.texture
    this._uClearValue.value = pressureDissipation
    this.screen.material = this.clearMaterial
    renderer.setRenderTarget(this.pressure.write)
    renderer.render(this.screen, this.screenCamera)
    this.pressure.swap()

    // Pressure Jacobi iterations
    this._uPressureDivergence.value = this.divergence.texture
    for (let i = 0; i < iterations; i++) {
      this._uPressurePressure.value = this.pressure.read.texture
      this.screen.material = this.pressureMaterial
      renderer.setRenderTarget(this.pressure.write)
      renderer.render(this.screen, this.screenCamera)
      this.pressure.swap()
    }

    // Gradient subtract
    this._uGradPressure.value = this.pressure.read.texture
    this._uGradVelocity.value = this.velocity.read.texture
    this.screen.material = this.gradientSubtractMaterial
    renderer.setRenderTarget(this.velocity.write)
    renderer.render(this.screen, this.screenCamera)
    this.velocity.swap()

    // Advect velocity
    this._uAdvDt.value = dt
    this._uAdvVelocity.value = this.velocity.read.texture
    this._uAdvSource.value = this.velocity.read.texture
    this._uAdvDissipation.value = velocityDissipation
    this.screen.material = this.advectionMaterial
    renderer.setRenderTarget(this.velocity.write)
    renderer.render(this.screen, this.screenCamera)
    this.velocity.swap()

    // Advect density (dye)
    this._uAdvVelocity.value = this.velocity.read.texture
    this._uAdvSource.value = this.density.read.texture
    this._uAdvDissipation.value = densityDissipation
    this.screen.material = this.advectionMaterial
    renderer.setRenderTarget(this.density.write)
    renderer.render(this.screen, this.screenCamera)
    this.density.swap()

    this.uniform.value = this.density.read.texture

    // Restore renderer settings
    renderer.autoClear = currentAutoClear
    renderer.setRenderTarget(currentRenderTarget)
  }

  destroy(): null {
    this.density.dispose()
    this.velocity.dispose()
    this.pressure.dispose()
    this.divergence.dispose()
    this.curl.dispose()

    this.clearMaterial.dispose()
    this.splatMaterial.dispose()
    this.advectionMaterial.dispose()
    this.divergenceMaterial.dispose()
    this.curlMaterial.dispose()
    this.vorticityMaterial.dispose()
    this.pressureMaterial.dispose()
    this.gradientSubtractMaterial.dispose()

    this.screenTriangle.dispose()

    // Clear all references
    Object.assign(this, {
      renderer: null,
      density: null,
      velocity: null,
      pressure: null,
      divergence: null,
      curl: null,
      clearMaterial: null,
      splatMaterial: null,
      advectionMaterial: null,
      divergenceMaterial: null,
      curlMaterial: null,
      vorticityMaterial: null,
      pressureMaterial: null,
      gradientSubtractMaterial: null,
      screenCamera: null,
      screenTriangle: null,
      screen: null,
      uniform: null,
    } as unknown as Partial<this>)

    return null
  }
}
