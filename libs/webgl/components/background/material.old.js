import { FUNCTIONS } from 'libs/webgl/utils/functions'
import { NOISE } from 'libs/webgl/utils/noise'
import { Color, ShaderMaterial, TextureLoader, Vector2 } from 'three'

const vertexShader = /*glsl*/ `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const fragmentShader = /*glsl*/ `
    ${FUNCTIONS.PI}
    ${NOISE.PERLIN_3D('perlin3d')}
    ${FUNCTIONS.MAP_RANGE}
    

    varying vec2 vUv;

    uniform float uTime;
    uniform float uTimeRythm;

    
    uniform vec2 uScreenResolution;
    uniform float uDpr;
    uniform vec3 uColor;



    uniform float uNoiseAmplitude;
    uniform float uNoiseFrequency;
    uniform float uAspect;

    uniform float uNoiseTimeScale;
    uniform float uNoiseRythmTimeScale;

    uniform sampler2D uTexture;

    
    
    uniform float uPixelsAmplitude;
    uniform float uPixelsFrequency;
    uniform float uPixelsSegments;
    uniform float uPixelsShift;

    uniform float uPixelsTimeScale;
    uniform float uPixelsRythmTimeScale;
    // uniform sampler2D uAnalyzerTexture;

    uniform float uSinusAmplitude;
    uniform float uSinusFrequency;
    uniform float uSinusShift;
    uniform float uSinusY;
    uniform float uSinusFade;
    uniform float uSinusTimeScale;
    uniform float uSinusRythmTimeScale;

    void main() {
        vec2 screenResolution = uScreenResolution.xy * uDpr;
        vec2 coordinates = gl_FragCoord.xy / screenResolution ;
        coordinates /= vec2(1., uAspect);

        float frequency = uNoiseFrequency;
        float amplitude = uNoiseAmplitude;

        // vec2 delta = vec2(x,y) * uPixelsAmplitude;

        float segments = round(screenResolution.x / uPixelsSegments);

        vec2 aspectUv = vUv / vec2( 1., uAspect);

        vec2 direction = vUv - vec2(0.5,0.5);
        // direction *= 2.;


        float pixelsTime = (uTimeRythm * uPixelsRythmTimeScale) + (uTime * uPixelsTimeScale);
        float nx = perlin3d(vec3(aspectUv.x * uPixelsFrequency, 10., pixelsTime));
        nx = mapRange(-1.,1.,nx,0.,1.);
        nx *= uPixelsAmplitude;
        // aspectUv.x += nx;

        float ny = perlin3d(vec3(aspectUv.y * uPixelsFrequency, -10., pixelsTime));
        ny = mapRange(-1.,1.,ny,0.,1.);
        ny *= uPixelsAmplitude;
        // aspectUv.y += ny;

        vec2 pixelsUv = fract(aspectUv * vec2(segments));

        if(floor(direction.x) == -1.) {
            pixelsUv.x = 1. - pixelsUv.x;
        }

        if(floor(direction.y) == -1.) {
            pixelsUv.y = 1. - pixelsUv.y;
        }

        pixelsUv*=2.;
        pixelsUv-=1.;

        direction *= uPixelsShift;

        



        // float noise = perlin3d(vec3((coordinates + (pixelsUv * -direction)) * frequency, uTime)) ;

        vec2 noiseShift = pixelsUv * -direction;
        float noiseTime = (uTimeRythm * uNoiseRythmTimeScale) + (uTime * uNoiseTimeScale);
        float noise = perlin3d(vec3((coordinates + noiseShift) * frequency, noiseTime)) ;
        noise = mapRange(-0.33, 1.0, noise, 0.0, 1.0);
        noise = clamp(noise, 0.0, 1.0);
        noise = smoothstep(0.0, 0.5, noise);
        noise *= amplitude;
        
        gl_FragColor = vec4(uColor, noise);

        
 
        vec2 sinusUv = vUv;
        // sinusUv.y *= uAspect;

        float sinusShift = uSinusShift / uSinusFrequency;
        // sinusShift+= uTime;

        // float shift = pixelsUv.x * -direction.x * 1.;
        float sinus = sin((((sinusUv.x * PI) + sinusShift) * uSinusFrequency) ) * uSinusAmplitude;
        
        float shapeCenter = sinus + uSinusY;

        float fadeStart = shapeCenter + uSinusFade;
        float fadeEnd = shapeCenter - uSinusFade;
        // float shape = vUv.y > shapeCenter ? 1. : 0.;
        float shape = mapRange(fadeStart, fadeEnd, sinusUv.y, 1., 0.);

        // gl_FragColor = vec4( uColor, shape);

        // gl_FragColor = vec4(pixelsUv,0., 1.);

        gl_FragColor = texture2D(uTexture, vUv + pixelsUv * -direction * uPixelsShift);
        gl_FragColor = texture2D(uTexture, vUv);
        // gl_FragColor.rgb /= gl_FragColor.a;

        // gl_FragColor = vec4(pixelsUv,0., 1.);
    }
