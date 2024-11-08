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
 * RGB values of a color, where all values are in intervall [0,1]
 */
export type Color = [number, number, number];

/**
 * A color Map maps a value t in [0,1] to a color
 */
export type ColorMap = (t: number) => Color;

/**
 * Interface for the parameter object for {@link index.ShadingScene.calculate}
 */
export interface CalculateParams {
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

/**
 * Mimics a for-loop but schedules each loop iteration using `setTimeout`, so that
 * event handles, react updates, etc. can run in-between
 */
export async function timeoutForLoop(start: number, end: number, body: (i: number) => void) {
  return new Promise<void>((resolve) => {
    const inner = (i: number) => {
      body(i);
      i = i + 1;
      if (i == end) {
        resolve();
      } else {
        setTimeout(() => inner(i), 0);
      }
    };
    setTimeout(() => inner(0), 0);
  });
}
