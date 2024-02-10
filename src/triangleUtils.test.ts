import {describe, expect, test} from '@jest/globals';
import * as triangleUtils from './triangleUtils.js';
import { vec3 } from "gl-matrix";

const triangleArray = new Float32Array([0.,0.,0.,1.,0.,0.,0.,1.,0.]); 
const firstTriangle = [vec3.fromValues(0.,0.,0.), vec3.fromValues(1.,0.,0.), vec3.fromValues(0.,1.,0.)]

describe('Triangle Util functions: ', () => {
    test('ectract triangle from array', () => {
      expect(triangleUtils.extractTriangle(triangleArray, 0)).toBe(firstTriangle);
    });
  });