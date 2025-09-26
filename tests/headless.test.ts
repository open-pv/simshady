import { describe, expect, test } from 'vitest';
import { solarData } from './data';
import { runShadingSceneHeadlessChrome } from '../src/headless/headlessBrowser';

describe('Headless Browser', () => {
  test('check browser functionality', async () => {
    const sim = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const shade = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);

    const result = await runShadingSceneHeadlessChrome(sim, shade, solarData);
    expect(result).toBeDefined();
  });
});
