import { describe, expect, test } from 'vitest';
import * as triangleUtils from '../src/triangleUtils.js';

const triangleArray = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 3, 1, 1, 3, 6]);
const firstTriangle: triangleUtils.Triangle = [0, 0, 0, 1, 0, 0, 0, 1, 0];
const secondTriangle: triangleUtils.Triangle = [1, 1, 1, 1, 3, 1, 1, 3, 6];

const subdivisionFirstTriangle = [0, 0, 0, 1, 0, 0, 0.5, 0.5, 0, 0, 1, 0, 0, 0, 0, 0.5, 0.5, 0];

describe('Triangle Util functions: ', () => {
  test('Calculate area of triangles', () => {
    expect(triangleUtils.area(triangleArray, 0)).to.equal(0.5);
    expect(triangleUtils.area(triangleArray, 9)).to.equal(5);
  });
  test('Calculate normal of triangles', () => {
    expect(triangleUtils.normal(triangleArray, 0)).toStrictEqual([0, 0, 1]);
    expect(triangleUtils.normal(triangleArray, 9)).toStrictEqual([1, 0, 0]);
  });
  test('Subdivide triangles', () => {
    expect(triangleUtils.subdivide(firstTriangle, 0, 1)).toStrictEqual(subdivisionFirstTriangle);
  });
  test('Calculate midpoint of triangles', () => {
    expect(triangleUtils.midpoint(firstTriangle, 0)[0]).to.be.closeTo(1 / 3, 0.01);
    expect(triangleUtils.midpoint(firstTriangle, 0)[1]).to.be.closeTo(1 / 3, 0.01);
    expect(triangleUtils.midpoint(firstTriangle, 0)[2]).to.equal(0);
    expect(triangleUtils.midpoint(secondTriangle, 0)[0]).to.equal(1);
    expect(triangleUtils.midpoint(secondTriangle, 0)[1]).to.be.closeTo(7 / 3, 0.01);
    expect(triangleUtils.midpoint(secondTriangle, 0)[2]).to.be.closeTo(8 / 3, 0.01);
  });
});
