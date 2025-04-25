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
    const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0]; // Diagonal longer than 1
    const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
    const testGeometry = createTestGeometry(positions, normals);
    const refinedGeometry = scene.refineMesh(testGeometry, 1);
    expect(refinedGeometry.attributes.position.count).toEqual(6); //Expect one subdivision
  });
});

describe('Scene initialization', () => {
  test('addShadingGeometry works', () => {
    const scene = new ShadingScene();
    const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
    const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
    const testGeometry = createTestGeometry(positions, normals);
    scene.addShadingGeometry(testGeometry);
    expect(scene.shadingGeometry?.attributes.position.count).toEqual(3);
  });

  test('addSimulationGeometry works', () => {
    const scene = new ShadingScene();
    const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
    const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
    const testGeometry = createTestGeometry(positions, normals);
    scene.addSimulationGeometry(testGeometry);
    expect(scene.simulationGeometry?.attributes.position.count).toEqual(3);
  });

  test('addSolarIrradiance works', () => {
    const scene = new ShadingScene();
    const solarIrradiance = {
      data: [
        { altitude_deg: 78.28, azimuth_deg: 45.0, average_radiance_W_m2_sr: 36.799 },
        { altitude_deg: 78.28, azimuth_deg: 315.0, average_radiance_W_m2_sr: 36.799 },
      ],
      metadata: { nside: 4, latitude: 47.21, longitude: 15.86, valid_timesteps_for_aggregation: 8760 },
    };

    const solarIrradianceSecondTimeStep = {
      data: [
        { altitude_deg: 78.28, azimuth_deg: 45.0, average_radiance_W_m2_sr: 36.799 },
        { altitude_deg: 78.28, azimuth_deg: 315.0, average_radiance_W_m2_sr: 36.799 },
      ],
      metadata: { nside: 4, latitude: 47.21, longitude: 15.86, valid_timesteps_for_aggregation: 8760 },
    };
    scene.addSolarIrradiance(solarIrradiance);
    expect(Array.isArray(scene.solarIrradiance)).toBe(true);
    expect(scene.solarIrradiance![0].metadata.valid_timesteps_for_aggregation).toEqual(8760);

    const sceneWithTimeSeries = new ShadingScene();
    sceneWithTimeSeries.addSolarIrradiance([solarIrradiance, solarIrradianceSecondTimeStep]);
    expect(Array.isArray(scene.solarIrradiance)).toBe(true);
    expect(scene.solarIrradiance![0].metadata.valid_timesteps_for_aggregation).toEqual(8760);
  });
});
