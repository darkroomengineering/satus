/* eslint-disable */

// https://github.com/oframe/ogl/blob/master/examples/post-fluid-distortion.html

import {
  FloatType,
  HalfFloatType,
  LinearFilter,
  NearestFilter,
  RedFormat,
  RGBAFormat,
  RGFormat,
} from 'three/src/constants'
import { ShaderMaterial } from 'three/src/materials/ShaderMaterial'
import { Vector2 } from 'three/src/math/Vector2'
import { Vector3 } from 'three/src/math/Vector3'
import { WebGLRenderTarget } from 'three/src/renderers/WebGLRenderTarget'

import Program from './program'

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform sampler2D tFluid;
uniform float uTime;
varying vec2 vUv;
void main() {
    vec3 fluid = texture2D(tFluid, vUv).rgb;
    vec2 uv = vUv - fluid.rg * 0.0002;
    gl_FragColor = mix( texture2D(tMap, uv), vec4(fluid * 0.1 + 0.5, 1), step(0.5, vUv.x) ) ;
}
`

const baseVertex = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;
void main () {
    vUv = uv;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`

const clearShader = /* glsl */ `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
uniform sampler2D uTexture;
uniform float value;
void main () {
    gl_FragColor = value * texture2D(uTexture, vUv);
}
`

const splatShader = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
}
`

const advectionManualFilteringShader = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform vec2 dyeTexelSize;
uniform float dt;
uniform float dissipation;
vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}
void main () {
    vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
    gl_FragColor = dissipation * bilerp(uSource, coord, dyeTexelSize);
    gl_FragColor.a = 1.0;
}
`

const advectionShader = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main () {
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    gl_FragColor = dissipation * texture2D(uSource, coord);
    gl_FragColor.a = 1.0;
}
`

const divergenceShader = /* glsl */ `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`

const curlShader = /* glsl */ `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`

const vorticityShader = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
}
`

const pressureShader = /* glsl */ `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float C = texture2D(uPressure, vUv).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`

const gradientSubtractShader = /* glsl */ `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`

function createDoubleFBO(
  width,
  height,
  {
    wrapS,
    wrapT,
    minFilter = LinearFilter,
    magFilter = minFilter,
    format = RGBAFormat,
    internalFormat,
    type,
    depthBuffer,
    stencilBuffer,
  } = {},
) {
  const fbo = {
    read: new WebGLRenderTarget(width, height, {
      wrapS,
      wrapT,
      minFilter,
      magFilter,
      format,
      type,
      depthBuffer,
      stencilBuffer,
    }),
    write: new WebGLRenderTarget(width, height, {
      wrapS,
      wrapT,
      minFilter,
      magFilter,
      format,
      type,
      depthBuffer,
      stencilBuffer,
    }),
    swap: () => {
      const temp = fbo.read
      fbo.read = fbo.write
      fbo.write = temp
    },
  }
  if (internalFormat) {
    fbo.read.texture.internalFormat = fbo.write.texture.internalFormat =
      internalFormat
  }

  return fbo
}

function getTHREEFormat(format) {
  switch (format) {
    case 34842:
      return 'RGBA16F'
    case 33327:
      return 'RG16F'
    case 33325:
      return 'R16F'
    case 6408:
      return RGBAFormat
    case 33319:
      return RGFormat
    case 6403:
      return RedFormat
    default:
      break
  }
}

function supportRenderTextureFormat(gl, internalFormat, format, type) {
  let texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    internalFormat,
    gl.RGBA,
    gl.RGBA,
    0,
    format,
    type,
    null,
  )

  let fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  )

  let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  return status == gl.FRAMEBUFFER_COMPLETE
}

// Helper functions for more device support
function getSupportedFormat(gl, internalFormat, format, type) {
  if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
    switch (internalFormat) {
      case gl.R16F:
        return getSupportedFormat(gl, gl.RG16F, gl.RG, type)
      case gl.RG16F:
        return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type)
      default:
        return null
    }
  }

  return {
    internalFormat: getTHREEFormat(internalFormat),
    format: getTHREEFormat(format),
  }
}

export default class FluidSimulation {
  constructor({ renderer, size = 128 } = {}) {
    this.renderer = renderer
    // Resolution of simulation
    this.simRes = size
    this.dyeRes = size

    // Main inputs to control look and feel of fluid
    this.iterations = 3
    this.densityDissipation = 0.97
    this.velocityDissipation = 0.98
    this.pressureDissipation = 0.8
    this.curlStrength = 20
    this.radius = 0.2

    // Common uniform
    this.texelSize = {
      value: new Vector2(1 / this.simRes, 1 / this.simRes),
    }

    const gl = this.renderer.getContext()

    const isWebGL2 = this.renderer.capabilities.isWebGL2

    let halfFloat
    let supportLinearFiltering
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float')
      supportLinearFiltering = gl.getExtension('OES_texture_float_linear')
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float')
      supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear')
    }
    const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES

    let rgba
    let rg
    let r

