import * as THREE from 'three';
import { BufferAttribute, BufferGeometry, TypedArray } from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { viridis } from './colormaps.js';
import * as elevation from './elevation.js';
import * as sun from './sun.js';
import * as triangleUtils from './triangleUtils.js';
import {
  CalculateParams,
  CartesianPoint,
  ColorMap,
  SolarIrradianceData,
  SphericalPoint,
  SunVector,
  logNaNCount,
} from './utils.js';

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
  private solarIrradiance: SolarIrradianceData | null;
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
    this.solarIrradiance = null;
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
    geometry = geometry.toNonIndexed();
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
    geometry = geometry.toNonIndexed();
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
   * Add data of solar irradiance to the scene.
   * @param irradiance
   */
  addSolarIrradiance(irradiance: SolarIrradianceData) {
    this.solarIrradiance = irradiance;
  }

  async addSolarIrradianceFromURL(url: string): Promise<void> {
    const response = await fetch(url);
    const data = await response.json();
    this.addSolarIrradiance(data);
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
      pvCellEfficiency = 0.2,
      maxYieldPerSquareMeter = 1400 * 0.2,
      progressCallback = (progress, total) => console.log(`Progress: ${progress}/${total}%`),
    } = params;

    // Validate class parameters
    if (!this.validateClassParams()) {
      throw new Error(
        'Invalid Class Parameters: You need to supply at least Shading Geometry, a Simulation Geometry, and Irradiance Data.',
      );
    }

    // Merge geometries
    let simulationGeometry = BufferGeometryUtils.mergeGeometries(this.simulationGeometries);
    let shadingGeometry = BufferGeometryUtils.mergeGeometries(this.shadingGeometries);

    simulationGeometry = this.refineMesh(simulationGeometry, 1.0);

    console.log('Number of simulation triangles:', simulationGeometry.attributes.position.count / 3);
    console.log('Number of shading triangles:', shadingGeometry.attributes.position.count / 3);

    // Extract and validate geometry attributes
    const meshArray = <Float32Array>shadingGeometry.attributes.position.array;
    const points = simulationGeometry.attributes.position.array;
    const normalsArray = simulationGeometry.attributes.normal.array;

    const midpointsArray = this.computeMidpoints(points, normalsArray);

    // Check for NaN values in geometry data
    logNaNCount('midpoints', midpointsArray);
    logNaNCount('mesh', meshArray);

    // Perform ray tracing to calculate intensities
    const shadedScene = await this.rayTrace(
      midpointsArray,
      normalsArray,
      meshArray,
      this.solarIrradiance!, // Non-null assertion
      (i, total) => progressCallback(i + total, total),
    );

    console.log('diffuseIntensities', shadedScene);

    // Calculate final intensities and generate output mesh
    const pvYield = sun.calculatePVYield(shadedScene, pvCellEfficiency);
    console.log('finalIntensities', pvYield);

    return this.createMesh(simulationGeometry, pvYield, maxYieldPerSquareMeter);
  }

  // Helper to validate class parameters
  private validateClassParams(): boolean {
    const hasShadingGeom = this.shadingGeometries.length > 0;
    const hasSimulationGeom = this.simulationGeometries.length > 0;
    const hasIrradianceData = this.solarIrradiance != null;
    return hasShadingGeom && hasSimulationGeom && hasIrradianceData;
  }

  // Helper to compute midpoints of triangles and track NaN values
  private computeMidpoints(points: TypedArray, normals: TypedArray): Float32Array {
    let midpoints: number[] = [];
    for (let i = 0; i < normals.length; i += 9) {
      const midpoint = triangleUtils.midpoint(points, i);
      midpoints.push(...midpoint);
    }
    return new Float32Array(midpoints);
  }

  /** @ignore */
  private createMesh(subdividedGeometry: BufferGeometry, intensities: Float32Array, maxYieldPerSquareMeter: number): THREE.Mesh {
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
   * @param diffuseIrradianceUrl url where a 2D json of irradiance values lies. To generate such a json, visit https://github.com/open-pv/irradiance
   * @return
   * @memberof Scene
   */
  private async rayTrace(
    midpoints: Float32Array,
    normals: TypedArray,
    meshArray: Float32Array,
    irradiance: SolarIrradianceData,
    progressCallback: (progress: number, total: number) => void,
  ): Promise<Float32Array> {
    let irradianceShadedByElevation: SunVector[] = [];
    let shadingElevationAngles: SphericalPoint[] = [];

    irradianceShadedByElevation = sun.convertSpericalToEuclidian(irradiance);

    if (this.elevationRaster.length > 0) {
      shadingElevationAngles = elevation.getMaxElevationAngles(
        this.elevationRaster,
        this.elevationRasterMidpoint,
        this.elevationAzimuthDivisions,
      );
      sun.shadeIrradianceFromElevation(irradianceShadedByElevation, shadingElevationAngles);
    }
    normals = normals.filter((_, index) => index % 9 < 3);
    const shadedIrradianceScenes = await rayTracingWebGL(
      midpoints,
      normals,
      meshArray,
      irradianceShadedByElevation,
      progressCallback,
    );
    if (shadedIrradianceScenes === null) {
      throw new Error('Error occured when running the Raytracing in WebGL.');
    }

    let intensities = new Float32Array(shadedIrradianceScenes[0].length).fill(0);

    for (let i = 0; i < shadedIrradianceScenes.length; i++) {
      for (let j = 0; j < intensities.length; j++) {
        intensities[j] += shadedIrradianceScenes[i][j] / shadedIrradianceScenes.length;
      }
    }

    return intensities;
  }
}
