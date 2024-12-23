// MIT License

// Copyright (c) 2017 Pavel Dobryakov

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
"use strict";
import * as dat from "dat.gui";
import { memory } from "../crate/pkg/sandtable_bg";
import { compileShaders } from "./fluidShaders";
const canvas = document.getElementById("fluid-canvas");
const sandCanvas = document.getElementById("sand-canvas");

let fluidColor = [1, 1, 0.8];
function iOS() {
  return (
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}

const isIOS = iOS();
function startFluid({ universe }) {
  canvas.width = universe.width();
  canvas.height = universe.height();
  let config = {
    TEXTURE_DOWNSAMPLE: 0,
    DENSITY_DISSIPATION: 0.98,
    VELOCITY_DISSIPATION: 0.99,
    PRESSURE_DISSIPATION: 0.8,
    PRESSURE_ITERATIONS: 25,
    CURL: 15,
    SPLAT_RADIUS: 0.005,
  };

  let pointers = [];
  let splatStack = [];
  let isWebGL2;

  const { gl, ext } = getWebGLContext(canvas);
  let {
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
    velocityOutShader,
  } = compileShaders(gl);
  startGUI();
  // 该函数在给定的 canvas 上初始化 WebGL 上下文，首先尝试使用 webgl2，如果 WebGL 2.0 不支持则回退到 webgl。
  // 它设置了 WebGL 扩展，例如浮动点纹理的支持（WebGL 2.0 使用 EXT_color_buffer_float，WebGL 1.0 使用 OES_texture_half_float）和这些纹理的线性过滤。
  // 函数还设置了清除颜色为黑色，并且透明度为 0（gl.clearColor(0.0, 0.0, 0.0, 0.0)）。
  // 根据 WebGL 版本和可用扩展，配置了不同的纹理格式支持，如 RGBA16F、RG16F 和 R16F 等。
  function getWebGLContext(canvas) {
    const params = {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    };

    let gl = canvas.getContext("webgl2", params);
    isWebGL2 = !!gl;
    if (!isWebGL2)
      gl =
        canvas.getContext("webgl", params) ||
        canvas.getContext("experimental-webgl", params);

    let halfFloat;
    let supportLinearFiltering;
    if (isWebGL2) {
      halfFloat = gl.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = gl.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = gl.getExtension("OES_texture_half_float");
      supportLinearFiltering = gl.getExtension("OES_texture_half_float_linear");
    }

    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    const halfFloatTexType = isWebGL2
      ? gl.HALF_FLOAT
      : halfFloat.HALF_FLOAT_OES;
    let formatRGBA;
    let formatRG;
    let formatR;

    if (isWebGL2) {
      formatRGBA = getSupportedFormat(
        gl,
        gl.RGBA16F,
        gl.RGBA,
        halfFloatTexType
      );
      formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
      formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    }

    return {
      gl,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering,
      },
    };
  }

  // 该函数通过创建纹理并将其附加到帧缓冲区来检查所请求的纹理格式是否受支持。
  // 如果不支持该格式，它会尝试更通用的格式（例如 RG16F 或 RGBA16F）。
  function getSupportedFormat(gl, internalFormat, format, type) {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F:
          return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
        case gl.RG16F:
          return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        default:
          return null;
      }
    }

    return {
      internalFormat,
      format,
    };
  }

  // 该函数创建纹理和帧缓冲区，检查给定的格式是否适合作为渲染目标，
  // 通过调用 gl.checkFramebufferStatus(gl.FRAMEBUFFER) 来进行检查。
  function supportRenderTextureFormat(gl, internalFormat, format, type) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      4,
      4,
      0,
      format,
      type,
      null
    );

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) return false;
    return true;
  }

  // 该函数使用 dat.GUI 库创建图形用户界面，允许动态调整多个配置参数，如纹理分辨率、密度扩散、速度扩散、压力扩散等。
  // 它还包含一个按钮，点击后会触发随机的“splats”（涂抹效果）。
  function startGUI() {
    var gui = new dat.GUI({ width: 300 });
    gui
      .add(config, "TEXTURE_DOWNSAMPLE", { Full: 0, Half: 1, Quarter: 2 })
      .name("resolution")
      .onFinishChange(initFramebuffers);
    gui.add(config, "DENSITY_DISSIPATION", 0.9, 1.0).name("density diffusion");
    gui
      .add(config, "VELOCITY_DISSIPATION", 0.9, 1.0)
      .name("velocity diffusion");
    gui
      .add(config, "PRESSURE_DISSIPATION", 0.0, 1.0)
      .name("pressure diffusion");
    gui.add(config, "PRESSURE_ITERATIONS", 1, 60).name("iterations");
    gui.add(config, "CURL", 0, 50).name("vorticity").step(1);
    gui.add(config, "SPLAT_RADIUS", 0.0001, 0.01).name("splat radius");

    gui
      .add(
        {
          fun: () => {
            splatStack.push(parseInt(Math.random() * 20) + 5);
          },
        },
        "fun"
      )
      .name("Random splats");

    gui.close();
  }
  // 该函数定义了一个指针（鼠标或触摸）事件的原型，存储了位置（x、y）、
  // 速度（dx、dy）和状态（down、moved）。它还为指针存储了一个颜色值。
  function pointerPrototype() {
    this.id = -1;
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 300, 30];
  }

  pointers.push(new pointerPrototype());
  // 它用于创建和管理 WebGL 程序（Program）。它接受一个顶点着色器（vertex shader）和一个片段着色器（fragment shader）作为参数
  class GLProgram {
    //
    constructor(vertexShader, fragmentShader) {
      this.uniforms = {};
      this.program = gl.createProgram();

      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      gl.linkProgram(this.program);

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
        throw gl.getProgramInfoLog(this.program);

      const uniformCount = gl.getProgramParameter(
        this.program,
        gl.ACTIVE_UNIFORMS
      );
      for (let i = 0; i < uniformCount; i++) {
        const uniformName = gl.getActiveUniform(this.program, i).name;
        this.uniforms[uniformName] = gl.getUniformLocation(
          this.program,
          uniformName
        );
      }
    }
    //
    // 该方法使用 gl.useProgram(this.program) 激活并绑定当前的 WebGL 程序，这样在之后的 WebGL 渲染调用中将使用这个程序对象bind() {
      gl.useProgram(this.program);
    }
  }

  let texWidth;
  let texHeight;
  let density;
  let velocity;
  let velocityOut;
  let burns;
  let cells;
  let divergence;
  let curl;
  let pressure;
  initFramebuffers();

  const clearProgram = new GLProgram(baseVertexShader, clearShader);
  const displayProgram = new GLProgram(baseVertexShader, displayShader);
  const velocityOutProgram = new GLProgram(baseVertexShader, velocityOutShader);
  const splatProgram = new GLProgram(baseVertexShader, splatShader);
  const advectionProgram = new GLProgram(
    baseVertexShader,
    ext.supportLinearFiltering
      ? advectionShader
      : advectionManualFilteringShader
  );
  const divergenceProgram = new GLProgram(baseVertexShader, divergenceShader);
  const curlProgram = new GLProgram(baseVertexShader, curlShader);
  const vorticityProgram = new GLProgram(baseVertexShader, vorticityShader);
  const pressureProgram = new GLProgram(baseVertexShader, pressureShader);
  const gradientSubtractProgram = new GLProgram(
    baseVertexShader,
    gradientSubtractShader
  );

  //
