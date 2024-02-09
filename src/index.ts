import { BufferGeometry, BufferAttribute } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { vec3 } from "gl-matrix"
import * as triangleUtils from './triangleUtils';

export default class Scene {
    geometries: Array<BufferGeometry>
    mergedGeometry: BufferGeometry | null
    radius: number
    center: [number, number]

    constructor() {
        this.geometries = [];
        this.mergedGeometry = null;
        this.radius = 60;
        this.center = [0, 0];
    }

    addSTL(stlData: ArrayBuffer) {
        // let response = await fetch(url);
        let geometry = new STLLoader().parse(stlData);
        // TODO: Offset calculations?
        this.addGeometry(geometry)
        console.log("stl added");
    }

    addGeometry(geometry: BufferGeometry) {
        this.geometries.push(geometry);
        this.mergedGeometry = null;
    }

    setCenter(x: number, y: number) {
        this.center = [x, y];
    }

    setRadius(radius: number) {
        this.radius = radius;
    }

    extractMesh(radius: number) {
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

    refineMesh(mesh: BufferGeometry) {
        const positions = mesh.attributes.position.array.slice();
        let newPositions = [];
        // Iterate over triangles
        for(let i = 0; positions.length; i += 9) {
            const area = triangleUtils.area(positions, i);
            let triangles = [];
        }
        const triangle = triangleUtils.extractTriangle(positions, i);
        const subdividedTriangles = adaptiveSubdivideMesh(triangles, threshold)
          
            const newpos_update = []
            for (const triangle of subdividedTriangles) {
              newpos_update.push(...triangle)
            }
            return newpos_update          
    }

    calculate() {
        let innerGeometry = this.extractMesh(this.radius);
        let outerGeometry = this.extractMesh(3 * this.radius); // TODO: make configurable

        const mesh_vectors = raytracingGeometry.attributes.position.array
        const points = innerGeometry.attributes.position.array
        const normals = innerGeometry.attributes.normal.array
      
        const status_elem = document.getElementById("status")
        status_elem.textContent = "Simulating"
        status_elem.hasChanged = true
      
        let uniquePoints = []
        let uniqueNormals = []
      
        // Create an object to hold point/normal pairs, where the key is a string representation of the point
        const uniquePairs = {}
      
        for (let i = 0; i < points.length; i += 3) {
          const point = [points[i], points[i + 1], points[i + 2]].map((value) =>
            parseFloat(value.toFixed(6))
          ) // limit precision
          const pointKey = JSON.stringify(point)
      
          if (!uniquePairs.hasOwnProperty(pointKey)) {
            uniquePairs[pointKey] = i / 3
            uniquePoints.push(points[i], points[i + 1], points[i + 2])
            uniqueNormals.push(normals[i], normals[i + 1], normals[i + 2])
          }
        }
      
        const uniquePointsArray = new Float32Array(uniquePoints.slice())
        const uniqueNormalsArray = new Float32Array(uniqueNormals.slice())
      
        const laserPointsRadius = 0.5
        const laserPointsMinDistance = 1.0
      
        // Compute unique intensities
        const uniqueIntensities = await rayTracingPointsWebGL(
          uniquePointsArray,
          mesh_vectors,
          uniqueNormalsArray,
          laserPoints,
          laserPointsRadius,
          laserPointsMinDistance,
          window.numSimulations,
          loc
        )
        if (uniqueIntensities === null) {
          window.setLoading(false)
          return null
        }
        // Store unique intensities in uniquePairs
        for (let i = 0; i < uniqueIntensities.length; i++) {
          const point = [
            uniquePoints[i * 3],
            uniquePoints[i * 3 + 1],
            uniquePoints[i * 3 + 2],
          ].map((value) => parseFloat(value.toFixed(6))) // limit precision
          const pointKey = JSON.stringify(point)
      
          if (uniquePairs.hasOwnProperty(pointKey)) {
            uniquePairs[pointKey] = uniqueIntensities[i]
          } else {
            console.error(`Couldn't find indices for pointKey ${pointKey}`)
          }
        }
      
        // Generate final intensities array
        let intensities_array = new Array(points.length / 3).fill(0)
      
        for (let i = 0; i < points.length; i += 3) {
          const point = [points[i], points[i + 1], points[i + 2]].map((value) =>
            parseFloat(value.toFixed(6))
          ) // limit precision
          const pointKey = JSON.stringify(point)
      
          if (uniquePairs.hasOwnProperty(pointKey)) {
            intensities_array[i / 3] = uniquePairs[pointKey]
          }
        }
      
        const intensities = new Float32Array(intensities_array)
      
        status_elem.textContent = "Simulation Done"
        status_elem.hasChanged = true
        window.setLoading(false)
        showMeshIntensities(intensities, laserPoints, resetCamera)
      
    }
}


export function add(a: number, b: number): number {
    return a + b;
}