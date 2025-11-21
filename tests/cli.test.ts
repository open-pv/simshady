import { describe, expect, test } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('CLI integration test', () => {
  test('run CLI as subprocess', () => {
    const outputDir = path.join(__dirname, 'cli', 'results');

    // Change working directory to base simshady directory
    process.chdir(path.join(__dirname, '..'));

    // CLI needs to be built in order to test properly
    const cliExists = fs.existsSync(path.join(__dirname, '/dist/cli.cjs'));
    if (!cliExists) {
      execSync('npm run build');
    }

    try {
      execSync(
        `node dist/cli.cjs run ` +
          `--simulation-geometry ${path.join(__dirname, 'data/building.obj')} ` +
          `--irradiance-data ${path.join(__dirname, 'data/irradiance.json')} ` +
          `--output-dir ${outputDir} ` +
          `--silent`,
      );

      // Check the output
      expect(fs.existsSync(outputDir)).toBe(true);
    } catch (error: any) {
      console.error('CLI execution failed:', error.stdout, error.stderr);
      throw error;
    }
  });
});
