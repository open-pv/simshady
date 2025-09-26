import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { runShadingSceneHeadlessChrome } from './headlessBrowser';
import { SolarIrradianceData } from '../utils';

async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data) as T;
}

function concatFloat32(arrays: Float32Array[]): Float32Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

// Turn file names into array
function fileArray(input: string | string[] | undefined): string[] {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
}

type GeometryFile = { positions: number[] };

async function loadPositionsArrays(files: string[]): Promise<Float32Array> {
  const arrays: Float32Array[] = [];
  for (const f of files) {
    const data = await readJsonFile<GeometryFile>(f);
    if (!data || !Array.isArray((data as any).positions)) {
      throw new Error(`Invalid geometry file format: ${f}. Expected { positions: number[] }`);
    }
    arrays.push(new Float32Array(data.positions));
  }
  return concatFloat32(arrays);
}

type CLIOptions = {
  simulationGeometry?: string | string[];
  shadingGeometry?: string | string[];
  irradianceData?: string;
  efficiency?: number;
  maximumYield?: number;
  outputFile?: string;
  returnColors?: boolean;
  chromeArgs?: string[];
};

async function main(argv: string[]) {
  const program = new Command();
  program.name('simshady').description("Run simshady's shading simulation and PV yield estimation in a headless environment");

  const run = program.command('run').description('Run a shading simulation');

  run
    .option('--simulation-geometry <file...>', 'Simulation geometry JSON file(s). JSON format: { positions: number[] }')
    .option('--shading-geometry <file...>', 'Shading geometry JSON file(s). JSON format: { positions: number[] }')
    .option('--irradiance-data <file>', 'Solar irradiance JSON file. JSON format: SolarIrradianceData or SolarIrradianceData[]')
    .option('--efficiency <number>', 'Efficiency of the conversion from solar energy to electricity. Value in [0,1]', (v) =>
      parseFloat(v),
    )
    .option(
      '--maximum-yield <number>',
      'Upper boundary of annual yield in kWh/m2/year.This value is used to normalize the color of the returned three.js mesh.',
      (v) => parseFloat(v),
    )
    .option('--output-file <file>', 'Output file location')
    .option('--return-colors', 'Flag indicating if intensity color values should get returned', false)
    .option('--chrome-args <arg...>', 'Additional Chrome launch argument(s)')

    .action(async (cliOptions) => {
      try {
        const options: CLIOptions = cliOptions;

        const simFiles = fileArray(options.simulationGeometry);
        if (simFiles.length === 0) {
          throw new Error('Missing required --simulation-geometry');
        }
        const simPos = await loadPositionsArrays(simFiles);

        const irrFile = options.irradianceData;
        if (irrFile === undefined) {
          throw new Error('Missing required --irradiance-data');
        }
        const irradianceData = await readJsonFile<SolarIrradianceData | SolarIrradianceData[]>(irrFile);

        const shadeFiles = fileArray(options.shadingGeometry);
        const shadePos = (await loadPositionsArrays(shadeFiles)) ?? new Float32Array();

        const result = await runShadingSceneHeadlessChrome(
          simPos,
          shadePos,
          irradianceData,
          options.efficiency,
          options.maximumYield,
          {
            returnColors: !!options.returnColors,
            launchArgs: options.chromeArgs,
            dist_dirname: __dirname,
          },
        );

        const outStr = JSON.stringify(result);

        if (options.outputFile) {
          await fs.mkdir(path.dirname(options.outputFile), { recursive: true });
          await fs.writeFile(options.outputFile, outStr, 'utf8');
        } else {
          process.stdout.write(outStr);
        }
      } catch (error: any) {
        process.stderr.write(`Error: ${error?.message ?? String(error)}\n`);
      }
    });

  await program.parseAsync(argv);
}

// Execute when run
if (require.main === module) {
  main(process.argv);
}

export default main;
