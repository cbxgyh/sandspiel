
//
// 这段代码的主要目的是计算和显示实时的帧率（FPS），并将帧率数据发送到 Google Analytics（GA）。它通过监控每帧的渲染时间来计算帧率，并在每一帧后更新帧率数据
// FPS 计算：通过每帧的时间差计算 FPS，并且保留最近 30 帧的 FPS 数据。
// 数据发送：每 600 帧计算一次平均 FPS，并将其作为事件发送到 Google Analytics。根据 FPS 值的不同，还会发送不同的事件标记（如 fps-L50，fps-L40）。
// 页面显示：在页面上实时更新 FPS。


// samples：定义了收集和发送 FPS 数据的次数（在这里是每 600 帧发送一次）。
// dataLayer：这是 Google Analytics 需要的一个全局数组，用来存储 GA 事件数据。
// gtag()：这是一个包装函数，用于将事件发送到 dataLayer 中，便于后续将数据发送给 Google Analytics。
let samples = 600;

window.dataLayer = window.dataLayer || [];

function gtag() {
  dataLayer.push(arguments);
}


// fps：一个匿名类的实例，用来计算和展示 FPS。
// this.fps：获取页面上 ID 为 fps 的 DOM 元素，用于显示当前的 FPS。
// this.frames：一个数组，用来保存最近的 FPS 数据，最多保存 30 个数据点。
// this.lastFrameTimeStamp：记录上一帧的时间戳，用于计算时间差（delta）。

const fps = new (class {
  constructor() {
    this.fps = document.getElementById("fps");
    this.frames = [];
    this.lastFrameTimeStamp = performance.now();
  }

  // performance.now()：返回当前的高精度时间戳，单位为毫秒，用于精确计算每帧的时间间隔。
  // delta：当前帧与上一帧之间的时间差，单位为毫秒。
  // fps：根据时间差计算的帧率，公式是 1 / delta * 1000，即每秒的帧数。
  render() {
    // Convert the delta time since the last frame render into a measure
    // of frames per second.

    const now = performance.now();
    const delta = now - this.lastFrameTimeStamp;
    this.lastFrameTimeStamp = now;
    const fps = (1 / delta) * 1000;


    // 将计算得到的 FPS 添加到 frames 数组中，并确保数组中最多只有 30 个最新的 FPS 数据（如果超过 30 个数据点，移除最旧的）
    // Save only the latest 100 timings.
    this.frames.push(fps);
    if (this.frames.length > 30) {
      this.frames.shift();
    }


    // 计算最近 30 帧的 FPS 数据的最小值 (min)、最大值 (max) 和平均值 (mean)。
    // min：最近 30 帧的最低 FPS。
    // max：最近 30 帧的最高 FPS。
    // mean：最近 30 帧的平均 FPS。
    // Find the max, min, and mean of our 100 latest timings.
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < this.frames.length; i++) {
      sum += this.frames[i];
      min = Math.min(this.frames[i], min);
      max = Math.max(this.frames[i], max);
    }
    let mean = sum / this.frames.length;


    // 每当 samples 达到 0 时，表示需要发送一次 FPS 数据到 Google Analytics。
    // gtag("event", "fps", {...})：将平均 FPS 作为事件发送到 Google Analytics。
    // 如果 FPS 低于不同的阈值（50, 40, 30, 20），还会发送额外的事件，分别标记为 fps-L50, fps-L40, fps-L30, fps-L20。
    samples--;
    if (samples === 0) {
      console.log(`sending fps ${Math.round(mean)} to ga`);
      gtag("event", "fps", {
        value: Math.round(mean),
      });
      if (mean < 50) {
        gtag("event", "fps-L50", {
          value: Math.round(mean),
        });
      }

      if (mean < 40) {
        gtag("event", "fps-L40", {
          value: Math.round(mean),
        });
      }
      if (mean < 30) {
        gtag("event", "fps-L30", {
          value: Math.round(mean),
        });
      }
      if (mean < 20) {
        gtag("event", "fps-L20", {
          value: Math.round(mean),
        });
      }
    }

    // 在页面上显示计算出的平均 FPS。
    // Render the statistics.
    this.fps.textContent = `FPS:${Math.round(mean)}`;
  }
})();

export { fps };
