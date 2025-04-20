import { SolarIrradianceData, SphericalPoint, SunVector } from './utils';

export async function fetchIrradiance(baseUrl: string, lat: number, lon: number): Promise<SolarIrradianceData> {
  const url = baseUrl + '/' + lat.toFixed(0) + '.0/' + lon.toFixed(0) + '.0.json';
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

export function shadeIrradianceFromElevation(Irradiance: SunVector[], shadingElevationAngles: SphericalPoint[]): void {
  function findShadingElevation(azimuth: number): SphericalPoint {
    return shadingElevationAngles.reduce((prev, curr) =>
      Math.abs(curr.azimuth - azimuth) < Math.abs(prev.azimuth - azimuth) ? curr : prev,
    );
  }

  for (let i = Irradiance.length - 1; i >= 0; i--) {
    const point = Irradiance[i];
    const shadingElevation = findShadingElevation(point.vector.spherical.azimuth);
    if (shadingElevation && point.vector.spherical.altitude < shadingElevation.altitude) {
      Irradiance[i].isShadedByElevation = true;
    }
  }
}

/**
 * Converts intensities, which are solar energy per time per area, into
 * electric energy per time per area. This means multiplying every element of
 * intensities with the solarToElectricityConversionEfficiency.
 * @param intensities
 * @param solarToElectricityConversionEfficiency
 * @returns
 */
export function calculatePVYield(
  intensities: Float32Array[],
  solarToElectricityConversionEfficiency: number,
  daylightHours: number,
): Float32Array[] {
  // solarIrradiance.metadata.daylight_timesteps_processed is hours with daylight
  // 0.065 is solid angle (Raumwinkel) per skypixel in the HEALpix Level 4
  // 1/1000 is Watt to kiloWatt
  const factor = ((daylightHours * 0.065) / 1000) * solarToElectricityConversionEfficiency;
  return intensities.map((arr) => new Float32Array(arr.map((x) => x * factor)));
}
