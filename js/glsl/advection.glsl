// 模拟基于速度场的流体或气体的行为。在这段代码中，多个纹理和物理参数交互影响着最终的像素值。




基于流体或物理场的操作，结合了速度场、源项、风场和消散等概念。具体来说，它通过使用速度场对源项进行偏移，同时对密度进行处理，最终通过消散因子调整颜色的强度
precision highp float;
precision mediump sampler2D;


// vUv: 当前片段的纹理坐标，通常由顶点着色器传递给片段着色器。
// uVelocity: 速度场纹理，用于存储每个像素的速度信息（通常是二维向量）。
// uSource: 源项纹理，可能代表源（如污染物或其他物理量）的浓度或值。
// uWind: 风场纹理，可能包含其他场的相关数据（如风速或压力）。
// texelSize: 单个纹素的大小，通常是 1.0 / textureWidth 和 1.0 / textureHeight，用于计算纹理坐标的偏移。
// dt: 时间步长，用于模拟中物理量随时间的变化。
// dissipation: 消散因子，用于控制物理量（如源项或密度）的衰减。
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform sampler2D uWind;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main() {
  // 坐标计算
  // 这行代码的目的是计算基于速度场 uVelocity 的偏移坐标，模拟源项或物质随时间的流动：
// texture2D(uVelocity, vUv).xy 从 uVelocity 纹理中采样并获取 x 和 y 速度分量。
// dt * texture2D(uVelocity, vUv).xy * texelSize 计算出速度场所引起的偏移，使用时间步长 dt 和纹素大小 texelSize 来进行适当的缩放。
// vUv - ... 通过从当前坐标中减去偏移量，得到源项的新的采样坐标。
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
// 密度计算
  // 从 uWind 纹理中采样获取密度的 w 分量，w 通常表示某种物理量（如流体密度或浓度）。
// 如果密度大于 0.99，则将其重置为 0，这可能表示某些阈值的处理（例如避免过高的值，或用于“清空”高密度区域）
  float density = texture2D(uWind, vUv).w * 1.;
  if (density > 0.99) {
    density = 0.;
  }

  // texture2D(uSource, coord) 从 uSource 纹理中采样新的源项值（基于偏移后的坐标 coord）。
// vec4(density) 将密度值转换为一个 vec4，表示将密度值与源项的颜色分量结合。
// 将源项值和密度值相加，得到一个新的颜色值。
// 乘以 dissipation，控制物理量（如源项）的衰减。
// 设置透明度为 1.0，表示完全不透明。

  gl_FragColor = dissipation * (texture2D(uSource, coord) + vec4(density));
  gl_FragColor.a = 1.0;
}

// 速度场偏移: 根据 uVelocity 速度场对源项的位置进行偏移，模拟物质或流体随时间流动的效果。
// 密度处理: 根据 uWind 风场中的密度值调整源项的影响，密度过高时将其清除。
// 源项衰减: 通过 dissipation 因子来控制物理量随时间的衰减效果，使得源项逐渐减弱。
// 最终输出: 经过这些处理后，最终的颜色值被输出，表示新的物理量浓度或场的强度。

// 这段代码适用于模拟流体动力学中的浓度传输或污染物扩散等效果，其中源项可以是污染物、热量或其他物理量，而速度场（uVelocity）和风场（uWind）决定了这些物理量如何随时间传播。消散因子（dissipation）用于模拟物理量的自然衰减，例如流体的扩散或热量的散失。

// 这种着色器经常用于流体模拟、污染扩散、烟雾和气体传播等场景，尤其是在计算流体动力学（CFD）模拟的可视化中。