import { describe, expect, test } from 'vitest';
import { DataLoader, FileType, JsonDataLoader, ObjDataLoader } from '../../src/headless/dataLoader';
import path from 'path';

const DATA_DIR = path.join(__dirname, '/data');

describe('DataLoader', () => {
  describe('getPathType', () => {
    test('detect JSON file type', async () => {
      const loader = new DataLoader();
      const type = await loader.getPathType(path.join(DATA_DIR, 'geometry.json'));
      expect(type).toBe(FileType.JSON);
    });

    test('detect OBJ file type', async () => {
      const loader = new DataLoader();
      const type = await loader.getPathType(path.join(DATA_DIR, 'building.obj'));
      expect(type).toBe(FileType.OBJ);
    });
  });

  describe('load', () => {
    test('load OBJ file', async () => {
      const loader = new DataLoader();
      const positions = await loader.load(path.join(DATA_DIR, 'building.obj'), true);

      expect(positions).toBeInstanceOf(Float32Array);
      expect(positions.length).toBeGreaterThan(0);
      expect(positions.length % 9).toBe(0);
    });

    test('load JSON file', async () => {
      const loader = new DataLoader();
      const positions = await loader.load(path.join(DATA_DIR, 'geometry.json'), true);

      expect(positions).toBeInstanceOf(Float32Array);
      expect(positions.length).toBeGreaterThan(0);
      expect(positions.length % 9).toBe(0);
    });

    test('throws error for non-existent file', async () => {
      const loader = new DataLoader();
      await expect(loader.load('/nonexistent/file.obj', true)).rejects.toThrow();
    });
  });

  describe('loadPositionsArrays', () => {
    test('load and concatenate multiple files', async () => {
      const loader = new DataLoader();
      const files = [path.join(DATA_DIR, 'calibration.obj'), path.join(DATA_DIR, 'calibration.obj')];

      const positions = await loader.loadPositionsArrays(files, true);

      // Should be double the single file
      expect(positions.length).toBe(36); // 2 * 18
    });

    test('return empty array for empty file list', async () => {
      const loader = new DataLoader();
      const positions = await loader.loadPositionsArrays([], true);
      expect(positions.length).toBe(0);
    });
  });

  describe('loadIrradianceData', () => {
    test('load irradiance JSON', async () => {
      const loader = new DataLoader();
      const data = await loader.loadIrradianceData(path.join(DATA_DIR, 'irradiance.json'));

      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('metadata');
    });
  });

  describe('JsonDataLoader', () => {
    test('load JSON file', async () => {
      const loader = new JsonDataLoader();
      const positions = await loader.load(path.join(DATA_DIR, 'geometry.json'), true);

      expect(positions).toBeInstanceOf(Float32Array);
      expect(positions.length).toBeGreaterThan(0);
      expect(positions.length % 9).toBe(0);
    });
  });

  describe('ObjDataLoader', () => {
    test('load OBJ file', async () => {
      const loader = new ObjDataLoader();
      const positions = await loader.load(path.join(DATA_DIR, 'building.obj'), true);

      expect(positions).toBeInstanceOf(Float32Array);
      expect(positions.length).toBeGreaterThan(0);
      expect(positions.length % 9).toBe(0);
    });
  });
});
