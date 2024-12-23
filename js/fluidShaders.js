let baseVertex = require("./glsl/baseVertex.glsl");
let clearShaderString = require("./glsl/clear.glsl");
let displayShaderString = require("./glsl/display.glsl");
let splatShaderString = require("./glsl/splat.glsl");
let advectionManualFilteringShaderString = require("./glsl/advectionManualFilter.glsl");
let advectionShaderString = require("./glsl/advection.glsl");
let divergenceShaderString = require("./glsl/divergence.glsl");
let curlShaderString = require("./glsl/curl.glsl");
let vorticityShaderString = require("./glsl/vorticity.glsl");
let pressureShaderString = require("./glsl/pressure.glsl");
let gradientSubtractShaderString = require("./glsl/gradientSubtract.glsl");
let velocityOutShaderString = require("./glsl/velocityOut.glsl");

// 该函数的任务是编译和加载所有 GLSL 着色器，确保它们能在 WebGL 中运行。compileShaders 函数会依次编译所有的着色器，并最终返回一个包含所有着色器对象的对象。
// compileShader 函数是一个通用函数，用于创建、加载和编译单个着色器。
// 它接受两个参数：type 是着色器类型（gl.VERTEX_SHADER 或 gl.FRAGMENT_SHADER），source 是着色器的源代码。
// gl.createShader(type) 用于创建一个着色器对象。
// gl.shaderSource(shader, source) 将源代码传递给着色器对象。
// gl.compileShader(shader) 执行编译操作。
// 如果编译失败，gl.getShaderInfoLog(shader) 会返回错误信息，我们会抛出一个错误。
function compileShaders(gl) {
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw gl.getShaderInfoLog(shader);

    return shader;
  }

  const baseVertexShader = compileShader(gl.VERTEX_SHADER, baseVertex);
  const clearShader = compileShader(gl.FRAGMENT_SHADER, clearShaderString);
  const displayShader = compileShader(gl.FRAGMENT_SHADER, displayShaderString);
  const splatShader = compileShader(gl.FRAGMENT_SHADER, splatShaderString);
  const advectionManualFilteringShader = compileShader(
    gl.FRAGMENT_SHADER,
    advectionManualFilteringShaderString
  );
  const advectionShader = compileShader(
    gl.FRAGMENT_SHADER,
    advectionShaderString
  );
  const divergenceShader = compileShader(
    gl.FRAGMENT_SHADER,
    divergenceShaderString
  );
  const curlShader = compileShader(gl.FRAGMENT_SHADER, curlShaderString);
  const vorticityShader = compileShader(
    gl.FRAGMENT_SHADER,
    vorticityShaderString
  );
  const pressureShader = compileShader(
    gl.FRAGMENT_SHADER,
    pressureShaderString
  );
  const gradientSubtractShader = compileShader(
    gl.FRAGMENT_SHADER,
    gradientSubtractShaderString
  );
  const velocityOutShader = compileShader(
    gl.FRAGMENT_SHADER,
    velocityOutShaderString
  );

  // compileShaders 返回一个对象，包含了所有已编译的着色器对象。每个着色器对象对应一个特定的 GLSL 着色器，方便在 WebGL 程序中使用
  return {
    baseVertexShader,
    clearShader,
    displayShader,
    splatShader,
    advectionManualFilteringShader,
    advectionShader,
    divergenceShader,
    curlShader,
    vorticityShader,
    pressureShader,
    gradientSubtractShader,
    velocityOutShader
  };
}

export { compileShaders };
