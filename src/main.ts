import * as THREE from 'three';
import { BufferAttribute, BufferGeometry, TypedArray } from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { viridis } from './colormaps.js';
import * as elevation from './elevation.js';
import * as sun from './sun.js';
import * as triangleUtils from './triangleUtils.js';
import { CalculateParams, CartesianPoint, ColorMap, SolarIrradianceData, logNaNCount } from './utils.js';

// @ts-ignore
import { rayTracingWebGL } from './rayTracingWebGL.js';
import { filterShadingBufferGeometry, filterShadingGeometry, getMinSunAngleFromIrradiance } from './geometryFilter';

/**
 * This class holds all information about the scene that is simulated.
 * A ShadingScene is typically equipped with the following attributes:
 * * Simulation geometry, where the PV potential is calculated.
 * * Shading geometry, where no PV potential is calculated but which are
 *   responsible for shading.
 * * Solar Irradiance Data that contains information about incoming irradiance
 *   in the format of sky domes.
 * The Usage of this class and its methods is explained in the "Getting Started" Section
 * of this site.
 */
export class ShadingScene {
  /**
   * A Three.js geometry holding the main object of the scene,
   * see {@link ShadingScene.addShadingGeometry}
   */
  public simulationGeometry: BufferGeometry | undefined;
  /**
   * A Three.js geometry holding the objects that cause shading,
   * see {@link ShadingScene.addShadingGeometry}
   */
  public shadingGeometry: BufferGeometry | undefined;
  /**
   * The minimum radiance angle which gets used during raytracing.
   * It is being used for filtering out shading geometry which
   * physically cannot shade the simulation geometry. See {@link filterShadingGeometry}
   */
  public minSunAngle: number | undefined;
  /**
   * A Raster (2D Matrix) holding rasterized data of the terrain,
   * see {@link ShadingScene.addElevationRaster}
   */
  public elevationRaster: Array<CartesianPoint>;
  /**
   * The midpoint of the elevationRaster, where the main object of
   * the scene is located.
   * See {@link ShadingScene.addElevationRaster}
   */
  private elevationRasterMidpoint: CartesianPoint;
  /**
   * A timeseries of Skydomes holding averaged direct and diffuse
   * irradiance data.
   * See {@link ShadingScene.addSolarIrradiance}
   */
  public solarIrradiance: SolarIrradianceData[] | null;
  private colorMap: (t: number) => [number, number, number];

  constructor() {
    this.elevationRaster = [];
    this.elevationRasterMidpoint = { x: 0, y: 0, z: 0 };
    this.solarIrradiance = null;
    this.colorMap = viridis;
  }

