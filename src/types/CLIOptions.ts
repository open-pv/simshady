export type CLIOptions = {
  simulationGeometry?: string[];
  shadingGeometry?: string[];
  irradianceData?: string;
  efficiency?: number;
  maximumYield?: number;
  returnColors?: boolean;
  chromeArgs?: string[];
  maxOldSpaceSize?: number;
  silent?: boolean;
  // artifact options
  outputDir?: string;
  summary?: boolean;
  snapshotTopdown?: boolean;
  obj?: boolean;
  topdownSize?: string; // WxH
};
