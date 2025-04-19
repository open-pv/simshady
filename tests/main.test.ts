import { describe, expect, test } from 'vitest';
import { ShadingScene } from '../src/main';

import { BufferAttribute, BufferGeometry } from 'three'; // Import Three.js components if available or mock them

// Mock or utility function to create a simple geometry for testing
function createTestGeometry(positions: number[], normals: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  return geometry;
}

describe('Scene refineMesh', () => {
  test('subdivides triangle edges longer than maxLength', () => {
    const scene = new ShadingScene();
    const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0]; // Diagonal longer than 1
    const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
    const testGeometry = createTestGeometry(positions, normals);
    const refinedGeometry = scene.refineMesh(testGeometry, 1);
    expect(refinedGeometry.attributes.position.count).toEqual(6); //Expect one subdivision
  });

  test('does not subdivide triangle edges shorter than or equal to maxLength', () => {
    const scene = new ShadingScene();
    const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
    const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
    const testGeometry = createTestGeometry(positions, normals);
    const refinedGeometry = scene.refineMesh(testGeometry, 1.5);

    expect(refinedGeometry.attributes.position.count).toEqual(3);
  });
});
