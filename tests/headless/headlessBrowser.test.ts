import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { solarData } from '../data';
import { runShadingSceneHeadlessChrome } from '../../src/headless/headlessBrowser';
import path from 'path';
import { DataLoader } from '../../src/headless/dataLoader';
import fs from 'fs';
import os from 'os';

describe('Headless Browser', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'headless'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('check browser functionality', async () => {
    const sim = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const shade = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const now = new Date().toISOString();
    const result = await runShadingSceneHeadlessChrome(sim, shade, solarData, now, undefined, { silent: true });
    expect(result).toBeUndefined();
  });

  test('check for output files', async () => {
    const dataLoader = new DataLoader();
    const positions = await dataLoader.load(path.join(__dirname, 'data/calibration.obj'), true);
    const irradianceData = await dataLoader.loadIrradianceData(path.join(__dirname, 'data/irradiance.json'));

    await runShadingSceneHeadlessChrome(positions, new Float32Array(), irradianceData, new Date().toISOString(), undefined, {
      outputDir: tempDir,
      silent: true,
      summary: true,
      snapshotTopdown: true,
      topdownSize: '1024x1024',
      obj: true,
    });

    // Check all output files exist
    expect(fs.existsSync(path.join(tempDir, 'snapshot_topdown.png'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'summary.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'mesh.obj'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'metadata.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'mesh/positions.bin'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'mesh/colors.bin'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'mesh/intensities.bin'))).toBe(true);
  }, 30000);
});

describe('Calibration - verify kWh unit', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'headless'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('1m² surface should yield about 1000 kWh', async () => {
    const dataLoader = new DataLoader();
    const positions = await dataLoader.load(path.join(__dirname, 'data/calibration.obj'), true);
    const irradianceData = await dataLoader.loadIrradianceData(path.join(__dirname, 'data/irradiance_munich_2018.json'));

    await runShadingSceneHeadlessChrome(positions, positions, irradianceData, new Date().toISOString(), undefined, {
      outputDir: tempDir,
      silent: false,
      summary: true,
      efficiency: 1.0, // set to 1.0 so the calculated yield doesn't get reduced
    });

    const summary = JSON.parse(fs.readFileSync(path.join(tempDir, 'summary.json'), 'utf-8'));

    // Verify actually 1m²
    expect(summary.total.total_area).toBeCloseTo(1.0, 1);

    // Verify yield is close to 1000 kWh
    expect(summary.total.sum_yield_total_in_kWh).toBeGreaterThan(900);
    expect(summary.total.sum_yield_total_in_kWh).toBeLessThan(1100);
  }, 30000);
});
