// Top level imports are only possible for classes and functions which do not get injected into the empty puppeteer page
import type { SolarIrradianceData } from '../utils';
import { ShadingScene as ShadingSceneType } from '../main';
import path from 'path';
import puppeteer from 'puppeteer';
import fs from 'fs';

export interface RunHeadlessChromeOptions {
  returnColors?: boolean;
  launchArgs?: string[];
  executablePath?: string;
  dist_dirname?: string;
}

export interface RunHeadlessChrome {
  intensities?: number[];
  colors?: number[];
  outSimGeom?: number[];
}

/**
 * Run ShadingScene in headless Chromium with WebGL2 enabled.
 */
export async function runShadingSceneHeadlessChrome(
  simulationPositions: Float32Array | number[],
  shadingPositions: Float32Array | number[],
  solarIrradiance: SolarIrradianceData | SolarIrradianceData[],
  solarToElectricityConversionEfficiency?: number,
  maxYieldPerSquareMeter?: number,
  options: RunHeadlessChromeOptions = {},
): Promise<RunHeadlessChrome> {
  // extremely ugly approach. Cli wrapper has to provide dist directory while test runs get resolved automatically
  const dirname = options.dist_dirname ?? path.resolve(__dirname, '../../dist/');
  const bundlePath = path.resolve(dirname, './index.js');

  const { returnColors = false, launchArgs = [], executablePath } = options;
  const browser = await puppeteer
    .launch({
      args: ['--headless=new', '--enable-webgl2', '--no-sandbox', ...launchArgs],
      protocolTimeout: 24 * 60 * 60 * 1_000,
      executablePath,
    })
    .catch((error) => {
      throw new Error(`Failed to launch Puppeteer browser: ${error.message}`);
    });
  try {
    const page = await browser.newPage();
    // Capture console logs from the page
    page.on('console', (msg) => {
      console.log('BROWSER CONSOLE:', msg.text());
    });

    // Expose functions to transfer data without serialization overhead
    await page.exposeFunction('getSimulationData', () => {
      return { positions: Array.from(simulationPositions) };
    });

    await page.exposeFunction('getShadingData', () => {
      return { positions: Array.from(shadingPositions) };
    });

    await page.exposeFunction('getIrradianceData', () => {
      return solarIrradiance;
    });

    let result: RunHeadlessChrome = {};
    await page.exposeFunction('setResultData', (res: RunHeadlessChrome) => {
      result = res;
    });

    try {
      await page.setContent(
        `
              <!doctype html>
              <meta charset="utf-8" />
              <script type="importmap">
              {
                "imports": {
                  "three": "https://unpkg.com/three@0.161.0/build/three.module.js",
                  "three/examples/jsm/utils/BufferGeometryUtils.js": "https://unpkg.com/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js"
                }
              }
              </script>
              <body></body>`.trim(),
        { waitUntil: 'domcontentloaded', timeout: 30000 },
      );
    } catch (error: any) {
      throw new Error(`Failed to set page content: ${error.message}`);
    }

    const hasWebGL2 = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
    if (!hasWebGL2) {
      throw new Error('WebGL2 not available in headless Chrome.');
    }

    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle not found at ${bundlePath}. Please run 'yarn build' first.`);
    }
    const simshadyBundle = fs.readFileSync(bundlePath, 'utf8');

    try {
      await page.evaluate(
        async ({ simshadyBundle, solarToElectricityConversionEfficiency, maxYieldPerSquareMeter, returnColors }) => {
          try {
            const blob = new Blob([simshadyBundle], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);

            // needed for successful testing using vitest
            const dynamicImport = eval.call(null, 'u => import(u)');

            const { ShadingScene } = await dynamicImport(url);
            const { BufferGeometry, Float32BufferAttribute } = await dynamicImport('three');

            const simData = await (window as any).getSimulationData();
            const shadeData = await (window as any).getShadingData();
            const irrData = await (window as any).getIrradianceData();

            function fromArrays(pos: number[]) {
              const positions = new Float32Array(pos);
              if (positions.length % 9 !== 0) {
                throw new Error('Triangle array length must be divisible by 9.');
              }
              const geom = new BufferGeometry();
              geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
              return geom;
            }

            const simGeom = fromArrays(simData.positions);
            const shadeGeom = fromArrays(shadeData.positions);
            const scene: ShadingSceneType = new ShadingScene();
            scene.addSimulationGeometry(simGeom);
            scene.addShadingGeometry(shadeGeom);
            scene.addSolarIrradiance(irrData);

            const mesh = await scene.calculate({ solarToElectricityConversionEfficiency, maxYieldPerSquareMeter });

            const intensitiesAttr = mesh.geometry.getAttribute('intensities');
            const intensities: number[] = Array.from(intensitiesAttr.array);
            let colors: number[] | undefined;
            if (returnColors) {
              const colorAttr = mesh.geometry.getAttribute('color');
              if (colorAttr) {
                colors = Array.from(colorAttr.array);
              }
            }

            const simGeomAttr = scene.simulationGeometry?.getAttribute('position');
            const outSimGeom: number[] = Array.from(simGeomAttr?.array ?? []);
            (window as any).setResultData({ intensities, colors, outSimGeom });
          } catch (error: any) {
            // set error here so it can get handled outside the browser context
            (window as any).setResultData({ error: error.message, stack: error.stack });
          }
        },
        {
          simshadyBundle,
          solarToElectricityConversionEfficiency,
          maxYieldPerSquareMeter,
          returnColors,
        },
      );
      // Check if there was an error in the page evaluation
      if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(`Error in browser evaluation: ${result.error}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to execute shading calculation in browser: ${error.message}`);
    }
    return result;
  } finally {
    await browser.close();
  }
}
