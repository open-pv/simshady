import { CartesianPoint, SphericalPoint } from './utils';

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
 * Returns the vector from start to end in the Horizontal coordinate system
 * @param start
 * @param end
 * @returns
 */
export function calculateSphericalCoordinates(start: CartesianPoint, end: CartesianPoint): SphericalPoint {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  if (dx == 0 && dy == 0) {
    return { radius: 1, azimuth: 0, altitude: 0 };
  }

  const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const altitude = Math.asin(dz / r);

  let azimuth = (2 * Math.PI - Math.atan2(dy, dx)) % (2 * Math.PI);

  return { radius: 1, azimuth, altitude };
}

/**
 * Calculates the maximum heights visible from an observer in a set of directions.
 * Returns a list of spherical points of length numDirections.
 * @param elevation list of points with x,y,z component
 * @param observer Point of interest for which the elevation angles are calculated.
 * @param directions List of altitude azimuth pairs. Angles in degree and conform to the
 * coordinate space definition of simshady.
 * @returns
 */
export function getElevationShadingMask(
  elevation: CartesianPoint[],
  observer: CartesianPoint,
  directions: [number, number][],
): [number, number, number][] {
  const shadingMask: [number, number, number][] = [];

  for (const [altDeg, azDeg] of directions) {
    const azRad = (azDeg * Math.PI) / 180;
    const altRad = (altDeg * Math.PI) / 180;
    let maxAltitude = -Infinity;

    for (const point of elevation) {
      const { azimuth, altitude } = calculateSphericalCoordinates(observer, point);
      const azDiff = Math.abs(((azimuth - azRad + Math.PI) % (2 * Math.PI)) - Math.PI);
      if (azDiff < Math.PI / 180) {
        // approx 1 degree tolerance
        if (altitude > maxAltitude) maxAltitude = altitude;
      }
    }

    const isVisible = altRad > maxAltitude ? 1 : 0;
    shadingMask.push([altDeg, azDeg, isVisible]);
  }

  return shadingMask;
}
