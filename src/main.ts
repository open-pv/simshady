import * as THREE from 'three';
import { BufferAttribute, BufferGeometry, TypedArray } from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { viridis } from './colormaps.js';
import * as elevation from './elevation.js';
import * as sun from './sun.js';
import * as triangleUtils from './triangleUtils.js';
import { CalculateParams, CartesianPoint, ColorMap, isValidUrl, SphericalPoint, SunVector } from './utils.js';

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
export class ShadingScene {
  public simulationGeometries: Array<BufferGeometry>;
  public shadingGeometries: Array<BufferGeometry>;
  public elevationRaster: Array<CartesianPoint>;
  private elevationRasterMidpoint: CartesianPoint;
  public latitude: number;
  public longitude: number;
  private elevationAzimuthDivisions: number;
  private colorMap: (t: number) => [number, number, number];

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
    this.colorMap = viridis;
  }

  /**
   * Adds a geometry as a target for the shading simulation.
   * For these geometries, the PV potential will be simulated.
   * This geometry will also be used as a shading geometry, hence
   * it is not needed to additionally add it by using `addShadingGeometry`.
   *
   * @param geometry Arbitrary Three.js geometry
   * @memberof Scene
   */
  addSimulationGeometry(geometry: BufferGeometry) {
    this.simulationGeometries.push(geometry);
    this.shadingGeometries.push(geometry);
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
   * Add a elevation model to the simulation scene.
   * @param raster List of Points with x,y,z coordinates, representing a digital elevation model (DEM). It is
   * important that all values of x,y and z are given with same units. If x and y are given in lat / lon and
   * z is given in meters, this will result in wrong simulation Results.
   * @param midpoint The point of the observer, ie the center of the building
   * @param azimuthDivisions Number of divisions of the azimuth Angle, i.e. the list of the azimuth
   * angle will be [0, ..., 2Pi] where the list has a lenght of azimuthDivisions
   */
  addElevationRaster(raster: CartesianPoint[], midpoint: CartesianPoint, azimuthDivisions: number) {
    this.elevationAzimuthDivisions = azimuthDivisions;
    this.elevationRaster = raster;
    this.elevationRasterMidpoint = midpoint;
  }

  /**
   * Change the Color Map that is used for the colors of the simulated Three.js mesh. This is
   * optional, the default colorMap is viridis (blue to green to yellow)
   * @param colorMap
   */
  addColorMap(colorMap: ColorMap) {
    this.colorMap = colorMap;
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
   * @param params: The input object containing information about the simulation.

   * @returns A three.js colored mesh of the simulationGeometry.
   */

  async calculate(params: CalculateParams = {}) {
    const {
      numberSimulations = 80,
      diffuseIrradianceURL,
      pvCellEfficiency = 0.2,
      maxYieldPerSquareMeter = 1400 * 0.2,
      progressCallback = (progress, total) => console.log(`Progress: ${progress}/${total}%`),
      urlDirectIrrandianceTIF,
      urlDiffuseIrrandianceTIF,
    } = params;
    if (urlDiffuseIrrandianceTIF === undefined || urlDirectIrrandianceTIF === undefined) {
      throw new Error('A URL for the geotif files for Diffuse and Direct Irradiance is undefined.');
    }
    console.log('Simulation package was called to calculate');
    let simulationGeometry = BufferGeometryUtils.mergeGeometries(this.simulationGeometries);
    let shadingGeometry = BufferGeometryUtils.mergeGeometries(this.shadingGeometries);

    // TODO: This breaks everything, why?
    simulationGeometry = this.refineMesh(simulationGeometry, 1.0); // TODO: make configurable

    console.log('Number of simulation triangles:', simulationGeometry.attributes.position.count / 3);
    console.log('Number of shading triangles:', shadingGeometry.attributes.position.count / 3);

    const meshArray = <Float32Array>shadingGeometry.attributes.position.array;
    const points = simulationGeometry.attributes.position.array;
    const normalsArray = simulationGeometry.attributes.normal.array;

    let midpointsNan = 0;
    let midpoints: number[] = [];
    for (let i = 0; i < normalsArray.length; i += 9) {
      const midpoint = triangleUtils.midpoint(points, i);
      for (let j = 0; j < 3; j++) {
        midpoints.push(midpoint[j] + normalsArray[i + j] * 0.05);
        if (isNaN(normalsArray[i])) {
          midpointsNan++;
        }
      }
    }
    if (midpointsNan > 0) {
      console.log(`${midpointsNan}/${midpoints.length} midpoints are nan`);
    }

    const midpointsArray = new Float32Array(midpoints.slice());

    let meshNan = 0;
    for (let i = 0; i < meshArray.length; i++) {
      if (isNaN(meshArray[i])) {
        meshNan++;
      }
    }
    if (meshNan > 0) {
      console.log(`${meshNan}/${meshArray.length} mesh coordinates are nan`);
    }
    // Compute unique intensities
    console.log('Calling this.rayTrace');

    const doDiffuseIntensities = typeof diffuseIrradianceURL === 'string';
    const simulationRounds = doDiffuseIntensities ? 2 : 1;

    const directIntensities = await this.rayTrace(
      midpointsArray,
      normalsArray,
      meshArray,
      numberSimulations,
      undefined,
      (i, total) => progressCallback(i, total * simulationRounds),
    );
    let diffuseIntensities = new Float32Array();
    if (doDiffuseIntensities) {
      diffuseIntensities = await this.rayTrace(midpointsArray, normalsArray, meshArray, 0, diffuseIrradianceURL, (i, total) =>
        progressCallback(i + total, total * simulationRounds),
      );
    }

    console.log('directIntensities', directIntensities);
    console.log('diffuseIntensities', diffuseIntensities);

    const intensities = await sun.calculatePVYield(
      directIntensities,
      diffuseIntensities,
      pvCellEfficiency,
      this.latitude,
      this.longitude,
      urlDirectIrrandianceTIF,
      urlDiffuseIrrandianceTIF,
    );
    console.log('finalIntensities', intensities);

    return this.createMesh(simulationGeometry, intensities, maxYieldPerSquareMeter);
  }
  /** @ignore */
  createMesh(subdividedGeometry: BufferGeometry, intensities: Float32Array, maxYieldPerSquareMeter: number): THREE.Mesh {
    const Npoints = subdividedGeometry.attributes.position.array.length / 9;
    var newColors = new Float32Array(Npoints * 9);

    for (var i = 0; i < Npoints; i++) {
      const col = this.colorMap(Math.min(maxYieldPerSquareMeter, intensities[i]) / maxYieldPerSquareMeter);
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
      // roughness: 1,
    });
    subdividedGeometry.setAttribute('intensities', new THREE.Float32BufferAttribute(intensities, 1));
    let mesh = new THREE.Mesh(subdividedGeometry, material);

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
    let irradiance: SunVector[] = [];
    let shadingElevationAngles: SphericalPoint[] = [];

    if (typeof diffuseIrradianceUrl === 'string' && isValidUrl(diffuseIrradianceUrl)) {
      // Case where diffuse Radiation is considered in simulation
      const diffuseIrradianceSpherical = await sun.fetchIrradiance(diffuseIrradianceUrl, this.latitude, this.longitude);
      irradiance = sun.convertSpericalToEuclidian(diffuseIrradianceSpherical);
    } else if (typeof diffuseIrradianceUrl != 'undefined') {
      throw new Error('The given url for diffuse Irradiance is not valid.');
    } else if (numberSimulations > 0) {
      irradiance = sun.getRandomSunVectors(numberSimulations, this.latitude, this.longitude);
    } else {
      throw new Error(
        'No irradiance found for the simulation. Either give a valid URL for diffuse radiation or a numberSimulation > 0.',
      );
    }

    if (this.elevationRaster.length > 0) {
      shadingElevationAngles = elevation.getMaxElevationAngles(
        this.elevationRaster,
        this.elevationRasterMidpoint,
        this.elevationAzimuthDivisions,
      );
      sun.shadeIrradianceFromElevation(irradiance, shadingElevationAngles);
    }
    normals = normals.filter((_, index) => index % 9 < 3);
    let intensities = await rayTracingWebGL(midpoints, normals, meshArray, irradiance, progressCallback);

    if (intensities === null) {
      throw new Error('Error occured when running the Raytracing in WebGL.');
    }

    for (let i = 0; i < intensities.length; i++) {
      intensities[i] /= irradiance.length;
    }

    return intensities;
  }
}
