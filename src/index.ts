import * as THREE from 'three';
import { BufferAttribute, BufferGeometry, TypedArray } from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { viridis } from './colormaps';
import * as elevation from './elevation';
import * as sun from './sun';
import * as triangleUtils from './triangleUtils.js';
import { CartesianPoint, Point, SphericalPoint, SunVector, isValidUrl } from './utils';

// @ts-ignore
import { rayTracingWebGL } from './rayTracingWebGL.js';

/**
 * This class holds all information about the scene that is simulated.
 * A ShadingScene is typically equipped with the following attributes:
 * * A pair of coordinates to locate the scene
 * * Simulation geometries, where the PV potential is calculated
 * * Shading geometries, where no PV potential is calculated but which are
 *   responsible for shading
 */
export default class ShadingScene {
  simulationGeometries: Array<BufferGeometry>;
  shadingGeometries: Array<BufferGeometry>;
  elevationRaster: Array<CartesianPoint>;
  elevationRasterMidpoint: CartesianPoint;
  latitude: number;
  longitude: number;
  elevationAzimuthDivisions: number;

  /**
   *
   * @param latitude Latitude of the midpoint of the scene.
   * @param longitude Longitude of the midpoint of the scene.
   */
  constructor(latitude: number, longitude: number) {
    if (latitude === undefined || longitude === undefined) {
      throw new Error('Latitude and Longitude must be defined');
    }
    this.simulationGeometries = [];
    this.shadingGeometries = [];
    this.elevationRaster = [];
    this.elevationRasterMidpoint = { x: 0, y: 0, z: 0 };
    this.latitude = latitude;
    this.longitude = longitude;
    this.elevationAzimuthDivisions = 60;
  }

  /**
   * Adds a geometry as a target for the shading simulation.
   * For these geometries, the PV potential will be simulated.
   *
   * @param geometry Arbitrary Three.js geometry
   * @memberof Scene
   */
  addSimulationGeometry(geometry: BufferGeometry) {
    this.simulationGeometries.push(geometry);
  }

  /**
   * Adds a geometry as an outer geometry for the shading simulation.
   * These geometries are responsible for shading.
   *
   * @param geometry Arbitrary Three.js geometry
   * @memberof Scene
   */
  addShadingGeometry(geometry: BufferGeometry) {
    this.shadingGeometries.push(geometry);
  }
  /**
   * IMPORTANT: Make sure that the DEM and the building mesh are in the same units, for example 1 step in
   * DEM coordinates should be equal to 1 step in the SimulationGeometry coordinates.
   * @param raster List of Points with x,y,z coordinates, representing a digital elevation model (DEM)
   * @param midpoint The point of the observer, ie the center of the building
   * @param azimuthDivisions Number of divisions of the azimuth Angle, i.e. the list of the azimuth
   * angle will be [0, ..., 2Pi] where the list has a lenght of azimuthDivisions
   */
  addElevationRaster(raster: CartesianPoint[], midpoint: CartesianPoint, azimuthDivisions: number) {
    this.elevationAzimuthDivisions = azimuthDivisions;
    this.elevationRaster = raster;
    this.elevationRasterMidpoint = midpoint;
  }

  /** @ignore */
  refineMesh(mesh: BufferGeometry, maxLength: number): BufferGeometry {
    const positions = mesh.attributes.position.array.slice();

    let newTriangles: number[] = [];
    let newNormals: number[] = [];
    // Iterate over triangles
    for (let i = 0; i < positions.length; i += 9) {
      let normal = triangleUtils.normal(positions, i);
      if (normal[2] < -0.9) {
        // Triangle is facing down, we can skip this
        continue;
      }
      let triangles = triangleUtils.subdivide(positions, i, maxLength);
      newTriangles = newTriangles.concat(triangles);
      // copy normal for each subdivided triangle
      newNormals = newNormals.concat(triangles.map((_, i) => normal[i % 3]));
    }

    let geometry = new BufferGeometry();
    const normalsArray = new Float32Array(newNormals);
    const positionArray = new Float32Array(newTriangles);
    geometry.setAttribute('position', new BufferAttribute(positionArray, 3));
    geometry.setAttribute('normal', new BufferAttribute(normalsArray, 3));
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;

    return geometry;
  }

