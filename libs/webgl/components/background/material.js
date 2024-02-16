import { colors } from 'config/variables'
import { FUNCTIONS } from 'libs/webgl/utils/functions'
import { NOISE } from 'libs/webgl/utils/noise'
import { Color, ShaderMaterial, Vector2 } from 'three'

const vertexShader = /*glsl*/ `
    varying vec2 vUv;
    varying vec2 vAspectUv;
    varying vec2 vProgramSize;

    uniform float uAspect;

    void main() {
        vUv = uv;
        vAspectUv = uv / vec2(1., uAspect);
        vProgramSize = vec2(length(modelViewMatrix[0]), length(modelViewMatrix[1])); 
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const fragmentShader = /*glsl*/ `
    ${FUNCTIONS.PI}
    ${NOISE.PERLIN_3D('perlin3d')}
    ${FUNCTIONS.MAP_RANGE}

    varying vec2 vUv;
    varying vec2 vAspectUv;
    varying vec2 vProgramSize;

    uniform sampler2D uTexture;
    uniform vec3 uColor;
    uniform vec3 uBackgroundColor;
    uniform float uSegments;
    uniform float uAspect;
    uniform float uShift;
    uniform float uAmplitude;
    uniform float uFrequency;
    uniform float uTimeScale;
    uniform float uRythmTimeScale;
    uniform float uTime;
    uniform float uTimeRythm;
    uniform vec2 uClip;
    uniform float uBorderRadius;
    uniform bool uIsTransparent;

    uniform vec2 uResolution;
    uniform float uDpr;

    float sdRoundBox( in vec2 p, in vec2 b, in vec4 r ) {
        r.xy = (p.x>0.0)?r.xy : r.zw;
        r.x  = (p.y>0.0)?r.x  : r.y;
        vec2 q = abs(p)-b+r.x;
        return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r.x;
    }

    void main() {
      float frame = sdRoundBox((vUv * vProgramSize) - (vProgramSize * 0.5), vProgramSize * 0.5, vec4(uBorderRadius));
      frame = clamp(frame, 0., 1.);
      // if(frame >= 1.) discard;

      // vec2 coordinates = vUv * vProgramSize;
      // coordinates.y = vProgramSize.y - coordinates.y;

      //   // top
      //   if(coordinates.y < uClipInset.x) {
      //     discard;
      //   }

      //   // bottom
      //   if(coordinates.y > vProgramSize.y - uClipInset.y) {
      //     discard;
      //   }

        // vec2 coord = vUv * vProgramSize;
        vec2 coord = gl_FragCoord.xy;
        vec2 resolution = uResolution * uDpr;
        vec2 clip = uClip * uDpr;
        coord.y = resolution.y - coord.y;

        if(coord.y < clip.x) {
            discard;
        }

        if(coord.y > resolution.y - clip.y) {
            discard;
        }
        

        vec2 distanceToCenter = vUv - vec2(0.5);
        distanceToCenter *= 2.;

        float pixelsTime = (uTimeRythm * uRythmTimeScale) + (uTime * uTimeScale);
        float nx = perlin3d(vec3(vAspectUv.x * uFrequency, 10., pixelsTime));
        nx = mapRange(-1.,1.,nx,0.,1.);
        nx *= uAmplitude;
        // aspectUv.x += nx;

        float ny = perlin3d(vec3(vAspectUv.y * uFrequency, -10., pixelsTime));
        ny = mapRange(-1.,1.,ny,0.,1.);
        ny *= uAmplitude;
        // aspectUv.y += ny;

        float segments = vProgramSize.x / uSegments;
        vec2 pixelsUv = fract((vUv + vec2(nx,ny)) * vec2(segments, round(segments / uAspect)));

        if(floor(distanceToCenter.x) == -1.) {
            pixelsUv.x = 1. - pixelsUv.x;
        }

        if(floor(distanceToCenter.y) == -1.) {
            pixelsUv.y = 1. - pixelsUv.y;
        }

        pixelsUv *= 2.;
        pixelsUv -= 1.;

        vec2 shift = pixelsUv * -distanceToCenter * uShift;
        float alpha = texture2D(uTexture, vUv + shift).r;
        alpha = clamp(alpha, 0., 1.);

        if(uIsTransparent) {
          gl_FragColor = vec4(uColor,(1. - frame) * alpha);
        } else {
          gl_FragColor = vec4(mix(uBackgroundColor, uColor, alpha), 1. - frame);
        }
        // gl_FragColor.a = alpha;

        // gl_FragColor = texture2D(uTexture, vUv);
        // gl_FragColor = vec4(pixelsUv,0., 1.);

        // gl_FragColor = texture2D(uTexture, vUv);
        // gl_FragColor = vec4(uColor,1.);
    }
`

export class BackgroundMaterial extends ShaderMaterial {
  constructor({
    color = colors.green,
    backgroundColor = colors['dark-gray'],
  } = {}) {
    super({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: { value: new Color() },
        uBackgroundColor: { value: new Color() },
        uTime: { value: Math.random() * 1000 },
        uTimeRythm: { value: Math.random() * 1000 },
        // uScreenResolution: { value: new Vector2() },
        uDpr: { value: 1 },
        uAspect: { value: 1 },
        uTexture: { value: null },

        // uNoiseAmplitude: { value: 1 },
        // uNoiseFrequency: { value: 1 },
        // uNoiseTimeScale: { value: 1 },
        // uNoiseRythmTimeScale: { value: 1 },
        // uTexture: {
        //   value: new TextureLoader().load('/images/observer.bc0a0bbe.jpg'),
        // },
        uAmplitude: { value: 0.25 },
        uFrequency: { value: 2 },
        uShift: { value: 0.5 },
        uSegments: { value: 25 },
        uTimeScale: { value: 1 },
        uRythmTimeScale: { value: 1 },
        uClip: { value: new Vector2(0, 0) }, // top,bottom
        uResolution: { value: new Vector2() },
        uBorderRadius: { value: 0 },
        uIsTransparent: { value: false },

        // uSinusAmplitude: { value: 0.1 },
        // uSinusFrequency: { value: 7 },
        // uSinusShift: { value: 0 },
        // uSinusY: { value: 0.5 },
        // uSinusFade: { value: 0.1 },
        // uSinusTimeScale: { value: 1 },
        // uSinusRythmTimeScale: { value: 1 },

        // uAnalyzerTexture: { value: null },
      },
      transparent: true,
    })

    // this.resolution = this.uniforms.uScreenResolution.value
    this.color = color
    this.backgroundColor = backgroundColor
    this.clip = this.uniforms.uClip.value
    this.resolution = this.uniforms.uResolution.value
  }

  set color(value) {
    this.uniforms.uColor.value.set(value).convertLinearToSRGB()
  }

  set backgroundColor(value) {
    this.uniforms.uBackgroundColor.value.set(value).convertLinearToSRGB()
  }

  set amplitude(value) {
    this.uniforms.uAmplitude.value = value
  }

  set frequency(value) {
    this.uniforms.uFrequency.value = value
  }

  set shift(value) {
    this.uniforms.uShift.value = value
  }

  set segments(value) {
    this.uniforms.uSegments.value = value
  }

  set timeScale(value) {
    this.uniforms.uTimeScale.value = value
  }

  set rythmTimeScale(value) {
    this.uniforms.uRythmTimeScale.value = value
  }

  set dpr(value) {
    this.uniforms.uDpr.value = value
  }

  set borderRadius(value) {
    this.uniforms.uBorderRadius.value = value
  }

  set isTransparent(value) {
    this.uniforms.uIsTransparent.value = value
  }
}
