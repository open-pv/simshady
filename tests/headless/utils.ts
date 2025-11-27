import { MeshData } from '../../src/headless/meshExporter';

/**
 *
 * @param triangleCount
 * @param intensitiesPerTriangle
 */
export function createMockMeshData(triangleCount: number = 1, intensitiesPerTriangle?: number[]): MeshData {
  const singleTriangle = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  const singleColors = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  const positions = new Float32Array(Array(triangleCount).fill(singleTriangle).flat());
  const colors = new Float32Array(Array(triangleCount).fill(singleColors).flat());

  let intensities: Float32Array;
  if (intensitiesPerTriangle) {
    intensities = new Float32Array(intensitiesPerTriangle);
  } else {
    intensities = new Float32Array(triangleCount).fill(100);
  }

  return {
    positions,
    colors,
    intensities,
    metadata: {
      triangleCount,
      vertexCount: triangleCount * 3,
      attributes: {
        position: { itemSize: 3, type: 'Float32' },
        color: { itemSize: 3, type: 'Float32' },
        intensities: { itemSize: 1, type: 'Float32' },
      },
      bounds: { min: [0, 0, 0], max: [1, 1, 0], center: [0.5, 0.5, 0], size: [1, 1, 0] },
      options: { silent: true },
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    },
  };
}