    if (isWebGL2) {
      rgba = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType)
      rg = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType)
      r = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType)
    } else {
      rgba = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
      rg = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
      r = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
    }

    const filtering = supportLinearFiltering ? LinearFilter : NearestFilter

    halfFloat = isWebGL2 ? FloatType : HalfFloatType

    // Create fluid simulation FBOs
    this.density = createDoubleFBO(this.dyeRes, this.dyeRes, {
      type: halfFloat,
      minFilter: filtering,
      format: rgba.format,
      internalFormat: rgba.internalFormat,
      depthBuffer: false,
      stencilBuffer: false,
    })

    this.velocity = createDoubleFBO(this.simRes, this.simRes, {
      type: halfFloat,
      minFilter: filtering,
      format: rg.format,
      internalFormat: rg.internalFormat,
      depthBuffer: false,
      stencilBuffer: false,
    })

    this.pressure = createDoubleFBO(this.simRes, this.simRes, {
      type: halfFloat,
      minFilter: NearestFilter,
      format: r.format,
      internalFormat: r.internalFormat,
      depthBuffer: false,
      stencilBuffer: false,
    })

    this.divergence = new WebGLRenderTarget(this.simRes, this.simRes, {
      type: halfFloat,
      minFilter: NearestFilter,
      format: r.format,
      depthBuffer: false,
      stencilBuffer: false,
    })
    this.divergence.texture.internalFormat = r.internalFormat

    this.curl = new WebGLRenderTarget(this.simRes, this.simRes, {
      type: halfFloat,
      minFilter: NearestFilter,
      format: r.format,
      depthBuffer: false,
      stencilBuffer: false,
    })
    this.curl.texture.internalFormat = r.internalFormat

    //programs
    this.clearProgram = new Program(
      new ShaderMaterial({
        vertexShader: baseVertex,
        fragmentShader: clearShader,
        uniforms: {
          texelSize: this.texelSize,
          uTexture: { value: null },
          value: { value: this.pressureDissipation },
        },
        depthTest: false,
        depthWrite: false,
      }),
    )

    this.splatProgram = new Program(
      new ShaderMaterial({
        vertexShader: baseVertex,
        fragmentShader: splatShader,
        uniforms: {
          texelSize: this.texelSize,
          uTarget: { value: null },
          aspectRatio: { value: 1 },
          color: { value: new Vector3() },
          point: { value: new Vector2() },
          radius: { value: 1 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    )

    this.advectionProgram = new Program(
      new ShaderMaterial({
        vertexShader: baseVertex,
        fragmentShader: supportLinearFiltering
          ? advectionShader
          : advectionManualFilteringShader,
        uniforms: {
          texelSize: this.texelSize,
          dyeTexelSize: {
            value: new Vector2(1 / this.dyeRes, 1 / this.dyeRes),
          },
          uVelocity: { value: null },
          uSource: { value: null },
          dt: { value: 0.016 },
          dissipation: { value: 1.0 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    )

    this.divergenceProgram = new Program(
      new ShaderMaterial({
        vertexShader: baseVertex,
        fragmentShader: divergenceShader,
        uniforms: {
          texelSize: this.texelSize,
          uVelocity: { value: null },
        },
        depthTest: false,
        depthWrite: false,
      }),
    )

    this.curlProgram = new Program(
      new ShaderMaterial({
        vertexShader: baseVertex,
        fragmentShader: curlShader,
        uniforms: {
          texelSize: this.texelSize,
          uVelocity: { value: null },
        },
        depthTest: false,
        depthWrite: false,
      }),
    )

    this.vorticityProgram = new Program(
      new ShaderMaterial({
        vertexShader: baseVertex,
        fragmentShader: vorticityShader,
        uniforms: {
          texelSize: this.texelSize,
          uVelocity: { value: null },
          uCurl: { value: null },
          curl: { value: this.curlStrength },
          dt: { value: 0.016 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    )

    this.pressureProgram = new Program(
      new ShaderMaterial({
        vertexShader: baseVertex,
        fragmentShader: pressureShader,
        uniforms: {
          texelSize: this.texelSize,
          uPressure: { value: null },
          uDivergence: { value: null },
        },
        depthTest: false,
        depthWrite: false,
      }),
    )

    this.gradienSubtractProgram = new Program(
      new ShaderMaterial({
        vertexShader: baseVertex,
        fragmentShader: gradientSubtractShader,
        uniforms: {
          texelSize: this.texelSize,
          uPressure: { value: null },
          uVelocity: { value: null },
        },
        depthTest: false,
        depthWrite: false,
      }),
    )

    this.splats = []

    this.lastMouse = new Vector2()

    window.addEventListener('touchstart', this.onMouseDown.bind(this), false)
    window.addEventListener('mousedown', this.onMouseDown.bind(this), false)

    window.addEventListener('touchstart', this.updateMouse.bind(this), false)
    window.addEventListener('touchmove', this.updateMouse.bind(this), false)
    window.addEventListener('mousemove', this.updateMouse.bind(this), false)

    window.addEventListener('touchend', this.onMouseUp.bind(this), false)
    window.addEventListener('mouseup', this.onMouseUp.bind(this), false)
  }

  onMouseDown() {
    this.mouseDown = true
  }

  onMouseUp() {
    this.mouseDown = false
  }

  updateMouse(e) {
    if (e.changedTouches && e.changedTouches.length) {
      e.x = e.changedTouches[0].pageX
      e.y = e.changedTouches[0].pageY
    }
    if (e.x === undefined) {
      e.x = e.pageX
      e.y = e.pageY
    }

    if (!this.lastMouse.isInit) {
      this.lastMouse.isInit = true

      // First input
      this.lastMouse.set(e.x, e.y)
    }

    const deltaX = e.x - this.lastMouse.x
    const deltaY = e.y - this.lastMouse.y

    this.lastMouse.set(e.x, e.y)

    const viewportSize = this.renderer.getSize(new Vector2())

    // Add if the mouse is moving
    if (Math.abs(deltaX) || Math.abs(deltaY)) {
      this.splats.push({
        // Get mouse value in 0 to 1 range, with y flipped
        x: e.x / viewportSize.width,
        y: 1.0 - e.y / viewportSize.height,
        dx: deltaX * 5.0,
        dy: deltaY * -5.0,
      })
    }
  }

  splat({ x, y, dx, dy }) {
    const viewportSize = this.renderer.getSize(new Vector2())

    this.splatProgram.program.uniforms.uTarget.value =
      this.velocity.read.texture
    this.splatProgram.program.uniforms.aspectRatio.value =
      viewportSize.width / viewportSize.height
    this.splatProgram.program.uniforms.point.value.set(x, y)
    this.splatProgram.program.uniforms.color.value.set(dx, dy, 1.0)
    this.splatProgram.program.uniforms.radius.value = this.radius / 100.0

    this.renderer.setRenderTarget(this.velocity.write)
    this.splatProgram.render(this.renderer)

    this.velocity.swap()

    this.splatProgram.program.uniforms.uTarget.value = this.density.read.texture

    this.renderer.setRenderTarget(this.density.write)
    this.splatProgram.render(this.renderer)

    this.density.swap()
  }

  update(clock) {
    // Perform all of the fluid simulation renders
    // No need to clear during sim, saving a number of GL calls.
    this.renderer.autoClear = false

    // Render all of the inputs since last frame
    for (let i = this.splats.length - 1; i >= 0; i--) {
      this.splat(this.splats.splice(i, 1)[0])
    }

    this.curlProgram.program.uniforms.uVelocity.value =
      this.velocity.read.texture

    this.renderer.setRenderTarget(this.curl)
    this.curlProgram.render(this.renderer)

    this.vorticityProgram.program.uniforms.uVelocity.value =
      this.velocity.read.texture
    this.vorticityProgram.program.uniforms.uCurl.value = this.curl.texture

    this.renderer.setRenderTarget(this.velocity.write)
    this.vorticityProgram.render(this.renderer)

    this.velocity.swap()

    this.divergenceProgram.program.uniforms.uVelocity.value =
      this.velocity.read.texture

    this.renderer.setRenderTarget(this.divergence)
    this.divergenceProgram.render(this.renderer)

    this.clearProgram.program.uniforms.uTexture.value =
      this.pressure.read.texture
    this.clearProgram.program.uniforms.value.value = this.pressureDissipation

    this.renderer.setRenderTarget(this.pressure.write)
    this.clearProgram.render(this.renderer)

    this.pressure.swap()

    this.pressureProgram.program.uniforms.uDivergence.value =
      this.divergence.texture

    for (let i = 0; i < this.iterations; i++) {
      this.pressureProgram.program.uniforms.uPressure.value =
        this.pressure.read.texture

      this.renderer.setRenderTarget(this.pressure.write)
      this.pressureProgram.render(this.renderer)

      this.pressure.swap()
    }

    this.gradienSubtractProgram.program.uniforms.uPressure.value =
      this.pressure.read.texture
    this.gradienSubtractProgram.program.uniforms.uVelocity.value =
      this.velocity.read.texture

    this.renderer.setRenderTarget(this.velocity.write)
    this.gradienSubtractProgram.render(this.renderer)

    this.velocity.swap()

    this.advectionProgram.program.uniforms.dyeTexelSize.value.set(
      1 / this.simRes,
    )
    this.advectionProgram.program.uniforms.uVelocity.value =
      this.velocity.read.texture
    this.advectionProgram.program.uniforms.uSource.value =
      this.velocity.read.texture
    this.advectionProgram.program.uniforms.dissipation.value =
      this.velocityDissipation

    this.renderer.setRenderTarget(this.velocity.write)
    this.advectionProgram.render(this.renderer)

    this.velocity.swap()

    this.advectionProgram.program.uniforms.dyeTexelSize.value.set(
      1 / this.dyeRes,
    )
    this.advectionProgram.program.uniforms.uVelocity.value =
      this.velocity.read.texture
    this.advectionProgram.program.uniforms.uSource.value =
      this.density.read.texture
    this.advectionProgram.program.uniforms.dissipation.value =
      this.densityDissipation

    this.renderer.setRenderTarget(this.density.write)
    this.advectionProgram.render(this.renderer)

    this.density.swap()

    // Set clear back to default
    this.renderer.autoClear = true

    return this.density.read.texture
  }
}
