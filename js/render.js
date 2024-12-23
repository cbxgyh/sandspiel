const reglBuilder = require("regl");
import { memory } from "../crate/pkg/sandtable_bg";
import { Species } from "../crate/pkg/sandtable";
import { Universe } from "../crate/pkg";

// 这段代码使用了 regl 和 WebAssembly (memory, Species, Universe) 来创建一个 WebGL 渲染的沙子模拟，结合 sandtable 模块的逻辑展示和操作。主要功能包括在 WebGL 上绘制沙子模拟的状态、生成快照以及颜色调色板的生成。

let fsh = require("./glsl/sand.glsl");
let vsh = require("./glsl/sandVertex.glsl");

// 1. 初始化 WebGL 渲染 (startWebGL)
// startWebGL 函数接受一个配置对象，初始化 WebGL 渲染，并通过 regl 绘制沙子模拟的状态。
// regl: 使用 regl 库来简化 WebGL 的渲染过程，提供了简单的 API 用于创建和管理纹理、着色器和绘制操作。
// frag 和 vert: 分别是 fragment 和 vertex 着色器的源代码，来自 sand.glsl 和 sandVertex.glsl 文件。
// uniforms: 这些是传递给着色器的变量，如时间 t、数据纹理 data 和分辨率 resolution。
let startWebGL = ({ canvas, universe, isSnapshot = false }) => {
  const regl = reglBuilder({
    canvas,
    attributes: { preserveDrawingBuffer: isSnapshot },
  });
  // const lastFrame = regl.texture();
  const width = universe.width();
  const height = universe.height();
  let cell_pointer = universe.cells();
  let cells = new Uint8Array(memory.buffer, cell_pointer, width * height * 4);
  const dataTexture = regl.texture({ width, height, data: cells });

  let drawSand = regl({
    frag: fsh,
    uniforms: {
      t: ({ tick }) => tick,
      data: () => {
        // if (cell_pointer != universe.cells()) {
        //   console.log(cell_pointer);
        // }
        cell_pointer = universe.cells();
        cells = new Uint8Array(memory.buffer, cell_pointer, width * height * 4);
        // }

        return dataTexture({ width, height, data: cells });
      },
      resolution: ({ viewportWidth, viewportHeight }) => [
        viewportWidth,
        viewportHeight,
      ],
      dpi: window.devicePixelRatio * 2,
      isSnapshot,
      // backBuffer: lastFrame
    },

    vert: vsh,
    attributes: {
      // Full screen triangle
      position: [
        [-1, 4],
        [-1, -1],
        [4, -1],
      ],
    },
    // Our triangle has 3 vertices
    count: 3,
  });

  return () => {
    regl.poll();
    drawSand();
  };
};

// 2. 生成快照 (snapshot)
// snapshot 函数生成一个沙子模拟的快照，将其渲染到一个新创建的 canvas 元素上，并返回图像数据 URL。
// canvas.toDataURL("image/png"): 将 canvas 内容转换为 PNG 格式的图像数据 URL，便于下载或展示。
let snapshot = (universe) => {
  let canvas = document.createElement("canvas");
  canvas.width = universe.width() / 2;
  canvas.height = universe.height() / 2;
  let render = startWebGL({ universe, canvas, isSnapshot: true });
  render();

  return canvas.toDataURL("image/png");
};

// 3. 生成调色板 (pallette)
// pallette 函数生成一个调色板，将每个物种的颜色渲染到 canvas 上，并将这些颜色存储在一个对象中。
// Species: 代表沙子模拟中的不同物种（可能是沙子、液体或气体等）。
// readPixels: 从 WebGL 上读取像素数据，这里读取了每个物种的颜色信息并存储在 colors 对象中。
let pallette = () => {
  let canvas = document.createElement("canvas");

  let species = Object.values(Species).filter((x) => Number.isInteger(x));
  let range = Math.max(...species) + 1;
  let universe = Universe.new(range, 1);
  canvas.width = 3;
  canvas.height = range;
  universe.reset();

  species.forEach((id) => universe.paint(id, 0, 1, id));

  let render = startWebGL({ universe, canvas, isSnapshot: true });
  render();
  let ctx = canvas.getContext("webgl");
  let data = new Uint8Array(range * 4);
  ctx.readPixels(0, 0, 1, range, ctx.RGBA, ctx.UNSIGNED_BYTE, data);
  let colors = {};
  species.forEach((id) => {
    let index = (range - 1 - id) * 4;
    let color = `rgba(${data[index]},${data[index + 1]}, ${
      data[index + 2]
    }, 0.25)`;
    colors[id] = color;
  });
  return colors;
};

export { startWebGL, snapshot, pallette };
