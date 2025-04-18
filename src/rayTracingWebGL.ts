import { TypedArray } from 'three';
import { SunVector, timeoutForLoop } from './utils';
import { calculatePVYield } from './sun';
import { normalize } from 'three/src/math/MathUtils.js';

function addToArray(ar1: Float32Array, ar2: Float32Array) {
  for (var i = 0; i < ar1.length; i++) {
    ar1[i] += ar2[i];
  }
}

/**
 * this function calculates
 * 1) for each surface point
 * 2) for each sky segment
 * 3) the dot product of normalized skysegment direction vector and the normal of the surface point
 * 4) if the sky segment is visible from the point
 * @param midpointsArray flattened Nx3 array with N the number of surface points for which shading is calculated
 * @param normals flattened Nx3 array, N times a vector of 3 components (the midpoint normals)
 * @param trianglesArray flattened Mx9 array with M the number of shading triangles
 * @param skysegmentDirectionArray flattened Sx3 array with S being the number of sky segments (normalized!)
 * @param progressCallback flattened Callback indicating the progress
 * @returns shadedMaskScenes: NxS array containing the dot product of the direction vector of the skysegment and the normal of the midpoint
 */
export async function rayTracingWebGL(
  midpointsArray: TypedArray,
  normals: TypedArray,
  trianglesArray: TypedArray,
  skysegmentDirectionArray: Float32Array,
  progressCallback: (progress: number, total: number) => void,
): Promise<Float32Array[] | null> {
  const N_TRIANGLES = trianglesArray.length / 9;
  const width = midpointsArray.length / 3; // Change this to the number of horizontal points in the grid
  const N_POINTS = width;

  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) {
    throw new Error('Browser does not support WebGL2');
  }

  // Vertex shader code
  const vertexShaderSource = `#version 300 es
        #define INFINITY         1000000.0
        precision highp float;


        uniform sampler2D u_triangles;
        uniform vec3 u_sun_direction;
        uniform int textureWidth;

        in vec3 a_position;
        in vec3 a_normal;

        out vec4 outColor;

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

            vec3 pvec = cross(rayDirection, edge2);

            float epsilon = 0.000001; // Add epsilon to avoid division by zero
            float det = dot(edge1, pvec);
            if (abs(det) < epsilon) // Check if det is too close to zero
                return INFINITY;

            float inv_det = 1.0 / det;
            if ( isDoubleSided == 0 && det < 0.0 ) 
                return INFINITY;

            vec3 tvec = rayOrigin - v0;
            float u = dot(tvec, pvec) * inv_det;
            vec3 qvec = cross(tvec, edge1);
            float v = dot(rayDirection, qvec) * inv_det;
            float t = dot(edge2, qvec) * inv_det;
            float x = dot(pvec,pvec);
            return (u < 0.0 || u > 1.0 || v < 0.0 || u + v > 1.0 || t <= 0.01) ? INFINITY : t;

        }


        bool Calculate_Shading_at_Point(vec3 vertex_position, vec3 sun_direction) {
            float d;
            float t = INFINITY;
            bool is_shadowed = false;
            for (int i = 0; i < ${N_TRIANGLES}; i++) {
                int index = i * 3;
                int x = index % textureWidth;
                int y = index / textureWidth;
                vec3 v0 = texelFetch(u_triangles, ivec2(x, y), 0).rgb;

                index = i * 3 + 1;
                x = index % textureWidth;
                y = index / textureWidth;
                vec3 v1 = texelFetch(u_triangles, ivec2(x, y), 0).rgb;

                index = i * 3 + 2;
                x = index % textureWidth;
                y = index / textureWidth;
                vec3 v2 = texelFetch(u_triangles, ivec2(x, y), 0).rgb;
                d = TriangleIntersect(v0, v1, v2, vertex_position, sun_direction, 1);
                if (d < t && abs(d)>0.0001) {
                    return true;

            }
            }
            return is_shadowed;
        }

        void main() {
            if (Calculate_Shading_at_Point(a_position.xyz, u_sun_direction)) {
                        outColor = vec4(0, 0, 0, 0); // Shadowed
                    } else {
                        float intensity = abs(dot(a_normal.xyz, u_sun_direction));
                        outColor = vec4(intensity, intensity, intensity, intensity); // Not shadowed
                    }

        }`;

  // Fragment shader code
  const fragmentShaderSource = `#version 300 es
        precision highp float;
        void main() {
        }
        `;

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  const program = createProgram(gl, vertexShader, fragmentShader, ['outColor']);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  var maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  var textureWidth = Math.min(3 * N_TRIANGLES, Math.floor(maxTextureSize / 9) * 9);
  var textureHeight = Math.ceil((3 * N_TRIANGLES) / textureWidth);
  console.log('Max Texture Size', maxTextureSize, textureWidth, textureHeight);

  const colorBuffer = makeBuffer(gl, N_POINTS * 16);
  const tf = makeTransformFeedback(gl, colorBuffer);
  // gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  // gl.pixelStorei(gl.PACK_ALIGNMENT, 1);

  gl.useProgram(program);

  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  var alignedTrianglesArray;
  if (textureHeight == 1) {
    alignedTrianglesArray = trianglesArray;
  } else {
    alignedTrianglesArray = new Float32Array(textureWidth * textureHeight * 3);

    for (var i = 0; i < 3 * N_TRIANGLES; i++) {
      var x = (3 * i) % textureWidth;
      var y = Math.floor((3 * i) / textureWidth);
      var index = y * textureWidth + x;
      for (var j = 0; j < 3; j++) {
        alignedTrianglesArray[index + j] = trianglesArray[3 * i + j];
      }
    }
  }

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, textureWidth, textureHeight, 0, gl.RGB, gl.FLOAT, alignedTrianglesArray);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D, null);

  var u_trianglesLocation = gl.getUniformLocation(program, 'u_triangles');
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(u_trianglesLocation, 0);

  var u_textureWidth = gl.getUniformLocation(program, 'textureWidth');
  gl.uniform1i(u_textureWidth, textureWidth);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const normalAttributeLocation = gl.getAttribLocation(program, 'a_normal');

  const positionBuffer = makeBufferAndSetAttribute(gl, midpointsArray, positionAttributeLocation);
  const normalBuffer = makeBufferAndSetAttribute(gl, normals, normalAttributeLocation);

  //var colorCodedArray = null;
  var shadedMaskScenes: Float32Array[] = [];
  // each element of this shadedIrradianceScenes represents the shading
  // caused by one ray of the irradiance list

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

      let sunDirectionUniformLocation = gl.getUniformLocation(program, 'u_sun_direction');
      gl.uniform3fv(sunDirectionUniformLocation, [x, y, z]);

      drawArraysWithTransformFeedback(gl, tf, gl.POINTS, N_POINTS);
      let colorCodedArray = getResults(gl, colorBuffer, N_POINTS);

      // Store the result at the correct index in shadedMaskScenes (i/3 for the vector index)
      shadedMaskScenes[Math.floor(i / 3)] = colorCodedArray.filter((_, index) => (index + 1) % 4 === 0);
    },
    3,
  ); // Add step parameter of 3 for the loop

  gl.deleteTexture(texture);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  gl.deleteProgram(program);
  gl.deleteBuffer(positionBuffer);
  gl.deleteBuffer(normalBuffer);
  gl.deleteTransformFeedback(tf);
  gl.deleteBuffer(colorBuffer);
  return shadedMaskScenes;
}

