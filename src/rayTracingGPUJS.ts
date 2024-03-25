// @ts-nocheck
//Combining kernels
//kernel Maps
//Pipelines etc

//general Idea
//1. Generate Triangles and rays --> {triangles,rays}
//2. const { edge1, edge2 } = calculateEdgeMatrices(triangles)
//3. calculatePMatrix = gpu.createKernel(function(rays, edge2) --> .setOutput({y:num_triangles,x:num_rays}) [P-Matrix], each entry is a vec3
//4. const calculateDeterminant = gpu.createKernel(function(edge1, PMatrix)) --> setOutput({x:num_rays,y:num_triangles});
//5. const calculateInverseDeterminant = gpu.createKernel(function(detMatrix) --> setOutput({x:num_rays,y:num_triangles});
//6. const TMatrix = calculateT(edge2, rays, triangles, edge1, PMatrix, detMatrix);
// import { GPU, input } from './gpu-browser.min.js';
import { GPU, input, Input, IKernelRunShortcut } from 'gpu.js';

const calculateEdgeMatrices = (triangles: Float32Array) => {
  const edge1 = [];
  const edge2 = [];

  for (let i = 0; i < triangles.length; i += 9) {
    // Vertex V1
    const V1x = triangles[i + 0];
    const V1y = triangles[i + 1];
    const V1z = triangles[i + 2];

    // Vertex V2
    const V2x = triangles[i + 3];
    const V2y = triangles[i + 4];
    const V2z = triangles[i + 5];

    // Vertex V3
    const V3x = triangles[i + 6];
    const V3y = triangles[i + 7];
    const V3z = triangles[i + 8];

    // Edge E1 = V2 - V1
    edge1.push([V2x - V1x, V2y - V1y, V2z - V1z]);

    // Edge E2 = V3 - V1
    edge2.push([V3x - V1x, V3y - V1y, V3z - V1z]);
  }

  return { edge1, edge2 };
};

export class RayTracer {
  gpu: GPU;
  calculateInvDetMatrix: IKernelRunShortcut;
  calculateT: IKernelRunShortcut;

  constructor() {
    this.gpu = new GPU();

    this.calculateInvDetMatrix = this.gpu.createKernel(
      function (rays: Input, edge1: Input, edge2: Input) {
        const rayDirX = rays[this.thread.x][3];
        const rayDirY = rays[this.thread.x][4];
        const rayDirZ = rays[this.thread.x][5];

        const edge1X = edge1[this.thread.y][0];
        const edge1Y = edge1[this.thread.y][1];
        const edge1Z = edge1[this.thread.y][2];

        const edge2X = edge2[this.thread.y][0];
        const edge2Y = edge2[this.thread.y][1];
        const edge2Z = edge2[this.thread.y][2];

        // Cross product D x E2
        const pX = rayDirY * edge2Z - rayDirZ * edge2Y;
        const pY = rayDirZ * edge2X - rayDirX * edge2Z;
        const pZ = rayDirX * edge2Y - rayDirY * edge2X;

        // Dot product E1 . P
        const det = edge1X * pX + edge1Y * pY + edge1Z * pZ;

        let invDet = 0;
        if (Math.abs(det) >= 0.0000001) {
          // Check for near-zero determinant
          invDet = 1 / det; // Inverse is undefined or very large for near-zero determinant
        }
        return invDet;
      },
      { dynamicArguments: true, dynamicOutput: true },
    );

    this.calculateT = this.gpu.createKernel(
      function (edge1, edge2, points, triangles, invDetMatrix) {
        //UV Matrix Calculation
        const edge1X = edge1[this.thread.y][0];
        const edge1Y = edge1[this.thread.y][1];
        const edge1Z = edge1[this.thread.y][2];

        const edge2X = edge2[this.thread.y][0];
        const edge2Y = edge2[this.thread.y][1];
        const edge2Z = edge2[this.thread.y][2];

        const rayOriginX = points[this.thread.z][0];
        const rayOriginY = points[this.thread.z][1];
        const rayOriginZ = points[this.thread.z][2];

        const V1x = triangles[this.thread.y][0];
        const V1y = triangles[this.thread.y][1];
        const V1z = triangles[this.thread.y][2];

        // T = O - V1
        const Tx = rayOriginX - V1x;
        const Ty = rayOriginY - V1y;
        const Tz = rayOriginZ - V1z;

        // Q = T x E1
        const Qx = Ty * edge1Z - Tz * edge1Y;
        const Qy = Tz * edge1X - Tx * edge1Z;
        const Qz = Tx * edge1Y - Ty * edge1X;

        // TODO: det(T, edge1, edge2), could precompute edge1 x edge2
        // t = (E2 . Q) / det
        return (edge2X * Qx + edge2Y * Qy + edge2Z * Qz) * invDetMatrix[this.thread.y][this.thread.x];
      },
      { dynamicArguments: true },
    );

    this.calculateInvDetMatrix.setPipeline(true);
    this.calculateT.setCanvas(this.calculateInvDetMatrix.canvas);
    this.calculateT.setContext(this.calculateInvDetMatrix.context);
    this.calculateT.setPipeline(true);
  }

  run(triangles: Float32Array, rays: Float32Array, points: Float32Array) {
    const { edge1, edge2 } = calculateEdgeMatrices(triangles);

    const n = 8192; // size of each slice
    const totalSlices = Math.ceil(triangles.length / 9 / n); // Calculate total number of slices

    for (let i = 0; i < totalSlices; i++) {
      var start = new Date().getTime();

      // Calculate the start and end indices for the current slice
      const startIdx = i * n;
      const endIdx = Math.min(startIdx + n, triangles.length / 9); // Ensure we don't go beyond the array length
      const sliceLen = endIdx - startIdx;

      // Slice the arrays for the current segment
      const slicedTriangles = triangles.slice(startIdx * 9, endIdx * 9);
      const slicedEdge1 = edge1.slice(startIdx * 3, endIdx * 3);
      const slicedEdge2 = edge2.slice(startIdx * 3, endIdx * 3);

      console.log('rays', rays.length);
      console.log('sEdge1', slicedEdge1.length);
      console.log('sEdge2', slicedEdge2.length);

      // Perform calculations on the current slice
      this.calculateInvDetMatrix.setOutput({ x: rays.length / 6, y: sliceLen }).setPipeline(true);
      const invDetMatrix = this.calculateInvDetMatrix(
        input(rays, [rays.length / 6, 6]),
        input(slicedEdge1, [sliceLen, 3]),
        input(slicedEdge2, [sliceLen, 3]),
      );

      // this.calculateT.setOutput({y: sliceLen, x: rays.length / 6, z: points.length / 6})
      // const TMatrix = this.calculateT(
      //   input(slicedEdge1, [sliceLen, 3]),
      //   input(slicedEdge2, [sliceLen, 3]),
      //   input(points, [simulation_num_points, 6]),
      //   input(slicedTriangles, [sliceLen, 9]),
      //   input(invDetMatrix, [sliceLen, simulation_num_rays]),
      // );

      var end = new Date().getTime();
      console.log(`Duration for slice ${i + 1}/${totalSlices}:`, end - start, 'ms');
    }
  }
}
