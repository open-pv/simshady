export type Point = {
  x: number;
  y: number;
};

function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function calculateElevationAngle(elevationDifference: number, distance: number): number {
  return Math.atan2(elevationDifference, distance);
}

/**
 * Calculates the maximum heights visible from an observer in a set of directions.
 * Returns a 2D array. The first dimension is over all Z-values (heights) of the observer, the second dimension
 * is over the number of theta directions defined with numDirections.
 * @param grid 2D array of elevations, in the current implementation it needs to be a NxN grid where N is uneven!
 * @param observer Point of interest, given as the indexes from the grid: [10,10] means that grid[10][10] is the point for
 * which the elevation angles are calculated.
 * @param observerZ List of height values of the observer. This will replace the grid[observer] values.
 * @param numDirections Length of the returned list.
 * @returns
 */
export function getMaxElevationAngles(
  grid: number[][],
  observer: Point,
  observerZ: number[],
  numDirections: number = 360,
): number[][] {
  const maxAngles: number[][] = Array.from({ length: observerZ.length }, () => Array(numDirections).fill(-Infinity));
  const numRows = grid.length;
  const numCols = grid[0].length;

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      if (row === observer.y && col === observer.x) continue;
      const targetPoint: Point = { x: col, y: row };
      const distance = calculateDistance(observer, targetPoint);
      const angleToTarget = (Math.atan2(targetPoint.y - observer.y, targetPoint.x - observer.x) * 180) / Math.PI;
      const adjustedAngle = angleToTarget < 0 ? angleToTarget + 360 : angleToTarget;
      const thetaIndex = Math.floor(adjustedAngle / (360 / numDirections));
      for (let zIndex = 0; zIndex < observerZ.length; zIndex++) {
        let elevationDifference = grid[row][col] - observerZ[zIndex];
        let elevationAngle = calculateElevationAngle(elevationDifference, distance);
        if (elevationAngle > maxAngles[zIndex][thetaIndex]) {
          maxAngles[zIndex][thetaIndex] = elevationAngle;
        }
      }
    }
  }
  return maxAngles;
}
