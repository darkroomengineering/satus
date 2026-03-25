import { useFrame, useThree } from "@react-three/fiber";
import { createTimeline } from "animejs";
import { useLayoutEffect, useRef } from "react";
import type { Texture } from "three";
import { Color, ShaderMaterial, Vector2 } from "three";
import { useTransitionEvent } from "~/lib/transitions";
import { useFlowmap } from "~/webgl/components/flowmap-provider";
import { BLEND } from "~/webgl/utils/blend";
import { FUNCTIONS } from "~/webgl/utils/functions";
import { NOISE } from "~/webgl/utils/noise";
import { PALETTES, useShaderStore } from "../../store";

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  ${NOISE.FBM_3D(4)}
  ${BLEND.SCREEN}
  ${FUNCTIONS.PI}
  ${FUNCTIONS.MAP_RANGE}

  uniform float uTime;
  uniform float uDistortion;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorATarget;
  uniform vec3 uColorBTarget;
  uniform float uColorMix;
  uniform sampler2D uFlowmap;
  uniform float uFlowIntensity;
  uniform vec2 uResolution;

  varying vec2 vUv;

  void main() {
    vec4 flow = texture2D(uFlowmap, vUv);
    vec2 flowVelocity = flow.rg;

    vec2 uv = vUv;
    uv += flowVelocity * uFlowIntensity * 0.15;

    float aspect = uResolution.x / uResolution.y;
    vec2 noiseUv = vec2(uv.x * aspect, uv.y);

    float time = uTime * 0.08;

    float n1 = fbm(vec3(noiseUv * 1.5, time));
    float n2 = fbm(vec3(noiseUv * 3.0 + 100.0, time * 1.3));

    float distortAmount = uDistortion * 2.0;
    float n3 = fbm(vec3(noiseUv * 2.0 + n1 * distortAmount, time * 0.5 + distortAmount));

    float pattern = n1 * 0.5 + n2 * 0.25 + n3 * 0.25;
    pattern += length(flowVelocity) * 0.3 * uFlowIntensity;

    float intensity = smoothstep(-0.3, 0.8, pattern);

    vec3 colorA = mix(uColorA, uColorATarget, uColorMix);
    vec3 colorB = mix(uColorB, uColorBTarget, uColorMix);

    vec3 color = mix(colorA, colorB, intensity * 0.6);

    vec3 highlight = colorB * intensity * 0.25;
    color = blendScreen(color, highlight);

    float vignette = 1.0 - length(vUv - 0.5) * 0.6;
    vignette = smoothstep(0.1, 1.0, vignette);
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createUniforms() {
  return {
    uTime: { value: 0 },
    uDistortion: { value: 0 },
    uColorA: { value: new Color(...PALETTES.home.colorA) },
    uColorB: { value: new Color(...PALETTES.home.colorB) },
    uColorATarget: { value: new Color(...PALETTES.home.colorA) },
    uColorBTarget: { value: new Color(...PALETTES.home.colorB) },
    uColorMix: { value: 0 },
    uFlowmap: { value: null as Texture | null },
    uFlowIntensity: { value: 1 },
    uResolution: { value: new Vector2(1, 1) },
  };
}

export function BackgroundShader() {
  const materialRef = useRef<ShaderMaterial>(null!);
  const flowmap = useFlowmap("flowmap");
  const size = useThree((state) => state.size);
  const uniformsRef = useRef(createUniforms());

  const storeRef = useRef(useShaderStore);

  useLayoutEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms = uniformsRef.current;
  }, []);

  useTransitionEvent({
    onExit: ({ done }) => {
      const store = storeRef.current;
      const obj = { distortion: 0, colorMix: 0 };
      const tl = createTimeline({ onComplete: done });
      tl.add(obj, {
        distortion: 1,
        duration: 800,
        ease: "inOutCubic",
        onUpdate: () => {
          store.setState({ distortion: obj.distortion });
        },
      });
      tl.add(
        obj,
        {
          colorMix: 1,
          duration: 800,
          ease: "inOutCubic",
          onUpdate: () => {
            store.setState({ colorMix: obj.colorMix });
          },
        },
        200,
      );
      return () => tl.revert();
    },
    onEnter: ({ done }) => {
      const store = storeRef.current;
      const state = store.getState();
      const obj = { distortion: state.distortion };
      const tl = createTimeline({
        onComplete: () => {
          store.getState().commitPalette();
          done();
        },
      });
      tl.add(obj, {
        distortion: 0,
        duration: 1200,
        ease: "outQuart",
        onUpdate: () => {
          store.setState({ distortion: obj.distortion });
        },
      });
      return () => tl.revert();
    },
  });

  useFrame(({ clock }) => {
    const u = uniformsRef.current;
    const state = storeRef.current.getState();

    u.uTime.value = clock.getElapsedTime();
    u.uDistortion.value = state.distortion;
    u.uColorMix.value = state.colorMix;

    u.uColorA.value.setRGB(...state.currentPalette.colorA);
    u.uColorB.value.setRGB(...state.currentPalette.colorB);
    u.uColorATarget.value.setRGB(...state.targetPalette.colorA);
    u.uColorBTarget.value.setRGB(...state.targetPalette.colorB);

    u.uFlowmap.value = flowmap.uniform.value;
    u.uResolution.value.set(size.width, size.height);
  });

  return (
    <mesh scale={[size.width, size.height, 1]} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
