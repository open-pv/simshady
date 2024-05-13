import { describe, expect, test } from 'vitest';
import * as sun from '../src/sun';

const irradianceSpherical: number[][] = [
  [1, 2, 3, 4],
  [1, 2, 3, 4],
];

const irradianceEuclidian = new Float32Array([0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 1, 0, 0, 0, 2, 0, -3, 0, 0, 0, -4, 0]);

describe('Test functionalities from sun.ts: ', () => {
  const N = 50;
  let vectors = sun.getRandomSunVectors(N, 0, 0);
  test('Get Correct number of positions for cartesian coordiantes.', () => {
    expect(vectors.cartesian.length).toStrictEqual(3 * N);
  });
  test('Get Correct number of positions for spherical coordiantes.', () => {
    expect(vectors.spherical.length).toStrictEqual(2 * N);
  });
  test('Get normalized sun vectors.', () => {
    for (let i = 0; i < N / 3; i++) {
      let length = vectors.cartesian[3 * i] ** 2 + vectors.cartesian[3 * i + 1] ** 2 + vectors.cartesian[3 * i + 2] ** 2;
      expect(length).to.closeTo(1, 0.001);
    }
  });
  test('Sun is always above the horizon.', () => {
    for (let i = 0; i < N / 3; i++) {
      let z = vectors.cartesian[3 * i + 2];
      let altitude = vectors.spherical[2 * i];
      expect(z).toBeGreaterThan(0);
      expect(altitude).toBeGreaterThan(0);
    }
  });
  test('ConvertSpericalToEuclidian works right.', () => {
    const tolerance = 0.00001;
    console.log(tolerance);
    const calculatedIrradianceEuclidian = sun.convertSpericalToEuclidian(irradianceSpherical);
    console.log(calculatedIrradianceEuclidian);
    const allClose = calculatedIrradianceEuclidian.every(
      (value, index) => Math.abs(value - irradianceEuclidian[index]) <= tolerance,
    );
    expect(allClose).toBe(true);
  });
  test('Fetch irradiance json from openpv url.', async () => {
    const result = await sun.fetchIrradiance('https://www.openpv.de/data/irradiance', 50.0, 11.0);

    expect(result.data.length).toBeGreaterThan(5);
  });
});
