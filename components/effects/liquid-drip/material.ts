/**
 * LiquidDripMaterial — TSL raymarched darkroom-developer curtain
 *
 * A full-width sheet of clear developer chemical clings to the top edge of the
 * hero and bleeds downward in thin rivulets — like fixer running off a print
 * hung to dry. Raymarched (orthographic) so the sheet + rivulets carry real 3D
 * normals, shaded as a translucent/glassy fluid (near-transparent body read via
 * a bright wet meniscus + sharp glints, faint safelight-red tint). NOT chrome.
 *
 * Motion / interactivity:
 *  - Rivulets grow down out of the curtain; a bead swells at the tip, pinches
 *    off and falls away off-screen while the thread drains back up, then loops.
 *  - `spawnDrop(uvx)` releases a fresh drop at a clicked column (8 slots, so
 *    rapid clicks never cancel a still-falling drop).
 *
 * Pinned to the viewport (static fullscreen quad — see webgl.tsx).
 *
 * Pipeline: MeshBasicNodeMaterial { transparent } on the WebGPURenderer.
 * Linear color space + NoToneMapping → LINEAR color constants.
 *
 * TS2590 discipline: heavy logic in plain-JS helpers (NOT Fn-wrapped) with
 * explicit FloatNode/Vec3Node signatures + `as unknown as` casts at chain
 * breaks. The Fn() body holds only the march loop + final color assembly.
 */

import { Vector2 } from 'three'
import {
  Break,
  clamp,
  dot,
  Fn,
  float,
  fract,
  If,
  Loop,
  length,
  min,
  mix,
  normalize,
  pow,
  screenUV,
  sin,
  smoothstep,
  uniform,
  vec3,
  vec4,
} from 'three/tsl'
import type { Node } from 'three/webgpu'
import { MeshBasicNodeMaterial } from 'three/webgpu'

type FloatNode = Node<'float'>
const _v3sample = vec3(0, 0, 0)
type Vec3Node = typeof _v3sample
const _v2u = uniform(new Vector2())
type Vec2Uniform = typeof _v2u

// World half-height the view maps to (worldY ∈ [-SCALE/2, +SCALE/2]).
const VIEW_SCALE = 2.0
const SHEET_Y = 1.04
// Continuous curtain band: ONE wide horizontal cylinder (along x), not discrete
// lobes — so the chemical reads as a single connected sheet, never as blobs.
const CURTAIN_R = 0.4
const CURTAIN_LEN = 6.0
// Concurrent click-drop slots: enough that rapid clicking never recycles a
// still-falling user drop (round-robin only reuses after this many).
const CLICK_SLOTS = 8

export class LiquidDripMaterial extends MeshBasicNodeMaterial {
  private readonly _uTime = uniform(0)
  private readonly _uAmplitude = uniform(1.0)
  private readonly _uResolution = uniform(new Vector2(1, 1))

  private readonly _uClicks: Vec2Uniform[] = Array.from(
    { length: CLICK_SLOTS },
    () => uniform(new Vector2(0, -1000))
  )
  private _clickIndex = 0

  readonly resolution = this._uResolution.value as Vector2

  constructor() {
    super({ transparent: true })
    this._buildNodes()
  }

