import { create } from "zustand";

interface PagePalette {
  colorA: [number, number, number];
  colorB: [number, number, number];
}

interface ShaderStore {
  targetPalette: PagePalette;
  currentPalette: PagePalette;
  distortion: number;
  colorMix: number;

  setTargetPalette: (palette: PagePalette) => void;
  commitPalette: () => void;
}

export const PALETTES = {
  home: {
    colorA: [0.02, 0.02, 0.02],
    colorB: [0.89, 0.02, 0.07],
  },
  features: {
    colorA: [0.02, 0.02, 0.05],
    colorB: [0.0, 0.44, 0.95],
  },
  about: {
    colorA: [0.04, 0.02, 0.04],
    colorB: [0.47, 0.16, 0.79],
  },
} as const satisfies Record<string, PagePalette>;

export const useShaderStore = create<ShaderStore>((set, get) => ({
  targetPalette: PALETTES.home,
  currentPalette: PALETTES.home,
  distortion: 0,
  colorMix: 0,

  setTargetPalette: (palette) => set({ targetPalette: palette }),
  commitPalette: () => {
    const { targetPalette } = get();
    set({ currentPalette: targetPalette, colorMix: 0, distortion: 0 });
  },
}));
