import { describe, expect, test } from 'vitest';
import * as sun from '../src/sun';

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
});
