import { describe, expect, test } from 'vitest';
import * as sun from '../src/sun';
import { CartesianPoint } from '../src/utils';

const irradianceSpherical = {
  metadata: { description: '', latitude: 0, longitude: 0, samplesAzimuth: 0, samplesAltitude: 0 },
  data: [
    {
      altitude: 0,
      azimuth: 0,
      radiance: 1,
    },
    {
      altitude: 0,
      azimuth: Math.PI / 2,
      radiance: 2,
    },
    {
      altitude: 0,
      azimuth: Math.PI,
      radiance: 3,
    },
    {
      altitude: 0,
      azimuth: (Math.PI * 3) / 2,
      radiance: 4,
    },
    {
      altitude: Math.PI / 2,
      azimuth: 0,
      radiance: 1,
    },
    {
      altitude: Math.PI / 2,
      azimuth: Math.PI / 2,
      radiance: 2,
    },
    {
      altitude: Math.PI / 2,
      azimuth: Math.PI,
      radiance: 3,
    },
    {
      altitude: Math.PI / 2,
      azimuth: (Math.PI * 3) / 2,
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
