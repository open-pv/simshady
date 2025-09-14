import { describe, test, expect, beforeAll } from 'vitest';
import { rayTracingWebGL1Headless } from '../src/headless/rayTracingWebGL1Headless';
import { createHeadlessGL } from '../src/headless/createHeadlessGL';

let gl: WebGLRenderingContext;

beforeAll(async () => {
  gl = await createHeadlessGL({ createWebGL2Context: false, width: 64, height: 64 });
});

function expectCloseArray(actual: Float32Array, expected: number[], eps = 0.0) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThanOrEqual(eps);
  }
}

function makeFloat32(arr: number[]): Float32Array {
  return new Float32Array(arr);
}

function makeTriangle(u: [number, number, number], v: [number, number, number], w: [number, number, number]): number[] {
  return [...u, ...v, ...w];
}

describe('rayTracingWebGL1Headless - intensity without occlusion', () => {
  test('aligned: normal (+Z) and sun (+Z) -> 1.0', async () => {
    const midpoints = makeFloat32([0, 0, 0]);
    const normals = makeFloat32([0, 0, 1]);
    const triangles = makeFloat32(makeTriangle([-10, -10, -1], [10, -10, -1], [0, 10, -1])); // behind the point
    const sunDirs = makeFloat32([0, 0, 1]);

    const res = await rayTracingWebGL1Headless(midpoints, normals, triangles, sunDirs, () => {}, gl);
    expect(res).toBeTruthy();
    expect(res!.length).toBe(1);
    expectCloseArray(res![0], [1.0]);
  });

  test('orthogonal: normal (+Z) and sun (+X) -> 0.0', async () => {
    const midpoints = makeFloat32([0, 0, 0]);
    const normals = makeFloat32([0, 0, 1]);
    const triangles = makeFloat32(makeTriangle([-10, -10, -1], [10, -10, -1], [0, 10, -1]));
    const sunDirs = makeFloat32([1, 0, 0]);

    const res = await rayTracingWebGL1Headless(midpoints, normals, triangles, sunDirs, () => {}, gl);
    expect(res).toBeTruthy();
    expectCloseArray(res![0], [0.0]);
  });

  test('opposite: normal (+Z) and sun (-Z) -> 1.0', async () => {
    const midpoints = makeFloat32([0, 0, 0]);
    const normals = makeFloat32([0, 0, 1]);
    // Place occluder away from the -Z ray (put it at +Z)
    const triangles = makeFloat32(makeTriangle([-10, -10, 1], [10, -10, 1], [0, 10, 1]));
    const sunDirs = makeFloat32([0, 0, -1]);

    const res = await rayTracingWebGL1Headless(midpoints, normals, triangles, sunDirs, () => {}, gl);
    expect(res).toBeTruthy();
    expectCloseArray(res![0], [1.0]);
  });

  test('60 deg angle: normal (+Z) and sun 60 deg from Z+  -> 0.5', async () => {
    const midpoints = makeFloat32([0, 0, 0]);
    const normals = makeFloat32([0, 0, 1]);
    const triangles = makeFloat32(makeTriangle([-10, -10, -1], [10, -10, -1], [0, 10, -1]));
    // x = sin(60°); z = cos(60°)
    const dir = [Math.sqrt(3) / 2, 0, 0.5];
    const sunDirs = makeFloat32(dir);

    const res = await rayTracingWebGL1Headless(midpoints, normals, triangles, sunDirs, () => {}, gl);
    expect(res).toBeTruthy();
    expectCloseArray(res![0], [0.5], 0.01);
  });
});

