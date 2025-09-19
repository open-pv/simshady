import type { SolarIrradianceData } from '../utils';
export interface RunHeadlessChromiumOptions {
  returnColors?: boolean;
  launchArgs?: string[];
  executablePath?: string;
  dist_dirname?: string;
}

export interface RunHeadlessChromiumResult {
  intensities: number[];
  colors?: number[];
}

export function runShadingSceneHeadlessChromium(
  simulationPositions: Float32Array | number[],
  shadingPositions: Float32Array | number[],
  solarIrradiance: SolarIrradianceData | SolarIrradianceData[],
  solarToElectricityConversionEfficiency?: number,
  maxYieldPerSquareMeter?: number,
  options?: RunHeadlessChromiumOptions,
): Promise<RunHeadlessChromiumResult>;
