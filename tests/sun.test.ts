import { describe, expect, test } from 'vitest';
import * as sun from '../src/sun';

describe('calculatePVYield', () => {
  test('should calculate the correct yield', () => {
    const intensities = [new Float32Array([0, 1, 2, 3]), new Float32Array([4, 5, 6, 7])];
    const solarToElectricityConversionEfficiency = 100;
    const pvYield = sun.calculatePVYield(intensities, solarToElectricityConversionEfficiency, 1 / 0.065);
    const expectedPVYield = [new Float32Array([0, 0.1, 0.2, 0.3]), new Float32Array([0.4, 0.5, 0.6, 0.7])];

    // some loop magic, as the typescript tests can only compare numbers, not number[]
    const actual = pvYield.flatMap((arr) => Array.from(arr));
    const expected = expectedPVYield.flatMap((arr) => Array.from(arr));
    actual.forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index]);
    });
  });
});
