import { vec3 } from "gl-matrix"

type ArrayType = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
type Triangle = [vec3, vec3, vec3];

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
    vec3.scale(normal, ar, 2 / area);
    return [normal, area];
}

export function normal(positions: ArrayType, startIndex: number): vec3 {
    return normalAndArea(positions, startIndex)[0];
}

export function area(positions: ArrayType, startIndex: number): number {
    return normalAndArea(positions, startIndex)[1];
}

export function subdivide(vertices: [vec3, vec3, vec3]): [Triangle, Triangle, Triangle, Triangle] {
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