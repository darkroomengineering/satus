export const BLEND = {
  NORMAL: /* glsl */ `
	vec3 blendNormal(vec3 base, vec3 blend) {
		return blend;
	}

	vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
		return (blendNormal(base, blend) * opacity + base * (1.0 - opacity));
	}`,
  COLOR_DODGE: /* glsl */ `
	float blendColorDodge(float base, float blend) {
		return (blend==1.0)?blend:min(base/(1.0-blend),1.0);
	}

	vec3 blendColorDodge(vec3 base, vec3 blend) {
		return vec3(blendColorDodge(base.r,blend.r),blendColorDodge(base.g,blend.g),blendColorDodge(base.b,blend.b));
	}

	vec3 blendColorDodge(vec3 base, vec3 blend, float opacity) {
		return (blendColorDodge(base, blend) * opacity + base * (1.0 - opacity));
	}
	`,
  ADD: /* glsl */ `
	float blendAdd(float base, float blend) {
		return min(base+blend,1.0);
	}

	vec3 blendAdd(vec3 base, vec3 blend) {
		return min(base+blend,vec3(1.0));
	}

	vec3 blendAdd(vec3 base, vec3 blend, float opacity) {
		return (blendAdd(base, blend) * opacity + base * (1.0 - opacity));
	}
	`,
} as const
