import {describe, expect, test} from 'vitest';
import * as triangleUtils from '../src/triangleUtils.js';
import { vec3 } from "gl-matrix";

const triangleArray = new Float32Array([0.,0.,0.,1.,0.,0.,0.,1.,0.,1.,1.,1.,1.,3.,1.,1.,3.,6.]); 
const firstTriangle = [vec3.fromValues(0.,0.,0.), vec3.fromValues(1.,0.,0.), vec3.fromValues(0.,1.,0.)]
const secondTriangle = [vec3.fromValues(1.,1.,1.), vec3.fromValues(1.,3.,1.), vec3.fromValues(1.,3.,6.)]

describe('Triangle Util functions: ', () => {
    test('Ectract triangle from array', () => {
      expect(triangleUtils.extractTriangle(triangleArray, 0)).toStrictEqual(firstTriangle);
      expect(triangleUtils.extractTriangle(triangleArray, 9)).toStrictEqual(secondTriangle);
    });
    test('Calculate area of triangles', () => {
      expect(triangleUtils.area(triangleArray,0)).to.equal(0.5);
      expect(triangleUtils.area(triangleArray,9)).to.equal(5);
    });
    test('Calculate normal of triangles', () => {
      expect(triangleUtils.normal(triangleArray,0)).toStrictEqual(vec3.fromValues(0.,0.,1.));
      expect(triangleUtils.normal(triangleArray,9)).toStrictEqual(vec3.fromValues(1.,0.,0.));
    });
  });

// TODO:
// * Test normals
// * Test subdivision