describe('rayTracingWebGL1Headless - intensity with occlusion', () => {
  test('occluder between point and sun → 0.0', async () => {
    const midpoints = makeFloat32([0, 0, 0]);
    const normals = makeFloat32([0, 0, 1]);
    // big triangle at z=+0.5 covering the ray from origin to +Z
    const triangles = makeFloat32(makeTriangle([-10, -10, 0.5], [10, -10, 0.5], [0, 10, 0.5]));
    const sunDirs = makeFloat32([0, 0, 1]);

    const res = await rayTracingWebGL1Headless(midpoints, normals, triangles, sunDirs, () => {}, gl);
    expect(res).toBeTruthy();
    expectCloseArray(res![0], [0.0]);
  });

  test('occluder below point → 1.0', async () => {
    const midpoints = makeFloat32([0, 0, 0]);
    const normals = makeFloat32([0, 0, 1]);
    const triangles = makeFloat32(makeTriangle([-10, -10, -0.5], [10, -10, -0.5], [0, 10, -0.5]));
    const sunDirs = makeFloat32([0, 0, 1]);

    const res = await rayTracingWebGL1Headless(midpoints, normals, triangles, sunDirs, () => {}, gl);
    expect(res).toBeTruthy();
    expectCloseArray(res![0], [1.0]);
  });

  test('occluder off-axis → 1.0', async () => {
    const midpoints = makeFloat32([0, 0, 0]);
    const normals = makeFloat32([0, 0, 1]);
    // triangle at z=+0.5 but far on +X so the +Z ray misses it
    const triangles = makeFloat32(makeTriangle([10, -10, 0.5], [12, -10, 0.5], [10, 10, 0.5]));
    const sunDirs = makeFloat32([0, 0, 1]);

    const res = await rayTracingWebGL1Headless(midpoints, normals, triangles, sunDirs, () => {}, gl);
    expect(res).toBeTruthy();
    expectCloseArray(res![0], [1.0]);
  });
});

describe('rayTracingWebGL1Headless - multiple points', () => {
  test('two points with different normals: (+X) and (+Z) -> 0.0 and 1.0', async () => {
    const midpoints = makeFloat32([0, 0, 0, 0, 0, 0]);
    const normals = makeFloat32([0, 0, 1, 1, 0, 0]);
    const triangles = makeFloat32(makeTriangle([-10, -10, -1], [10, -10, -1], [0, 10, -1]));
    const sunDirs = makeFloat32([0, 0, 1]);

    const res = await rayTracingWebGL1Headless(midpoints, normals, triangles, sunDirs, () => {}, gl);
    expectCloseArray(res![0], [1.0, 0.0]);
  });

  test('10 points plane, uniform normal', async () => {
    const N = 10;
    const midpoints = new Float32Array(new Array(N).fill(0).flatMap((_, index, __) => [index, 0, 0]));
    const normals = new Float32Array(new Array(N).fill(0).flatMap(() => [0, 0, 1]));
    const triangles = makeFloat32(makeTriangle([-10, -10, -1], [10, -10, -1], [0, 10, -1]));
    const sunDirs = makeFloat32([0, 0, 1]);

    const res = await rayTracingWebGL1Headless(midpoints, normals, triangles, sunDirs, () => {}, gl);
    expect(res![0].length).toBe(N);
    expectCloseArray(res![0], new Array(N).fill(1.0));
  });
});

describe('rayTracingWebGL1Headless - multiple sun directions', () => {
  test('two sun directions: normal (+Z) and sun (+Z) and (+X) -> 1.0 and 0.0', async () => {
    const midpoints = makeFloat32([0, 0, 0]);
    const normals = makeFloat32([0, 0, 1]);
    const triangles = makeFloat32(makeTriangle([-10, -10, -1], [10, -10, -1], [0, 10, -1]));
    const sunDirs = makeFloat32([0, 0, 1, 1, 0, 0]);

    const res = await rayTracingWebGL1Headless(midpoints, normals, triangles, sunDirs, () => {}, gl);
    expect(res).toBeTruthy();
    expect(res!.length).toBe(2);
    expectCloseArray(res![0], [1.0]); // +Z
    expectCloseArray(res![1], [0.0]); // +X
  });
});
