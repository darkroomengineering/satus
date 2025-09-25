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
  LIGHTEN: /* glsl */ `
	  float blendLighten(float base, float blend) {
		  return max(blend,base);
	  }
	  
	  vec3 blendLighten(vec3 base, vec3 blend) {
		  return vec3(blendLighten(base.r,blend.r),blendLighten(base.g,blend.g),blendLighten(base.b,blend.b));
	  }
	  
	  vec3 blendLighten(vec3 base, vec3 blend, float opacity) {
		  return (blendLighten(base, blend) * opacity + base * (1.0 - opacity));
	  }
	  `,
  SCREEN: /* glsl */ `
	  float blendScreen(float base, float blend) {
		  return 1.0-((1.0-base)*(1.0-blend));
	  }
	  
	  vec3 blendScreen(vec3 base, vec3 blend) {
		  return vec3(blendScreen(base.r,blend.r),blendScreen(base.g,blend.g),blendScreen(base.b,blend.b));
	  }
	  
	  vec3 blendScreen(vec3 base, vec3 blend, float opacity) {
		  return (blendScreen(base, blend) * opacity + base * (1.0 - opacity));
	  }
	  `,
} as const
