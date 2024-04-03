export type ArrayType =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | number[];

export type Triangle = [number, number, number, number, number, number, number, number, number];

export function normalAndArea(positions: ArrayType, startIndex: number): [[number, number, number], number] {
  const [x0, y0, z0, x1, y1, z1, x2, y2, z2] = positions.slice(startIndex, startIndex + 9);

  const d01x = x1 - x0;
  const d01y = y1 - y0;
  const d01z = z1 - z0;
  const d02x = x2 - x0;
  const d02y = y2 - y0;
  const d02z = z2 - z0;

  const crsx = d01y * d02z - d01z * d02y;
  const crsy = d01z * d02x - d01x * d02z;
  const crsz = d01x * d02y - d01y * d02x;

  const crs_norm = Math.sqrt(crsx * crsx + crsy * crsy + crsz * crsz);
  const area = crs_norm / 2;
  const normal: [number, number, number] = [crsx / crs_norm, crsy / crs_norm, crsz / crs_norm];
  return [normal, area];
}

export function normal(positions: ArrayType, startIndex: number): [number, number, number] {
  return normalAndArea(positions, startIndex)[0];
}

export function area(positions: ArrayType, startIndex: number): number {
  return normalAndArea(positions, startIndex)[1];
}

export function subdivide(positions: ArrayType, startIndex: number, threshold: number): number[] {
  const triangle = positions.slice(startIndex, startIndex + 9);
  const [x0, y0, z0, x1, y1, z1, x2, y2, z2] = triangle;

  const d01x = x1 - x0;
  const d01y = y1 - y0;
  const d01z = z1 - z0;
  const d02x = x2 - x0;
  const d02y = y2 - y0;
  const d02z = z2 - z0;
  const d12x = x2 - x1;
  const d12y = y2 - y1;
  const d12z = z2 - z1;

  const l01 = d01x * d01x + d01y * d01y + d01z * d01z;
  const l02 = d02x * d02x + d02y * d02y + d02z * d02z;
  const l12 = d12x * d12x + d12y * d12y + d12z * d12z;

  const longest = Math.max(l01, l02, l12);
  if (longest <= threshold * threshold) {
    return Array.from(triangle);
  }
  if (l01 == longest) {
    const xm = (x0 + x1) / 2;
    const ym = (y0 + y1) / 2;
    const zm = (z0 + z1) / 2;

    const tri1 = [x0, y0, z0, xm, ym, zm, x2, y2, z2];
    const tri2 = [x1, y1, z1, x2, y2, z2, xm, ym, zm];

    return subdivide(tri1, 0, threshold).concat(subdivide(tri2, 0, threshold));
  } else if (l02 == longest) {
    const xm = (x0 + x2) / 2;
    const ym = (y0 + y2) / 2;
    const zm = (z0 + z2) / 2;

    const tri1 = [x0, y0, z0, x1, y1, z1, xm, ym, zm];
    const tri2 = [x1, y1, z1, x2, y2, z2, xm, ym, zm];

    return subdivide(tri1, 0, threshold).concat(subdivide(tri2, 0, threshold));
  } else if (l12 == longest) {
    const xm = (x1 + x2) / 2;
    const ym = (y1 + y2) / 2;
    const zm = (z1 + z2) / 2;

    const tri1 = [x0, y0, z0, x1, y1, z1, xm, ym, zm];
    const tri2 = [x2, y2, z2, x0, y0, z0, xm, ym, zm];

    return subdivide(tri1, 0, threshold).concat(subdivide(tri2, 0, threshold));
  } else {
    throw new Error("No edge is longest, this shouldn't happen");
  }
}

export function midpoint(positions: ArrayType, startIndex: number): [number, number, number] {
  const [x0, y0, z0, x1, y1, z1, x2, y2, z2] = positions.slice(startIndex, startIndex + 9);
  return [(x0 + x1 + x2) / 3, (y0 + y1 + y2) / 3, (z0 + z1 + z2) / 3];
}
