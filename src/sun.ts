import SunCalc from 'suncalc';
import { Point, SolarIrradianceData, SphericalPoint } from './utils';

/**
 * Creates arrays of sun vectors. "cartesian" is a vector of length 3*Ndates where every three entries make up one vector.
 * "spherical" is a vector of length 2*Ndates, where pairs of entries are altitude, azimuth.
 * @param Ndates
 * @param lat
 * @param lon
 * @returns
 */
export function getRandomSunVectors(Ndates: number, lat: number, lon: number): Point[] {
  let sunVectors: Point[] = [];

  let i: number = 0;
  while (i < Ndates) {
    let date = getRandomDate(new Date(2023, 1, 1), new Date(2023, 12, 31));

    const posSpherical = SunCalc.getPosition(date, lat, lon);
    // pos.altitude: sun altitude above the horizon in radians,
    //   e.g. 0 at the horizon and PI/2 at the zenith (straight over your head)
    // pos. azimuth: sun azimuth in radians (direction along the horizon, measured
    //   from south to west), e.g. 0 is south and Math.PI * 3/4 is northwest
    if (posSpherical.altitude < 0.1 || isNaN(posSpherical.altitude)) {
      continue;
    }
    sunVectors.push({
      cartesian: {
        x: -Math.cos(posSpherical.altitude) * Math.sin(posSpherical.azimuth),
        y: -Math.cos(posSpherical.altitude) * Math.cos(posSpherical.azimuth),
        z: Math.sin(posSpherical.altitude),
      },
      spherical: {
        radius: 1,
        altitude: posSpherical.altitude,
        azimuth: posSpherical.azimuth,
      },
    });
    i++;
  }
  return sunVectors;
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Converts an 2d vector of irradiance values in sperical coordinates to a 1d vector in euclidian coordinates
 * @param irradiance Vector of shape N_altitude x N_azimuth
 * @returns Vector of shape 3 x  N_altitude x N_azimuth
 */
export function convertSpericalToEuclidian(irradiance: SolarIrradianceData): Point[] {
  const sunVectors: Point[] = [];

  for (let obj of irradiance.data) {
    sunVectors.push({
      cartesian: {
        x: obj.radiance * Math.sin(obj.theta) * Math.cos(obj.phi),
        y: obj.radiance * Math.sin(obj.theta) * Math.sin(obj.phi),
        z: obj.radiance * Math.cos(obj.theta),
      },
      spherical: { radius: obj.radiance, azimuth: obj.phi, altitude: obj.theta },
    });
  }
  return sunVectors;
}

export async function fetchIrradiance(baseUrl: string, lat: number, lon: number): Promise<SolarIrradianceData> {
  const url = baseUrl + '/' + lat.toFixed(1) + '/' + lon.toFixed(1) + '.json';
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const jsonData = await response.json();
    return jsonData;
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
    throw error;
  }
}

export function shadeIrradianceFromElevation(directIrradiance: Point[], shadingElevationAngles: SphericalPoint[]): void {}
