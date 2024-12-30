// 原先的基础上做了一些改进，特别是使用了 双线性插值 来更加平滑地计算源项值，并通过速度场对源项进行偏移


precision highp float;
precision mediump sampler2D;
// vUv: 当前片段的纹理坐标，由顶点着色器传递。
// uVelocity: 速度场纹理，存储每个像素的速度分量。
// uSource: 源项纹理，存储源项值（如污染物浓度等）。
// uWind: 风场纹理，用于存储密度或其他物理量。
// texelSize: 纹素大小，通常是 1.0 / textureWidth 和 1.0 / textureHeight，用于计算纹理坐标的偏移。
// dt: 时间步长，控制源项或物理量随时间的变化。
// dissipation: 消散因子，用于控制物理量（如源项或密度）的衰减。
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform sampler2D uWind;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;

// 该函数用于在 2D 纹理坐标上进行 双线性插值（bilinear interpolation），以便在纹理坐标 p 上获取更加平滑的值：

// st.xy 和 st.zw 分别表示给定坐标 p 左下角和右上角的整数坐标。
// uv = st * texelSize.xyxy 将坐标转换为纹理空间坐标。
// 使用 texture2D 从四个邻近像素（左下、右下、左上、右上）采样。
// 最后，通过 mix 函数按照插值系数 f 对四个邻居像素进行插值计算，返回平滑的值。
vec4 bilerp(in sampler2D sam, in vec2 p) {
  vec4 st;
  st.xy = floor(p - 0.5) + 0.5;
  st.zw = st.xy + 1.0;
  vec4 uv = st * texelSize.xyxy;
  vec4 a = texture2D(sam, uv.xy);
  vec4 b = texture2D(sam, uv.zy);
  vec4 c = texture2D(sam, uv.xw);
  vec4 d = texture2D(sam, uv.zw);
  vec2 f = p - st.xy;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {

//   // 使用 uVelocity 纹理中的速度场信息来对源项进行时间上的偏移，类似于流体或物质随时间的流动。
// texture2D(uVelocity, vUv).xy 从 uVelocity 纹理中采样速度向量，并计算速度对当前坐标的影响。
// gl_FragCoord.xy 表示当前片段的屏幕坐标，减去速度场对该片段的影响，得到源项新的采样坐标。
  vec2 coord = gl_FragCoord.xy - dt * texture2D(uVelocity, vUv).xy;
  // 密度处理
  // 从 uWind 纹理中采样密度的 w 分量，假设 w 表示某种物理量（如流体密度或浓度）。
// 如果密度大于 0.99，将其设置为 0，用于清除过高密度的区域。
  float density = texture2D(uWind, vUv).w;
  if (density > 0.99) {
    density = 0.;
  }

  // bilerp(uSource, coord) 使用双线性插值函数在 uSource 纹理上根据 coord 计算源项的值，得到源项的平滑值。
// 将源项值与密度值相加（通过 vec4(density) 转换为 RGBA 格式）。这意味着源项与密度合并影响最终的颜色。
// 乘以 dissipation，控制源项随时间的衰减（例如流体的扩散或热量的散失）。
  gl_FragColor = dissipation * (bilerp(uSource, coord) + vec4(density));
  gl_FragColor.a = 1.0;
}

// 整体效果:
// 速度场偏移: 根据 uVelocity 速度场对源项进行偏移，模拟物质或流体随时间流动的效果。
// 双线性插值: 使用 bilerp 函数对源项进行平滑插值，从而避免源项值的锯齿状变化，使得源项在纹理空间中更加平滑。
// 密度处理: 对 uWind 纹理中的密度值进行处理，如果超过某个阈值则清除。
// 源项衰减: 通过 dissipation 因子对源项进行衰减，模拟物理量的扩散。
// 最终输出: 将处理后的源项值和密度值输出，得到新的物理量浓度或场的强度。
// 应用场景：
// 这段代码可以用于 流体模拟、污染物扩散、烟雾或气体传播等场景。特别是在流体动力学（CFD）模拟中，使用速度场对源项进行偏移，并通过双线性插值计算源项的值，能够更精确地模拟物理现象。dissipation 因子用于控制源项随时间的衰减，模拟物理量的扩散过程。