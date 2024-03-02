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