`

export class BackgroundMaterial extends ShaderMaterial {
  constructor({ color = '#C5F17B' } = {}) {
    super({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: { value: new Color() },
        uTime: { value: Math.random() * 1000 },
        uTimeRythm: { value: Math.random() * 1000 },
        uScreenResolution: { value: new Vector2() },
        uDpr: { value: 1 },
        uAspect: { value: 1 },

        uNoiseAmplitude: { value: 1 },
        uNoiseFrequency: { value: 1 },
        uNoiseTimeScale: { value: 1 },
        uNoiseRythmTimeScale: { value: 1 },
        uTexture: {
          value: new TextureLoader().load('/images/observer.bc0a0bbe.jpg'),
        },
        uPixelsAmplitude: { value: 0.25 },
        uPixelsFrequency: { value: 2 },
        uPixelsShift: { value: 0.5 },
        uPixelsSegments: { value: 25 },
        uPixelsTimeScale: { value: 1 },
        uPixelsRythmTimeScale: { value: 1 },

        uSinusAmplitude: { value: 0.1 },
        uSinusFrequency: { value: 7 },
        uSinusShift: { value: 0 },
        uSinusY: { value: 0.5 },
        uSinusFade: { value: 0.1 },
        uSinusTimeScale: { value: 1 },
        uSinusRythmTimeScale: { value: 1 },

        // uAnalyzerTexture: { value: null },
      },
      transparent: true,
    })

    this.resolution = this.uniforms.uScreenResolution.value
    this.color = color
  }

  set noiseAmplitude(value) {
    this.uniforms.uNoiseAmplitude.value = value
  }

  set noiseFrequency(value) {
    this.uniforms.uNoiseFrequency.value = value
  }

  set noiseRythmTimeScale(value) {
    this.uniforms.uNoiseRythmTimeScale.value = value
  }

  set noiseTimeScale(value) {
    this.uniforms.uNoiseTimeScale.value = value
  }

  set color(value) {
    this.uniforms.uColor.value.set(value).convertLinearToSRGB()
  }

  set dpr(value) {
    this.uniforms.uDpr.value = value
  }

  set pixelsAmplitude(value) {
    this.uniforms.uPixelsAmplitude.value = value
  }

  set pixelsFrequency(value) {
    this.uniforms.uPixelsFrequency.value = value
  }

  set pixelsShift(value) {
    this.uniforms.uPixelsShift.value = value
  }

  set pixelsSegments(value) {
    this.uniforms.uPixelsSegments.value = value
  }

  set pixelsTimeScale(value) {
    this.uniforms.uPixelsTimeScale.value = value
  }

  set pixelsRythmTimeScale(value) {
    this.uniforms.uPixelsRythmTimeScale.value = value
  }

  set sinusAmplitude(value) {
    this.uniforms.uSinusAmplitude.value = value
  }

  set sinusFrequency(value) {
    this.uniforms.uSinusFrequency.value = value
  }

  set sinusShift(value) {
    this.uniforms.uSinusShift.value = value
  }

  set sinusY(value) {
    this.uniforms.uSinusY.value = value
  }

  set sinusFade(value) {
    this.uniforms.uSinusFade.value = value
  }

  set sinusTimeScale(value) {
    this.uniforms.uSinusTimeScale.value = value
  }

  set sinusRythmTimeScale(value) {
    this.uniforms.uSinusRythmTimeScale.value = value
  }
}
