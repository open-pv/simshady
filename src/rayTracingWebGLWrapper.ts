import { TypedArray } from 'three';
import { rayTracingWebGL } from './rayTracingWebGL';
import { rayTracingWebGL1Headless } from './headless/rayTracingWebGL1Headless';

/**
 * A wrapper for rayTracingWebGL and rayTracingWebGL1Headless.
 * This allows using either browser-based or headless WebGL contexts
 * Automatically detects WebGL version and uses appropriate implementation
 */
export async function rayTracingWebGLWrapper(
  midpointsArray: TypedArray,
  normals: TypedArray,
  trianglesArray: TypedArray,
  skysegmentDirectionArray: Float32Array,
  progressCallback: (progress: number, total: number) => void,
  gl?: WebGLRenderingContext | WebGL2RenderingContext | null,
): Promise<Float32Array[] | null> {
  if (!gl) {
    // We expect simshady to run in the browser
    return rayTracingWebGL(midpointsArray, normals, trianglesArray, skysegmentDirectionArray, progressCallback);
  } else {
    // Provided GL context means we are running in a headless environment

    // Check if we have WebGL2 support
    const isWebGL2 = 'createVertexArray' in gl;
    if (isWebGL2) {
      // Use WebGL2 implementation
      return rayTracingWebGL(
        midpointsArray,
        normals,
        trianglesArray,
        skysegmentDirectionArray,
        progressCallback,
        gl as WebGL2RenderingContext,
      );
    } else {
      return rayTracingWebGL1Headless(
        midpointsArray,
        normals,
        trianglesArray,
        skysegmentDirectionArray,
        progressCallback,
        gl as WebGLRenderingContext,
      );
    }
  }
}
