/**
 * LiquidMetalMaterial — TSL 2D screen-space metaball effect
 *
 * A fullscreen 2D metaball renderer — liquid red-metal blobs merging and
 * drifting like chemicals pooling in a darkroom developing tray.
 * Replaces the previous 3D raymarch (30-step loop, ~600 ALU/px) with a
 * cheap 2D inverse-square field (~12 ALU/px). Target: ≥55 FPS.
 *
 * Architecture mirrors AnimatedGradientMaterial exactly:
 *  - MeshBasicNodeMaterial subclass { transparent: true }
 *  - Uniforms exposed as typed getters/setters
 *  - colorNode built via TSL Fn()
 *
 * 2D field approach:
 *  - 4 animated blob centers (sin/cos orbits + mx_fractal_noise_float wobble)
 *  - Metaball field: Σ rᵢ² / max(|p-cᵢ|², eps)
 *  - Coverage: smoothstep around threshold ~1.0
 *  - Faux normal from 2 extra field evals (central difference on x and y)
 *  - Shading: Fresnel + Blinn-Phong + vertical env gradient → liquid red metal
 *
 * Public API (mirrors AnimatedGradientMaterial):
 *  time, amplitude, dpr (no-op), aspect (Vector2), resolution (Vector2 dummy)
 */

import { Vector2 } from 'three'
import {
  clamp,
  cos,
  dot,
  Fn,
  float,
  max,
  mix,
  mx_fractal_noise_float,
  normalize,
  pow,
  screenUV,
  sin,
  smoothstep,
  sqrt,
  uniform,
  vec3,
  vec4,
} from 'three/tsl'
import type { Node } from 'three/webgpu'
import { MeshBasicNodeMaterial } from 'three/webgpu'

// Convenience alias: a float-typed TSL node with full arithmetic method chaining
type FloatNode = Node<'float'>

// Vec3Node: derive the concrete type once via type-query so casts stay simple.
const _v3sample = vec3(0, 0, 0)
type Vec3Node = typeof _v3sample

export class LiquidMetalMaterial extends MeshBasicNodeMaterial {
  private readonly _uTime = uniform(0)
  private readonly _uAspect = uniform(new Vector2(1, 1))
  private readonly _uAmplitude = uniform(1.0)

  // Exposed for webgl.tsx: aspect.set(x,y) and resolution.set(x,y)
  readonly aspect: Vector2
  readonly resolution: Vector2 = new Vector2(0, 0)

  constructor({ amplitude = 1.0 }: { amplitude?: number } = {}) {
    super({ transparent: true })
    this._uAmplitude.value = amplitude
    this.aspect = this._uAspect.value as Vector2
    this._buildNodes()
  }

