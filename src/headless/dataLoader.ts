import fs from 'fs/promises';
import path from 'path';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Group, Mesh } from 'three';
import { SolarIrradianceData } from '../utils';

/**
 * Supported file types for geometry loading
 */
export enum FileType {
  JSON = 'json',
  OBJ = 'obj',
  UNKNOWN = 'unknown',
}

/**
 * Base data loader class
 */
class BaseDataLoader {
  async load(filePath: string, silent: boolean): Promise<Float32Array> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        return await this.loadSingleFile(filePath, silent);
      } else if (stats.isDirectory()) {
        return await this.loadDirectory(filePath, silent);
      } else {
        throw new Error(`Path is neither file nor directory: ${filePath}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to load geometry from ${filePath}: ${error.message}`);
    }
  }

  async loadSingleFile(_: string, silent: boolean): Promise<Float32Array> {
    throw new Error(`Not implemented.`);
  }

  /**
   * Loads all files inside the directory.
   */
  async loadDirectory(filePath: string, silent: boolean): Promise<Float32Array> {
    const filesNames = await fs.readdir(filePath);
    const files = filesNames.map((file) => path.join(filePath, file));

    console.log(`Loading ${files.length} files from directory: ${filePath}`);
    const geometries = await Promise.all(files.map((file) => this.loadSingleFile(file, silent)));
    const concatenated = this.concatenateGeometries(geometries);
    console.log(`Extracted ${concatenated.length / 9} triangles from directory: ${filePath}`);
    return concatenated;
  }

  /**
   * Concatenate multiple geometry arrays into one
   * @param geometries Array of geometry data to concatenate
   * @returns Concatenated geometry data
   */
  private concatenateGeometries(geometries: Float32Array[]): Float32Array {
    const totalLength = geometries.reduce((sum, geom) => sum + geom.length, 0);
    const concatenated = new Float32Array(totalLength);

    let offset = 0;
    for (const geom of geometries) {
      concatenated.set(geom, offset);
      offset += geom.length;
    }

    return concatenated;
  }
}

/**
 * Wrapper class that determines the appropriate loader based on file type and loads the data.
 */
export class DataLoader {
  private concatFloat32(arrays: Float32Array[]): Float32Array {
    const total = arrays.reduce((sum, a) => sum + a.length, 0);
    const out = new Float32Array(total);
    let offset = 0;
    for (const a of arrays) {
      out.set(a, offset);
      offset += a.length;
    }
    return out;
  }

  /**
   * Loads the arrays from all provided files or directories and combines all loaded arrays from the files into one single array.
   * @param files A list of all filenames that should get loaded. Either multiple files or directories.
   * @param silent Flag indicating if there is console output
   */
  async loadPositionsArrays(files: string[], silent: boolean): Promise<Float32Array> {
    const arrays: Float32Array[] = [];
    for (const f of files) {
      arrays.push(await this.load(f, silent));
    }
    return this.concatFloat32(arrays);
  }

  /**
   * Determine the file type based on the filename extension
   * @param filename The filename to check
   * @returns The FileType enum value
   */
  private getFileType(filename: string): FileType {
    const extension = path.extname(filename).toLowerCase().slice(1);
    switch (extension) {
      case 'json':
        return FileType.JSON;
      case 'obj':
        return FileType.OBJ;
      default:
        return FileType.UNKNOWN;
    }
  }

  /**
   * Check if this loader can handle the given path
   * @param filePath Path to check
   * @returns True if this loader can handle the path
   */
  async getPathType(filePath: string): Promise<FileType> {
    const stats = await fs.stat(filePath);
    if (stats.isFile()) {
      return this.getFileType(filePath);
    } else if (stats.isDirectory()) {
      const files = await fs.readdir(filePath);
      return this.getFileType(files.reverse()[0]);
    } else {
      throw new Error();
    }
  }

  /**
   * Load geometry data from the given path using the appropriate loader
   * @param filePath Path to the geometry file or directory
   * @param silent Flag indicating if there is console output
   * @returns Promise resolving to geometry data
   */
  async load(filePath: string, silent: boolean): Promise<Float32Array> {
    const fileType = await this.getPathType(filePath);
    switch (fileType) {
      case FileType.JSON:
        return new JsonDataLoader().load(filePath, silent);
      case FileType.OBJ:
        return new ObjDataLoader().load(filePath, silent);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Load {@link SolarIrradianceData} from provided filepath.
   * @param filePath
   */
  async loadIrradianceData(filePath: string): Promise<SolarIrradianceData | SolarIrradianceData[]> {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  }
}

/**
 * Data loader for JSON geometry files
 * Expects JSON format: { positions: number[] }
 */
export class JsonDataLoader extends BaseDataLoader {
  async loadSingleFile(filePath: string, silent: boolean): Promise<Float32Array> {
    if (!silent) console.log('Start loading JSON data from:', filePath);
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    if (!silent) console.log('JSON data loading finished');

    if (!parsed || !Array.isArray(parsed.positions)) {
      throw new Error(`Invalid geometry file format: ${filePath}. Expected { positions: number[] }`);
    }

    return new Float32Array(parsed.positions);
  }
}

/**
 * Data loader for OBJ geometry files using Three.js OBJLoader
 */
export class ObjDataLoader extends BaseDataLoader {
  private objLoader: OBJLoader;

  constructor() {
    super();
    this.objLoader = new OBJLoader();
  }

  async loadSingleFile(filePath: string, silent: boolean): Promise<Float32Array> {
    if (!silent) console.log('Start loading OBJ data from:', filePath);
    try {
      const objContent = await fs.readFile(filePath, 'utf8');
      const object = this.objLoader.parse(objContent);
      const positions = this.extractPositionsFromObject(object);
      if (!silent) console.log(`Extracted ${positions.length / 9} triangles from OBJ file: ${path.basename(filePath)}`);
      return positions;
    } catch (error) {
      console.error(`OBJ loading failed: ${error}`);
      return new Float32Array();
    }
  }

  /**
   * Extracts triangles from Mesh Objects
   */
  private extractPositionsFromObject(object: Group): Float32Array {
    const allPositions: number[] = [];
    for (const child of object.children) {
      const geometry = (child as Mesh).geometry;
      const positionAttribute = geometry.getAttribute('position');
      if (positionAttribute) {
        const positions = positionAttribute.array;
        for (let i = 0; i < positions.length; i += 9) {
          // Extract triangle vertices (3 vertices * 3 components each = 9 values)
          for (let j = 0; j < 9 && i + j < positions.length; j++) {
            allPositions.push(positions[i + j]);
          }
        }
      }
    }

    if (allPositions.length === 0) {
      throw new Error('No valid geometry found in OBJ file');
    }
    if (allPositions.length % 9 !== 0) {
      throw new Error(`Invalid triangle count: ${allPositions.length} positions not divisible by 9`);
    }
    return new Float32Array(allPositions);
  }
}
