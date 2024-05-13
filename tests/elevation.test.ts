import { describe, expect, test } from 'vitest';
import * as elevation from '../src/elevation';

describe('calculateSphericalCoordinates', () => {
  test('should calculate the correct spherical coordinates', () => {
    const start = { x: 0, y: 0, z: 0 };
    const ends = [
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 1 },
      { x: 0, y: -1, z: 1 },
    ];
    const expectedResults = [
      { altitude: 0, azimuth: 0 },
      { altitude: Math.PI / 4, azimuth: 0 },
      { altitude: Math.PI / 4, azimuth: (3 / 2) * Math.PI },
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
    const points: elevation.SphericalPoint[] = [
      { altitude: -Infinity, azimuth: 0 },
      { altitude: 10, azimuth: 90 },
      { altitude: -Infinity, azimuth: 180 },
      { altitude: -Infinity, azimuth: 230 },
      { altitude: -Infinity, azimuth: 240 },
      { altitude: 20, azimuth: 270 },
    ];

    elevation.fillMissingAltitudes(points);

    expect(points[0].altitude).toBe(10);
    expect(points[2].altitude).toBe(10);
    expect(points[3].altitude).toBe(20);
    expect(points[4].altitude).toBe(20);
  });
});

describe('getMaxElevationAngles', () => {
  test('should correctly calculate the maximum elevation angles for given elevation points and observer', () => {
    const elevations: elevation.Point[] = [
      { x: 1, y: 1, z: 2 },
      { x: 1, y: -1, z: 4 },
      { x: -1, y: -1, z: 6 },
      { x: -1, y: 1, z: 8 },
    ];
    const observer: elevation.Point = { x: 0, y: 0, z: 0 };
    const numDirections = 20;
    const result: elevation.SphericalPoint[] = elevation.getMaxElevationAngles(elevations, observer, numDirections);
    console.log(result);
    expect(result).to.be.an('array').that.has.lengthOf(numDirections);
  });
});
