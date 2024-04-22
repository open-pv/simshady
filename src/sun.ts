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
