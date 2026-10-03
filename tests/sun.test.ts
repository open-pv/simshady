import { describe, expect, test } from 'vitest';
import * as sun from '../src/sun';

describe('calculatePVYield', () => {
  test('should calculate the correct yield', () => {
    const intensities = [new Float32Array([0, 1, 2, 3]), new Float32Array([4, 5, 6, 7])];
    const solarToElectricityConversionEfficiency = 100;
    const pvYield = sun.calculatePVYield(intensities, solarToElectricityConversionEfficiency, 1, 0.1);
    const expectedPVYield = [new Float32Array([0, 0.01, 0.02, 0.03]), new Float32Array([0.04, 0.05, 0.06, 0.07])];

    // some loop magic, as the typescript tests can only compare numbers, not number[]
    const actual = pvYield.flatMap((arr) => Array.from(arr));
    const expected = expectedPVYield.flatMap((arr) => Array.from(arr));
    actual.forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index]);
    });
  });
});