  private _buildNodes(): void {
    const uTime = this._uTime
    const uAmp = this._uAmplitude
    const uRes = this._uResolution
    const clicks = this._uClicks

    const sdSphere = (p: Vec3Node, c: Vec3Node, r: FloatNode): FloatNode =>
      length(p.sub(c)).sub(r) as unknown as FloatNode

    const sdRivuletCore = (
      p: Vec3Node,
      x: FloatNode,
      yTop: FloatNode,
      yBot: FloatNode,
      r: FloatNode
    ): FloatNode => {
      const cy = clamp(p.y, yBot, yTop) as unknown as FloatNode
      const near = vec3(x, cy, float(0.0)) as unknown as Vec3Node
      return length(p.sub(near)).sub(r) as unknown as FloatNode
    }

    const smin = (a: FloatNode, b: FloatNode, k: number): FloatNode => {
      if (k === 0) return a
      const h = clamp(
        float(0.5).add(b.sub(a).mul(0.5 / k)),
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode
      return mix(b, a, h).sub(
        float(k).mul(h).mul(float(1.0).sub(h))
      ) as unknown as FloatNode
    }

    const addRivulet = (
      p: Vec3Node,
      field: FloatNode,
      cx: number,
      rate: number,
      offset: number,
      baseLen: number,
      baseR: number
    ): FloatNode => {
      const phase = fract(uTime.mul(rate).add(offset)) as unknown as FloatNode
      const x = float(cx).add(
        sin(uTime.mul(0.18).add(offset)).mul(0.02)
      ) as unknown as FloatNode
      const yTop = float(SHEET_Y - 0.36)

      // Head descends out of the curtain, accelerating, and exits the bottom of
      // the view — it never shrinks away in place.
      const descend = phase
        .mul(phase)
        .mul(2.4)
        .mul(uAmp) as unknown as FloatNode
      const headY = yTop.sub(descend) as unknown as FloatNode

      // The thread FOLLOWS the head (up to `baseLen` reach) so the drip stays
      // welded to the curtain — reading as developer running off the print, not
      // a free-floating drop — until the head finally pulls away near the bottom.
      const reach = min(
        descend,
        float(baseLen).mul(uAmp)
      ) as unknown as FloatNode
      const yBot = yTop.sub(reach) as unknown as FloatNode

      const appear = smoothstep(
        float(0.0),
        float(0.08),
        phase
      ) as unknown as FloatNode
      // ease out only once the head is already off-screen → no visible pop
      const exit = float(1.0).sub(
        smoothstep(float(0.85), float(1.0), phase)
      ) as unknown as FloatNode

      // thin tendril, thinning further the longer it has stretched
      const taper = float(1.0).sub(
        smoothstep(float(0.0), float(1.4), reach).mul(0.5)
      ) as unknown as FloatNode
      const threadR = float(baseR)
        .mul(0.6)
        .mul(appear)
        .mul(exit)
        .mul(taper) as unknown as FloatNode
      let d = smin(field, sdRivuletCore(p, x, yTop, yBot, threadR), 0.09)

      // Heavy teardrop head: swells in, holds its volume, and rides the head
      // position off the bottom of the view.
      const headR = float(baseR)
        .mul(1.45)
        .mul(smoothstep(float(0.04), float(0.24), phase))
        .mul(exit) as unknown as FloatNode
      const headC = vec3(x, headY, float(0.0)) as unknown as Vec3Node
      d = smin(d, sdSphere(p, headC, headR), 0.07)
      return d
    }

    const addClickDrop = (
      p: Vec3Node,
      field: FloatNode,
      slot: Vec2Uniform
    ): FloatNode => {
      const elapsed = uTime.sub(slot.y) as unknown as FloatNode
      const fallDist = elapsed
        .mul(0.3)
        .add(elapsed.mul(elapsed).mul(0.7)) as unknown as FloatNode
      const fallY = float(SHEET_Y - 0.05).sub(fallDist) as unknown as FloatNode
      // Swell in, then keep volume while falling off the bottom — like the
      // ambient rivulets, the drop leaves the view instead of vanishing in
      // place, so spamming clicks never cancels a still-falling drop.
      const grow = smoothstep(
        float(0.0),
        float(0.12),
        elapsed
      ) as unknown as FloatNode
      const r = float(0.085).mul(grow) as unknown as FloatNode
      const c = vec3(slot.x, fallY, float(0.0)) as unknown as Vec3Node
      return smin(field, sdSphere(p, c, r), 0.07)
    }

    // Continuous full-width curtain: a horizontal cylinder (capsule along x) at
    // the top, whose center undulates in y with x+time so the visible bottom
    // edge waves like chemical bleeding off a hung print. Because the capsule is
    // one unbroken primitive spanning well past the screen edges, it reads as a
    // single connected sheet — NOT a row of blobs.
    const sdCurtainBand = (p: Vec3Node): FloatNode => {
      const wave = sin(p.x.mul(1.1).add(uTime.mul(0.5)))
        .mul(0.06)
        .add(sin(p.x.mul(2.3).sub(uTime.mul(0.33))).mul(0.035))
        .add(
          sin(p.x.mul(4.6).add(uTime.mul(0.21))).mul(0.018)
        ) as unknown as FloatNode
      const cx = clamp(
        p.x,
        float(-CURTAIN_LEN),
        float(CURTAIN_LEN)
      ) as unknown as FloatNode
      const dxv = p.x.sub(cx) as unknown as FloatNode
      const dy = p.y.add(wave).sub(SHEET_Y) as unknown as FloatNode
      return length(vec3(dxv, dy, p.z)).sub(CURTAIN_R) as unknown as FloatNode
    }

    // Scene SDF: the curtain band, the ambient rivulets, and the click drops.
    const map = (p: Vec3Node): FloatNode => {
      let d = sdCurtainBand(p)

      d = addRivulet(p, d, -1.7, 0.2, 0.0, 1.15, 0.034)
      d = addRivulet(p, d, -0.85, 0.26, 1.6, 1.35, 0.03)
      d = addRivulet(p, d, -0.1, 0.22, 3.0, 1.0, 0.042)
      d = addRivulet(p, d, 0.8, 0.3, 0.8, 1.25, 0.031)
      d = addRivulet(p, d, 1.6, 0.24, 2.3, 1.4, 0.036)

      for (const c of clicks) {
        d = addClickDrop(p, d, c as Vec2Uniform)
      }
      return d
    }

    const calcNormal = (p: Vec3Node): Vec3Node => {
      const k = 0.0015
      const e1 = vec3(1.0, -1.0, -1.0) as unknown as Vec3Node
      const e2 = vec3(-1.0, -1.0, 1.0) as unknown as Vec3Node
      const e3 = vec3(-1.0, 1.0, -1.0) as unknown as Vec3Node
      const e4 = vec3(1.0, 1.0, 1.0) as unknown as Vec3Node
      const n = e1
        .mul(map(p.add(e1.mul(k)) as unknown as Vec3Node))
        .add(e2.mul(map(p.add(e2.mul(k)) as unknown as Vec3Node)))
        .add(e3.mul(map(p.add(e3.mul(k)) as unknown as Vec3Node)))
        .add(e4.mul(map(p.add(e4.mul(k)) as unknown as Vec3Node)))
      return normalize(n) as unknown as Vec3Node
    }

    const shadeGel = (
      n: Vec3Node,
      viewDir: Vec3Node
    ): { color: Vec3Node; alpha: FloatNode } => {
      const NdotV = clamp(
        dot(n, viewDir),
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode

      const fres = pow(
        float(1.0).sub(NdotV),
        float(2.2)
      ) as unknown as FloatNode

      const l1 = normalize(vec3(0.4, 0.85, 0.5)) as unknown as Vec3Node
      const l2 = normalize(vec3(-0.35, 0.55, 0.75)) as unknown as Vec3Node
      const h1 = normalize(l1.add(viewDir)) as unknown as Vec3Node
      const h2 = normalize(l2.add(viewDir)) as unknown as Vec3Node
      const s1 = pow(
        clamp(dot(n, h1), float(0.0), float(1.0)),
        float(150.0)
      ).mul(1.7) as unknown as FloatNode
      const s2 = pow(
        clamp(dot(n, h2), float(0.0), float(1.0)),
        float(90.0)
      ).mul(0.7) as unknown as FloatNode
      const glintAmt = s1.add(s2) as unknown as FloatNode
      const glint = vec3(1.0, 0.92, 0.88).mul(glintAmt) as unknown as Vec3Node

      const body = vec3(0.05, 0.005, 0.008) as unknown as Vec3Node
      const rim = vec3(0.85, 0.16, 0.14).mul(
        fres.mul(0.75)
      ) as unknown as Vec3Node
      const color = body.add(rim).add(glint) as unknown as Vec3Node

      const alpha = clamp(
        float(0.16).add(fres.mul(0.55)).add(glintAmt.mul(0.6)),
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode

      return { color, alpha }
    }

    const liquidGelNode = Fn(() => {
      const aspect = uRes.x.div(uRes.y) as unknown as FloatNode
      const wx = screenUV.x
        .sub(0.5)
        .mul(aspect)
        .mul(VIEW_SCALE) as unknown as FloatNode
      const wy = float(0.5)
        .sub(screenUV.y)
        .mul(VIEW_SCALE) as unknown as FloatNode

      const ro = vec3(wx, wy, 2.0).toVar()
      const rd = vec3(0.0, 0.0, -1.0).toVar()

      const t = float(0.0).toVar()
      const hit = float(0.0).toVar()
      const pHit = vec3(0.0, 0.0, 0.0).toVar()

      Loop(48, () => {
        const p = ro.add(rd.mul(t)).toVar()
        const d = map(p as unknown as Vec3Node)
        If(d.lessThan(0.001), () => {
          hit.assign(1.0)
          pHit.assign(p)
          Break()
        })
        t.addAssign(d.mul(0.9))
        // All geometry sits within z ∈ [−CURTAIN_R, +CURTAIN_R] around z = 0, so
        // a ray from z = 2 confirms a miss by ~t = 2.4; 2.8 leaves margin while
        // sparing the empty lower screen the full march depth.
        If(t.greaterThan(2.8), () => {
          Break()
        })
      })

      const normal = calcNormal(pHit as unknown as Vec3Node)
      const viewDir = vec3(0.0, 0.0, 1.0) as unknown as Vec3Node
      const shaded = shadeGel(normal, viewDir)

      return vec4(shaded.color, hit.mul(shaded.alpha))
    })()

    this.colorNode = liquidGelNode
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Release a fresh drop at a clicked column (uvx in 0..1 across the screen). */
  spawnDrop(uvx: number): void {
    const res = this._uResolution.value as Vector2
    const aspect = res.y > 0 ? res.x / res.y : 1
    const cx = (uvx - 0.5) * aspect * VIEW_SCALE
    const slot = this._uClicks[this._clickIndex]
    if (slot) {
      ;(slot.value as Vector2).set(cx, this._uTime.value as number)
      this._clickIndex = (this._clickIndex + 1) % this._uClicks.length
    }
  }

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
}
