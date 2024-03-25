import { BufferGeometry, BufferAttribute, TypedArray } from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as triangleUtils from './triangleUtils.js';
import { Triangle, ArrayType } from './triangleUtils.js';
import { getRandomSunVectors } from './sun';
import { viridis } from './colormaps';
import * as THREE from 'three';

// @ts-ignore
import { rayTracingWebGL } from './rayTracingWebGL.js';

export default class Scene {
  simulationGeometries: Array<BufferGeometry>;
  shadingGeometries: Array<BufferGeometry>;
  latitude: number;
  longitude: number;

  constructor(latitude: number, longitude: number) {
    this.simulationGeometries = [];
    this.shadingGeometries = [];
    this.latitude = latitude;
    this.longitude = longitude;
  }

  /**
   * Adds a geometry as a target for the shading simulation.
   * For these geometries, the PV potential will be simulated.
   *
   * @param {BufferGeometry} geometry: Arbitrary Three.js geometry
   * @memberof Scene
   */
  addSimulationGeometry(geometry: BufferGeometry) {
    this.simulationGeometries.push(geometry);
  }

  /**
   * Adds a geometry as an outer geometry for the shading simulation.
   * These geometries are responsible for shading.
   *
   * @param {BufferGeometry} geometry: Arbitrary Three.js geometry
   * @memberof Scene
   */
  addShadingGeometry(geometry: BufferGeometry) {
    this.shadingGeometries.push(geometry);
  }

  /**
   * Adaptively subdivide each triangle of `mesh` until all triangles have area of at most `maxArea`.
   *
   * @param {BufferGeometry} mesh
   * @param {number} maxArea
   * @return {*}  {BufferGeometry}
   * @memberof Scene
   */
  refineMesh(mesh: BufferGeometry, maxArea: number): BufferGeometry {
    const positions = mesh.attributes.position.array.slice();
    const normals = mesh.attributes.normal.array.slice();

    let newTriangles: Triangle[] = [];
    let newNormals: number[] = [];
    // Iterate over triangles
    for (let i = 0; i < positions.length; i += 9) {
      let [normal, area] = triangleUtils.normalAndArea(positions, i);
      if (normal[2] < -0.9) {
        // Triangle is facing down, we can skip this
        continue;
      }
      let triangles = [triangleUtils.extractTriangle(positions, i)];
      while (!(area <= maxArea)) {
        triangles = triangles.flatMap(triangleUtils.subdivide);
        area /= 4;
      }
      newTriangles = newTriangles.concat(triangles);
      // copy normal for each subdivided triangle
      newNormals = newNormals.concat(
        triangles.flatMap((_) => [
          normal[0],
          normal[1],
          normal[2],
          normal[0],
          normal[1],
          normal[2],
          normal[0],
          normal[1],
          normal[2],
        ]),
      );
    }

    let geometry = new BufferGeometry();
    const normalsArray = new Float32Array(newNormals);
    const positionArray = new Float32Array(triangleUtils.flatten(newTriangles));
    geometry.setAttribute('position', new BufferAttribute(positionArray, 3));
    geometry.setAttribute('normal', new BufferAttribute(normalsArray, 3));
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;

    return geometry;
  }

  /**
   * Run the simulation.
   *
   * @return
   * @memberof Scene
   */
  async calculate(numberSimulations: number = 80) {
    console.log('Simulation package was called to calculate');
    let simulationGeometry = BufferGeometryUtils.mergeGeometries(this.simulationGeometries);
    let shadingGeometry = BufferGeometryUtils.mergeGeometries(this.shadingGeometries);
    // TODO: This breaks everything, why?
    simulationGeometry = this.refineMesh(simulationGeometry, 0.5); // TODO: make configurable

    console.log('Number of simulation triangles:', simulationGeometry.attributes.position.count / 3);
    console.log('Number of shading triangles:', shadingGeometry.attributes.position.count / 3);

    const meshArray = <Float32Array>shadingGeometry.attributes.position.array;
    const points = simulationGeometry.attributes.position.array;
    const normalsArray = simulationGeometry.attributes.normal.array;

    let midpoints: number[] = [];
    for (let i = 0; i < normalsArray.length; i += 9) {
      const triangle = triangleUtils.extractTriangle(points, i);
      const midpoint = triangleUtils.midpoint(triangle);
      midpoints = midpoints.concat(midpoint);
    }

    const midpointsArray = new Float32Array(midpoints.slice());

    for (let i = 0; i < midpointsArray.length; i++) {
      if (isNaN(midpointsArray[i])) {
        console.log(`midpoint ${i} is nan`);
      }
    }
    for (let i = 0; i < normalsArray.length; i++) {
      if (isNaN(normalsArray[i])) {
        console.log(`normals ${i} is nan`);
      }
    }
    for (let i = 0; i < meshArray.length; i++) {
      if (isNaN(meshArray[i])) {
        console.log(`mesh ${i} is nan`);
      }
    }
    // Compute unique intensities
    const intensities = await this.rayTrace(midpointsArray, normalsArray, meshArray, numberSimulations);

    if (intensities === null) {
      throw new Error('Error raytracing in WebGL.');
    }
    for (let i = 0; i < intensities.length; i++) {
      if (isNaN(intensities[i])) {
        console.log(`intensities ${i} is nan`);
      }
    }

    console.log('Simulation package successfully calculated something');
    console.log(intensities);

    // Normalize intensities by number of simulations
    for (let i = 0; i < intensities.length; i++) {
      intensities[i] /= numberSimulations;
    }

    return this.show(simulationGeometry, intensities);
  }

  show(subdividedGeometry: BufferGeometry, intensities: Float32Array) {
    const Npoints = subdividedGeometry.attributes.position.array.length / 9;
    var newColors = new Float32Array(Npoints * 9);
    for (var i = 0; i < Npoints; i++) {
      const col = viridis(Math.min(1, intensities[i] / 0.6));
      //The 0.6 comes from looking at a rooftop facing south with good angle.
      for (let j = 0; j < 9; j += 3) {
        newColors[9 * i + j] = col[0];
        newColors[9 * i + j + 1] = col[1];
        newColors[9 * i + j + 2] = col[2];
      }
    }

    subdividedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
    var material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      // shininess: 0, // TODO: typescript rejects this, do we need it?
      roughness: 1,
    });
    var mesh = new THREE.Mesh(subdividedGeometry, material);

    return mesh;
  }

  /**
   * Call ray-tracing shader to calculate intensities for each midpoint based on the given normals and mesh
   *
   * @param midpoints midpoints of triangles for which to calculate intensities
   * @param normals normals for each midpoint
   * @param meshArray array of vertices for the shading mesh
   * @return
   * @memberof Scene
   */
  async rayTrace(midpoints: Float32Array, normals: TypedArray, meshArray: Float32Array, numberSimulations: number) {
    let sunDirections = getRandomSunVectors(numberSimulations, this.latitude, this.longitude);
    return rayTracingWebGL(midpoints, normals, meshArray, sunDirections);
  }
}
