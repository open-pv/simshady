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
 * * Simulation geometry, where the PV potential is calculated
 * * Shading geometry, where no PV potential is calculated but which are
 *   responsible for shading
 */
export class ShadingScene {
  public simulationGeometry: BufferGeometry | undefined;
  public shadingGeometry: BufferGeometry | undefined;
  public elevationRaster: Array<CartesianPoint>;
  private elevationRasterMidpoint: CartesianPoint;
  private elevationAzimuthDivisions: number;
  public solarIrradiance: SolarIrradianceData | null;
  private colorMap: (t: number) => [number, number, number];

  constructor() {
    this.elevationRaster = [];
    this.elevationRasterMidpoint = { x: 0, y: 0, z: 0 };
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
    if (!this.simulationGeometry) {
      this.simulationGeometry = geometry;
    } else {
      this.simulationGeometry = BufferGeometryUtils.mergeGeometries([this.simulationGeometry, geometry]);
    }
    if (!this.shadingGeometry) {
      this.shadingGeometry = geometry;
    } else {
      this.shadingGeometry = BufferGeometryUtils.mergeGeometries([this.shadingGeometry, geometry]);
    }
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
    if (!this.shadingGeometry) {
      this.shadingGeometry = geometry;
    } else {
      this.shadingGeometry = BufferGeometryUtils.mergeGeometries([this.shadingGeometry, geometry]);
    }
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

  /** @ignore
   * Gets a BufferGeometry representing a mesh. Refines the triangles until all triangles
   * have sites smaller maxLength.
   */

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

   * @returns A three.js colored mesh of the simulationGeometry. Each triangle gets an 
   * attribute called intensity, that holds the annual electricity in kwh/m2 that a PV
   * system can generate.
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

    this.simulationGeometry = this.refineMesh(this.simulationGeometry, 1.0);

    console.log('Number of simulation triangles:', this.simulationGeometry.attributes.position.count / 3);
    console.log('Number of shading triangles:', this.shadingGeometry.attributes.position.count / 3);

    // Extract and validate geometry attributes
    const meshArray = <Float32Array>this.shadingGeometry.attributes.position.array;
    const points = this.simulationGeometry.attributes.position.array;
    const normalsArray = this.simulationGeometry.attributes.normal.array;

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

    return this.createMesh(this.simulationGeometry, pvYield, maxYieldPerSquareMeter);
  }

  // Type Guard function to validate class parameters
  private validateClassParams(): this is {
    shadingGeometry: NonNullable<BufferGeometry>;
    simulationGeometry: NonNullable<BufferGeometry>;
    solarIrradiance: NonNullable<SolarIrradianceData>;
  } {
    return (
      this.shadingGeometry !== null &&
      this.shadingGeometry !== undefined &&
      this.simulationGeometry !== null &&
      this.simulationGeometry !== undefined &&
      this.solarIrradiance != null
    );
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
    /**
     * Converts an array of SunVector objects to a flat Float32Array containing only
     * the normalized cartesian coordinates (x, y, z) and a Float32Array of absolute values.
     * @param sunVectors
     * @returns
     */
    function convertSunVectorsToFloat32Array(sunVectors: SunVector[]): {
      skysegmentDirections: Float32Array;
      skysegmentRadiation: Float32Array;
    } {
      const normalizedVectors = new Float32Array(sunVectors.length * 3);
      const absoluteValues = new Float32Array(sunVectors.length);

      // Iterate through each SunVector and extract the cartesian coordinates
      for (let i = 0; i < sunVectors.length; i++) {
        const vector = sunVectors[i].vector.cartesian;
        const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);

        // Calculate normalized components
        const normalizedX = magnitude !== 0 ? vector.x / magnitude : 0;
        const normalizedY = magnitude !== 0 ? vector.y / magnitude : 0;
        const normalizedZ = magnitude !== 0 ? vector.z / magnitude : 1;

        normalizedVectors[i * 3] = normalizedX;
        normalizedVectors[i * 3 + 1] = normalizedY;
        normalizedVectors[i * 3 + 2] = normalizedZ;

        absoluteValues[i] = magnitude;
      }

      return {
        skysegmentDirections: normalizedVectors,
        skysegmentRadiation: absoluteValues,
      };
    }

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

    // Convert the existing array to a flat Float32Array
    const { skysegmentDirections, skysegmentRadiation } = convertSunVectorsToFloat32Array(irradianceShadedByElevation);
    normals = normals.filter((_, index) => index % 9 < 3);
    console.log('midpoints', midpoints);
    console.log('normals', normals);
    console.log('meshArray', meshArray);
    console.log('skysegmentDirectionArray', skysegmentDirections);

    const shadedMaskScenes = await rayTracingWebGL(midpoints, normals, meshArray, skysegmentDirections, progressCallback);
    console.log('shadedMaskScenes', shadedMaskScenes);
    if (shadedMaskScenes === null) {
      throw new Error('Error occured when running the Raytracing in WebGL.');
    }

    //At this point we have one array shaded mask array (length N)for the sky segment
    //So we do the following
    //

    let intensities = new Float32Array(shadedMaskScenes[0].length).fill(0);
    console.log('skysegmentradiation', skysegmentRadiation);
    //iterate over each sky segment
    for (let i = 0; i < shadedMaskScenes.length; i++) {
      // iterate over each midpoint
      for (let j = 0; j < intensities.length; j++) {
        intensities[j] += shadedMaskScenes[i][j] * skysegmentRadiation[i];
      }
    }

    return intensities;
  }
}
