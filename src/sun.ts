import { getPosition } from 'suncalc';

export function getRandomSunVectors(Ndates: number, lat: number, lon: number): Float32Array {
  const sunVectors = new Float32Array(Ndates * 3);
  var i = 0;
  while (i < Ndates) {
    let date = getRandomDate(new Date(2023, 1, 1), new Date(2023, 12, 31));

    const pos = getPosition(date, lat, lon);
    if (pos.altitude < 0.1 || pos.altitude == Number.NaN) {
      continue;
    }
    sunVectors[3 * i] = -Math.cos(pos.altitude) * Math.sin(pos.azimuth);
    sunVectors[3 * i + 1] = -Math.cos(pos.altitude) * Math.cos(pos.azimuth);
    sunVectors[3 * i + 2] = Math.sin(pos.altitude);
    i += 1;
  }
  return sunVectors;
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function convertSpericalToEuclidian(irradiance: number[][]): Float32Array {
  const polarSamples = irradiance.length;
  const azimuthSamples = irradiance[0].length;
  const polarStepSize = Math.PI / 2 / polarSamples;
  const azimuthStepSize = (Math.PI * 2) / azimuthSamples;
  const sunVectors = new Float32Array(polarSamples * azimuthSamples * 3);
  for (let i = 0; i <= polarSamples; i++) {
    for (let j = 0; i <= azimuthSamples; i++) {
      sunVectors[i * j] = -irradiance[i][j] * Math.cos(i * polarStepSize) * Math.sin(j * azimuthStepSize);
      sunVectors[i * j + 1] = -irradiance[i][j] * Math.cos(i * polarStepSize) * Math.cos(j * azimuthStepSize);
      sunVectors[3 * i + 2] = irradiance[i][j] * Math.sin(i * polarStepSize);
    }
  }
  return sunVectors;
}

export async function fetchIrradiance(url: string, lat: number, lon: number): Promise<number[][]> {
  //TODO: Implement fullURL from url, lat, lon
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