// 这段代码主要涉及初始化 WebGL 的帧缓冲对象（FBO），它用于存储渲染过程中的临时数据，如流体模拟中的速度场、密度场等。代码的核心功能是创建并管理多个不同类型的帧缓冲对象，包括单一帧缓冲和双缓冲帧缓冲



  // 该函数初始化了多个帧缓冲对象（FBO），每个 FBO 都包含一个纹理作为其附件。纹理的尺寸根据 config.TEXTURE_DOWNSAMPLE 调整，分辨率是 gl.drawingBufferWidth 和 gl.drawingBufferHeight 的一部分。
// velocity、density、divergence、curl、pressure、burns、cells 和 velocityOut 等都是需要用作模拟不同物理量的帧缓冲对象。
// 在创建 FBO 时，会根据 ext.supportLinearFiltering 来设置纹理的过滤模式，使用线性过滤或最近邻过滤。
// 对于每个 FBO，调用 createDoubleFBO 或 createFBO 来创建对应的纹理和帧缓冲对象。
  function initFramebuffers() {
    texWidth = gl.drawingBufferWidth >> config.TEXTURE_DOWNSAMPLE;
    texHeight = gl.drawingBufferHeight >> config.TEXTURE_DOWNSAMPLE;

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;

    velocity = createDoubleFBO(
      0,
      texWidth,
      texHeight,
      rg.internalFormat,
      rg.format,
      texType,
      ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    );
    density = createDoubleFBO(
      2,
      texWidth,
      texHeight,
      rgba.internalFormat,
      rgba.format,
      texType,
      ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    );
    divergence = createFBO(
      4,
      texWidth,
      texHeight,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    curl = createFBO(
      5,
      texWidth,
      texHeight,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    pressure = createDoubleFBO(
      6,
      texWidth,
      texHeight,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    burns = createFBO(
      8,
      texWidth,
      texHeight,
      rg.internalFormat,
      rg.format,
      texType,
      ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    );
    cells = createFBO(
      10,
      texWidth,
      texHeight,
      rg.internalFormat,
      rg.format,
      texType,
      ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    );
    velocityOut = createFBO(
      9,
      texWidth,
      texHeight,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    );
  }

  // 该函数创建一个单一的帧缓冲对象，并将其与一个纹理绑定。
// gl.activeTexture(gl.TEXTURE0 + texId) 激活指定的纹理单元，并为该单元创建纹理对象。
// gl.texParameteri 设置纹理的过滤方式（最小/放大过滤）和包裹方式（S 和 T 方向都使用 gl.CLAMP_TO_EDGE）。
// gl.texImage2D 定义了纹理的尺寸、格式和类型，并将其分配给当前的帧缓冲对象。
// gl.framebufferTexture2D 将纹理附加到帧缓冲对象的颜色附件上。
// 最后，清除帧缓冲并返回包含纹理、帧缓冲对象和纹理 ID 的数组。
  function createFBO(texId, w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0 + texId);
    let texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      w,
      h,
      0,
      format,
      type,
      null
    );

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return [texture, fbo, texId];
  }

  // 该函数创建了两个 FBO，并且返回一个包含这两个 FBO 的对象，具有 read 和 write 属性，用于双缓冲的处理。
// swap() 方法用于交换两个 FBO，这对于流体模拟中的双缓冲处理非常重要，可以避免写入和读取同一个帧缓冲对象。
// 这样在每一帧中，读和写操作分别使用两个不同的 FBO，在模拟过程中提高效率。
  function createDoubleFBO(texId, w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(texId, w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(texId + 1, w, h, internalFormat, format, type, param);

    return {
      get read() {
        return fbo1;
      },
      get write() {
        return fbo2;
      },
      swap() {
        let temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  const width = universe.width();
  const height = universe.height();


  // 这段代码的主要功能是创建和配置一个 WebGL 渲染管线，用于在不同的帧缓冲（Framebuffer）上进行图形渲染。
// 特别是它创建了一个用于在 WebGL 中执行渲染过程的基础图形（一个正方形），
// 并通过 blit 函数实现了将图像从一个帧缓冲拷贝到另一个帧缓冲的功能。下面我将详细解析这段代码：
  const blit = (() => {

    // 顶点数据
    // 顶点数据：使用 gl.ARRAY_BUFFER 和 gl.bufferData 创建一个用于存储顶点位置的缓冲区，
    // 并设置顶点坐标数据。这里存储的是
    // 一个简单的四个顶点（-1, -1、-1, 1、1, 1 和 1, -1），这些顶点将构成一个正方形。该正方形将被用作绘制的基础几何图形。
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );

    // 索引数据
    // 使用 gl.ELEMENT_ARRAY_BUFFER 和 gl.bufferData 创建一个索引缓冲区，以定义绘制这个正方形的两个三角形的顺序。
    // 顶点的顺序是通过 Uint16Array 来定义的，[0, 1, 2, 0, 2, 3] 描述了两个三角形的顶点索引。
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW
    );

    // 如果当前是 WebGL2 并且设备不是 iOS 设备，代码会创建一个 PBO（像素缓冲对象），这对于异步读取像素数据非常有用。
    // 通过 gl.PIXEL_PACK_BUFFER 创建并绑定一个缓冲区，并通过 gl.bufferData 初始化该缓冲区以存储图像数据（width * height * 4，即 RGBA 格式的每个像素 4 字节）。
    if (isWebGL2 && !isIOS) {
      const pbo = gl.createBuffer();
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
      gl.bufferData(
        gl.PIXEL_PACK_BUFFER,
        new Uint8Array(width * height * 4),
        gl.STATIC_DRAW
      );
    }
    // 顶点属性设置：
    //
    // 使用 gl.vertexAttribPointer 和 gl.enableVertexAttribArray 设置顶点属性（在这里是位置数据，2 表示每个顶点有 2 个坐标：x 和 y）。
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    // blit 函数的创建：
    //
    // 最终，blit 函数返回一个方法，用于将渲染结果从当前帧缓冲拷贝到另一个帧缓冲。
    // 参数 destination：destination 是目标帧缓冲，它是 gl.bindFramebuffer 绑定的帧缓冲，表示要将当前渲染的结果复制到该目标帧缓冲。
    // 渲染过程：使用 gl.drawElements 执行绘制操作，绘制一个矩形（由两个三角形组成）
    return (destination) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();
  // lastTime 变量用于记录当前时间（以毫秒为单位）。这可能用于在后续代码中计算时间差，通常用于时间基的动画或物理更新（例如，每秒更新的帧数 FPS）。
  let lastTime = Date.now();

  // multipleSplats(parseInt(Math.random() * 20) + 5);
  // 这三行代码分别创建了三个 Uint8Array 视图，分别用于存储
// 风（winds）、
// 燃烧状态（burns）和
// 细胞状态（cells）的数据。
// 每个 Uint8Array 都通过 memory.buffer 访问到内存数据。具体来说，它通过以下方式从内存中提取数据：
// universe.winds()、universe.burns() 和 universe.cells() 可能是返回对应数据的偏移量或起始地址。
// width * height * 4 计算了每个数据区块的总大小，通常是宽度（width）和高度（height）的乘积，再乘以 4，表示每个像素占用 4 字节（通常是 RGBA 格式）。这表明每个像素数据由 4 个分量（R、G、B 和 A）组成，每个分量占用 1 字节。
  let winds = new Uint8Array(
    memory.buffer,
    universe.winds(),
    width * height * 4
  );

  let burnsData = new Uint8Array(
    memory.buffer,
    universe.burns(),
    width * height * 4
  );

  let cellsData = new Uint8Array(
    memory.buffer,
    universe.cells(),
    width * height * 4
  );
  //
// 这段代码实现了一个 reset 函数，主要目的是通过清空或重置一些与图形渲染或物理模拟相关的纹理（如燃烧状态、密度、压力、速度等）来为后续的计算和渲染做准备。它通过 WebGL 绑定不同的纹理到纹理单元，并用一个清除程序（clearProgram）进行重置操作。以下是对代码的详细解析。
//  burns：可能表示燃烧状态，清空它可能意味着重置燃烧场。
// density：可能表示流体密度，清空它意味着清空流体的密度信息。
// pressure：可能表示流体的压力场，清空它意味着清空压力信息。
// velocity：可能表示流体的速度场，清空它意味着重置速度场。

  function reset() {
    // 这行代码将绑定 clearProgram，假设这是一个用于清除数据的着色器程序。通过 clearProgram.bind()，激活这个着色器程序，确保后续的渲染操作在该程序下进行。
    clearProgram.bind();
    // texUnit 初始化为 0，然后绑定 burns[0]（假设这是一个用于存储燃烧状态的纹理）到纹理单元 TEXTURE0。
    // gl.uniform1i 将纹理单元（texUnit）传递给着色器中的 uWind uniform，这可能是燃烧状态纹理在着色器中的位置。
    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, burns[0]);
    gl.uniform1i(clearProgram.uniforms.uWind, texUnit++);

    // 纹理绑定
    // density.read[0] 纹理到下一个纹理单元，并将该纹理单元传递给着色器中的 uTexture uniform。
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, density.read[0]);
    gl.uniform1i(clearProgram.uniforms.uTexture, texUnit++);

    // 设置 value uniform 为 0，这可能表示清空数据或将纹理内容重置为零。
    gl.uniform1f(clearProgram.uniforms.value, 0);

    // 使用 blit 函数执行纹理的绘制操作，将数据写入到 density.write[1] 纹理。
    blit(density.write[1]);
    // density.swap() 用于交换 density.read 和 density.write，使得 density.write[1] 成为新的读取纹理，确保后续的计算可以基于更新后的数据进行。

    density.swap();

    // 重置压力和速度纹理：
    //
    // 紧接着重复相同的步骤来清除压力（pressure）和速度（velocity）纹理：
    // 绑定 pressure.read[0] 和 velocity.read[0] 纹理。
    // 使用 clearProgram 清空这些纹理的数据。
    // 交换纹理（pressure.swap() 和 velocity.swap()）以更新后续操作的输入数据。


    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, burns[0]);
    gl.uniform1i(clearProgram.uniforms.uWind, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
    gl.uniform1i(clearProgram.uniforms.uTexture, texUnit++);

    gl.uniform1f(clearProgram.uniforms.value, 0);

    blit(pressure.write[1]);
    pressure.swap();

    texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, burns[0]);
    gl.uniform1i(clearProgram.uniforms.uWind, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read[0]);
    gl.uniform1i(clearProgram.uniforms.uTexture, texUnit++);

    gl.uniform1f(clearProgram.uniforms.value, 0);

    blit(velocity.write[1]);
    velocity.swap();
  }

  let sync = undefined;
  // 这段代码实现了一个用于模拟流体、烟雾、火灾等物理现象的计算更新过程。
// 它通过 WebGL 使用着色器进行各种图形操作，涉及到多个物理模拟步骤，
// 如 advection（平流）、curl（旋度）、vorticity（涡度）、divergence（散度）、
// pressure（压力）等，并通过多个纹理进行状态存储和更新
  function update() {
    // 通过 Uint8Array 从 memory.buffer 中读取并存储纹理数据（如 winds、burnsData、cellsData）。
    // 这些数据代表了流体模拟的状态信息。
    winds = new Uint8Array(memory.buffer, universe.winds(), width * height * 4);

    burnsData = new Uint8Array(
      memory.buffer,
      universe.burns(),
      width * height * 4
    );

    let cell_pointer = universe.cells();
    cellsData = new Uint8Array(memory.buffer, cell_pointer, width * height * 4);

    // resizeCanvas();
    // dt 计算每一帧的时间差，用于控制模拟的时间步长。Math.min 用于确保时间差不超过 16 毫秒（60 FPS）。
    const dt = Math.min((Date.now() - lastTime) / 1000, 0.016);
    lastTime = Date.now();

    gl.viewport(0, 0, texWidth, texHeight);

    if (splatStack.length > 0) multipleSplats(splatStack);
    // multipleSplats(1);

    // ADVECTION
    // velocityRead ->
    // velocityWrite
    // 这部分通过 advectionProgram 进行速度的平流操作。首先绑定速度纹理，设置着色器的 uVelocity 和 uSource uniform，
    // 控制平流操作的时间步长 dt 和速度衰减 dissipation
    advectionProgram.bind();

    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read[0]);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read[0]);
    gl.uniform1i(advectionProgram.uniforms.uSource, texUnit++);

    gl.uniform2f(
      advectionProgram.uniforms.texelSize,
      1.0 / texWidth,
      1.0 / texHeight
    );
    // gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
    // gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read[2]);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(
      advectionProgram.uniforms.dissipation,
      config.VELOCITY_DISSIPATION
    );
    blit(velocity.write[1]);
    velocity.swap();

    // 更新燃烧和细胞纹理
    // 更新 burns 和 cells 纹理的内容。通过 gl.texImage2D 将 burnsData 和 cellsData 写入到对应的纹理。

    gl.bindTexture(gl.TEXTURE_2D, burns[0]);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      burnsData
    );

    gl.bindTexture(gl.TEXTURE_2D, cells[0]);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      cellsData
    );

    // ADVECTION
    // burns
    // velocityRead
    // densityRead ->
    // densityWrite


    //  对燃烧和密度进行平流
    // 这部分代码进行燃烧（burns）和密度（density）的平流计算。类似于速度的平流，首先绑定相应的纹理，并将它们传递给着色器进行处理。
    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, burns[0]);
    gl.uniform1i(advectionProgram.uniforms.uWind, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read[0]);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, density.read[0]);
    gl.uniform1i(advectionProgram.uniforms.uSource, texUnit++);

    // gl.uniform1i(advectionProgram.uniforms.uWind, burns[2]);
    // gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
    // gl.uniform1i(advectionProgram.uniforms.uSource, density.read[2]);
    gl.uniform1f(
      advectionProgram.uniforms.dissipation,
      config.DENSITY_DISSIPATION
    );
    blit(density.write[1]);
    density.swap();

    // Splat
    // velocityRead -> velocityWrite
    // densityRead -> velocityWrite
    // 遍历 pointers 数组，并根据指针的移动进行 splat（喷溅）操作。每个指针（代表用户输入或其他源）会向流体中注入速度和密度。
    for (let i = 0; i < pointers.length; i++) {
      const pointer = pointers[i];
      if (pointer.moved && window.UI.state.selectedElement < 0) {
        splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
        pointer.moved = false;
      }
    }

    // CURL
    // velocityRead -> curl
    // 计算速度场的旋度（curl）。旋度是描述流体旋转的量，用于流体动力学中。
    curlProgram.bind();

    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read[0]);
    gl.uniform1i(curlProgram.uniforms.uVelocity, texUnit++);

    gl.uniform2f(
      curlProgram.uniforms.texelSize,
      1.0 / texWidth,
      1.0 / texHeight
    );
    // gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read[2]);
    blit(curl[1]);

    // VORTICITY
    // velocityRead
    // curl ->
    // velocityWrite

    // 通过涡度程序 vorticityProgram 计算流体的涡度，涡度通常用于流体动力学中的湍流模拟。
    vorticityProgram.bind();

    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read[0]);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, curl[0]);
    gl.uniform1i(vorticityProgram.uniforms.uCurl, texUnit++);

    gl.uniform2f(
      vorticityProgram.uniforms.texelSize,
      1.0 / texWidth,
      1.0 / texHeight
    );

    // gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read[2]);
    // gl.uniform1i(vorticityProgram.uniforms.uCurl, curl[2]);
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write[1]);
    velocity.swap();

    // DIVERGENCE
    // velocityRead ->
    // divergence

    // 计算速度场的散度（divergence），散度用于描述流体的源和汇
    divergenceProgram.bind();

    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read[0]);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, texUnit++);

    gl.uniform2f(
      divergenceProgram.uniforms.texelSize,
      1.0 / texWidth,
      1.0 / texHeight
    );
    // gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read[2]);
    blit(divergence[1]);

    // CLEAR
    // burns
    // pressureRead->
    // pressureWrite

    // 清除燃烧（burns）和压力（pressure）的纹理，并进行一定的压力衰减。
    clearProgram.bind();

    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, burns[0]);
    gl.uniform1i(clearProgram.uniforms.uWind, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
    gl.uniform1i(clearProgram.uniforms.uTexture, texUnit++);

    let pressureTexId = texUnit - 1;

    // let pressureTexId = pressure.read[2];
    // gl.activeTexture(gl.TEXTURE0 + pressureTexId);
    // gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);

    // gl.uniform1i(clearProgram.uniforms.uWind, burns[2]);
    // gl.uniform1i(clearProgram.uniforms.uTexture, pressureTexId);
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE_DISSIPATION);

    blit(pressure.write[1]);
    pressure.swap();

    // PRESSURE
    // divergence
    // pressureRead->
    // pressureWrite

    // 计算压力场，并迭代计算多次来逼近最终的压力结果。
    pressureProgram.bind();
    //TODO
    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, divergence[0]);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, texUnit++);

    // gl.activeTexture(gl.TEXTURE0 + texUnit);
    // gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
    // gl.uniform1i(clearProgram.uniforms.uTexture, texUnit++);

    gl.uniform2f(
      pressureProgram.uniforms.texelSize,
      1.0 / texWidth,
      1.0 / texHeight
    );
    // gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2]);
    pressureTexId = pressure.read[2];
    gl.uniform1i(pressureProgram.uniforms.uPressure, pressureTexId);
    gl.activeTexture(gl.TEXTURE0 + pressureTexId);
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
      blit(pressure.write[1]);
      pressure.swap();
    }

    // VELOCITY OUT
    // velocityRead
    // pressureRead ->
    // velocityOut
    // 计算速度输出：
    // 在这一步，速度输出（Velocity Output） 会更新流体的速度场。
    // velocityOutProgram 是用于更新速度场的 shader 程序。
    // 绑定 velocity.read[0] 作为当前速度场的输入纹理，并绑定 pressure.read[0] 作为压力场的输入纹理。
    // 使用 blit(velocityOut[1]) 将更新后的速度场写入 velocityOut[1]，并更新速度缓冲区。
    velocityOutProgram.bind();

    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read[0]);
    gl.uniform1i(velocityOutProgram.uniforms.uTexture, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
    gl.uniform1i(velocityOutProgram.uniforms.uPressure, texUnit++);

    // gl.uniform1i(velocityOutProgram.uniforms.uTexture, velocity.read[2]);
    // gl.uniform1i(velocityOutProgram.uniforms.uPressure, pressure.read[2]);
    blit(velocityOut[1]);



    // 同步操作（Sync GPU
    // 这个部分的目的是同步 GPU 操作，以确保渲染结果在继续执行下一步之前已经完成。
    // 使用 gl.readPixels 读取 GPU 渲染结果。
    // gl.fenceSync 和 gl.clientWaitSync 用来同步 CPU 和 GPU 之间的操作，确保读取操作在 GPU 渲染完成后进行
    if (!isWebGL2 || isIOS) {
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, winds);
    } else if (sync === undefined) {
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, 0);
      sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    } else {
      const status = gl.clientWaitSync(sync, 0, 0);

      if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, winds);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, 0);
        sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      }
    }

    // GRADIENT SUBTRACT
    // burns
    // pressureRead
    // velocityRead
    // sands ->
    // velocityWrite
    gradientSubtractProgram.bind();
    // 梯度减法
    // 梯度减法（Gradient Subtraction） 是一个常见的流体模拟技术，用来调整流体的速度场。
    // 在这个步骤中，通过 gradientSubtractProgram 计算速度场的梯度，并根据压力和燃烧等信息对速度场进行修正。
    // 绑定 burns[0]、pressure.read[0]、velocity.read[0] 和 cells[0] 作为输入纹理。
    // 通过 blit(velocity.write[1]) 更新速度场，并交换速度缓冲区
    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, burns[0]);
    gl.uniform1i(gradientSubtractProgram.uniforms.uWind, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
    gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read[0]);
    gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, texUnit++);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, cells[0]);
    gl.uniform1i(gradientSubtractProgram.uniforms.uCells, texUnit++);

    gl.uniform2f(
      gradientSubtractProgram.uniforms.texelSize,
      1.0 / texWidth,
      1.0 / texHeight
    );

    // gl.uniform1i(gradientSubtractProgram.uniforms.uWind, burns[2]);
    // gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read[2]);
    // gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read[2]);
    blit(velocity.write[1]);
    velocity.swap();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // 最后，显示程序（Display Program） 用于将最终的密度或其它模拟结果渲染到屏幕上。
    // 绑定 `density.read[

    // DISPLAY
    // density ->
    // null/renderbuffer?
    displayProgram.bind();

    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, density.read[0]);
    gl.uniform1i(displayProgram.uniforms.uTexture, texUnit++);

    // gl.uniform1i(displayProgram.uniforms.uTexture, density.read[2]);

    blit(null);
  }
  // 这段代码的主要作用是模拟流体（例如液体、气体等）的喷溅（splat），并在 WebGL 上进行渲染。在这段代码中，有两个函数：splat 和 multipleSplats，用于执行单次喷溅和多个喷溅的操作
  // splat 函数是流体模拟中的一个基本操作，用于在指定位置进行喷溅，并更新速度场和密度场。
  // x, y: 喷溅的位置（以像素为单位）。
