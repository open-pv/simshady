import { describe, expect, test, beforeEach, vi } from 'vitest';
import { HeadlessShadingScene } from '../src';
import { rayTracingWebGLWrapper } from '../src/rayTracingWebGLWrapper';
import { createHeadlessGL } from '../src/headless/createHeadlessGL';
import { solarData } from './data';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { runShadingSceneHeadlessChromium } from '../src';

describe('Headless WebGL Context Creation', () => {
  test('createHeadlessGL creates a WebGL context with default options', async () => {
    const gl = await createHeadlessGL();
    expect(gl).toBeDefined();
  });

  test('check for OES_texture_float', async () => {
    const gl = await createHeadlessGL();
    const hasTextureFloat = !!gl.getExtension('OES_texture_float');
    expect(hasTextureFloat).toBe(true);
    expect(gl).toBeDefined();
  });

  test('createHeadlessGL respects custom options', async () => {
    const size = 256;
    const options = {
      width: size,
      height: size,
      preserveDrawingBuffer: true,
      antialias: false,
    };

    const gl = await createHeadlessGL(options);
    expect(gl).toBeDefined();
    expect(gl.drawingBufferHeight).toBe(size);
    expect(gl.drawingBufferWidth).toBe(size);
  });
});

describe('rayTracingWebGLHeadless Function', () => {
  test('ray tracing functionality', async () => {
    const gl = await createHeadlessGL();
    const midpoints = new Float32Array([0, 0, 0]);
    const normals = new Float32Array([0, 0, 1]);
    const triangles = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const skySegments = new Float32Array([0, 0, 1, 1, 0, 0]);
    const progressCallback = vi.fn();
    const result = await rayTracingWebGLWrapper(midpoints, normals, triangles, skySegments, progressCallback, gl);

    expect(result).toBeDefined();
  });
});

describe('Headless Shading Scene Functionality', () => {
  let scene: HeadlessShadingScene;

  beforeEach(() => {
    scene = new HeadlessShadingScene();
  });

  test('dispose cleans up resources properly', async () => {
    const gl = await createHeadlessGL();
    scene.setWebGLContext(gl);
    scene.dispose();
    // if createBuffer throws an error then WebGL context has been disposed
    expect(() => gl.createBuffer()).toThrow();
  });

  test('check end to end works properly', async () => {
    const sim = new BufferGeometry();
    sim.setAttribute('position', new Float32BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3));
    const shade = new BufferGeometry();
    shade.setAttribute('position', new Float32BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3));
    scene.addSimulationGeometry(sim);
    scene.addShadingGeometry(shade);
    scene.addSolarIrradiance(solarData);
    const result = await scene.calculate();
    scene.dispose();
    expect(result).toBeDefined;
  });
});

describe('Headless Browser', () => {
  test('check browser functionality', async () => {
    const sim = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const shade = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);

    const result = await runShadingSceneHeadlessChromium(sim, shade, solarData);
    expect(result).toBeDefined();
  });
});
