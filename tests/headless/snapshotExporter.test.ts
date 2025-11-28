import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { SnapshotExporter } from '../../src/headless/snapshotExporter';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SnapshotExporter', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-exporter'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('startTopDownGeneration', () => {
    test('normal generation', async () => {
      const mockPage = {} as any;
      const res = await SnapshotExporter.startTopDownGeneration(mockPage, {
        outputDir: tempDir,
        topdownSize: '1024x1024',
      });

      expect(res).toBeUndefined();
    });

    test('skip generation for invalid topdownSize', async () => {
      const mockPage = {} as any;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await SnapshotExporter.startTopDownGeneration(mockPage, {
        outputDir: tempDir,
        topdownSize: '2048',
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('wrong format'));
      warnSpy.mockRestore();
    });
  });
});
