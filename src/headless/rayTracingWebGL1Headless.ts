import { TypedArray } from 'three';
import { timeoutForLoop } from '../utils';

/**
 * WebGL1-compatible version of rayTracingWebGL that accepts a WebGL context as parameter
 * This version uses WebGL1 features for compatibility with headless-gl.
 *
 * @param midpointsArray flattened Nx3 array with N the number of surface points for which shading is calculated
 * @param normals flattened Nx3 array, N times a vector of 3 components (the midpoint normals)
 * @param trianglesArray flattened Mx9 array with M the number of shading triangles
 * @param skysegmentDirectionArray flattened Sx3 array with S being the number of sky segments (normalized!)
 * @param progressCallback flattened Callback indicating the progress
 * @param gl WebGL1 context to use for rendering
 * @returns shadedMaskScenes: NxS array containing the dot product of the direction vector of the skysegment and the normal of the midpoint
 */
export async function rayTracingWebGL1Headless(
  midpointsArray: TypedArray,
  normals: TypedArray,
  trianglesArray: TypedArray,
  skysegmentDirectionArray: Float32Array,
  progressCallback: (progress: number, total: number) => void,
  gl: WebGLRenderingContext,
): Promise<Float32Array[] | null> {
  const N_TRIANGLES = trianglesArray.length / 9;
  const width = midpointsArray.length / 3; // Change this to the number of horizontal points in the grid
  const N_POINTS = width;

  const textureFloatExtension = gl.getExtension('OES_texture_float');
  if (!textureFloatExtension) {
    throw Error(`OES_texture_float not available!`);
  }

  // Vertex shader code (fullscreen triangle)
  const vertexShaderSource = `
        precision highp float;
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
        `;

  // Fragment shader code
  const fragmentShaderSource = `
        #define INFINITY         1000000.0
        precision highp float;

        uniform sampler2D u_triangles;
        uniform vec3 u_sun_direction;
        uniform float textureWidth;
        uniform float textureHeight;

        uniform sampler2D u_midpoints;
        uniform sampler2D u_normals;
        uniform float u_pointsWidth;


        vec3 cross1(vec3 a, vec3 b) {
            vec3 c = vec3(0, 0, 0);
            c.x = a[1] * b[2] - a[2] * b[1];
            c.y = a[2] * b[0] - a[0] * b[2];
            c.z = a[0] * b[1] - a[1] * b[0];
            return c;
        }

        float TriangleIntersect( vec3 v0, vec3 v1, vec3 v2, vec3 rayOrigin, vec3 rayDirection, int isDoubleSided )
        {
            vec3 edge1 = v1 - v0;
            vec3 edge2 = v2 - v0;

            vec3 pvec = cross1(rayDirection, edge2);

            float epsilon = 0.000001; // Add epsilon to avoid division by zero
            float det = dot(edge1, pvec);
            if (abs(det) < epsilon) // Check if det is too close to zero
                return INFINITY;

            float inv_det = 1.0 / det;
            if ( isDoubleSided == 0 && det < 0.0 ) 
                return INFINITY;

            vec3 tvec = rayOrigin - v0;
            float u = dot(tvec, pvec) * inv_det;
            vec3 qvec = cross1(tvec, edge1);
            float v = dot(rayDirection, qvec) * inv_det;
            float t = dot(edge2, qvec) * inv_det;
            return (u < 0.0 || u > 1.0 || v < 0.0 || u + v > 1.0 || t <= 0.01) ? INFINITY : t;

        }

        vec3 getTriangleVertexPosition(int triIndex, int vertexIndex) {
            int dataIndex = triIndex * 3 + vertexIndex;
            // normalized uv floats
            float fx = mod(float(dataIndex), textureWidth);
            float fy = floor(float(dataIndex) / textureWidth);
            vec2 uv = vec2((fx + 0.5) / textureWidth, (fy + 0.5) / textureHeight);
            return texture2D(u_triangles, uv).rgb;
        }

        bool Calculate_Shading_at_Point(vec3 vertex_position, vec3 sun_direction) {
            float d;
            float t = INFINITY;
            for (int i = 0; i < ${N_TRIANGLES}; i++) {
                vec3 v0 = getTriangleVertexPosition(i, 0);
                vec3 v1 = getTriangleVertexPosition(i, 1);
                vec3 v2 = getTriangleVertexPosition(i, 2);
                d = TriangleIntersect(v0, v1, v2, vertex_position, sun_direction, 1);
                if (d < t && abs(d)>0.0001) {
                    return true;
                }
            }
            return false;
        }

        void main() {
            // Map current fragment to midpoint index
            float x = gl_FragCoord.x / u_pointsWidth;
            vec3 pos = texture2D(u_midpoints, vec2(x, 0.5)).rgb;
            vec3 nrm = texture2D(u_normals, vec2(x, 0.5)).rgb;

            float intensity = 0.0;
            if (!Calculate_Shading_at_Point(pos, u_sun_direction)) {
                intensity = abs(dot(normalize(nrm), u_sun_direction));
            }
            gl_FragColor = vec4(intensity, intensity, intensity, intensity);
        }
        `;

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  const program = createProgram(gl, vertexShader, fragmentShader);

  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  const textureWidth = Math.min(3 * N_TRIANGLES, Math.floor(maxTextureSize / 9) * 9);
  const textureHeight = Math.ceil((3 * N_TRIANGLES) / textureWidth);

  gl.useProgram(program);

  // Triangles texture
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  let alignedTrianglesArray;
  if (textureHeight == 1) {
    alignedTrianglesArray = trianglesArray;
  } else {
    alignedTrianglesArray = new Float32Array(textureWidth * textureHeight * 3);

    for (let i = 0; i < 3 * N_TRIANGLES; i++) {
      const x = (3 * i) % textureWidth;
      const y = Math.floor((3 * i) / textureWidth);
      const index = y * textureWidth + x;
      for (let j = 0; j < 3; j++) {
        alignedTrianglesArray[index + j] = trianglesArray[3 * i + j];
      }
    }
  }

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB,
    textureWidth,
    textureHeight,
    0,
    gl.RGB,
    gl.FLOAT,
    alignedTrianglesArray as Float32Array,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  const u_trianglesLocation = gl.getUniformLocation(program, 'u_triangles');
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(u_trianglesLocation, 0);

  const u_textureWidth = gl.getUniformLocation(program, 'textureWidth');
  const u_textureHeight = gl.getUniformLocation(program, 'textureHeight');
  gl.uniform1f(u_textureWidth, textureWidth);
  gl.uniform1f(u_textureHeight, textureHeight);

  // Midpoints texture (N_POINTS x 1)
  const midpointsTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, midpointsTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, N_POINTS, 1, 0, gl.RGB, gl.FLOAT, midpointsArray as Float32Array);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const u_midpoints = gl.getUniformLocation(program, 'u_midpoints');
  gl.uniform1i(u_midpoints, 1);

  // Normals texture (N_POINTS x 1)
  const normalsTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, normalsTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, N_POINTS, 1, 0, gl.RGB, gl.FLOAT, normals as Float32Array);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const u_normals = gl.getUniformLocation(program, 'u_normals');
  gl.uniform1i(u_normals, 2);

  // Points width uniform
  const u_pointsWidth = gl.getUniformLocation(program, 'u_pointsWidth');
  gl.uniform1f(u_pointsWidth, N_POINTS);

  // Sun direction uniform location
  const u_sun_direction = gl.getUniformLocation(program, 'u_sun_direction');

  // Output framebuffer (RGBA) of size N_POINTS x 1
  const outputTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, outputTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N_POINTS, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

  // Fullscreen triangle buffer
  const a_position = gl.getAttribLocation(program, 'a_position');
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  // cover full clip space (from (-1; -1) to (1; 1)):
  const fullScreenTriangle = new Float32Array([-1, -1, 3, -1, -1, 3]);
  gl.bufferData(gl.ARRAY_BUFFER, fullScreenTriangle, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  // set viewport size as N_POINTS x 1
  gl.viewport(0, 0, N_POINTS, 1);

  const shadedMaskScenes: Float32Array[] = [];

  await timeoutForLoop(
    0,
    skysegmentDirectionArray.length,
    (i) => {
      // For the progress callback, we need to report the current vector index (i/3)
      // out of the total number of vectors (length/3)
      progressCallback(Math.floor(i / 3), Math.floor(skysegmentDirectionArray.length / 3));

      let x = skysegmentDirectionArray[i];
      let y = skysegmentDirectionArray[i + 1];
      let z = skysegmentDirectionArray[i + 2];

      let magnitude = Math.sqrt(x * x + y * y + z * z);

      // Handle zero or near-zero magnitude
      if (magnitude < 1e-10) {
        // Default direction if vector is effectively zero
        x = 0;
        y = 0;
        z = 1;
      } else {
        x = x / magnitude;
        y = y / magnitude;
        z = z / magnitude;
      }

      gl.uniform3fv(u_sun_direction, new Float32Array([x, y, z]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const pixelBuffer = new Uint8Array(N_POINTS * 4);
      gl.readPixels(0, 0, N_POINTS, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);

      // Store the result at the correct index in shadedMaskScenes (i/3 for the vector index)
      const intensities = new Float32Array(N_POINTS);
      for (let j = 0; j < N_POINTS; j++) {
        const r = pixelBuffer[j * 4];
        intensities[j] = r / 255;
      }
      shadedMaskScenes[Math.floor(i / 3)] = intensities;
    },
    3,
  ); // Add step parameter of 3 for the loop

  gl.deleteTexture(texture);
  gl.deleteTexture(midpointsTexture);
  gl.deleteTexture(normalsTexture);
  gl.deleteTexture(outputTexture);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  gl.deleteProgram(program);
  gl.deleteBuffer(quadBuffer);
  return shadedMaskScenes;
}

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (shader === null) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader | null,
  fragmentShader: WebGLShader | null,
): WebGLProgram {
  const program = gl.createProgram();

  if (program === null || vertexShader === null || fragmentShader === null) {
    throw new Error('abortSimulation');
  } else {
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
  throw new Error('Program compilation error.');
}
