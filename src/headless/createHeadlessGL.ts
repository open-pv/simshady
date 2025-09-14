/**
 * Configuration options for headless WebGL context
 */
export interface HeadlessGLOptions {
  width?: number;
  height?: number;
  createWebGL2Context?: boolean;
  preserveDrawingBuffer?: boolean;
  antialias?: boolean;
  alpha?: boolean;
  depth?: boolean;
  stencil?: boolean;
  premultipliedAlpha?: boolean;
}

/**
 * Creates a headless WebGL context using headless-gl
 * Note: headless-gl currently only supports WebGL 2.0 in on an experimental level
 *
 * @param options Configuration options for the WebGL context
 * @returns WebGL context that can be used with simshady's ray tracing functions
 */
export async function createHeadlessGL(options: HeadlessGLOptions = {}): Promise<WebGLRenderingContext> {
  try {
    const { default: createGL } = await import('gl');

    const {
      width = 100,
      height = 100,
      createWebGL2Context = true,
      preserveDrawingBuffer = true,
      antialias = false,
      alpha = false,
      depth = true,
      stencil = false,
      premultipliedAlpha = true,
    } = options;

    // Create the headless WebGL context
    const gl = createGL(width, height, {
      createWebGL2Context,
      preserveDrawingBuffer,
      antialias,
      alpha,
      depth,
      stencil,
      premultipliedAlpha,
    });

    if (!gl) {
      throw new Error('Failed to create headless WebGL context');
    }

    return gl as WebGLRenderingContext;
  } catch (error) {
    throw new Error(`Failed to create headless WebGL context. ${error}`);
  }
}
