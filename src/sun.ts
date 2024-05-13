import { getPosition } from 'suncalc';

/**
 * Creates arrays of sun vectors. "cartesian" is a vector of length 3*Ndates where every three entries make up one vector.
 * "spherical" is a vector of length 2*Ndates, where pairs of entries are altitude, azimuth.
 * @param Ndates
 * @param lat
 * @param lon
 * @returns
 */
export function getRandomSunVectors(
  Ndates: number,
  lat: number,
  lon: number,
): {
  cartesian: Float32Array;
  spherical: Float32Array;
} {
  const sunVectors = new Float32Array(Ndates * 3);
  const sunVectorsSpherical = new Float32Array(Ndates * 2);
  var i = 0;
  while (i < Ndates) {
    let date = getRandomDate(new Date(2023, 1, 1), new Date(2023, 12, 31));

    const posSperical = getPosition(date, lat, lon);
    // pos.altitude: sun altitude above the horizon in radians,
    //   e.g. 0 at the horizon and PI/2 at the zenith (straight over your head)
    // pos. azimuth: sun azimuth in radians (direction along the horizon, measured
    //   from south to west), e.g. 0 is south and Math.PI * 3/4 is northwest

    if (posSperical.altitude < 0.1 || posSperical.altitude == Number.NaN) {
      continue;
    }
    sunVectors[3 * i] = -Math.cos(posSperical.altitude) * Math.sin(posSperical.azimuth);
    sunVectors[3 * i + 1] = -Math.cos(posSperical.altitude) * Math.cos(posSperical.azimuth);
    sunVectors[3 * i + 2] = Math.sin(posSperical.altitude);
    sunVectorsSpherical[2 * i] = posSperical.altitude;
    sunVectorsSpherical[2 * i + 1] = posSperical.azimuth;
    i += 1;
  }
  return { cartesian: sunVectors, spherical: sunVectorsSpherical };
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Converts an 2d vector of irradiance values in sperical coordinates to a 1d vector in euclidian coordinates
 * @param irradiance Vector of shape N_altitude x N_azimuth
 * @returns Vector of shape 3 x  N_altitude x N_azimuth
 */
export function convertSpericalToEuclidian(irradiance: number[][]): Float32Array {
  const altitudeSamples = irradiance.length;
  const azimuthSamples = irradiance[0].length;
  const altitudeStepSize = altitudeSamples > 1 ? Math.PI / 2 / (altitudeSamples - 1) : Math.PI / 2;
  const azimuthStepSize = (Math.PI * 2) / azimuthSamples;
  const sunVectors = new Float32Array(altitudeSamples * azimuthSamples * 3);
  let index = 0;
  for (let i = 0; i < altitudeSamples; i++) {
    for (let j = 0; j < azimuthSamples; j++) {
      sunVectors[index] = irradiance[i][j] * Math.sin(i * altitudeStepSize) * Math.cos(j * azimuthStepSize);
      sunVectors[index + 1] = irradiance[i][j] * Math.sin(i * altitudeStepSize) * Math.sin(j * azimuthStepSize);
      sunVectors[index + 2] = irradiance[i][j] * Math.cos(i * altitudeStepSize);
      index += 3;
    }
  }
  return sunVectors;
}

export async function fetchIrradiance(baseUrl: string, lat: number, lon: number): Promise<number[][]> {
  //TODO: Implement fullURL from url, lat, lon
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
