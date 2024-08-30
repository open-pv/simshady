import { describe, expect, test } from 'vitest';
import * as sun from '../src/sun';
import { CartesianPoint } from '../src/utils';

const irradianceSpherical = {
  metadata: { description: '', latitude: 0, longitude: 0, samples_phi: 0, samples_theta: 0 },
  data: [
    {
      theta: 0,
      phi: 0,
      radiance: 1,
    },
    {
      theta: 0,
      phi: Math.PI / 2,
      radiance: 2,
    },
    {
      theta: 0,
      phi: Math.PI,
      radiance: 3,
    },
    {
      theta: 0,
      phi: (Math.PI * 3) / 2,
      radiance: 4,
    },
    {
      theta: Math.PI / 2,
      phi: 0,
      radiance: 1,
    },
    {
      theta: Math.PI / 2,
      phi: Math.PI / 2,
      radiance: 2,
    },
    {
      theta: Math.PI / 2,
      phi: Math.PI,
      radiance: 3,
    },
    {
      theta: Math.PI / 2,
      phi: (Math.PI * 3) / 2,
      radiance: 4,
    },
  ],
};

const irradianceEuclidian: CartesianPoint[] = [
  {
    x: 0,
    y: 0,
    z: 1,
  },
  {
    x: 0,
    y: 0,
    z: 2,
  },
  {
    x: 0,
    y: 0,
    z: 3,
  },
  {
    x: 0,
    y: 0,
    z: 4,
  },
  {
    x: 1,
    y: 0,
    z: 0,
  },
  {
    x: 0,
    y: 2,
    z: 0,
  },
  {
    x: -3,
    y: 0,
    z: 0,
  },
  {
    x: 0,
    y: -4,
    z: 0,
  },
];

describe('Test functionalities from sun.ts: ', () => {
  const N = 50;
  let vectors = sun.getRandomSunVectors(N, 0, 0);
  test('Get Correct number of positions for cartesian coordiantes.', () => {
    expect(vectors.length).toStrictEqual(N);
  });
  test('Get Correct number of positions for spherical coordiantes.', () => {
    expect(vectors.length).toStrictEqual(N);
  });
  test('Get normalized sun vectors.', () => {
    for (let obj of vectors) {
      let length = obj.vector.cartesian.x ** 2 + obj.vector.cartesian.y ** 2 + obj.vector.cartesian.z ** 2;
      expect(length).to.closeTo(1, 0.001);
    }
  });
  test('Sun is always above the horizon.', () => {
    for (let i = 0; i < N / 3; i++) {
      let z = vectors[i].vector.cartesian.z;
      let altitude = vectors[i].vector.spherical.altitude;
      expect(z).toBeGreaterThan(0);
      expect(altitude).toBeGreaterThan(0);
    }
  });
  test('ConvertSpericalToEuclidian works right.', () => {
    const tolerance = 0.00001;
    const calculatedIrradianceEuclidian = sun.convertSpericalToEuclidian(irradianceSpherical);
    const allClose = calculatedIrradianceEuclidian.every(
      (point, index) =>
        Math.abs(point.vector.cartesian.x - irradianceEuclidian[index].x) <= tolerance &&
        Math.abs(point.vector.cartesian.y - irradianceEuclidian[index].y) <= tolerance &&
        Math.abs(point.vector.cartesian.z - irradianceEuclidian[index].z) <= tolerance,
    );
    expect(allClose).toBe(true);
  });
  test('Fetch irradiance json from openpv url.', async () => {
    const result = await sun.fetchIrradiance('https://www.openpv.de/data/irradiance', 50.0, 11.0);

    expect(result.data.length).toBeGreaterThan(5);
  });
  test('Fetch irradiance tiff from openpv url.', async () => {
    const firstResult = await sun.getTiffValueAtLatLon(
      'https://www.openpv.de/data/irradiance/geotiff/average_direct_radiation.tif',
      [5.9, 47.3, 15.0, 55.0],
      47.5,
      10.1,
    );
    expect(firstResult).toBe(680.625);

    expect(
      async () =>
        await sun.getTiffValueAtLatLon(
          'https://www.openpv.de/data/irradiance/geotiff/average_direct_radiation.tif',
          [5.9, 47.3, 15.0, 55.0],
          57,
          10.1,
        ),
    ).rejects.toThrowError('bounding box');
  });
});