  private _buildNodes(): void {
    const uTime = this._uTime
    const uAspect = this._uAspect
    const uAmplitude = this._uAmplitude

    // ------------------------------------------------------------------
    // Noise wobble seeds — 4 blobs, each with a unique noise sample.
    // Low-frequency fractal noise (2 octaves) for organic drift.
    // ------------------------------------------------------------------
    const n0 = mx_fractal_noise_float(
      vec3(uTime.mul(0.17), float(0.0), float(12.3)),
      2,
      2.0,
      0.5,
      1.0
    )
    const n1 = mx_fractal_noise_float(
      vec3(uTime.mul(0.21), float(5.1), float(0.0)),
      2,
      2.0,
      0.5,
      1.0
    )
    const n2 = mx_fractal_noise_float(
      vec3(float(3.7), uTime.mul(0.29), float(0.0)),
      2,
      2.0,
      0.5,
      1.0
    )
    const n3 = mx_fractal_noise_float(
      vec3(float(7.2), float(1.3), uTime.mul(0.19)),
      2,
      2.0,
      0.5,
      1.0
    )

    // ------------------------------------------------------------------
    // 4 blob centers (x, y) — sin/cos orbits at distinct freqs + noise
    // wobble, all scaled by uAmplitude. Spread to fill the viewport and
    // overlap convincingly.
    // ------------------------------------------------------------------
    const c0x = sin(uTime.mul(0.41))
      .mul(0.38)
      .add(n0.mul(0.12))
      .mul(uAmplitude) as unknown as FloatNode
    const c0y = cos(uTime.mul(0.29))
      .mul(0.22)
      .add(n0.mul(0.08))
      .mul(uAmplitude) as unknown as FloatNode

    const c1x = cos(uTime.mul(0.37))
      .mul(0.32)
      .add(n1.mul(0.1))
      .mul(uAmplitude) as unknown as FloatNode
    const c1y = sin(uTime.mul(0.51))
      .mul(0.3)
      .add(n1.mul(0.09))
      .mul(uAmplitude) as unknown as FloatNode

    const c2x = sin(uTime.mul(0.61).add(1.4))
      .mul(0.44)
      .add(n2.mul(0.13))
      .mul(uAmplitude) as unknown as FloatNode
    const c2y = cos(uTime.mul(0.43).add(2.1))
      .mul(0.18)
      .add(n2.mul(0.07))
      .mul(uAmplitude) as unknown as FloatNode

    const c3x = cos(uTime.mul(0.53).add(3.9))
      .mul(0.28)
      .add(n3.mul(0.11))
      .mul(uAmplitude) as unknown as FloatNode
    const c3y = sin(uTime.mul(0.67).add(0.7))
      .mul(0.36)
      .add(n3.mul(0.1))
      .mul(uAmplitude) as unknown as FloatNode

    // Blob radii (squared, since the field uses r² already) — gentle breathing
    const r0sq = sin(uTime.mul(0.33))
      .mul(0.04)
      .add(0.3)
      .pow(2) as unknown as FloatNode
    const r1sq = sin(uTime.mul(0.41).add(1.1))
      .mul(0.03)
      .add(0.26)
      .pow(2) as unknown as FloatNode
    const r2sq = sin(uTime.mul(0.57).add(2.3))
      .mul(0.03)
      .add(0.22)
      .pow(2) as unknown as FloatNode
    const r3sq = sin(uTime.mul(0.47).add(4.1))
      .mul(0.025)
      .add(0.2)
      .pow(2) as unknown as FloatNode

    // eps to avoid division by zero in the metaball kernel
    const EPS_FIELD = float(0.0001)

    // ------------------------------------------------------------------
    // metaball2D — plain JS helper (NOT Fn-wrapped to avoid TS2590).
    // Returns Σ rᵢ² / max(|p-cᵢ|², eps) — high inside/near blobs.
    // px, py are already aspect-correct centered coords.
    // ------------------------------------------------------------------
    const metaball2D = (px: FloatNode, py: FloatNode): FloatNode => {
      const dx0 = px.sub(c0x) as unknown as FloatNode
      const dy0 = py.sub(c0y) as unknown as FloatNode
      const dist0sq = max(
        dx0.mul(dx0).add(dy0.mul(dy0)),
        EPS_FIELD
      ) as unknown as FloatNode
      const f0 = r0sq.div(dist0sq) as unknown as FloatNode

      const dx1 = px.sub(c1x) as unknown as FloatNode
      const dy1 = py.sub(c1y) as unknown as FloatNode
      const dist1sq = max(
        dx1.mul(dx1).add(dy1.mul(dy1)),
        EPS_FIELD
      ) as unknown as FloatNode
      const f1 = r1sq.div(dist1sq) as unknown as FloatNode

      const dx2 = px.sub(c2x) as unknown as FloatNode
      const dy2 = py.sub(c2y) as unknown as FloatNode
      const dist2sq = max(
        dx2.mul(dx2).add(dy2.mul(dy2)),
        EPS_FIELD
      ) as unknown as FloatNode
      const f2 = r2sq.div(dist2sq) as unknown as FloatNode

      const dx3 = px.sub(c3x) as unknown as FloatNode
      const dy3 = py.sub(c3y) as unknown as FloatNode
      const dist3sq = max(
        dx3.mul(dx3).add(dy3.mul(dy3)),
        EPS_FIELD
      ) as unknown as FloatNode
      const f3 = r3sq.div(dist3sq) as unknown as FloatNode

      return f0.add(f1).add(f2).add(f3) as unknown as FloatNode
    }

    // ------------------------------------------------------------------
    // shade2D — given the metaball field and faux normal, returns
    // litColor + alpha. Plain JS helper keeps the main Fn body small.
    // ------------------------------------------------------------------
    const shade2D = (
      fieldCenter: FloatNode,
      px: FloatNode,
      py: FloatNode
    ): { litColor: Vec3Node; alpha: FloatNode } => {
      // Metaball coverage threshold — tune so blobs are distinct merging shapes
      const THRESH = float(1.0)
      const EDGE = float(0.06)

      const coverage = smoothstep(
        THRESH.sub(EDGE),
        THRESH.add(EDGE),
        fieldCenter
      ) as unknown as FloatNode

      // Faux normal from central-difference gradient (2 extra field evals)
      const H = 0.02
      const fieldPx = metaball2D(px.add(H) as unknown as FloatNode, py)
      const fieldMx = metaball2D(px.sub(H) as unknown as FloatNode, py)
      const fieldPy = metaball2D(px, py.add(H) as unknown as FloatNode)
      const fieldMy = metaball2D(px, py.sub(H) as unknown as FloatNode)

      const gx = fieldPx.sub(fieldMx).mul(-1.0) as unknown as FloatNode
      const gy = fieldPy.sub(fieldMy).mul(-1.0) as unknown as FloatNode

      // Bend the normal tangentially (0.35 keeps it subtle / metallic)
      const BEND = float(0.35)
      const nxRaw = gx.mul(BEND) as unknown as FloatNode
      const nyRaw = gy.mul(BEND) as unknown as FloatNode

      // nz from unit-sphere constraint: sqrt(max(1 - nx²-ny², 0))
      const nzSq = float(1.0)
        .sub(nxRaw.mul(nxRaw))
        .sub(nyRaw.mul(nyRaw)) as unknown as FloatNode
      const nz = sqrt(max(nzSq, float(0.0))) as unknown as FloatNode

      const normal = normalize(vec3(nxRaw, nyRaw, nz)) as unknown as Vec3Node

      // Orthographic view direction always (0,0,1)
      const viewDir = vec3(
        float(0.0),
        float(0.0),
        float(1.0)
      ) as unknown as Vec3Node

      // Fresnel rim: pow(1 - NdotV, 3)
      const NdotV = clamp(
        dot(normal, viewDir),
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode
      const fresnel = pow(
        float(1.0).sub(NdotV),
        float(3.0)
      ) as unknown as FloatNode

      // Base albedo: deep red core → brighter Kodak red rim. The core stays
      // clearly red (not near-black) so blobs read as glowing red metal
      // against the black page rather than vanishing into it.
      const darkCore = vec3(
        float(0.55),
        float(0.02),
        float(0.06)
      ) as unknown as Vec3Node
      const kodakRed = vec3(
        float(0.89),
        float(0.024),
        float(0.075)
      ) as unknown as Vec3Node
      const metalBase = mix(
        darkCore,
        kodakRed,
        fresnel.mul(0.85).add(NdotV.mul(0.15))
      ) as unknown as Vec3Node

      // Specular: Blinn-Phong, light from top-right, warm white / gold
      const lightDir = normalize(
        vec3(float(0.6), float(0.8), float(0.8))
      ) as unknown as Vec3Node
      const halfVec = normalize(lightDir.add(viewDir)) as unknown as Vec3Node
      const NdotH = clamp(
        dot(normal, halfVec),
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode
      const specular = pow(NdotH, float(100.0)).mul(1.8) as unknown as FloatNode
      const specColor = vec3(
        float(1.0),
        float(0.85),
        float(0.7)
      ) as unknown as Vec3Node

      // Procedural env: vertical gradient dark → red → hot-white by normal.y
      const reflY = clamp(
        normal.y.mul(0.5).add(0.5),
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode
      const envDark = vec3(
        float(0.02),
        float(0.005),
        float(0.01)
      ) as unknown as Vec3Node
      const envRed = vec3(
        float(0.89),
        float(0.024),
        float(0.075)
      ) as unknown as Vec3Node
      const envHot = vec3(
        float(1.0),
        float(0.7),
        float(0.6)
      ) as unknown as Vec3Node
      const envLow = mix(
        envDark,
        envRed,
        smoothstep(float(0.0), float(0.5), reflY)
      ) as unknown as Vec3Node
      const envColor = mix(
        envLow,
        envHot,
        smoothstep(float(0.5), float(1.0), reflY)
      ) as unknown as Vec3Node

      // Combine: base + env reflection + specular highlight
      const litColor = metalBase
        .add(envColor.mul(fresnel.mul(0.6).add(0.1)))
        .add(specColor.mul(specular)) as unknown as Vec3Node

      // Alpha: coverage + slight fresnel rim boost, clamped 0..1
      const alpha = clamp(
        coverage.add(fresnel.mul(coverage).mul(0.25)),
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode

      return { litColor, alpha }
    }

    // ------------------------------------------------------------------
    // Main shading node — kept small so TS can infer it without TS2590
    // ------------------------------------------------------------------
    const liquidMetalNode = Fn(() => {
      // Aspect-correct centered 2D coords
      const sUV = screenUV.toVar()
      const px = sUV.x.sub(0.5).mul(uAspect.x).toVar()
      const py = sUV.y.sub(0.5).mul(uAspect.y).toVar()

      // Evaluate the metaball field at the center pixel
      const fieldVal = metaball2D(
        px as unknown as FloatNode,
        py as unknown as FloatNode
      )

      // Shade (computes faux normal, fresnel, specular, env, alpha)
      const { litColor, alpha } = shade2D(
        fieldVal,
        px as unknown as FloatNode,
        py as unknown as FloatNode
      )

      return vec4(litColor, alpha)
    })()

    this.colorNode = liquidMetalNode
  }

  // ---------------------------------------------------------------------------
  // Public API — mirrors AnimatedGradientMaterial surface
  // ---------------------------------------------------------------------------

  get time(): number {
    return this._uTime.value as number
  }
  set time(v: number) {
    this._uTime.value = v
  }

  get amplitude(): number {
    return this._uAmplitude.value as number
  }
  set amplitude(v: number) {
    this._uAmplitude.value = v
  }

  // TSL's screenUV is DPR-aware — no-op for API compatibility
  get dpr(): number {
    return 1
  }
  set dpr(_v: number) {
    /* no-op */
  }
}
