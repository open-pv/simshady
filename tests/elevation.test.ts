import { describe, expect, test } from 'vitest';
import * as elevation from '../src/elevation';
import { CartesianPoint, SphericalPoint } from '../src/utils';

describe('calculateSphericalCoordinates', () => {
  test('should calculate the correct spherical coordinates', () => {
    const start = { x: 0, y: 0, z: 0 };
    const ends = [
      { x: 0, y: 1, z: 1 },
      { x: 1, y: 0, z: 1 },
      { x: 0, y: -1, z: 1 },
    ];
    const expectedResults = [
      { altitude: Math.PI / 4, azimuth: (3 / 2) * Math.PI },
      { altitude: Math.PI / 4, azimuth: 0 },
      { altitude: Math.PI / 4, azimuth: (1 / 2) * Math.PI },
    ];

    ends.forEach((end, index) => {
      const result = elevation.calculateSphericalCoordinates(start, end);
      const expected = expectedResults[index];
      expect(result.azimuth).toBeCloseTo(expected.azimuth);
      expect(result.altitude).toBeCloseTo(expected.altitude);
    });
  });
});

describe('fillMissingAltitudes', () => {
  test('should fill negative infinity altitude with the nearest non-negative infinity altitude', () => {
    const points: SphericalPoint[] = [
      { radius: 1, altitude: -Infinity, azimuth: 0 },
      { radius: 1, altitude: 10, azimuth: 90 },
      { radius: 1, altitude: -Infinity, azimuth: 180 },
      { radius: 1, altitude: -Infinity, azimuth: 230 },
      { radius: 1, altitude: -Infinity, azimuth: 240 },
      { radius: 1, altitude: 20, azimuth: 270 },
    ];

    elevation.fillMissingAltitudes(points);

    expect(points[0].altitude).toBe(10);
    expect(points[2].altitude).toBe(10);
    expect(points[3].altitude).toBe(20);
    expect(points[4].altitude).toBe(20);
  });
});
/**describe('getMaxElevationAngles', () => {
  test('should correctly calculate the maximum elevation angles for given elevation points and observer', () => {
    const elevations: CartesianPoint[] = [
      { x: 1, y: 0, z: 1 },
      { x: 0, y: -1, z: 1 },
      { x: -1, y: 0, z: 1 },
      { x: 0, y: 1, z: 1 },
    ];
    const expectedResult: SphericalPoint[] = [
      { radius: 1, altitude: Math.PI / 4, azimuth: 0 },
      { radius: 1, altitude: Math.PI / 4, azimuth: Math.PI / 2 },
      { radius: 1, altitude: Math.PI / 4, azimuth: Math.PI },
      { radius: 1, altitude: Math.PI / 4, azimuth: (3 * Math.PI) / 2 },
    ];
    const observer: CartesianPoint = { x: 0, y: 0, z: 0 };
    const numDirections = elevations.length;
    const result: SphericalPoint[] = elevation.getMaxElevationAngles(elevations, observer, numDirections);
    expect(result).to.be.an('array').that.has.lengthOf(numDirections);
    result.forEach((point, index) => {
      expect(point.azimuth).toBeCloseTo(expectedResult[index].azimuth);
      expect(point.altitude).toBeCloseTo(expectedResult[index].altitude);
    });
  });
}); */