// dx, dy: 喷溅的速度（在 X 和 Y 方向上的分量），表示喷溅的速度矢量。
// color: 喷溅的颜色，通常是流体的颜色，传递的是一个包含 RGB 值的数组（例如 [1.0, 0.0, 0.0] 代表红色）。
  function splat(x, y, dx, dy, color) {
    // 这行代码将绑定一个 WebGL shader 程序，名为 splatProgram，它用于执行喷溅操作。此程序的主要任务是计算喷溅的位置、速度和颜色，并将结果写入流体模拟的纹理中。
    splatProgram.bind();

    // 选择一个纹理单元（TEXTURE0），并将 velocity.read[0]（当前的速度场纹理）绑定到该单元。
    // 通过 gl.uniform1i 设置 splatProgram shader 的 uTarget uniform，这个 uniform 代表目标纹理，即将喷溅结果写入的纹理。
    var texUnit = 0;
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read[0]);
    gl.uniform1i(splatProgram.uniforms.uTarget, texUnit++);

    // gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read[2]);
    // 设置 aspectRatio uniform，它表示画布的宽高比，用于调整喷溅的形状，以适应不同的画布尺寸。
    // 设置 point uniform，这是喷溅的目标位置，经过归一化（即 x 和 y 被除以画布的宽度和高度），这样就可以处理不同分辨率的画布
    gl.uniform1f(
      splatProgram.uniforms.aspectRatio,
      canvas.width / canvas.height
    );
    gl.uniform2f(
      splatProgram.uniforms.point,
      y / canvas.height,
      x / canvas.width
    );

    // color 是喷溅的颜色，它根据 dx 和 dy 设置了速度场的颜色（假设速度方向决定了颜色）。
    // radius 是喷溅的半径，通过 window.UI.state.size 获取喷溅的大小，除以 600 进行归一化处理
    gl.uniform3f(splatProgram.uniforms.color, dy, dx, 1.0);
    gl.uniform1f(
      splatProgram.uniforms.radius,
      (window.UI.state.size + 1) / 600
    );

    // 调用 blit(velocity.write[1]) 将计算结果写入到 velocity.write[1]，更新速度场。
    // 使用 velocity.swap() 交换纹理，确保下一次操作使用更新后的速度场。
    blit(velocity.write[1]);
    velocity.swap();

    // 1.密度场
    // 将 density.read[0]（当前的密度场纹理）绑定到纹理单元，并更新 uTarget uniform，表示目标密度场。
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, density.read[0]);
    gl.uniform1i(splatProgram.uniforms.uTarget, texUnit++);

    // 将 color 设置为喷溅的颜色，并将喷溅效果写入密度场（density.write[1]）。
    // 使用 density.swap() 更新密度场纹理。
    // gl.uniform1i(splatProgram.uniforms.uTarget, density.read[2]);
    gl.uniform3f(splatProgram.uniforms.color, color[0], color[1], color[2]);
    blit(density.write[1]);
    density.swap();
  }

  // 用于生成多个喷溅，通常在模拟中用来产生随机的流体涌动效果。
  // 用于生成多个喷溅，通常在模拟中用来产生随机的流体涌动效果。
  function multipleSplats(amount) {
    for (let i = 0; i < amount; i++) {
      const color = fluidColor;
      const x = canvas.width * Math.random();
      const y = canvas.height * Math.random();
      const dx = 1000 * (Math.random() - 0.5);
      const dy = 1000 * (Math.random() - 0.5);
      splat(x, y, dx, dy, color);
    }
  }

  let boundingRect;
  let scaleX;
  let scaleY;

  let resize = () => {
    boundingRect = sandCanvas.getBoundingClientRect();
    scaleX =
      sandCanvas.width /
      Math.ceil(window.devicePixelRatio) /
      boundingRect.width;
    scaleY =
      sandCanvas.height /
      Math.ceil(window.devicePixelRatio) /
      boundingRect.height;
  };
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("deviceorientation", resize, true);

  sandCanvas.addEventListener("mousemove", (e) => {
    const canvasLeft = (e.clientX - boundingRect.left) * scaleX;
    const canvasTop = (e.clientY - boundingRect.top) * scaleY;
    pointers[0].moved = pointers[0].down;
    pointers[0].dx = (canvasLeft - pointers[0].x) * 10.0;
    pointers[0].dy = (canvasTop - pointers[0].y) * 10.0;
    pointers[0].x = canvasLeft;
    pointers[0].y = canvasTop;
  });

  sandCanvas.addEventListener(
    "touchmove",
    (e) => {
      if (!window.paused) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
      const touches = e.targetTouches;
      // 这个函数通过一个循环生成多个喷溅，每个喷溅的位置、速度和颜色都是随机的。
      // 每次迭代时，都会调用 splat 函数，生成一个喷溅。
      for (let i = 0; i < touches.length; i++) {
        let pointer = pointers[i];
        pointer.moved = pointer.down;

        const canvasLeft = (touches[i].clientX - boundingRect.left) * scaleX;
        const canvasTop = (touches[i].clientY - boundingRect.top) * scaleY;

        pointer.dx = (canvasLeft - pointer.x) * 10.0;
        pointer.dy = (canvasTop - pointer.y) * 10.0;
        pointer.x = canvasLeft;
        pointer.y = canvasTop;
      }
    },
    false
  );
  // 这段代码主要是通过监听用户的鼠标和触摸事件，来管理与流体模拟互动的“指针”。它使用事件监听器来检测鼠标点击或触摸屏幕的行为，并更新 pointers 数组中的相应指针状态。这段代码看起来像是一个用户输入管理系统的一部分，通常用于交互式应用，如沙箱模拟或者流体模拟。下面我会逐行详细解释这些事件处理的逻辑。
