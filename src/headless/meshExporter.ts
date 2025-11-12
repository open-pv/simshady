import fs from 'fs';
import path from 'path';
import type { Page } from 'puppeteer';
import { CLIOptions } from '../types/CLIOptions';

/**
 * Metadata object containing all fields which get stored as metadata after a run.
 */
export type MeshData = {
  positions: Float32Array;
  colors: Float32Array;
  intensities: Float32Array;
  metadata: {
    triangleCount: number;
    vertexCount: number;
    attributes: {
      position: { itemSize: number; type: string };
      color: { itemSize: number; type: string };
      intensities: { itemSize: number; type: string };
    };
    bounds: {
      min: [number, number, number];
      max: [number, number, number];
      center: [number, number, number];
      size: [number, number, number];
    };
    options: any;
    startedAt: string;
    finishedAt: string;
  };
};

/**
 * Exports computed mesh data from browser to directory.
 */
export class MeshExporter {
  static async collectAttribute(page: Page, attrName: string, chunkSize: number = 100000): Promise<Float32Array> {
    // Get total count
    const count = await page.evaluate((name) => {
      const { mesh } = (window as any).__simshady__;
      const attr = mesh.geometry.getAttribute(name);
      return attr.array.length;
    }, attrName);

    // Collect in chunks
    const result = new Float32Array(count);
    for (let offset = 0; offset < count; offset += chunkSize) {
      const chunk = (await page.evaluate(
        (name, off, size) => {
          const { mesh } = (window as any).__simshady__;
          const attr = mesh.geometry.getAttribute(name);
          const end = Math.min(attr.array.length, off + size);
          return Array.from(attr.array.subarray(off, end));
        },
        attrName,
        offset,
        chunkSize,
      )) as number[];
      result.set(chunk, offset);
    }
    return result;
  }

  /**
   * Collect all mesh data (positions, colors, intensities, metadata) from the browser context and return
   * it inside the node.js context.
   */
  static async collectMeshData(page: Page, options: CLIOptions, startTime: string): Promise<MeshData> {
    // 1. Get metadata and bounds from browser
    const metadata = await page.evaluate(async () => {
      const finishedAt = new Date().toISOString();
      const { mesh } = (window as any).__simshady__;
      const { Box3, Vector3 } = await import('three');

      const posAttr = mesh.geometry.getAttribute('position');
      const colorAttr = mesh.geometry.getAttribute('color');
      const intensitiesAttr = mesh.geometry.getAttribute('intensities');

      // Calculate bounding box
      const box = new Box3().setFromObject(mesh);
      const center = new Vector3();
      const size = new Vector3();
      box.getCenter(center);
      box.getSize(size);

      return {
        triangleCount: Math.floor(posAttr.count / 3),
        vertexCount: posAttr.count,
        attributes: {
          position: { itemSize: posAttr.itemSize, type: 'Float32' },
          color: { itemSize: colorAttr.itemSize, type: 'Float32' },
          intensities: { itemSize: intensitiesAttr.itemSize, type: 'Float32' },
        },
        bounds: {
          min: box.min.toArray() as [number, number, number],
          max: box.max.toArray() as [number, number, number],
          center: center.toArray() as [number, number, number],
          size: size.toArray() as [number, number, number],
        },
        options: {},
        startedAt: '0',
        finishedAt: finishedAt,
      };
    });
    metadata['startedAt'] = startTime;
    metadata['options'] = options;

    const positions = await this.collectAttribute(page, 'position');
    const colors = await this.collectAttribute(page, 'color');
    const intensities = await this.collectAttribute(page, 'intensities');
    return {
      positions,
      colors,
      intensities,
      metadata,
    };
  }

  /**
   * Export collected mesh data to binary files in outputDir/mesh/
   */
  static async exportMeshData(meshData: MeshData, outputDir: string): Promise<void> {
    const meshDir = path.join(outputDir!!, 'mesh');
    await fs.promises.mkdir(meshDir, { recursive: true });

    // Write binaries
    await this.writeBinary(path.join(meshDir, 'positions.bin'), meshData.positions);
    await this.writeBinary(path.join(meshDir, 'colors.bin'), meshData.colors);
    await this.writeBinary(path.join(meshDir, 'intensities.bin'), meshData.intensities);

    // Write metadata
    await fs.promises.writeFile(path.join(outputDir, 'metadata.json'), JSON.stringify(meshData.metadata, null, 2), 'utf8');
  }

  /**
   * Write Float32Array to binary file
   */
  private static async writeBinary(filepath: string, data: Float32Array): Promise<void> {
    const buffer = Buffer.from(data.buffer);
    await fs.promises.writeFile(filepath, buffer);
  }
}