  /**
   * Adds a geometry as a target for the shading simulation.
   * For these geometries, the PV potential will be simulated.
   * This geometry will also be used as a shading geometry, hence
   * it is not needed to additionally add it by using `addShadingGeometry`.
   *
   * @param geometry [BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry) of a Three.js geometry, where three
   * consecutive numbers of the array represent one 3D point and nine consecutive
   * numbers represent one triangle.
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
   * @param geometry [BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry) of a Three.js geometry, where three
   * consecutive numbers of the array represent one 3D point and nine consecutive
   * numbers represent one triangle.
   * @param minSunAngle The minimum radiance angle which gets used during raytracing. It is being used for filtering out
   * shading geometry which physically cannot shade the simulation geometry. If none is provided the min. angle of the
   * provided irradiance data will be used.
   */
  addShadingGeometry(geometry: BufferGeometry, minSunAngle?: number) {
    if (minSunAngle !== undefined) {
      this.minSunAngle = minSunAngle;
    }
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
   * angle will be [0, ..., 2Pi] where the list has a lenght of azimuthDivisions
   */
  addElevationRaster(raster: CartesianPoint[], midpoint: CartesianPoint) {
    this.elevationRaster = raster;
    this.elevationRasterMidpoint = midpoint;
  }
  /**
   * Add data of solar irradiance to the scene. If it comes as a List of SolarIrradianceData,
   * this is interpreted as a time series of skydomes.
   *
   * **Important Note:** The first skydome of the list is used for the coloring of the final mesh!
   * Check out the type definition of {@link utils.SolarIrradianceData} for more information.
   * @param irradiance
   */
  addSolarIrradiance(irradiance: SolarIrradianceData[] | SolarIrradianceData) {
    // solarIrradiance is a time series of skydomes. If only one skydome is given
    // this one will be placed in a list
    if (!Array.isArray(irradiance)) {
      irradiance = [irradiance];
    }
    this.solarIrradiance = irradiance;
  }
  /**
   * Fetches a SolarIrradiance Object from a url and adds it to the
   * ShadingScene.
   * @param url
   */
  async addSolarIrradianceFromURL(url: string): Promise<void> {
    const response = await fetch(url);
    const data = await response.json();
    this.addSolarIrradiance(data);
  }

  /**
   * Change the Color Map that is used for the colors of the simulated Three.js mesh. This is
   * optional, the default colorMap is viridis (blue to green to yellow). Other options are
   * {@link colormaps.interpolateTwoColors} or {@link colormaps.interpolateThreeColors}
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

    const newTriangles: number[] = [];
    const newNormals: number[] = [];
    // Iterate over triangles
    for (let i = 0; i < positions.length; i += 9) {
      const normal = triangleUtils.normal(positions, i);
      if (normal[2] < -0.9) {
        // Triangle is facing down, we can skip this
        continue;
      }
      const triangles = triangleUtils.subdivide(positions, i, maxLength);
      for (let j = 0; j < triangles.length; j++) {
        newTriangles.push(triangles[j]);
        // copy normal for each subdivided triangle
        newNormals.push(normal[j % 3]);
      }
    }

    const geometry = new BufferGeometry();
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
   * The colors are chosen from the defined colorMap.
   * @param params The input object containing information about the simulation.

   * @returns A three.js colored mesh of the simulationGeometry. Each triangle gets an 
   * attribute called intensity, that holds the annual electricity in kwh/m2 that a PV
   * system can generate. If {@link ShadingScene.solarIrradiance} is a timeseries of sky
   * domes, the resulting intensities attribute is a flattened Float32Array of length T*N.
   */
  async calculate(params: CalculateParams = {}) {
    const {
      solarToElectricityConversionEfficiency = 0.15,
      maxYieldPerSquareMeter = 1400 * 0.15,
      progressCallback = (progress, total, elapsed, remaining) => {
        const format = (s: number) => {
          const min = Math.floor(s / 60);
          const sec = Math.floor(s % 60);
          return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
        };
        console.log(`Progress: ${progress}/${total} | Elapsed: ${format(elapsed)} | Est. remaining: ${format(remaining)}`);
      },
    } = params;

    // Validate class parameters
    if (!this.validateClassParams()) {
      throw new Error(
        'Invalid Class Parameters: You need to supply at least Shading Geometry, a Simulation Geometry, and Irradiance Data.',
      );
    }

    //Filter out irrelevant shading geometry
    const minSunAngle = this.minSunAngle ?? getMinSunAngleFromIrradiance(this.solarIrradiance);
    this.shadingGeometry = filterShadingBufferGeometry(this.simulationGeometry, this.shadingGeometry, minSunAngle);

    // Merge geometries
    this.simulationGeometry = this.refineMesh(this.simulationGeometry, 1.0);

    // Extract and validate geometry attributes
    // Flattened Mx3 array for M points
    const meshArray = <Float32Array>this.shadingGeometry.attributes.position.array;
    // Flattened Nx3 array for N points
    const points = this.simulationGeometry.attributes.position.array;
    // Flattened (N/3)x3 array for N/3 triangles, each triangle with a normal
    // Originally, every N point has one normal
    // Keeping only the first 3 elements out of every 9 so we have one normal
    // per triangle, not one normal per triangle edge point
    const normalsArray = this.simulationGeometry.attributes.normal.array.filter((_, index) => index % 9 < 3);

    const midpointsArray = this.computeMidpoints(points);

    // Check for NaN values in geometry data
    logNaNCount('midpoints', midpointsArray);
    logNaNCount('mesh', meshArray);

    // Wrap progress callback with timing
    const startTime = Date.now();
    const wrappedCallback = (progress: number, total: number) => {
      if (progress === 0) {
        return;
      }
      const elapsed = (Date.now() - startTime) / 1000;
      const average = elapsed / progress;
      const remaining = Math.max(0, (total - progress) * average);
      progressCallback(progress, total, elapsed, remaining);
    };

    // Perform ray tracing to calculate intensities
    const shadedScene = await this.rayTrace(
      midpointsArray,
      normalsArray,
      meshArray,
      this.solarIrradiance!, // Non-null assertion
      wrappedCallback,
    );

    const pvYield = sun.calculatePVYield(
      shadedScene,
      solarToElectricityConversionEfficiency,
      this.solarIrradiance[0].metadata.valid_timesteps_for_aggregation,
    );

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
  private computeMidpoints(points: TypedArray): Float32Array {
    let midpoints: number[] = [];
    for (let i = 0; i < points.length; i += 9) {
      const midpoint = triangleUtils.midpoint(points, i);
      midpoints.push(...midpoint);
    }
    return new Float32Array(midpoints);
  }

  /**
   * @ignore
   * This function does two things:
   * - it assigns a color to the given simulationGeometry. The color is assigned
   * using the FIRST value of the intensities time series and the maxYieldPerSquareMeter
   * as upper boundary.
   * - it flattens the time series of intensities and sets them as attribute to the simulationGeometry
   *
   * @param simulationGeometry Nx9 Array with the edge points of N triangles
   * @param intensities T x N intensities, one for every triangle and every time step
   * @param maxYieldPerSquareMeter number defining the upper boundary of the color map
   * @returns Mesh with color and new attribute "intensities" that has length T*N
   */
  private createMesh(
    simulationGeometry: BufferGeometry,
    intensities: Float32Array[],
    maxYieldPerSquareMeter: number,
  ): THREE.Mesh {
    const Npoints = simulationGeometry.attributes.position.array.length / 9;
    var newColors = new Float32Array(Npoints * 9);

    for (var i = 0; i < Npoints; i++) {
      const col = this.colorMap(Math.min(maxYieldPerSquareMeter, intensities[0][i]) / maxYieldPerSquareMeter);
      for (let j = 0; j < 9; j += 3) {
        newColors[9 * i + j] = col[0];
        newColors[9 * i + j + 1] = col[1];
        newColors[9 * i + j + 2] = col[2];
      }
    }

    simulationGeometry.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
    var material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    // In THREE, only Flat arrays can be set as an attribute
    const flatIntensities = new Float32Array(intensities.map((arr) => Array.from(arr)).flat());

    // Set the T*N Float32Array of intensities as attributes. On the website, this intensities
    // attribute needs to be divided again in T parts for the T time steps.
    simulationGeometry.setAttribute('intensities', new THREE.Float32BufferAttribute(flatIntensities, 1));
    let mesh = new THREE.Mesh(simulationGeometry, material);

    return mesh;
  }

  /** @ignore
   * This function returns a time series of intensities of shape T x N, with N the number of midpoints.
   * It includes the shading of geometries, the dot product of normal vector and sky segment vector,
   * and the radiation values from diffuse and direct irradiance.
   *
   * @param midpoints midpoints of triangles for which to calculate intensities
   * @param normals normals for each midpoint
   * @param meshArray array of vertices for the shading mesh
   * @param irradiance Time Series of sky domes
   * @return
   */
  private async rayTrace(
    midpoints: Float32Array,
    normals: TypedArray,
    meshArray: Float32Array,
    irradiance: SolarIrradianceData[],
    progressCallback: (progress: number, total: number) => void,
  ): Promise<Float32Array[]> {
    /**
     * Converts a list of solarIrradiance objects to a flat Float32Array containing only
     * the normalized cartesian coordinates (x, y, z) of the skysegments
     * and a list of Float32Arrays containing the absolute values of radiances at each
     * sky segment.
     * @param solarIrradiance
     * @returns skysegmentDirections as Sx3 flattened Float32Array with S being number of skysegments
     * skysegmentRadiation List of Float32Array, List has lenght T as the number of time steps,
     * each Float32Array has lenght S with on radiation value for each segment
     */
    function convertSolarIrradianceToFloat32Array(solarIrradiance: SolarIrradianceData[]): {
      skysegmentDirections: Float32Array;
      skysegmentRadiation: Float32Array[];
    } {
      const directions: number[] = [];
      const radiation: Float32Array[] = [];

      for (const entry of solarIrradiance) {
        const radiances: number[] = [];
        for (const point of entry.data) {
          const altRad = (point.altitude_deg * Math.PI) / 180;
          const azRad = (point.azimuth_deg * Math.PI) / 180;

          const x = Math.cos(altRad) * Math.sin(azRad);
          const y = Math.cos(altRad) * Math.cos(azRad);
          const z = Math.sin(altRad);

          directions.push(x, y, z);
          radiances.push(point.average_radiance_W_m2_sr);
        }
        radiation.push(new Float32Array(radiances));
      }

      return {
        skysegmentDirections: new Float32Array(directions),
        skysegmentRadiation: radiation,
      };
    }

    // Convert the existing array to a flat Float32Array
    const { skysegmentDirections, skysegmentRadiation } = convertSolarIrradianceToFloat32Array(irradiance);

    const shadedMaskScenes = await rayTracingWebGL(midpoints, normals, meshArray, skysegmentDirections, progressCallback);
    if (shadedMaskScenes === null) {
      throw new Error('Error occured when running the Raytracing in WebGL.');
    }
    //TODO Insert shading from ELevationRaster here
    if (this.elevationRaster.length > 0) {
      const elevationShadingMask = elevation.getElevationShadingMask(
        this.elevationRaster,
        this.elevationRasterMidpoint,
        // extract the altitude azimuth pairs from the first skysegment
        irradiance[0].data.map(({ altitude_deg, azimuth_deg }) => [altitude_deg, azimuth_deg]),
      );
    }

    //At this point we have one shaded mask array (length N) of normalized vectors
    //for the sky segment
    //And a time series of skySegmentRadiation (which are the absolute values of the sky segment
    // vectors)

    // Initializize Intensities of shape T x N, with one intensity per time step per midpoint
    let intensities = skysegmentRadiation.map(() => new Float32Array(midpoints.length / 3));

    //iterate over each sky segment
    for (let i = 0; i < shadedMaskScenes.length; i++) {
      // iterate over each midpoint
      for (let j = 0; j < midpoints.length; j++) {
        for (let t = 0; t < intensities.length; t++) {
          intensities[t][j] += shadedMaskScenes[i][j] * skysegmentRadiation[t][i];
        }
      }
    }
    return intensities;
  }
}
