import { Species } from "../crate/pkg/sandtable";

// rgbaToSpecies：将 RGBA 颜色值转换为物种（Species）标识符
// 该函数接收四个参数 (r, g, b, a)，表示 RGBA 颜色值。函数的主要步骤如下
//    如果透明度 a 小于 250，则返回 Species.Empty，表示透明或空状态。
  // 将 RGB 值归一化到 [0, 1] 范围内，即每个值除以 255。
  // 计算 HSL 色彩模型中的色相（H）、饱和度（S）和亮度（L）。
  // 对于灰度颜色（例如，接近黑色或白色），会根据亮度判断返回不同的物种：
  // 黑色返回 Species.Wall（墙）。
  // 白色返回 Species.Empty（空）。
  // 浅灰色返回 Species.Sand（沙）。
  // 对于非灰度颜色，函数使用色相和亮度值计算并选择对应的物种。色相值决定了颜色类型（例如，红色、黄色、绿色等），而亮度决定了具体的物种。
export function rgbaToSpecies(r, g, b, a) {
  // Transparent to Empty
  if (a < 250) {
    return 0;
  }

  r /= 255;
  g /= 255;
  b /= 255;

  // https://github.com/Qix-/color-convert/blob/master/conversions.js#L58
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const delta = max - min;
  let h;
  let s;

  if (max === min) {
    h = 0;
  } else if (r === max) {
    h = (g - b) / delta;
  } else if (g === max) {
    h = 2 + (b - r) / delta;
  } else if (b === max) {
    h = 4 + (r - g) / delta;
  }

  h = Math.min(h * 60, 360);

  if (h < 0) {
    h += 360;
  }

  const l = (min + max) / 2;

  if (max === min) {
    s = 0;
  } else if (l <= 0.5) {
    s = delta / (max + min);
  } else {
    s = delta / (2 - max - min);
  }

  // Greyscale options
  if (s < 0.05) {
    // Black to Wall
    if (l < 0.05) {
      return Species.Wall;
    }
    // White to Empty
    if (l > 0.95) {
      return Species.Empty;
    }
    // Light grey to Sand
    if (l > 0.5) {
      return Species.Sand;
    }
  }

  // Color options
  let hueIndex = Math.floor((h + 25.7) / 360 * 7);
  let lightnessIndex = Math.floor(l * 4 - 0.25);

  const colorsToSpecies = [
    [ Species.Fire, Species.Lava, Species.Rocket], // Red
    [ Species.Wood, null, Species.Gas], // Yellow
    [ Species.Plant, Species.Dust, Species.Acid], // Green
    [ Species.Plant, Species.Dust, Species.Acid ], // Green2: duplicate b/c they are perceptually close
    [ Species.Water, Species.Ice, Species.Stone ], // Blue
    [ Species.Oil, Species.Seed, Species.Fungus], // Purple
    [ Species.Cloner, Species.Mite, null ], // Violet
  ];

  const species = colorsToSpecies?.[hueIndex]?.[lightnessIndex];

  return species ? species : Species.Empty;
}
// svgToImageData：将 SVG 字符串转换为图像数据（ImageData）
// 该函数将 SVG 字符串转换为图像数据，并返回该图像的像素信息。主要步骤如下：
//
// 使用 DOMParser 解析 SVG 字符串，如果解析出错，则抛出错误。
// 将 SVG 尺寸调整为默认的 300x300（根据“Sandspiel”游戏的宇宙大小）。
// 使用 XMLSerializer 将 SVG 转换回字符串，并创建一个 Blob 对象，将 SVG 作为图像载入。
// 等待图像加载完成后，将图像绘制到一个 Canvas 元素上，并从中提取图像的像素数据（ImageData）。
// 对 Canvas 上下文进行旋转和缩放，使其与游戏世界的坐标系对齐。
// 返回图像的像素数据
export async function svgToImageData (svgString) {
  const width = 300;
  const height = 300;

  return new Promise((resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
  
    const errorNode = doc.querySelector("parsererror");
    if (errorNode) {
      reject("Error while parsing SVG.");
      return;
    } 
    
    // We want to fit any pasted SVG to the default Sandspiel universe size.
    doc.documentElement.setAttribute("width", width + "px");
    doc.documentElement.setAttribute("height", height + "px");
  
    const serializer = new XMLSerializer();
    const svgStringSized = serializer.serializeToString(doc);

    // Load the SVG into an image element
    const blob = new Blob([svgStringSized], {type: 'image/svg+xml'});
    const img = document.createElement("img");
    img.width = width;
    img.height = height;
  
    img.addEventListener("load", () => {
      // Then we write the image pixels to a canvas.
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      // Transform context to match Sandspiel Universe
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((-90 * Math.PI) / 180);
      ctx.scale(-1, 1.0);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
  
      ctx.drawImage(img, 0, 0);
  
      const imgData = ctx.getImageData(0, 0, width, height);
      resolve(imgData);
    });

    img.addEventListener('error', function (error) {
      reject(error);
    })

    img.src = URL.createObjectURL(blob);
  });
}