import { describe, expect, test } from 'vitest';
import * as triangleUtils from '../src/triangleUtils.js';
import { vec3 } from 'gl-matrix';

const triangleArray = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 3, 1, 1, 3, 6]);
const firstTriangle: triangleUtils.Triangle = [vec3.fromValues(0, 0, 0), vec3.fromValues(1, 0, 0), vec3.fromValues(0, 1, 0)];
const secondTriangle: triangleUtils.Triangle = [vec3.fromValues(1, 1, 1), vec3.fromValues(1, 3, 1), vec3.fromValues(1, 3, 6)];

const sub1FirstTriangle: triangleUtils.Triangle = [
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0.5, 0, 0),
  vec3.fromValues(0, 0.5, 0),
];
const sub2FirstTriangle: triangleUtils.Triangle = [
  vec3.fromValues(1, 0, 0),
  vec3.fromValues(0.5, 0.5, 0),
  vec3.fromValues(0.5, 0, 0),
];
const sub3FirstTriangle: triangleUtils.Triangle = [
  vec3.fromValues(0, 1, 0),
  vec3.fromValues(0.0, 0.5, 0),
  vec3.fromValues(0.5, 0.5, 0),
];
const sub4FirstTriangle: triangleUtils.Triangle = [
  vec3.fromValues(0.5, 0, 0),
  vec3.fromValues(0.5, 0.5, 0),
  vec3.fromValues(0, 0.5, 0),
];

describe('Triangle Util functions: ', () => {
  test('Ectract triangle from array', () => {
    expect(triangleUtils.extractTriangle(triangleArray, 0)).toStrictEqual(firstTriangle);
    expect(triangleUtils.extractTriangle(triangleArray, 9)).toStrictEqual(secondTriangle);
  });
  test('Calculate area of triangles', () => {
    expect(triangleUtils.area(triangleArray, 0)).to.equal(0.5);
    expect(triangleUtils.area(triangleArray, 9)).to.equal(5);
  });
  test('Calculate normal of triangles', () => {
    expect(triangleUtils.normal(triangleArray, 0)).toStrictEqual(vec3.fromValues(0, 0, 1));
    expect(triangleUtils.normal(triangleArray, 9)).toStrictEqual(vec3.fromValues(1, 0, 0));
  });
  test('Subdivide triangles', () => {
    expect(triangleUtils.subdivide(firstTriangle)).toStrictEqual([
      sub1FirstTriangle,
      sub2FirstTriangle,
      sub3FirstTriangle,
      sub4FirstTriangle,
    ]);
  });
  test('Calculate midpoint of triangles', () => {
    expect(triangleUtils.midpoint(firstTriangle)[0]).to.be.closeTo(1 / 3, 0.01);
    expect(triangleUtils.midpoint(firstTriangle)[1]).to.be.closeTo(1 / 3, 0.01);
    expect(triangleUtils.midpoint(firstTriangle)[2]).to.equal(0);
    expect(triangleUtils.midpoint(secondTriangle)[0]).to.equal(1);
    expect(triangleUtils.midpoint(secondTriangle)[1]).to.be.closeTo(7 / 3, 0.01);
    expect(triangleUtils.midpoint(secondTriangle)[2]).to.be.closeTo(8 / 3, 0.01);
  });
  test('Flatten triangles', () => {
    expect(triangleUtils.flatten([firstTriangle, secondTriangle])).toStrictEqual(triangleArray);
  });
});
