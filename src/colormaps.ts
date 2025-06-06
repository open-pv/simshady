import { Color, ColorMap } from './utils';

/**
 * The viridis color Map, as defined in https://observablehq.com/@flimsyhat/webgl-color-maps
 * Use colormaps in the {@link ShadingScene.addColorMap} method to define the colors of the returned
 * Three.js geometry.
 * @param t parameter in [0,1] to go through viridis color map
 * @returns
 */
export function viridis(t: number): Color {
  t = Math.min(Math.max(t, 0), 1);
  const c0 = [0.2777273272234177, 0.005407344544966578, 0.3340998053353061];
  const c1 = [0.1050930431085774, 1.404613529898575, 1.384590162594685];
  const c2 = [-0.3308618287255563, 0.214847559468213, 0.09509516302823659];
  const c3 = [-4.634230498983486, -5.799100973351585, -19.33244095627987];
  const c4 = [6.228269936347081, 14.17993336680509, 56.69055260068105];
  const c5 = [4.776384997670288, -13.74514537774601, -65.35303263337234];
  const c6 = [-5.435455855934631, 4.645852612178535, 26.3124352495832];
  return [
    c0[0] + t * (c1[0] + t * (c2[0] + t * (c3[0] + t * (c4[0] + t * (c5[0] + t * c6[0]))))),
    c0[1] + t * (c1[1] + t * (c2[1] + t * (c3[1] + t * (c4[1] + t * (c5[1] + t * c6[1]))))),
    c0[2] + t * (c1[2] + t * (c2[2] + t * (c3[2] + t * (c4[2] + t * (c5[2] + t * c6[2]))))),
  ];
}

/**
 * Creates a color map function that interpolates between two colors.
 * Use colormaps in the {@link ShadingScene.addColorMap} method to define the colors of the returned
 * Three.js geometry.
 * @param {Object} colors - The input colors.
 * @param {Color} colors.c0 - The starting color.
 * @param {Color} colors.c1 - The ending color.
 * @returns {ColorMap} A function that takes a value t (0 to 1) and returns an interpolated color.
 */
export function interpolateTwoColors(colors: { c0: Color; c1: Color }): ColorMap {
  const { c0, c1 } = colors;

  return (t: number): Color => {
    // Clamp t between 0 and 1
    t = Math.min(Math.max(t, 0), 1);

    // Interpolate between c0 and c1 for R, G, and B channels
    const r = c0[0] * (1 - t) + c1[0] * t;
    const g = c0[1] * (1 - t) + c1[1] * t;
    const b = c0[2] * (1 - t) + c1[2] * t;

    return [r, g, b];
  };
}

/**
 * Creates a color map function that interpolates between three colors using quadratic interpolation.
 * Use colormaps in the {@link ShadingScene.addColorMap} method to define the colors of the returned
 * Three.js geometry.
 * @param {Object} colors - The input colors.
 * @param {Color} colors.c0 - The first color.
 * @param {Color} colors.c1 - The second color.
 * @param {Color} colors.c2 - The third color.
 * @returns {ColorMap} A function that takes a value t (0 to 1) and returns an interpolated color.
 */
export function interpolateThreeColors(colors: { c0: Color; c1: Color; c2: Color }): ColorMap {
  const { c0, c1, c2 } = colors;

  return (t: number): Color => {
    // Clamp t between 0 and 1
    t = Math.max(0, Math.min(1, t));

    function quadraticInterpolation(t: number, v0: number, v1: number, v2: number): number {
      return (1 - t) * (1 - t) * v0 + 2 * (1 - t) * t * v1 + t * t * v2;
    }

    const r = quadraticInterpolation(t, c0[0], c1[0], c2[0]);
    const g = quadraticInterpolation(t, c0[1], c1[1], c2[1]);
    const b = quadraticInterpolation(t, c0[2], c1[2], c2[2]);

    return [r, g, b];
  };
}
