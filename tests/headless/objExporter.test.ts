import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { ObjExporter } from '../../src/headless/objExporter';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createMockMeshData } from './utils';

describe('ObjExporter', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'obj-exporter'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('create mesh.obj file', async () => {
    const meshData = createMockMeshData(1);
    await ObjExporter.exportObj(meshData, tempDir);

    const objPath = path.join(tempDir, 'mesh.obj');
    expect(fs.existsSync(objPath)).toBe(true);
  });

  test('write correct vertex count', async () => {
    const meshData = createMockMeshData(2); // 2 triangles = 6 vertices
    await ObjExporter.exportObj(meshData, tempDir);

    const objString = fs.readFileSync(path.join(tempDir, 'mesh.obj'), 'utf-8');
    const vertices = objString.split('\n').filter((l) => l.startsWith('v '));

    expect(vertices.length).toBe(6);
  });

  test('write correct face count', async () => {
    const meshData = createMockMeshData(3); // 3 triangles = 3 faces
    await ObjExporter.exportObj(meshData, tempDir);

    const objString = fs.readFileSync(path.join(tempDir, 'mesh.obj'), 'utf-8');
    const faces = objString.split('\n').filter((l) => l.startsWith('f '));

    expect(faces.length).toBe(3);
  });

  test('use extended vertex format with colors (v x y z r g b)', async () => {
    const meshData = createMockMeshData(1);
    await ObjExporter.exportObj(meshData, tempDir);

    const objString = fs.readFileSync(path.join(tempDir, 'mesh.obj'), 'utf-8');
    const firstVertex = objString.split('\n').find((l) => l.startsWith('v '));

    // Format: v x y z r g b (6 numbers after 'v')
    const parts = firstVertex!.split(' ');
    expect(parts.length).toBe(7); // 'v' + 6 numbers
  });
});
