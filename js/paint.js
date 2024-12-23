import { height, universe, width } from "./index.js";
import { sizeMap } from "./components/ui";


// 这段代码为一个交互式的“沙画”应用实现了画布上的触摸和鼠标绘制功能。用户可以通过鼠标点击、拖动，或者在触摸屏设备上进行触摸操作来绘制“沙子”或其他元素。它通过监听各种鼠标和触摸事件来控制绘制过程，并通过平滑绘制和撤销机制来优化用户体验。
const canvas = document.getElementById("sand-canvas");

// 计算两个触摸点或鼠标位置的距离
// a.clientX, a.clientY：第一个触摸点或鼠标位置。
// b.clientX, b.clientY：第二个触摸点或鼠标位置。
// 返回两点之间的欧几里得距离。
const eventDistance = (a, b) => {
  return Math.sqrt(
    Math.pow(a.clientX - b.clientX, 2) + Math.pow(a.clientY - b.clientY, 2),
    2
  );
};

// 计算一个向量的模，即其长度。
// 通过计算 clientX 和 clientY 的平方和的平方根来得到向量的大小。
// norm(a)
const magnitude = (a) => {
  return Math.sqrt(Math.pow(a.clientX, 2) + Math.pow(a.clientY, 2), 2);
};

// 归一化向量 a，将其转换为单位向量。
const norm = (a) => {
  let mag = magnitude(a);
  return { clientX: a.clientX / mag, clientY: a.clientY / mag };
};

// 通过将向量的每个分量除以它的大小，返回单位向量。
// scale(a, s)
// 缩放向量 a，将其乘以一个标量 s。
const scale = (a, s) => {
  return { clientX: a.clientX * s, clientY: a.clientY * s };
};

// 向量加法和减法。
const add = (a, b) => {
  return { clientX: a.clientX + b.clientX, clientY: a.clientY + b.clientY };
};
const sub = (a, b) => {
  return { clientX: a.clientX - b.clientX, clientY: a.clientY - b.clientY };
};

let painting = false;
let lastPaint = null;
let repeat = null;


// 绘制逻辑
// 鼠标事件
// 当鼠标按下时，触发 mousedown 事件，开始绘制。
// 调用 universe.push_undo() 保存撤销的状态（允许撤销上一操作）。
// setInterval 每 100 毫秒调用 paint 函数以连续绘制。
canvas.addEventListener("mousedown", (event) => {
  event.preventDefault();
  universe.push_undo();
  painting = true;
  clearInterval(repeat);
  repeat = window.setInterval(() => paint(event), 100);
  paint(event);
  lastPaint = event;
});

// 鼠标释放事件
// 当鼠标释放时，停止绘制，并清除定时器。
document.body.addEventListener("mouseup", (event) => {
  clearInterval(repeat);
  if (painting) {
    event.preventDefault();
    lastPaint = null;
    painting = false;
  }
});

// 鼠标移动事件
// 鼠标移动时调用 smoothPaint 函数，以平滑方式绘制
canvas.addEventListener("mousemove", (event) => {
  clearInterval(repeat);
  smoothPaint(event);
});

// 离开画布事件
// 当鼠标离开画布时，停止绘制。
canvas.addEventListener("mouseleave", (event) => {
  clearInterval(repeat);
  lastPaint = null;
});

// 触摸事件
// 触摸开始时，类似于鼠标按下，保存撤销记录，并开始绘制。
canvas.addEventListener("touchstart", (event) => {
  universe.push_undo();
  if (event.cancelable) {
    event.preventDefault();
  }
  painting = true;
  lastPaint = event;
  handleTouches(event);
});

// 触摸结束时，停止绘制并清除定时器
canvas.addEventListener("touchend", (event) => {
  if (event.cancelable) {
    event.preventDefault();
  }
  lastPaint = null;
  painting = false;
  clearInterval(repeat);
});
// 触摸移动时，调用 handleTouches 来处理绘制。
canvas.addEventListener("touchmove", (event) => {
  if (!window.paused) {
    if (event.cancelable) {
      event.preventDefault();
    }
  }
  clearInterval(repeat);
  handleTouches(event);
});
// 3. 绘制平滑效果
// 使绘制动作平滑化。通过连续多个小步绘制，避免快速移动时跳跃性绘制。
// 平滑绘制通过将每个绘制事件分解为多个小步，并在每个小步上调用 paint 函数。
function smoothPaint(event) {
  clearInterval(repeat);
  repeat = window.setInterval(() => paint(event), 100);
  let startEvent = { clientX: event.clientX, clientY: event.clientY };
  if (!painting) {
    return;
  }
  let size = sizeMap[window.UI.state.size];
  let i = 0;
  let step = Math.max(size / 5, 1);
  if (lastPaint) {
    while (eventDistance(startEvent, lastPaint) > step) {
      let d = eventDistance(startEvent, lastPaint);
      lastPaint = add(
        lastPaint,
        scale(norm(sub(lastPaint, event)), -Math.min(step, d))
      );
      i++;
      if (i > 1000) {
        break;
      }
      paint(lastPaint);
    }
  }
  paint(startEvent);

  lastPaint = event;
}


// 处理多点触摸。
// 如果是单点触摸，调用 smoothPaint 来平滑绘制。
// 如果是多点触摸，直接绘制每个触摸点。
const handleTouches = (event) => {
  let touches = Array.from(event.touches);
  if (touches.length == 1) {
    smoothPaint(touches[0]);
  } else {
    touches.forEach(paint);
  }
};


// 实际绘制
// 将触摸或鼠标事件转换为画布上的坐标，并进行绘制。
// 将鼠标或触摸事件的位置转换为画布上的相对坐标，并在对应位置绘制元素。
const paint = (event) => {
  if (!painting) {
    return;
  }
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX =
    canvas.width / Math.ceil(window.devicePixelRatio) / boundingRect.width;
  const scaleY =
    canvas.height / Math.ceil(window.devicePixelRatio) / boundingRect.height;

  const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
  const canvasTop = (event.clientY - boundingRect.top) * scaleY;

  const x = Math.min(Math.floor(canvasLeft), width - 1);
  const y = Math.min(Math.floor(canvasTop), height - 1);
  if (window.UI.state.selectedElement < 0) return;
  universe.paint(
    x,
    y,
    sizeMap[window.UI.state.size],
    window.UI.state.selectedElement
  );
};
