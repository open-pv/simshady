import { Point, SphericalPoint } from './utils';

export function fillMissingAltitudes(maxAngles: SphericalPoint[]): void {
  // First copy the maxAngles to a newAngles list, so that changes
  // in the list do not affect the algorithm
  let newAngles = maxAngles.map((angle) => ({ ...angle }));
  for (let i = 0; i < newAngles.length; i++) {
    if (newAngles[i].altitude != -Infinity) {
      continue;
    }
    let distance = 1;
    while (true) {
      let prevIndex = (i - distance + newAngles.length) % newAngles.length;
      let nextIndex = (i + distance) % newAngles.length;

      if (maxAngles[nextIndex].altitude !== -Infinity) {
        newAngles[i].altitude = maxAngles[nextIndex].altitude;
        break;
      } else if (maxAngles[prevIndex].altitude !== -Infinity) {
        newAngles[i].altitude = maxAngles[prevIndex].altitude;
        break;
      } else distance++;
    }
  }
  // Overwrite the maxAngles to make changes in this vector global
  for (let i = 0; i < maxAngles.length; i++) {
    maxAngles[i] = newAngles[i];
  }
}

/**
 *
 * @param start
 * @param end
 * @returns azimuth from 0 to 2*PI and altitude from 0 to PI/2, where altitude = 0 is facing directly upwards
 */
export function calculateSphericalCoordinates(start: Point, end: Point): { azimuth: number; altitude: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;

  const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const altitude = Math.acos(dz / r);
  let azimuth = Math.atan2(dy, dx);

  if (azimuth < 0) {
    azimuth += 2 * Math.PI; // Adjust azimuth to be from 0 to 2PI
  }

  return { azimuth, altitude };
}

/**
 * Calculates the maximum heights visible from an observer in a set of directions.
 * Returns a list of spherical points of length numDirections.
 * @param elevation list of points with x,y,z component
 * @param observer Point of interest for which the elevation angles are calculated.
 * @param numDirections Number of steps for the azimuth angle.
 * @returns
 */
export function getMaxElevationAngles(elevation: Point[], observer: Point, numDirections: number = 360): SphericalPoint[] {
  let maxAngles: SphericalPoint[] = Array.from({ length: numDirections }, (_, index) => ({
    radius: 1,
    azimuth: index * ((2 * Math.PI) / numDirections),
    altitude: -Infinity,
  }));

  for (let point of elevation) {
    const { azimuth, altitude } = calculateSphericalCoordinates(observer, point);
    console.log(azimuth, altitude);
    const closestIndex = Math.round(azimuth / ((2 * Math.PI) / numDirections)) % numDirections;

    if (altitude > maxAngles[closestIndex].altitude) {
      maxAngles[closestIndex].altitude = altitude;
    }
  }
  fillMissingAltitudes(maxAngles);
  return maxAngles;
}
