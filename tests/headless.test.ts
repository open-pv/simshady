import { describe, expect, test } from 'vitest';
import { solarData } from './data';
import { runShadingSceneHeadlessChromium } from '../src/headless/headlessBrowser';

describe('Headless Browser', () => {
  test('check browser functionality', async () => {
    const sim = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const shade = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);

    const result = await runShadingSceneHeadlessChromium(sim, shade, solarData);
    expect(result).toBeDefined();
  });
});
