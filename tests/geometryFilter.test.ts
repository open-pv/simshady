import { describe, it, expect } from 'vitest';
import {
  calculateBoundingBox,
  calculateMinimumHeight,
  getTriangleHorizontalDistance,
  filterShadingGeometry,
} from '../src/headless/geometryFilter';

describe('geometryFilter', () => {
  describe('calculateBoundingBox', () => {
    it('bounding box', () => {
      const positions = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
      const bbox = calculateBoundingBox(positions);
      expect(bbox.min).toEqual({ x: 0, y: 0, z: 0 });
      expect(bbox.max).toEqual({ x: 10, y: 10, z: 10 });
    });
  });

  describe('calculateMinimumHeight', () => {
    it('height for 45 degree angle', () => {
      const height = calculateMinimumHeight(10, 0, 45);
      expect(height).toBeCloseTo(10, 0);
    });

    it('zero distance', () => {
      const height = calculateMinimumHeight(0, 10, 45);
      expect(height).toBe(10);
    });
  });

  describe('getTriangleHorizontalDistance', () => {
    it('triangle inside bounding box', () => {
      const triangle = [5, 5, 5, 5, 5, 5, 5, 5, 5];
      const bbox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 10 },
      };
      const distance = getTriangleHorizontalDistance(triangle, bbox);
      expect(distance).toBe(0);
    });

    it('triangle outside bounding box', () => {
      const triangle = [-10, 0, 0, -10, 0, 0, -10, 0, 0];
      const bbox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 10 },
      };
      const distance = getTriangleHorizontalDistance(triangle, bbox);
      expect(distance).toBeCloseTo(10, 0);
    });
  });
  describe('filterShadingGeometry', () => {
    it('keep all geometry when minSunAngle is 0', () => {
      const simPos = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const shadePos = new Float32Array([0, 0, 10, 0, 0, 10, 0, 0, 10]);

      const filtered = filterShadingGeometry(simPos, shadePos, 0, true);
      expect(filtered.length).toBe(shadePos.length);
    });

    it('handle empty geometry', () => {
      const simPos = new Float32Array([]);
      const shadePos = new Float32Array([]);

      const filtered = filterShadingGeometry(simPos, shadePos, 10, true);
      expect(filtered.length).toBe(0);
    });
  });
});
