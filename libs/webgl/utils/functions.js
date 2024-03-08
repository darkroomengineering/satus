export const FUNCTIONS = {
  PI: `#define PI 3.14159265359`,
  MAP_RANGE: `
    float mapRange(float min1, float max1,float value, float min2, float max2) {
      return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
    }`,
  GREYSCALE: `
    vec3 greyscale(vec3 color) {
      float average = (color.r + color.g + color.b) / 3.;

      return vec3(average);
    }`,
}
