// Top level imports are only possible for classes and functions which do not get injected into the puppeteer page
import type { SolarIrradianceData } from '../utils';
import { ShadingScene as ShadingSceneType } from '../main';
import path from 'path';
import puppeteer from 'puppeteer';
import fs from 'fs';
import { BufferGeometry as BufferGeometryType } from 'three';
import { SummaryExporter } from './summaryExporter';
import { MeshExporter } from './meshExporter';
import { CLIOptions } from '../types/CLIOptions';
import { SnapshotExporter } from './snapshotExporter';
import { ObjExporter } from './objExporter';

/**
 * Run ShadingScene in headless Chromium with WebGL2 enabled.
 * Currently, the simshady CLI requires the built bundle, which is dynamically imported in the browser.
 * Since three.js isn't bundled with simshady, it's loaded from unpkg.
 *
 * If it is not possible to load from unpkg, one can bundle three.js within simshady by exporting it in the index,
 * adjusting the tsup config and updating the three.js imports. This would allow direct imports instead of loading from unpkg.
 * @link https://github.com/open-pv/simshady/pull/68
 * @link https://github.com/open-pv/simshady/pull/68#discussion_r2564949596
 */
export async function runShadingSceneHeadlessChrome(
  simulationPositions: Float32Array,
  shadingPositions: Float32Array,
  solarIrradiance: SolarIrradianceData | SolarIrradianceData[],
  startTime: string,
  dist_dirname?: string,
  options: CLIOptions = {},
) {
  const dirname = dist_dirname ?? path.resolve(__dirname, '../../dist/');
  const bundlePath = path.resolve(dirname, './index.js');

  const launchArgs = (options.chromeArgs ?? []).flatMap((arg) => arg.split(/\s+/).filter(Boolean));
  const browser = await puppeteer
    .launch({
      args: [
        '--headless=new',
        '--enable-webgl2',
        '--no-sandbox',
        '--disable-dev-shm-usage', // Overcome limited resource problems
        `--js-flags=--max_old_space_size=${options.maxOldSpaceSize}`, // Increase V8 heap size
        ...launchArgs,
      ],
      protocolTimeout: 24 * 60 * 60 * 1_000,
    })
    .catch((error) => {
      throw new Error(`Failed to launch Puppeteer browser: ${error.message}`);
    });
  try {
    const page = await browser.newPage();
    // Capture console logs from the page
    page.on('console', (msg) => {
      if (!options.silent) {
        console.log('BROWSER CONSOLE:', msg.text());
      }
    });

    // helper functions for loading data chunkwise into the browser
    await page.exposeFunction('getSimInfo', () => {
      return { length: simulationPositions.length };
    });
    await page.exposeFunction('getSimChunk', (offset: number, count: number) => {
      const end = Math.min(simulationPositions.length, offset + count);
      return Array.from(simulationPositions.subarray(offset, end));
    });

    await page.exposeFunction('getShadeInfo', () => {
      return { length: shadingPositions.length };
    });
    await page.exposeFunction('getShadeChunk', (offset: number, count: number) => {
      const end = Math.min(shadingPositions.length, offset + count);
      return Array.from(shadingPositions.subarray(offset, end));
    });

    await page.exposeFunction('getIrradianceData', () => {
      return solarIrradiance;
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
    } catch (error) {
      throw new Error(`Failed to set page content: ${error}`);
    }

    // check if WebGL2 is available
    const hasWebGL2 = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
    if (!hasWebGL2) {
      throw new Error('WebGL2 not available in headless Chrome.');
    }

    // check if simshady bundle exists
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`simshady bundle not found at ${bundlePath}. Please run 'yarn build' first.`);
    }
    const simshadyBundle = fs.readFileSync(bundlePath, 'utf8');

    try {
      await page.evaluate(
        async ({ simshadyBundle, solarToElectricityConversionEfficiency, maxYieldPerSquareMeter }) => {
          try {
            const blob = new Blob([simshadyBundle], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);

            // needed for successful testing using vitest
            const dynamicImport = eval.call(null, 'u => import(u)');

            const { ShadingScene } = await dynamicImport(url);
            const { BufferGeometry, Float32BufferAttribute } = await dynamicImport('three');

            // Pull simulation/shading geometry in chunks into browser context
            async function loadFloat32(totalLen: number, chunkFn: (offset: number, count: number) => Promise<number[]>) {
              const out = new Float32Array(totalLen);
              const CHUNK = 100000;
              for (let offset = 0; offset < totalLen; offset += CHUNK) {
                const count = Math.min(CHUNK, totalLen - offset);
                const part = await chunkFn(offset, count);
                out.set(part as any, offset);
              }
              return out;
            }

            console.log('Move data to browser memory');
            const simInfo = await (window as any).getSimInfo();
            const shadeInfo = await (window as any).getShadeInfo();
            const simPositions = await loadFloat32(simInfo.length, (o, c) => (window as any).getSimChunk(o, c));
            const shadePositions = await loadFloat32(shadeInfo.length, (o, c) => (window as any).getShadeChunk(o, c));
            const irrData = await (window as any).getIrradianceData();
            console.log('Data successfully moved to browser memory!');

            function fromArrays(positions: Float32Array) {
              if (positions.length % 9 !== 0) {
                throw new Error('Triangle array length must be divisible by 9.');
              }
              const geom: BufferGeometryType = new BufferGeometry();
              geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
              return geom;
            }

            const simGeom = fromArrays(simPositions);
            const shadeGeom = fromArrays(shadePositions);
            const scene: ShadingSceneType = new ShadingScene();
            scene.addSimulationGeometry(simGeom);
            scene.addShadingGeometry(shadeGeom);
            scene.addSolarIrradiance(irrData);
            console.log('Start Shading Simulation');
            const mesh = await scene.calculate({ solarToElectricityConversionEfficiency, maxYieldPerSquareMeter });
            console.log('Shading Simulation Finished');

            // Attach mesh on window for artifact calculations
            (window as any).__simshady__ = { mesh };
          } catch (error: any) {
            // set error here so it can get handled outside the browser context
            console.error('Error in browser evaluation:', error);
            throw error;
          }
        },
        {
          simshadyBundle,
          solarToElectricityConversionEfficiency: options.efficiency,
          maxYieldPerSquareMeter: options.maximumYield,
        },
      );

      if (!options.silent) console.log('Finished Mesh Calculation');

      // Export artifacts
      if (options.outputDir) {
        const meshData = await MeshExporter.collectMeshData(page, options, startTime);
        // Export binary mesh data
        await MeshExporter.exportMeshData(meshData, options.outputDir);

        // Summary Task
        if (options.summary !== false) await SummaryExporter.writeAggregationResults(meshData, options.outputDir);

        // Snapshot
        if (options.snapshotTopdown !== false) await SnapshotExporter.startTopDownGeneration(page, options);

        // OBJ Export
        if (options.obj !== false) await ObjExporter.exportObj(meshData, options.outputDir);

        if (!options.silent) console.log(`Artifacts written to: ${options.outputDir}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to execute shading calculation in browser: ${error.message}`);
    }
  } finally {
    await browser.close();
  }
}
