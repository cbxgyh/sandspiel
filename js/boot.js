import { Species } from "../crate/pkg";

// 这段代码用于初始化一个模拟世界（universe），并在其上逐步绘制不同的物质。通过 async/await
// 控制逐步执行的时间间隔，创建一个逐渐构建的效果。这段代码主要实现了两个功能：
// sleep 和 boot，以及一个用于绘制“碗”的 drawBowl 函数。

// 这是一个简单的延迟函数，返回一个 Promise，该 Promise 会在指定的毫秒数后解决。
// 它用于在异步操作中创建延迟效果，例如让动画逐帧显示。
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// boot 函数的作用是逐步在 universe 中绘制沙子（Species.Sand）和种子（Species.Seed）等物质，
// 并且控制绘制的速度，使得整个过程呈现出逐渐形成的效果。
//
// 主要过程包括：
//
// 使用 Math.sin 函数和 Math.random 来为每个物体生成随机的位置和变化的高度，使得模拟看起来更加动态和自然。
// 在绘制每一物质后，通过 await sleep(16) 来控制每次绘制的时间间隔，使得动画效果更加流畅。
// 在第二个循环中，使用随机的步进来控制种子的间隔，并在每次绘制后增加不同的延迟（await sleep(180)）。
async function boot(width, height) {
  //   for (let r = 0; r <= width * 1.7; r += 28) {
  //     for (let s = 6; s >= 1; s -= 1) {
  //       let rr = r - s * 4;
  //       window.u.paint(width / 2, height / 2, rr + 5, Species.Sand);
  //       window.u.paint(width / 2, height / 2, rr, Species.Empty);
  //       await sleep(16);
  //     }
  //   }

  //   for (let x = 5; x <= width - 5; x += Math.random() * 9) {
  //     window.u.paint(
  //       x,
  //       Math.floor(height - 40 + 20 * Math.sin(x / 50)),
  //       3,
  //       Species.Stone
  //     );
  //     await sleep(2);
  //   }

  // // 第一个循环，绘制沙子（Species.Sand）
  for (let x = 5; x <= width - 5; x += 10) {
    window.u.paint(
      x,
      Math.floor(height - 40 + 5 * Math.sin(x / 20)),
      Math.random() * 6 + 10,
      Species.Sand
    );
    // window.u.paint(
    //   width - x,
    //   Math.floor(height - 40 + 5 * Math.sin(x / 20)),
    //   Math.random() * 6 + 10,
    //   Species.Sand
    // );
    if (window.stopboot) return;
    await sleep(16);
  }
  // // 第二个循环，绘制种子（Species.Seed）
  for (let x = 40; x <= width - 40; x += 50 + Math.random() * 10) {
    // 这里，window.u.paint(x, y, size, species) 主要是根据给定的坐标 (x, y) 在 universe
    // 中绘制指定大小的物体（沙子或种子等）。species 是通过 Species 枚举传递的，决定了物体的类型。
    //
    // x 位置逐渐增加，每次增加一个步进，控制沙子和种子在屏幕上的分布。
    // y 位置通过 Math.sin 函数创建波动效果，使得物体在 Y 轴上逐渐起伏，模拟波动或者自然效果。
    // window.stopboot 是一个全局变量，用于控制是否停止初始化过程。可以在某些情况下手动中止初始化过程
    // （比如用户点击停止按钮等）。
    window.u.paint(
      x,
      Math.floor(height / 2 + 20 * Math.sin(x / 20)),
      6,
      Species.Seed
    );
    // // 退出循环
    if (window.stopboot) return;
// 延迟180毫秒
    await sleep(180);
  }

  //   for (let a = 0; a <= 180; a += 4) {
  //     let x = (width / 3 + 10) * Math.cos(a * (Math.PI / 180));
  //     let y = (height / 3 + 10) * Math.sin(a * (Math.PI / 180));
  //     window.u.paint(width / 2 + x, height / 2 + y, 21, Species.Sand);
  //     window.u.paint(width / 2 - x, height / 2 - y, 21, Species.Sand);
  //     await sleep(8);
  //   }
}

// 该函数的目的是绘制一个碗的形状。window.u.paint() 被用来绘制沙子和空物质，创建碗的外形和内空

// 这里 h 和 d 可能是定义的世界中某个区域的宽度或高度（从代码中没有看到它们的定义）。
// Species.Sand 用于填充沙子，Species.Empty 用于创建空区域，模拟一个碗的空心部分。
function drawBowl() {
  window.u.paint(h, h, d + 2, Species.Sand);
  window.u.paint(h, h, d - 2, Species.Empty);
}

export { sleep, boot };
