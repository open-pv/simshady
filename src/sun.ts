import { GeoTIFFImage, fromUrl } from 'geotiff';
import { SolarIrradianceData, SphericalPoint, SunVector } from './utils';

/**
 * Converts an 2d vector of irradiance values in sperical coordinates to a 1d vector in euclidian coordinates.
 * It expects:
 * - all angles in degree, not radiant
 * - azimuth=0 is North
 * - azimuth=90 is East
 * - altitude=0 is horizon
 * - altitude=90 is up
 * The resulting coordinate system is right handed with:
 * - x positive is East
 * - Y positive is North
 * - Z positive is upwards
 * @param irradiance Vector of shape N_altitude x N_azimuth
 * @returns Vector of shape 3 x  N_altitude x N_azimuth
 */
export function convertSpericalToEuclidian(irradiance: SolarIrradianceData): SunVector[] {
  const sunVectors: SunVector[] = [];

  for (let obj of irradiance.data) {
    sunVectors.push({
      vector: {
        cartesian: {
          x: obj.radiance * Math.cos((Math.PI / 180) * obj.altitude) * Math.sin((Math.PI / 180) * obj.azimuth),
          y: obj.radiance * Math.cos((Math.PI / 180) * obj.altitude) * Math.cos((Math.PI / 180) * obj.azimuth),
          z: obj.radiance * Math.sin((Math.PI / 180) * obj.altitude),
        },
        spherical: { radius: obj.radiance, azimuth: obj.azimuth, altitude: obj.altitude },
      },
      isShadedByElevation: false,
    });
  }
  return sunVectors;
}

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
 * Calculates the yield of a solar panel in kWh/m2
 * @param intensities
 * @param solarToElectricityConversionEfficiency
 * @returns
 */
export function calculatePVYield(intensities: Float32Array, solarToElectricityConversionEfficiency: number): Float32Array {
  let PVYield = new Float32Array(intensities.length);

  for (let i = 0; i < PVYield.length; i++) {
    PVYield[i] = solarToElectricityConversionEfficiency * intensities[i];
  }
  return PVYield;
}
