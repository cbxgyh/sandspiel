import { Universe, Species } from "../crate/pkg";
import { startWebGL } from "./render";
import { startFluid } from "./fluid";

// 这段代码是用来运行性能基准测试的，目的是对一个模拟宇宙系统的不同操作进行性能测量。代码中通过模拟一个包含沙子、
// 植物、火等物质的世界，并对其进行多次操作，记录每一轮操作的执行时间。最终输出这些时间的统计数据（如平均时间、
// 最小时间、最大时间等）。

const canvas = document.getElementById("sand-canvas");


// 这个函数初始化了一个新的 "宇宙"（universe），并通过 universe.paint()
// 方法在宇宙中不同的位置填充不同的物质（例如沙子、植物、火、空气等）。
// setup() 返回一个包含 universe、fluid 和 render 对象的对象，方便后续使用
function setup() {
  let n = 300;
  let h = n / 2.0;
  let d = n * 0.9;
  let universe = Universe.new(n, n);

  //  用于给宇宙的指定位置和大小填充特定的物质类型（如沙子、植物、火、空气）。
  universe.paint(10, 10, 10, Species.Sand);

  universe.paint(h, h, d + 2, Species.Plant);
  universe.paint(30, n - 10, 15, Species.Fire);
  universe.paint(h - 30, n - 10, 15, Species.Fire);
  universe.paint(h, h, n / 3, Species.Air);
  universe.paint(h, h, n / 3, Species.Fire);

  // startFluid() 和 startWebGL() 是初始化流体模拟和 WebGL 渲染的函数。
  let fluid = startFluid({ universe });
  let render = startWebGL({ canvas, universe });
  window.f = fluid;
  window.u = universe;
  window.r = render;

  return { universe, fluid, render };
}


// 这个函数用于执行一次基准测试，模拟 m 次的宇宙操作，并分别记录 CPU 和流体模拟的时间。
// 返回一个包含三个值的数组：总时间、CPU 时间、流体时间。
function trial(m,{ universe, fluid, render }  ) {

  const t0 = performance.now();
  let cpuTime = 0;
  let fluidTime = 0;
  universe.push_undo();
  for (let i = 0; i < m; i++) {
    const tcpu0 = performance.now();
    // 在每次 universe.tick() 后，都会更新流体模拟 (fluid.update()) 并调用渲染函数 render()。
    universe.tick();
    // performance.now() 用于测量执行时间，cpuTime 和 fluidTime 分别记录 CPU 和流体模拟的时间
    const tcpu1 = performance.now();
    cpuTime += tcpu1 - tcpu0;

    fluid.update();
    const tFluid = performance.now();
    fluidTime += tFluid - tcpu1;

    render();
  }
  const t1 = performance.now();
  universe.pop_undo();

  let delta = t1 - t0;
  return [delta, cpuTime, fluidTime];
}


// 这个函数用于运行多个 trial，以收集性能数据，并计算统计结果（如平均时间、最小时间、最大时间等）。

// n 表示进行多少次试验，m 表示每次试验执行多少次操作。
// 每次运行完 trial() 后，记录 delta（总时间），cpuTime（CPU 时间）和 fluidTime（流体时间）。
// 计算每项操作的统计数据：最小时间、最大时间、平均时间、标准差等。
function runTest(n, m, log) {
  let min = Infinity;
  let max = 0;
  let sum = 0;
  let cpuSum = 0;
  let cpuMin = Infinity;
  let cpuMax = 0;
  let fluidSum = 0;
  let fluidMin = Infinity;
  let fluidMax = 0;
  log(`Running ${n} trials of ${m} reps`);
  let world = setup();
  for (let i = 0; i < n; i++) {
    let [delta, cpuTime, fluidTime] = trial(m, world);
    min = Math.min(delta, min);
    max = Math.max(delta, max);
    sum += delta;

    cpuMin = Math.min(cpuTime, cpuMin);
    cpuMax = Math.max(cpuTime, cpuMax);
    cpuSum += cpuTime / n;

    fluidMin = Math.min(fluidTime, fluidMin);
    fluidMax = Math.max(fluidTime, fluidMax);
    fluidSum += fluidTime / n;

    let trialResult = ` t${i} ${(delta / m).toPrecision(3)}ms      ${(
      cpuTime / m
    ).toPrecision(3)}ms cpu  ${(fluidTime / m).toPrecision(3)}ms fluid `;
    log(trialResult);
  }
  let avg = sum / n;
  let dev = (max - min) / 2;
  let cDev = (cpuMax - cpuMin) / 2;
  let fDev = (fluidMax - fluidMin) / 2;
  let resultString = `avg:${(avg / m).toPrecision(3)}±${(dev / m).toPrecision(
    2
  )}ms ${(cpuSum / m).toPrecision(3)}±${(cDev / m).toPrecision(2)}ms ${(
    fluidSum / m
  ).toPrecision(3)}±${(fDev / m).toPrecision(2)}ms
  `;
  log(resultString);
}


// 这是启动基准测试的入口函数。
function runBenchmark(addLogLine) {
  // 在开始测试时，通过 window.paused = true 暂停了其他可能的操作，确保基准测试不被其他操作干扰。
  window.paused = true;
  console.log("running test");
  // 通过 runTest() 进行多个试验（50 次试验，每次执行 20 次操作），并使用 addLogLine 回调函数输出日志行。
  return runTest(50, 20, (line) => {
    console.log(line);
    addLogLine(line);
  });
}
export { runBenchmark };
