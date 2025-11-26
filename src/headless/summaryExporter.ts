import fs from 'fs';
import path from 'path';
import { MeshData } from './meshExporter';
import * as triangleUtils from '../triangleUtils';

/**
 * Contains all fields which get stored as part of the per step simulation results.
 */
type PerStepSummary = {
  t: number;
  sum_yield_in_kWh: number;
  mean_yield_in_kWh: number;
  theoretical_max_yield_in_kWh: number;
  total_area: number;
  active_area: number;
};

/**
 * Contains all fields which get stored as part of the accumulated simulation results.
 */
type TotalSummary = {
  sum_yield_total_in_kWh: number;
  mean_yield_total_in_kWh: number;
  total_area: number;
  active_area_mean: number;
  active_area_ever: number;
  time_steps: number;
};

type AggregationResult = {
  perStep: PerStepSummary[];
  total: TotalSummary;
};

/**
 * Handles the aggregation and analysis of simulation results.
 */
export class SummaryExporter {
  private static computeAreas(positions: ArrayLike<number>): Float32Array {
    if (positions.length % 9 !== 0) {
      throw new Error('Triangle array length must be divisible by 9.');
    }
    const N = positions.length / 9;
    const areas = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const start = i * 9;
      areas[i] = triangleUtils.area(positions as any, start);
    }
    return areas;
  }
  /**
   * Aggregate intensities and positions using triangle utils.
   */
  static async aggregate(meshData: MeshData): Promise<AggregationResult> {
    const positions = meshData.positions;
    const intensities = meshData.intensities;

    if (positions.length % 9 !== 0) {
      throw new Error('Triangle array length must be divisible by 9.');
    }
    const N = positions.length / 9;
    if (intensities.length % N !== 0) {
      throw new Error('Intensities length must be a multiple of triangle count.');
    }
    const T = intensities.length / N;

    const areas = this.computeAreas(positions);
    let A_sum = 0;
    for (let i = 0; i < N; i++) A_sum += areas[i];

    const perStep: PerStepSummary[] = [];
    let sum_yield_total = 0;
    let active_area_sum = 0;
    const everActive = new Uint8Array(N);

    for (let t = 0; t < T; t++) {
      let sum_yield_t = 0;
      let active_area_t = 0;
      let max_yield_t = 0;
      for (let i = 0; i < N; i++) {
        const I = intensities[t * N + i];
        const A = areas[i];
        if (I > max_yield_t) max_yield_t = I;
        sum_yield_t += I * A;
        active_area_t += A;
        everActive[i] = 1;
      }
      const mean_yield_t = A_sum > 0 ? sum_yield_t / A_sum : 0;
      perStep.push({
        t,
        sum_yield_in_kWh: sum_yield_t,
        mean_yield_in_kWh: mean_yield_t,
        theoretical_max_yield_in_kWh: max_yield_t,
        total_area: A_sum,
        active_area: active_area_t,
      });
      sum_yield_total += sum_yield_t;
      active_area_sum += active_area_t;
    }

    // Compute totals from global histogram
    const mean_yield_total = A_sum > 0 && T > 0 ? sum_yield_total / (A_sum * T) : 0;
    let active_area_ever = 0;
    for (let i = 0; i < N; i++) if (everActive[i]) active_area_ever += areas[i];

    const total: TotalSummary = {
      sum_yield_total_in_kWh: sum_yield_total,
      mean_yield_total_in_kWh: mean_yield_total,
      total_area: A_sum,
      active_area_mean: T > 0 ? active_area_sum / T : 0,
      active_area_ever,
      time_steps: T,
    };

    return { perStep, total };
  }

  /**
   * Write JSON summary using streaming.
   */
  static async writeJSONSummary(aggregation: AggregationResult, outputPath: string): Promise<void> {
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

    return new Promise((resolve, reject) => {
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);

      // Write opening brace and perStep array
      writeStream.write('{\n  "perStep": [\n');

      // Write perStep entries one by one
      aggregation.perStep.forEach((step, index) => {
        const isLast = index === aggregation.perStep.length - 1;
        const json = JSON.stringify(step, null, 2);
        // Indent each line of the step JSON
        const indented = json
          .split('\n')
          .map((line) => '    ' + line)
          .join('\n');
        writeStream.write(indented);
        if (!isLast) {
          writeStream.write(',\n');
        } else {
          writeStream.write('\n');
        }
      });

      // Write total summary
      writeStream.write('  ],\n  "total": ');
      const totalJson = JSON.stringify(aggregation.total, null, 2);
      const indentedTotal = totalJson
        .split('\n')
        .map((line, i) => (i === 0 ? line : '  ' + line))
        .join('\n');
      writeStream.write(indentedTotal);
      writeStream.write('\n}\n');

      writeStream.end();
    });
  }

  /**
   * Write complete aggregation result with all outputs
   */
  static async writeAggregationResults(meshData: MeshData, outputDir: string): Promise<void> {
    try {
      const aggregation = await this.aggregate(meshData);

      const summaryPath = path.join(outputDir, 'summary.json');
      await this.writeJSONSummary(aggregation, summaryPath);
    } catch (e: any) {
      console.error('Summary generation failed:', e.message);
    }
  }
}
