import { BufferGeometry, BufferAttribute, TypedArray } from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js"
import * as triangleUtils from './triangleUtils.js';
import { Triangle, ArrayType } from './triangleUtils.js';
import { getRandomSunVectors } from './sun';

// @ts-ignore
import { rayTracingWebGL } from './rayTracingWebGL.js';


export default class Scene {
    simulationGeometries: Array<BufferGeometry>
    shadingGeometries: Array<BufferGeometry>
    latitude: number
    longitude: number

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
        const normals = mesh.attributes.position.array.slice();

        let newTriangles: Triangle[] = [];
        let newNormals: number[] = [];
        // Iterate over triangles
        for(let i = 0; positions.length; i += 9) {
            let area = triangleUtils.area(positions, i);
            let triangles = [triangleUtils.extractTriangle(positions, i)];
            while(area > maxArea) {
                triangles = triangles.flatMap(triangleUtils.subdivide);
                area /= 4;
            }
            newTriangles = newTriangles.concat(triangles);
            const ni = i / 3;
            // copy normal for each subdivided triangle
            newNormals = newNormals.concat(triangles.flatMap(_ => [normals[ni], normals[ni+1], normals[ni+2]]));
        }

        let geometry = new BufferGeometry()
        geometry.setAttribute(
          "position",
          new BufferAttribute(new Float32Array(triangleUtils.flatten(newTriangles)), 3)
        );
        geometry.setAttribute(
            "normal",
            new BufferAttribute(new Float32Array(newNormals), 3)
        );
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.normal.needsUpdate = true;
    
        return geometry;
    }

    
    /**
     * Run the simulation.
     *
     * @return {*} 
     * @memberof Scene
     */
    async calculate(numberSimulations: number = 80) {
        let simulationGeometry = BufferGeometryUtils.mergeGeometries(this.simulationGeometries);
        let shadingGeometry = BufferGeometryUtils.mergeGeometries(this.shadingGeometries);
        simulationGeometry = this.refineMesh(simulationGeometry, 0.1); // TODO: make configurable

        const meshArray = <Float32Array> shadingGeometry.attributes.position.array;
        const points = simulationGeometry.attributes.position.array;
        const normalsArray = simulationGeometry.attributes.normal.array;
        
        let midpoints: number[] = [];
        for(let i = 0; i < normalsArray.length; i += 9) {
            const triangle = triangleUtils.extractTriangle(points, i);
            const midpoint = triangleUtils.midpoint(triangle);
            midpoints = midpoints.concat(midpoint);
        }
      
        const midpointsArray = new Float32Array(midpoints.slice())
      
        // Compute unique intensities
        const intensities = await this.rayTrace(
          midpointsArray,
          normalsArray,
          meshArray,
          numberSimulations
        );
        
        if (intensities === null) {
          throw new Error("Error raytracing in WebGL.");
        }
        
        // TODO: Currently: one intensity per triangle, do we need one for each point instead?
        return intensities;
    }
    
    
    /**
     * Call ray-tracing shader to calculate intensities for each midpoint based on the given normals and mesh 
     *
     * @param {Float32Array} midpoints midpoints of triangles for which to calculate intensities
     * @param {Float32Array} normals normals for each midpoint
     * @param {Float32Array} meshArray array of vertices for the shading mesh
     * @return {*} 
     * @memberof Scene
     */
    async rayTrace(midpoints: Float32Array, normals: TypedArray, meshArray: Float32Array, numberSimulations: number
    ) {
        let sunDirections = getRandomSunVectors(numberSimulations, this.latitude, this.longitude);
        return rayTracingWebGL(midpoints, normals, meshArray, sunDirections);
    }
}
