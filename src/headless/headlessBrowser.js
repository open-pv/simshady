/**
 * Run ShadingScene in headless Chromium with WebGL2 enabled.
 */
export async function runShadingSceneHeadlessChromium(
  simulationPositions,
  shadingPositions,
  solarIrradiance,
  solarToElectricityConversionEfficiency,
  maxYieldPerSquareMeter,
  options = {},
) {
  const { default: a } = await require('puppeteer');
  const { default: puppeteer } = await import('puppeteer');
  const fs = await import('fs');
  const path = await import('path');

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
      throw new Error(`Failed to set page content: ${error.message}`);
    }

    const hasWebGL2 = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
    if (!hasWebGL2) {
      throw new Error('WebGL2 not available in headless Chromium.');
    }

    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle not found at ${bundlePath}. Please run 'yarn build' first.`);
    }
    const simshadyBundle = fs.readFileSync(bundlePath, 'utf8');
    let result;
    try {
      result = await page.evaluate(
        async ({
          simshadyBundle,
          sim,
          shade,
          irr,
          solarToElectricityConversionEfficiency,
          maxYieldPerSquareMeter,
          wantColors,
        }) => {
          try {
            const blob = new Blob([simshadyBundle], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);

            // needed for successful testing using vitest
            const dynamicImport = eval.call(null, 'u => import(u)');

            const { ShadingScene } = await dynamicImport(url);
            const { BufferGeometry, Float32BufferAttribute } = await dynamicImport('three');

            function fromArrays(pos) {
              const positions = new Float32Array(pos);
              if (positions.length % 9 !== 0) throw new Error('Triangle array length must be divisible by 9.');
              const geom = new BufferGeometry();
              geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
              return geom;
            }

            const simGeom = fromArrays(sim);
            const shadeGeom = fromArrays(shade);
            const scene = new ShadingScene();
            scene.addSimulationGeometry(simGeom);
            scene.addShadingGeometry(shadeGeom);
            scene.addSolarIrradiance(irr);

            const mesh = await scene.calculate({ solarToElectricityConversionEfficiency, maxYieldPerSquareMeter });

            const intensitiesAttr = mesh.geometry.getAttribute('intensities');
            const intensities = Array.from(intensitiesAttr.array);
            const out = { intensities };
            if (wantColors) {
              const colorAttr = mesh.geometry.getAttribute('color');
              if (colorAttr) {
                out.colors = Array.from(colorAttr.array);
              }
            }
            return out;
          } catch (error) {
            // return error here so it can get handled outside the browser context
            return { error: error.message, stack: error.stack };
          }
        },
        {
          simshadyBundle: simshadyBundle,
          sim: Array.from(simulationPositions),
          shade: Array.from(shadingPositions),
          solarToElectricityConversionEfficiency,
          maxYieldPerSquareMeter,
          irr: solarIrradiance,
          wantColors: returnColors,
        },
      );
      // Check if there was an error in the page evaluation
      if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(`Error in browser evaluation: ${result.error}`);
      }
    } catch (error) {
      throw new Error(`Failed to execute shading calculation in browser: ${error.message}`);
    }
    return result;
  } finally {
    await browser.close();
  }
}