// 该事件处理函数会在用户按下鼠标时触发。它通过 pointers[0].down = true 标记第一个指针（鼠标）的状态为“按下”。
// 该指针的颜色被设置为 fluidColor，通常是流体模拟的颜色，表明当前正在使用该颜色进行互动。
  sandCanvas.addEventListener("mousedown", () => {
    pointers[0].down = true;
    pointers[0].color = fluidColor;
  });


// （触摸屏幕）
// 事件处理函数会在用户触摸屏幕时触发。
// e.preventDefault() 取消了默认的触摸行为，通常是为了避免浏览器进行滚动或其他默认操作，确保触摸事件只用来进行模拟。
// e.targetTouches 获取当前所有触摸点的数组。
// 通过 for 循环遍历每一个触摸点：
// 如果 pointers 数组的长度小于当前触摸点数量，则会创建新的指针（pointerPrototype()）。这样就能够支持多点触控。
// 通过计算 clientX 和 clientY，并减去 boundingRect.left 和 boundingRect.top，获得触摸点相对于画布的位置。通过 scaleX 和 scaleY 对位置进行缩放调整（可能是为了适应不同屏幕分辨率）。
// 每个触摸点都会被分配一个唯一的 ID（touches[i].identifier）以及它的触摸状态（down = true）。指针的坐标和颜色也会被更新。
  sandCanvas.addEventListener("touchstart", (e) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
      if (i >= pointers.length) pointers.push(new pointerPrototype());

      const canvasLeft = (touches[i].clientX - boundingRect.left) * scaleX;
      const canvasTop = (touches[i].clientY - boundingRect.top) * scaleY;

      pointers[i].id = touches[i].identifier;
      pointers[i].down = true;
      pointers[i].x = canvasLeft;
      pointers[i].y = canvasTop;
      pointers[i].color = fluidColor;
    }
  });
// （鼠标松开）
// 当用户释放鼠标按钮时，pointers[0].down 被设置为 false，表示第一个指针（鼠标）的状态变为“松开”。
  window.addEventListener("mouseup", () => {
    pointers[0].down = false;
  });

  // （触摸结束）
  // 该事件会在用户的触摸结束时触发。通过 e.changedTouches 获取所有已结束的触摸点。
// 通过双重循环匹配触摸点的 ID 和当前指针的 ID，一旦匹配，设置对应指针的 down 状态为 false，表示触摸点已结束。
  window.addEventListener("touchend", (e) => {
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++)
      for (let j = 0; j < pointers.length; j++)
        if (touches[i].identifier == pointers[j].id) pointers[j].down = false;
  });

  return { update, reset };
}

export { startFluid };
