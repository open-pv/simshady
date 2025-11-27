import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { SummaryExporter } from '../../src/headless/summaryExporter';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createMockMeshData } from './utils';

describe('SummaryExporter', () => {
  describe('aggregate', () => {
    test('compute yield for single triangle', async () => {
      // 1 triangle, area = 0.5 m², intensity = 100 kWh/m²
      // Expected: sum_yield = 100 * 0.5 = 50 kWh
      const meshData = createMockMeshData(1, [100]);

      const result = await SummaryExporter.aggregate(meshData);

      expect(result.perStep).toHaveLength(1);
      expect(result.perStep[0].sum_yield_in_kWh).toBeCloseTo(50);
      expect(result.total.sum_yield_total_in_kWh).toBeCloseTo(50);
      expect(result.total.total_area).toBeCloseTo(0.5);
    });

    test('compute correct yield for multiple triangles', async () => {
      // 2 triangles, each = 0.5 m², intensities = [100, 200]
      // Expected: sum_yield = 100*0.5 + 200*0.5 = 150 kWh
      const meshData = createMockMeshData(2, [100, 200]);

      const result = await SummaryExporter.aggregate(meshData);

      expect(result.perStep[0].sum_yield_in_kWh).toBeCloseTo(150);
      expect(result.total.total_area).toBeCloseTo(1.0);
    });

    test('computes correct yield for multiple timesteps', async () => {
      // 1 triangle, area = 0.5 m², 2 timesteps - intensities = [100, 200]
      // t=0: yield = 100 * 0.5 = 50
      // t=1: yield = 200 * 0.5 = 100
      // Expected: sum_yield = 150 kWh
      const meshData = createMockMeshData(1, [100, 200]);

      const result = await SummaryExporter.aggregate(meshData);

      expect(result.perStep).toHaveLength(2);
      expect(result.perStep[0].sum_yield_in_kWh).toBeCloseTo(50);
      expect(result.perStep[1].sum_yield_in_kWh).toBeCloseTo(100);
      expect(result.total.sum_yield_total_in_kWh).toBeCloseTo(150);
      expect(result.total.time_steps).toBe(2);
    });

    test('throw an error for invalid positions array length', async () => {
      const meshData = createMockMeshData(1);
      meshData.positions = new Float32Array([0, 0, 0, 1, 0]); // Only 5 elements, not divisible by 9

      await expect(SummaryExporter.aggregate(meshData)).rejects.toThrow('divisible by 9');
    });
  });

  describe('writeJSONSummary', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-exporter'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('write valid JSON file', async () => {
      const aggregation = {
        perStep: [
          {
            t: 0,
            sum_yield_in_kWh: 50,
            mean_yield_in_kWh: 100,
            theoretical_max_yield_in_kWh: 100,
            total_area: 0.5,
            active_area: 0.5,
          },
        ],
        total: {
          sum_yield_total_in_kWh: 50,
          mean_yield_total_in_kWh: 100,
          total_area: 0.5,
          active_area_mean: 0.5,
          active_area_ever: 0.5,
          time_steps: 1,
        },
      };

      const outputPath = path.join(tempDir, 'summary.json');
      await SummaryExporter.writeJSONSummary(aggregation, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(content.perStep).toHaveLength(1);
      expect(content.total.sum_yield_total_in_kWh).toBe(50);
    });
  });
});
