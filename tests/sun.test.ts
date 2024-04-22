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
  test('Get Correct number of positions.', () => {
    expect(vectors.length).toStrictEqual(3 * N);
  });
  test('Get normalized sun vectors.', () => {
    for (let i = 0; i < N / 3; i++) {
      let length = vectors[3 * i] ** 2 + vectors[3 * i + 1] ** 2 + vectors[3 * i + 2] ** 2;
      expect(length).to.closeTo(1, 0.001);
    }
  });
  test('Sun is always above the horizon.', () => {
    for (let i = 0; i < N / 3; i++) {
      let z = vectors[3 * i + 2];
      expect(z).toBeGreaterThan(0);
    }
  });
  test('ConvertSpericalToEuclidian works right.', () => {
    const tolerance = 0.00001;
    const calculatedIrradianceEuclidian = sun.convertSpericalToEuclidian(irradianceSpherical);
    const allClose =
      irradianceSpherical.length === irradianceEuclidian.length &&
      calculatedIrradianceEuclidian.every((value, index) => Math.abs(value - irradianceEuclidian[index]) <= tolerance);
    expect(allClose).toBe(true);
  });
});
