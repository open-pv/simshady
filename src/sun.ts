import { GeoTIFFImage, fromUrl } from 'geotiff';
import { SolarIrradianceData, SphericalPoint, SunVector } from './utils';

/**
 * Converts an 2d vector of irradiance values in sperical coordinates to a 1d vector in euclidian coordinates
 * @param irradiance Vector of shape N_altitude x N_azimuth
 * @returns Vector of shape 3 x  N_altitude x N_azimuth
 */
export function convertSpericalToEuclidian(irradiance: SolarIrradianceData): SunVector[] {
  const sunVectors: SunVector[] = [];

  for (let obj of irradiance.data) {
    sunVectors.push({
      vector: {
        cartesian: {
          x: obj.radiance * Math.sin(obj.theta) * Math.cos(obj.phi),
          y: obj.radiance * Math.sin(obj.theta) * Math.sin(obj.phi),
          z: obj.radiance * Math.cos(obj.theta),
        },
        spherical: { radius: obj.radiance, azimuth: obj.phi, altitude: obj.theta },
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
 *
 * @param url url where the tiff radiation image lies
 * @param tiffBoundingBox bounding box defining the box of the given tiff image: min Longitude , min Latitude , max Longitude , max Latitude
 * @param lat latitude of interest
 * @param lon longitude of interest
 * @returns
 */
export async function getTiffValueAtLatLon(
  url: string,
  tiffBoundingBox: [number, number, number, number],
  lat: number,
  lon: number,
): Promise<number> {
  const [minLon, minLat, maxLon, maxLat] = tiffBoundingBox;

  const tiff = await fromUrl(url);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();

  const pixelX = Math.floor(((lon - minLon) / (maxLon - minLon)) * width);
  const pixelY = Math.floor(((maxLat - lat) / (maxLat - minLat)) * height);
  if (pixelX < 0 || pixelY < 0 || pixelX > width || pixelY > height) {
    throw new Error('Given coordinates are outside the bounding box.');
  }
  const rasterData = await image.readRasters({ window: [pixelX, pixelY, pixelX + 1, pixelY + 1] });
  let radiation;
  if (typeof rasterData[0] === 'number') {
    radiation = rasterData[0];
  } else {
    radiation = rasterData[0][0];
  }
  if (radiation != 0) {
    return radiation;
  }

  const searchClosestRasterValue = async (
    image: GeoTIFFImage,
    pixelX: number,
    pixelY: number,
    width: number,
    height: number,
  ): Promise<number> => {
    let radiation;
    for (let i = 1; i < Math.max(width, height); i++) {
      const offsets = [
        [pixelX - i, pixelY],
        [pixelX + i, pixelY],
        [pixelX, pixelY - i],
        [pixelX, pixelY + i],
        [pixelX - i, pixelY - i],
        [pixelX + i, pixelY + i],
        [pixelX - i, pixelY + i],
        [pixelX + i, pixelY - i],
      ];
      for (const [x, y] of offsets) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          let rasterData = await image.readRasters({ window: [x, y, x + 1, y + 1] });
          if (typeof rasterData[0] === 'number') {
            radiation = rasterData[0];
          } else {
            radiation = rasterData[0][0];
          }
          if (radiation !== 0) {
            return radiation;
          }
        }
      }
    }
    throw new Error('Unexpected behaviour - it was not possible to get radiation values from the provided tiff file.');
  };
  radiation = searchClosestRasterValue(image, pixelX, pixelY, width, height);

  return radiation;
}

/**
 * Calculates the yield of a solar panel in kWh/m2/a
 * @param directIntensities
 * @param diffuseIntensities
 * @param pvCellEfficiency
 * @param lat
 * @param lon
 * @returns
 */
export async function calculatePVYield(
  directIntensities: Float32Array,
  diffuseIntensities: Float32Array,
  pvCellEfficiency: number,
  lat: number,
  lon: number,
  urlDirectIrrandianceTIF: string,
  urlDiffuseIrrandianceTIF: string,
): Promise<Float32Array> {
  let intensities = new Float32Array(directIntensities.length);
  const normalizationDirect = 0.5;
  const normalizationDiffuse = 72;
  // Both values come from the calibration function in https://github.com/open-pv/minimalApp
  // There the intensities are calibrated based on a horizontal plane
  const directRadiationAverage = await getTiffValueAtLatLon(urlDirectIrrandianceTIF, [5.9, 47.3, 15.0, 55.0], lat, lon);
  if (diffuseIntensities.length == 0) {
    for (let i = 0; i < intensities.length; i++) {
      intensities[i] = pvCellEfficiency * ((1.7 * (directRadiationAverage * directIntensities[i])) / normalizationDirect);
      //TODO: How can this factor 1.7 be changed? Is 1.7 a useful number?
    }
    return intensities;
  }
  const diffuseRadiationAverage = await getTiffValueAtLatLon(urlDiffuseIrrandianceTIF, [5.9, 47.3, 15.0, 55.0], lat, lon);

  for (let i = 0; i < intensities.length; i++) {
    intensities[i] =
      pvCellEfficiency *
      ((diffuseRadiationAverage * diffuseIntensities[i]) / normalizationDiffuse +
        (directRadiationAverage * directIntensities[i]) / normalizationDirect);
  }
  console.log('Intensities after efficiency was multiplied', intensities);
  return intensities;
}
