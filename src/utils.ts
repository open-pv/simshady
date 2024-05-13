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
export type SphericalPoint = {
  radius: number;
  altitude: number;
  azimuth: number;
};

export type CartesianPoint = {
  x: number;
  y: number;
  z: number;
};

export type Point = {
  cartesian: CartesianPoint;
  spherical: SphericalPoint;
};
