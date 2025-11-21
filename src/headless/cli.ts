import { Command } from 'commander';
import { CLIOptions } from '../types/CLIOptions';
import { DataLoader } from './dataLoader';
import { runShadingSceneHeadlessChrome } from './headlessBrowser';

// Turn file names into array
function fileArray(input: string | string[] | undefined): string[] {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
}

/**
 * The CLI program that defines the input and output parameters, provides explanations, and converts the
 * parameters into the appropriate formats for the headless program.
 * The minimum configuration includes only simulation geometry and irradiance data. Below is a list of all existing CLI
 * parameters.
 *
 * Required parameters:
 *
 * - _**--simulation-geometry**_: Simulation geometry file(s) or directory. Supports JSON format: _{ positions: number[] }_ and OBJ files.
 * - _**--irradiance-data**_: Solar irradiance JSON file. JSON format: SolarIrradianceData or SolarIrradianceData[].
 *
 * Optional parameters for the calculation:
 *
 * - _**--shading-geometry**_: Shading geometry file(s) or directory. Supports JSON format: _{ positions: number[] }_ and OBJ files
 * - _**--efficiency**_: Efficiency of the conversion from solar energy to electricity. Value in [0,1]
 * - _**--maximum-yield**_: Upper boundary of annual yield in kWh/m2/year.This value is used to normalize the color of the returned three.js mesh.
 *
 * To generate artifacts, at least _**--output-dir**_ must be used. Parameters that affect the output or artifact generation are:
 *
 * - _**--output-dir**_: The directory where output artifacts should get stored in.
 * - _**--summary/--no-summary**_: Flag indicating if per-time-step and total summaries should get stored. (default: true)
 * - _**--snapshot-topdown/--no-snapshot-topdown**_: Flag indicating if an orthographic top-down snapshot should get stored (default: true)
 * - _**--topdown-size**_: Snapshot size defines as width x height, e.g. "4096x4096" (default: "4096x4096")
 * - _**--obj/--no-obj**_: Flag indicating if a .obj file should get stored (default: true)
 *
 * Other parameters are:
 *
 * - _**--silent**_: Mute verbose output (default: false)
 * - _**--chrome-args**_: Additional Chrome launch argument(s). They will get applied to the headless browser session before launch.
 * - _**--max-old-space-size**_: Sets the max memory size of V8's old memory section in the browser (in MiB) (default: 16384).
 * It might be necessary to increase the V8’s old memory outside the browser as well.
 */
export async function main(argv: string[]) {
  const startTime = new Date().toISOString();
  const program = new Command();
  program.name('simshady').description("Run simshady's shading simulation and PV yield estimation in a headless environment.");

  const run = program.command('run').description('Run a shading simulation.');

  run
    .option(
      '--simulation-geometry <file...>',
      'Simulation geometry file(s) or directory. Supports JSON format: { positions: number[] } and OBJ files.',
    )
    .option(
      '--shading-geometry <file...>',
      'Shading geometry file(s) or directory. Supports JSON format: { positions: number[] } and OBJ files.',
    )
    .option('--irradiance-data <file>', 'Solar irradiance JSON file. JSON format: SolarIrradianceData or SolarIrradianceData[].')
    .option('--efficiency <number>', 'Efficiency of the conversion from solar energy to electricity. Value in [0,1].', (v) =>
      parseFloat(v),
    )
    .option(
      '--maximum-yield <number>',
      'Upper boundary of annual yield in kWh/m2/year.This value is used to normalize the color of the returned three.js mesh.',
      (v) => parseFloat(v),
    )
    .option('--chrome-args <arg...>', 'Additional Chrome launch argument(s).')
    .option(
      '--max-old-space-size',
      "Sets the max memory size of V8's old memory section in the browser (in MiB) (default: 16384).",
      '16384',
    )
    .option('--silent', 'Mute verbose output (default: false).', false)
    // artifact options
    .option('--output-dir <ul>', 'The directory where output artifacts should get stored in.')
    .option('--summary', 'Flag indicating if per-time-step and total summaries should get stored (default: true).', true)
    .option('--no-summary', 'No json summary.')
    .option('--snapshot-topdown', 'Flag indicating if an orthographic top-down snapshot should get stored (default: true).', true)
    .option('--no-snapshot-topdown', 'No topdown snapshot.')
    .option('--topdown-size <WxH>', 'Snapshot size as "width x height", e.g. "4096x4096" (default: "4096x4096").', '4096x4096')
    .option('--obj', 'Flag indicating if an OBJ file should get stored (default: true).', true)
    .option('--no-obj', 'No .obj output.')

    .action(async (cliOptions) => {
      try {
        const options: CLIOptions = cliOptions;
        const dataLoader = new DataLoader();

        const simFiles = fileArray(options.simulationGeometry);
        if (simFiles.length === 0) throw new Error('Missing required --simulation-geometry');
        const simPos = await dataLoader.loadPositionsArrays(simFiles, options.silent ?? false);

        const irrFile = options.irradianceData;
        if (irrFile === undefined) throw new Error('Missing required --irradiance-data');
        const irradianceData = await dataLoader.loadIrradianceData(irrFile);

        const shadeFiles = fileArray(options.shadingGeometry);
        const shadePos = (await dataLoader.loadPositionsArrays(shadeFiles, options.silent ?? false)) ?? new Float32Array();

        await runShadingSceneHeadlessChrome(simPos, shadePos, irradianceData, startTime, __dirname, options);
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
