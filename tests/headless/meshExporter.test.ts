import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { MeshExporter } from '../../src/headless/meshExporter';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createMockMeshData } from './utils';

describe('MeshExporter', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-exporter'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('exportMeshData', () => {
    test('create mesh/ subdirectory', async () => {
      const meshData = createMockMeshData();
      await MeshExporter.exportMeshData(meshData, tempDir);

      const meshDir = path.join(tempDir, 'mesh');
      expect(fs.existsSync(meshDir)).toBe(true);
    });

    test('write positions.bin', async () => {
      const meshData = createMockMeshData();
      await MeshExporter.exportMeshData(meshData, tempDir);

      const binPath = path.join(tempDir, 'mesh', 'positions.bin');
      expect(fs.existsSync(binPath)).toBe(true);
    });

    test('write colors.bin', async () => {
      const meshData = createMockMeshData();
      await MeshExporter.exportMeshData(meshData, tempDir);

      const binPath = path.join(tempDir, 'mesh', 'colors.bin');
      expect(fs.existsSync(binPath)).toBe(true);
    });

    test('write intensities.bin', async () => {
      const meshData = createMockMeshData();
      await MeshExporter.exportMeshData(meshData, tempDir);

      const binPath = path.join(tempDir, 'mesh', 'intensities.bin');
      expect(fs.existsSync(binPath)).toBe(true);
    });

    test('write metadata.json', async () => {
      const meshData = createMockMeshData();
      await MeshExporter.exportMeshData(meshData, tempDir);

      const jsonPath = path.join(tempDir, 'metadata.json');
      expect(fs.existsSync(jsonPath)).toBe(true);
    });

    test('read binary files back as Float32Array', async () => {
      const meshData = createMockMeshData();
      await MeshExporter.exportMeshData(meshData, tempDir);

      const buffer = fs.readFileSync(path.join(tempDir, 'mesh', 'positions.bin'));
      const positions = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);

      expect(positions.length).toBe(9);
    });
  });
});
