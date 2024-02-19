import { vec3 } from "gl-matrix"

export type ArrayType = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
export type Triangle = [vec3, vec3, vec3];

export function extractTriangle(positions: ArrayType, startIndex: number): Triangle {
    const i = startIndex;
    const v0 = vec3.fromValues(positions[i], positions[i+1], positions[i+2]);
    const v1 = vec3.fromValues(positions[i+3], positions[i+4], positions[i+5]);
    const v2 = vec3.fromValues(positions[i+6], positions[i+7], positions[i+8]);
    return [v0, v1, v2];
}

export function normalAndArea(positions: ArrayType, startIndex: number): [vec3, number] {
    const [v0, v1, v2] = extractTriangle(positions, startIndex);
    let d1 = vec3.create();
    vec3.sub(d1, v1, v0);
    let d2 = vec3.create();
    vec3.sub(d2, v2, v0);
    let ar = vec3.create();
    vec3.cross(ar, d1, d2);
    const area = vec3.len(ar) / 2;
    let normal = vec3.create();
    vec3.scale(normal, ar, 0.5 / area);
    return [normal, area];
}

export function normal(positions: ArrayType, startIndex: number): vec3 {
    return normalAndArea(positions, startIndex)[0];
}

export function area(positions: ArrayType, startIndex: number): number {
    return normalAndArea(positions, startIndex)[1];
}

export function subdivide(vertices: Triangle): [Triangle, Triangle, Triangle, Triangle] {
    const [v0, v1, v2] = vertices;

    const m01 = vec3.clone(v0);
    const m12 = vec3.clone(v1);
    const m20 = vec3.clone(v2);
  
    vec3.lerp(m01, v0, v1, 0.5);
    vec3.lerp(m12, v1, v2, 0.5);
    vec3.lerp(m20, v2, v0, 0.5);
  
    return [
      [v0, m01, m20],
      [v1, m12, m01],
      [v2, m20, m12],
      [m01, m12, m20],
    ];
}

export function midpoint(triangle: Triangle): [number, number, number] {
    const [v0, v1, v2] = triangle;
    return [
        (v0[0] + v1[0] + v2[0]) / 3,
        (v0[1] + v1[1] + v2[1]) / 3,
        (v0[2] + v1[2] + v2[2]) / 3,
    ];
}

export function flatten(triangles: Triangle[]): Float32Array {
    return new Float32Array(triangles.flatMap(tri => [
        tri[0][0], tri[0][1], tri[0][2],
        tri[1][0], tri[1][1], tri[1][2],
        tri[2][0], tri[2][1], tri[2][2],
    ]));
}