/**
 * Type declarations for the 'gl' package (headless-gl)
 * Attributes are a union of the official WebGL context attributes and a headless-gl specific attribute.
 * https://registry.khronos.org/webgl/specs/latest/1.0/#WEBGLCONTEXTATTRIBUTES
 * https://github.com/stackgl/headless-gl?tab=readme-ov-file#expiremental-webgl2-support
 */

declare module 'gl' {
  type WebGLPowerPreference = 'default' | 'high-performance' | 'low-power';
  interface ContextAttributes {
    createWebGL2Context?: boolean;
    alpha?: boolean;
    depth?: boolean;
    stencil?: boolean;
    antialias?: boolean;
    premultipliedAlpha?: boolean;
    preserveDrawingBuffer?: boolean;
    powerPreference?: WebGLPowerPreference;
    failIfMajorPerformanceCaveat?: boolean;
    desynchronized?: boolean;
  }

  function createGL(
    width: number,
    height: number,
    contextAttributes?: ContextAttributes,
  ): WebGLRenderingContext | WebGL2RenderingContext;

  export = createGL;
}