function getResults(gl: WebGL2RenderingContext, buffer: WebGLBuffer | null, N_POINTS: number) {
  let results = new Float32Array(N_POINTS * 4);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.getBufferSubData(
    gl.ARRAY_BUFFER,
    0, // byte offset into GPU buffer,
    results,
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, null); // productBuffer was still bound to ARRAY_BUFFER so unbind it
  return results;
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
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
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader | null,
  fragmentShader: WebGLShader | null,
  variables_of_interest: Iterable<string>,
): WebGLProgram {
  const program = gl.createProgram();

  if (program === null || vertexShader === null || fragmentShader === null) {
    throw new Error('abortSimulation');
  } else {
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.transformFeedbackVaryings(program, variables_of_interest, gl.SEPARATE_ATTRIBS);
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

function makeBuffer(gl: WebGL2RenderingContext, sizeOrData: BufferSource | number) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  //@ts-ignore
  gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, gl.DYNAMIC_DRAW);
  return buf;
}

function makeTransformFeedback(gl: WebGL2RenderingContext, buffer: WebGLBuffer | null) {
  const tf = gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer);
  return tf;
}

function makeBufferAndSetAttribute(gl: WebGL2RenderingContext, data: ArrayBuffer, loc: number): WebGLBuffer | null {
  const buf = makeBuffer(gl, data);
  // setup our attributes to tell WebGL how to pull
  // the data from the buffer above to the attribute
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(
    loc,
    3, // size (num components)
    gl.FLOAT, // type of data in buffer
    false, // normalize
    0, // stride (0 = auto)
    0, // offset
  );
  return buf;
}

function drawArraysWithTransformFeedback(
  gl: WebGL2RenderingContext,
  tf: WebGLTransformFeedback | null,
  primitiveType: number,
  count: number,
) {
  // turn of using the fragment shader
  gl.enable(gl.RASTERIZER_DISCARD);

  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
  gl.beginTransformFeedback(gl.POINTS);
  gl.drawArrays(primitiveType, 0, count);
  gl.endTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

  // unbind the buffer from the TRANFORM_FEEDBACK_BUFFER
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);

  // turn on using fragment shaders again
  gl.disable(gl.RASTERIZER_DISCARD);
}
