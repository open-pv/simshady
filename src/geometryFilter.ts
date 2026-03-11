import { SolarIrradianceData } from './utils';
import { BufferGeometry, Float32BufferAttribute } from 'three';

type BoundingBox = {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

/**
 * Computes the minimum sun altitude angle from irradiance data.
 * This is the lowest altitude_deg value across all sky segments with non-zero radiance.
 * @param irradiance Solar irradiance data
 * @returns Minimum altitude angle in degrees, or 0 if no valid data exists
 */
export function getMinSunAngleFromIrradiance(irradiance: SolarIrradianceData | SolarIrradianceData[]): number {
  const irradianceArray = Array.isArray(irradiance) ? irradiance : [irradiance];

  let minAltitude = Infinity;

  for (const entry of irradianceArray) {
    for (const point of entry.data) {
      // Only points with non-zero radiance
      if (point.average_radiance_W_m2_sr > 0) {
        minAltitude = Math.min(minAltitude, point.altitude_deg);
      }
    }
  }

  // If all radiance values are 0 or no data is available, return 0 (no filtering)
  return minAltitude === Infinity ? 0 : minAltitude;
}

/**
 * Calculate the bounding box of from a given positions array
 * @param positions Float32Array of triangle positions
 * @returns Bounding box with min and max coordinates
 */
export function calculateBoundingBox(positions: Float32Array): BoundingBox {
  if (positions.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };
  }

  // start with "infinite" negative bounding box
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  // Iterate through all vertices
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);

    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

/**
 * Calculate minimum height required for a geometry to potentially cast shadow.
 * @param horizontalDistance Distance in XY plane from the simulation geometry
 * @param groundLevel Minimum Z coordinate of the simulation geometry
 * @param minSunAngle Minimum sun altitude angle in degrees
 * @returns Minimum Z coordinate required
 */
export function calculateMinimumHeight(horizontalDistance: number, groundLevel: number, minSunAngle: number): number {
  const angleRadians = (minSunAngle * Math.PI) / 180;
  return groundLevel + horizontalDistance * Math.tan(angleRadians);
}

/**
 * Get the minimum horizontal distance (XY plane) from a triangle to the simulation's bounding box.
 * @param triangleVertices Array of 9 values representing triangle vertices
 * @param boundingBox Bounding box of the simulation geometry
 * @returns Minimum horizontal distance
 */
export function getTriangleHorizontalDistance(triangleVertices: number[], boundingBox: BoundingBox): number {
  let minDistance = Infinity;

  // Check all 3 vertices of the triangle
  for (let i = 0; i < 9; i += 3) {
    const x = triangleVertices[i];
    const y = triangleVertices[i + 1];

    // Calculate distance to the bounding box in XY plane
    // If the point is inside the bounding box then the distance is 0
    let dx = 0;
    let dy = 0;

    if (x < boundingBox.min.x) {
      dx = boundingBox.min.x - x;
    } else if (x > boundingBox.max.x) {
      dx = x - boundingBox.max.x;
    }

    if (y < boundingBox.min.y) {
      dy = boundingBox.min.y - y;
    } else if (y > boundingBox.max.y) {
      dy = y - boundingBox.max.y;
    }

    const distance = Math.sqrt(dx * dx + dy * dy);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

/**
 * Determine if a triangle should be kept based on minimum sun angle.
 * @param triangleVertices Array of 9 values representing triangle vertices
 * @param boundingBox Bounding box of the simulation geometry
 * @param groundLevel Minimum Z coordinate of the simulation geometry
 * @param minSunAngle Minimum sun altitude angle in degrees
 * @returns True if triangle should be kept
 */
export function shouldKeepTriangle(
  triangleVertices: number[],
  boundingBox: BoundingBox,
  groundLevel: number,
  minSunAngle: number,
): boolean {
  // Find the maximum Z coordinate of the triangle
  const z1 = triangleVertices[2];
  const z2 = triangleVertices[5];
  const z3 = triangleVertices[8];
  const maxZ = Math.max(z1, z2, z3);

  // Calculate the horizontal distance
  const horizontalDistance = getTriangleHorizontalDistance(triangleVertices, boundingBox);

  // Calculate the minimum required height
  const minHeight = calculateMinimumHeight(horizontalDistance, groundLevel, minSunAngle);

  // Keep triangle if its highest point is above the minimum required height
  return maxZ >= minHeight;
}

/**
 * Filter shading geometry based on minimum sun angle. Remove triangles that are too low to cast shadows given the
 * minimum sun angle.
 * @param simPos Simulation geometry positions
 * @param shadePos Shading geometry positions
 * @param minSunAngle Minimum sun altitude angle in degrees
 * @param silent Suppress console output
 * @returns Filtered shading geometry positions
 */
export function filterShadingGeometry(
  simPos: Float32Array,
  shadePos: Float32Array,
  minSunAngle: number,
  silent: boolean = false,
): Float32Array {
  if (shadePos.length === 0) {
    if (!silent) console.log('No shading geometry to filter, skipping filtering');
    return shadePos;
  }

  if (simPos.length === 0) {
    if (!silent) console.log('No simulation geometry provided, skipping filtering');
    return shadePos;
  }

  if (minSunAngle <= 0) {
    if (!silent) console.log('Min sun angle <= 0, skipping filtering');
    return shadePos;
  }

  // Calculate simulation geometry bounding box
  const boundingBox = calculateBoundingBox(simPos);
  const groundLevel = boundingBox.min.z;

  const totalTriangles = Math.floor(shadePos.length / 9);
  const keptTriangles: number[] = [];

  // Iterate through all triangles in shading geometry
  for (let i = 0; i < shadePos.length; i += 9) {
    const triangleVertices = [
      shadePos[i],
      shadePos[i + 1],
      shadePos[i + 2],
      shadePos[i + 3],
      shadePos[i + 4],
      shadePos[i + 5],
      shadePos[i + 6],
      shadePos[i + 7],
      shadePos[i + 8],
    ];

    if (shouldKeepTriangle(triangleVertices, boundingBox, groundLevel, minSunAngle)) {
      for (let j = 0; j < 9; j++) {
        keptTriangles.push(triangleVertices[j]);
      }
    }
  }

  const filteredArray = new Float32Array(keptTriangles);

  if (!silent) {
    const percentKept = ((keptTriangles.length / 9 / totalTriangles) * 100).toFixed(2);
    console.log(`Shading geometry filtering:`);
    console.log(`Min. sun angle: ${minSunAngle}°`);
    console.log(`Total triangles: ${totalTriangles}`);
    console.log(`Kept triangles: ${keptTriangles.length / 9}`);
    console.log(`Percentage kept: ${percentKept}%`);
  }

  return filteredArray;
}

/**
 * A slim wrapper to apply {@link filterShadingGeometry} to {@link BufferGeometry}
 * @param simulationGeometry Simulation geometry
 * @param shadingGeometry Shading geometry
 * @param minSunAngle Minimum sun altitude angle in degrees
 */
export function filterShadingBufferGeometry(
  simulationGeometry: BufferGeometry,
  shadingGeometry: BufferGeometry,
  minSunAngle: number,
): BufferGeometry {
  const simPos = new Float32Array(simulationGeometry?.getAttribute('position').array);
  const shadePos = new Float32Array(shadingGeometry?.getAttribute('position').array);
  const filteredPos = filterShadingGeometry(simPos, shadePos, minSunAngle);
  shadingGeometry.setAttribute('position', new Float32BufferAttribute(filteredPos, 3));
  return shadingGeometry;
}
