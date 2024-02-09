import { BufferGeometry, BufferAttribute } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { vec3 } from "gl-matrix"
import * as triangleUtils from './triangleUtils.js';
import { Triangle, ArrayType } from './triangleUtils.js';

// @ts-ignore
import { rayTracingWebGL } from './rayTracingWebGL.js';

export default class Scene {
    geometries: Array<BufferGeometry>
    mergedGeometry: BufferGeometry | null
    radius: number
    center: [number, number]
    numberSimulations: number

    constructor() {
        this.geometries = [];
        this.mergedGeometry = null;
        this.radius = 60;
        this.center = [0, 0];
        this.numberSimulations = 80; // TODO: Make configurable
    }
    
    /**
     * Adds an STL geometry to the scene
     *
     * @param {ArrayBuffer} stlData
     * @memberof Scene
     */
    addSTL(stlData: ArrayBuffer) {        
        let geometry = new STLLoader().parse(stlData);
        // TODO: Offset calculations?
        this.addGeometry(geometry)
        console.log("stl added");
    }

     /**
     * Adds an arbitrary Three.js geometry to the scene
     *
     * @param {ArrayBuffer} stlData
     * @memberof Scene
     */
    addGeometry(geometry: BufferGeometry) {
        this.geometries.push(geometry);
        this.mergedGeometry = null;
    }

    
    /**
     * Set the center point of the simulation
     *
     * @param {number} x x-coordinate of the center
     * @param {number} y y-coordinate of the center
     * @memberof Scene
     */
    setCenter(x: number, y: number) {
        this.center = [x, y];
    }

    
    /**
     * Set the radius of the simulation
     *
     * @param {number} radius Simulation radius in world units
     * @memberof Scene
     */
    setRadius(radius: number) {
        this.radius = radius;
    }

    
    /**
     * Build merged mesh from all scene geometries by extracting all surfaces that
     * are at most `radius` units away from the center point.
     *
     * @param {number} radius 
     * @return {*} {BufferGeometry} 
     * @memberof Scene
     */
    extractMesh(radius: number): BufferGeometry {
        if(this.mergedGeometry === null) {
            this.mergedGeometry = BufferGeometryUtils.mergeGeometries(this.geometries);
        }

        const [cx, cy] = this.center;
        const positions = this.mergedGeometry.attributes.position.array.slice();
        let newPositions = [];
        let newNormals = [];

        // Iterate over triangles
        for(let i = 0; positions.length; i += 9) {
            let keep = true;
            // Iterate over triangle vertices
            for(let j = 0; j < 9; j += 3) {
                // Check if x,y are inside center+radius
                const dx = positions[i+j] - cx;
                const dy = positions[i+j+1] - cy;
                if(dx*dx + dy*dy > radius*radius) {
                    keep = false;
                }
            }

            if(keep) {
                const [normal, area] = triangleUtils.normalAndArea(positions, i);
                //remove triangles with low area for shading
                if(area < 0.025) {
                    continue;
                }

                for (var j = 0; j < 9; j++) {
                    newPositions.push(positions[i + j]);
                    newNormals.push(normal[j % 3]);
                }
            }
        }

        let geometry = new BufferGeometry()
        geometry.setAttribute(
          "position",
          new BufferAttribute(new Float32Array(newPositions), 3)
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
    async calculate() {
        let outerGeometry = this.extractMesh(3 * this.radius); // TODO: make configurable
        let innerGeometry = this.extractMesh(this.radius);
        innerGeometry = this.refineMesh(innerGeometry, 0.1); // TODO: make configurable

        const meshArray = <Float32Array> outerGeometry.attributes.position.array;
        const points = innerGeometry.attributes.position.array;
        const normals = innerGeometry.attributes.normal.array;
        
        let midpoints: number[] = [];
        for(let i = 0; i < normals.length; i += 9) {
            const triangle = triangleUtils.extractTriangle(points, i);
            const midpoint = triangleUtils.midpoint(triangle);
            midpoints = midpoints.concat(midpoint);
        }
      
        const midpointsArray = new Float32Array(midpoints.slice())
        const normalsArray = new Float32Array(normals.slice())
      
        // Compute unique intensities
        const intensities = await this.rayTrace(
          midpointsArray,
          normalsArray,
          meshArray,
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
    async rayTrace(midpoints: Float32Array, normals: Float32Array, meshArray: Float32Array,
    ) {
        return rayTracingWebGL(midpoints, normals, meshArray, this.numberSimulations, [null, null]); // TODO: loc
    }
}
