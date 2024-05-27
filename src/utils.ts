export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
}
export type SolarIrradianceData = {
  metadata: {
    description: string;
    latitude: number;
    longitude: number;
    samples_phi: number;
    samples_theta: number;
  };
  data: Array<{
    theta: number;
    phi: number;
    radiance: number;
  }>;
};

/**
 * Spherical Coordinate of a point.
 *
 * Azimuth = 0 is North, Azimuth = PI/2 is East.
 *
 * Altitude = 0 is the horizon, Altitude = PI/2 is upwards / Zenith.
 */
export type SphericalPoint = {
  radius: number;
  altitude: number;
  azimuth: number;
};

/**
 * Cartesian Coordinate of a point.
 *
 * Positive X-Axis is north.
 */
export type CartesianPoint = {
  x: number;
  y: number;
  z: number;
};

export type Point = {
  cartesian: CartesianPoint;
  spherical: SphericalPoint;
};

export type SunVector = {
  vector: Point;
  isShadedByElevation: boolean;
};
