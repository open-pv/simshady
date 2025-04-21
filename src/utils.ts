/**
 * Solar irradiance data. `metadata` json holds the coordinates
 * where the irradiance data can be used. daylight_timesteps_processed
 * is the number of hours of daylight in the considered timeframe. If
 * the skydome represents a whole year, this is about 4700.
 * 
 * `data` holds a list of
 * sky segments, where altitude and azimuth define the position
 * and radiance defines the amount of incoming radiance. Read more about
 * it in the "How does simshady work" section of the docs page.
 *
 * Definition of the coordiante system in `simshady`:
 * Angles are expected in degree.
 * Azimuth = 0 is North, Azimuth = 90° is East.
 * Altitude = 0 is the horizon, Altitude = 90° is upwards / Zenith.
 * 
 * Example Data:
 * ```json
 * {
    "data": [
        {
            "altitude": 78.28,
            "azimuth": 45.0,
            "radiance": 32.13
        },
        {
            "altitude": 78.28,
            "azimuth": 135.0,
            "radiance": 32.13
        },
        ...
        ],
    "metadata": {
        "latitude": 48.5,
        "longitude": 11.5,
        "daylight_timesteps_processed": 4700,
    }
}
  ```
 */
export type SolarIrradianceData = {
  metadata: {
    latitude: number;
    longitude: number;
    daylight_timesteps_processed: number;
  };
  data: Array<{
    altitude: number;
    azimuth: number;
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
 * Positive X-axis is east.
 * Positive Y-axis is north.
 * Positive z-axis is upwards.
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
 * Interface for the parameter object for {@link ShadingScene.calculate}
 */
export interface CalculateParams {
  /**
   * Efficiency of the conversion from solar energy to electricity. This includes the
   * pv cell efficiency (about 20%) as well as the coverage density of PV panels per area
   * (about 70%).
   * Value in [0,1].
   * @defaultValue 0.15
   */
  solarToElectricityConversionEfficiency?: number;
  /**
   * Upper boundary of annual yield in kWh/m2/year. This value is used to normalize
   * the color of the returned three.js mesh.
   * In Germany this is something like 1400 kWh/m2/year multiplied with the given
   * solarToElectricityConversionEfficiency.
   * @defaultValue 1400*0.15
   */
  maxYieldPerSquareMeter?: number;
  /**
   * Callback function to indicate the progress of the simulation
   * @param progress number indicating the current progress
   * @param total number indicating the final number that progress needs to reach
   * @returns
   */
  progressCallback?: (progress: number, total: number) => void;
}

/**
 * @ignore
 * Mimics a for-loop but schedules each loop iteration using `setTimeout`, so that
 * event handles, react updates, etc. can run in-between
 */
export async function timeoutForLoop(start: number, end: number, body: (i: number) => void, step: number = 1) {
  return new Promise<void>((resolve) => {
    const inner = (i: number) => {
      body(i);
      i = i + step;
      if (i >= end) {
        resolve();
      } else {
        setTimeout(() => inner(i), 0);
      }
    };
    setTimeout(() => inner(start), 0);
  });
}

/**
 * @ignore
 * Helper to log NaN counts in data arrays. If no NaN values are found
 * nothing is logged.
 */
export function logNaNCount(name: string, array: Float32Array): void {
  const nanCount = Array.from(array).filter(isNaN).length;
  if (nanCount > 0) {
    console.log(`${nanCount}/${array.length} ${name} coordinates are NaN`);
  }
}
