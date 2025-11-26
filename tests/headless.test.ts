import { afterEach, describe, expect, test } from 'vitest';
import { solarData } from './data';
import { runShadingSceneHeadlessChrome } from '../src/headless/headlessBrowser';
import path from 'path';
import { DataLoader } from '../src/headless/dataLoader';
import fs from 'fs';

describe('Headless Browser', () => {
  test('check browser functionality', async () => {
    const sim = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const shade = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const now = new Date().toISOString();
    const result = await runShadingSceneHeadlessChrome(sim, shade, solarData, now, undefined, { silent: true });
    expect(result).toBeUndefined();
  });
});

describe('Calibration - verify kWh unit', () => {
  afterEach(() => {
    const outputDir = path.join(__dirname, 'cli/');
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
  test('1m² surface should yield about 1000 kWh', async () => {
    const outputDir = path.join(__dirname, 'cli/results/calibration');

    const dataLoader = new DataLoader();
    const positions = await dataLoader.load(path.join(__dirname, 'data/calibration.obj'), true);
    const irradianceData = await dataLoader.loadIrradianceData(path.join(__dirname, 'data/irradiance_munich_2018.json'));

    await runShadingSceneHeadlessChrome(positions, positions, irradianceData, new Date().toISOString(), undefined, {
      outputDir,
      silent: true,
      summary: true,
      efficiency: 1.0, // set to 1.0 so the calculated yield doesn't get reduced
    });

    const summary = JSON.parse(fs.readFileSync(path.join(outputDir, 'summary.json'), 'utf-8'));

    // Verify actually 1m²
    expect(summary.total.total_area).toBeCloseTo(1.0, 1);

    // Verify yield is close to 1000 kWh
    expect(summary.total.sum_yield_total_in_kWh).toBeGreaterThan(900);
    expect(summary.total.sum_yield_total_in_kWh).toBeLessThan(1100);
  }, 60000);
});
