/**
  @ignore
 */
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

/**
 @ignore
 */
export type SunVector = {
  vector: Point;
  isShadedByElevation: boolean;
};

/**
 * Interface for the parameter object for {@link index.ShadingScene.calculate}
 */
export interface CalculateParams {
  /**
   * Number of random sun positions that are used to calculate the PV yield.
   * @defaultValue 80
   */
  numberSimulations?: number;

  /**
   * URL where the files for the diffuse Irradiance can be retreived.
   * The object at this URL needs to be of type {@link SolarIrradianceData}.
   * @defaultValue undefined - only direct irradiance is used.
   */
  diffuseIrradianceURL?: string;
  /**
   * Efficiency of the solar cell, value in [0,1].
   * @defaultValue 0.2
   */
  pvCellEfficiency?: number;
  /**
   * Upper boundary of annual yield in kWh/m2/year. This value is used to normalize
   * the color of the returned three.js mesh.
   * In Germany this is something like 1400 kWh/m2/year multiplied with the given pvCellEfficiency.
   * @defaultValue 1400*0.2
   */
  maxYieldPerSquareMeter?: number;
  /**
   * URL of a GEOTIF File of annual average direct irradiance data. An example lies at
   * https://www.openpv.de/data/irradiance/geotiff/
   */
  urlDirectIrrandianceTIF?: string;
  /**
   * URL of a GEOTIF File of annual average diffuse irradiance data. An example lies at
   * https://www.openpv.de/data/irradiance/geotiff/
   */
  urlDiffuseIrrandianceTIF?: string;
  progressCallback?: (progress: number, total: number) => void;
}
