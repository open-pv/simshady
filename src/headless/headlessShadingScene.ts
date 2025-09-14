import { TypedArray } from 'three';
import { SolarIrradianceData } from '../utils.js';

import { createHeadlessGL, HeadlessGLOptions } from './createHeadlessGL';
import { ShadingScene } from '../main';

/**
 * Headless version of {@link ShadingScene}.
 *
 * This class provides the same functionality as ShadingScene but is made for running in
 * Node.js environments using headless WebGL rendering.
 */
export class HeadlessShadingScene extends ShadingScene {
  /** Optional WebGL context for headless rendering */
  private glContext?: WebGLRenderingContext | WebGL2RenderingContext;
  private readonly glOptions?: HeadlessGLOptions;

  constructor(glOptions?: HeadlessGLOptions) {
    super();
    this.glOptions = glOptions;
  }

  /**
   * Sets a custom WebGL context for headless rendering
   * @param gl WebGL context to use (WebGL1 or WebGL2)
   */
  setWebGLContext(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.glContext = gl;
  }

  /**
   * Creates or returns the WebGL context for headless rendering
   */
  private async getWebGLContext(): Promise<WebGLRenderingContext | WebGL2RenderingContext> {
    if (!this.glContext) {
      this.glContext = await createHeadlessGL(this.glOptions);
    }
    return this.glContext;
  }

  /**
   * This function returns a time series of intensities of shape T x N, with N the number of midpoints.
   * It includes the shading of geometries, the dot product of normal vector and sky segment vector,
   * and the radiation values from diffuse and direct irradiance.
   *
   * @param midpoints midpoints of triangles for which to calculate intensities
   * @param normals normals for each midpoint
   * @param meshArray array of vertices for the shading mesh
   * @param irradiance Time Series of sky domes
   * @return
   */
  protected async rayTrace(
    midpoints: Float32Array,
    normals: TypedArray,
    meshArray: Float32Array,
    irradiance: SolarIrradianceData[],
    progressCallback: (progress: number, total: number) => void,
  ): Promise<Float32Array[]> {
    // Use the headless WebGL context for ray tracing
    const gl = await this.getWebGLContext();

    return super.rayTrace(midpoints, normals, meshArray, irradiance, progressCallback, gl);
  }

  /**
   * Cleanup resources when done
   */
  dispose() {
    if (this.glContext && this.glContext.getExtension) {
      const destroyExt = this.glContext.getExtension('STACKGL_destroy_context');
      if (destroyExt) {
        destroyExt.destroy();
      }
    }
  }
}
