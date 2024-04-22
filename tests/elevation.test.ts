import { describe, expect, test } from 'vitest';
import * as elevation from '../src/elevation';

const observer: elevation.Point = { x: 1, y: 1 }; // Midpoint of the grid
describe('Test functionalities from elevation.ts: ', () => {
  const N = 50;
  const zValuesObserver = [0, 1, 5];
  const grid = [
    [1, 0, 2],
    [3, 0, 4],
    [5, 0, 6],
  ];

  const elevationAnglesExpectation = [
    [1.326, 1.339, 0, 1.295, 1.249, 0.615, 0, 0.955],
    [1.249, 1.295, -0.785, 1.231, 1.107, 0, -0.785, 0.615],
    [-0.785, 0.615, -1.373, 0, -1.107, -1.231, -1.373, -1.13],
  ];
  const elevationAngles = elevation.getMaxElevationAngles(grid, observer, zValuesObserver, 8);
  test('Get a list.', () => {
    const tolerance = 0.01;
    const allClose =
      elevationAngles.length === elevationAnglesExpectation.length &&
      elevationAngles.every(
        (row, rowIndex) =>
          row.length === elevationAnglesExpectation[rowIndex].length &&
          row.every((value, colIndex) => Math.abs(value - elevationAnglesExpectation[rowIndex][colIndex]) <= tolerance),
      );
    expect(allClose).toBe(true);
  });
});