  /**
   * This function is called as a last step, after the scene is fully build.
   * It runs the shading simulation and returns a THREE.js colored mesh.
   * The colors are chosen from the viridis colormap.
   * @param numberSimulations Number of random sun positions that are used to calculate the PV yield
   * @returns
   */

  async calculate(
    numberSimulations: number = 80,
    irradianceUrl: string | undefined,
    progressCallback: (progress: number, total: number) => void = (progress, total) =>
      console.log(`Progress: ${progress}/${total}%`),
  ) {
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
      const midpoint = triangleUtils.midpoint(points, i);
      for (let j = 0; j < 3; j++) {
        midpoints.push(midpoint[j] + normalsArray[i + j] * 0.05);
        if (isNaN(midpoint[j])) {
          console.log(`midpoint ${i} is nan`);
        }
        if (isNaN(normalsArray[i])) {
          console.log(`normals ${i} is nan`);
        }
      }
    }

    const midpointsArray = new Float32Array(midpoints.slice());

    for (let i = 0; i < meshArray.length; i++) {
      if (isNaN(meshArray[i])) {
        console.log(`mesh ${i} is nan`);
      }
    }
    // Compute unique intensities
    console.log('Calling this.rayTrace');

    const intensities = await this.rayTrace(
      midpointsArray,
      normalsArray,
      meshArray,
      numberSimulations,
      irradianceUrl,
      progressCallback,
    );

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

    return this.createMesh(simulationGeometry, intensities);
  }
  /** @ignore */
  createMesh(subdividedGeometry: BufferGeometry, intensities: Float32Array): THREE.Mesh {
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

  /** @ignore
   * Call ray-tracing shader to calculate intensities for each midpoint based on the given normals and mesh
   *
   * @param midpoints midpoints of triangles for which to calculate intensities
   * @param normals normals for each midpoint
   * @param meshArray array of vertices for the shading mesh
   * @param numberSimulations number of random sun positions that are used for the simulation. Either numberSimulations or irradianceUrl need to be given.
   * @param diffuseIrradianceUrl url where a 2D json of irradiance values lies. To generate such a json, visit https://github.com/open-pv/irradiance
   * @return
   * @memberof Scene
   */
  async rayTrace(
    midpoints: Float32Array,
    normals: TypedArray,
    meshArray: Float32Array,
    numberSimulations: number,
    diffuseIrradianceUrl: string | undefined,
    progressCallback: (progress: number, total: number) => void,
  ) {
    let directIrradiance: SunVector[] = [];
    let diffuseIrradiance: SunVector[] = [];
    let shadingElevationAngles: SphericalPoint[] = [];

    if (typeof diffuseIrradianceUrl === 'string' && isValidUrl(diffuseIrradianceUrl)) {
      const diffuseIrradianceSpherical = await sun.fetchIrradiance(diffuseIrradianceUrl, this.latitude, this.longitude);
      diffuseIrradiance = sun.convertSpericalToEuclidian(diffuseIrradianceSpherical);
    } else if (typeof diffuseIrradianceUrl != 'undefined') {
      throw new Error('The given url for diffuse Irradiance is not valid.');
    }
    console.log('Calling getRandomSunVectors');
    directIrradiance = sun.getRandomSunVectors(numberSimulations, this.latitude, this.longitude);
    console.log(directIrradiance);
    if (this.elevationRaster.length > 0) {
      shadingElevationAngles = elevation.getMaxElevationAngles(
        this.elevationRaster,
        this.elevationRasterMidpoint,
        this.elevationAzimuthDivisions,
      );
      sun.shadeIrradianceFromElevation(directIrradiance, shadingElevationAngles);
      if (diffuseIrradiance.length > 0) {
        sun.shadeIrradianceFromElevation(diffuseIrradiance, shadingElevationAngles);
      }
    }
    console.log('Calling rayTracingWebGL');
    normals = normals.filter((_, index) => index % 9 < 3);
    return rayTracingWebGL(midpoints, normals, meshArray, directIrradiance, diffuseIrradiance, progressCallback);
  }
}
