// 这段 GLSL 代码是一个用于计算 涡度 (Vorticity) 的片段着色器。涡度在流体力学中表示一个流体区域的旋转程度，在计算流体动力学中有重要作用。


precision highp float;
precision mediump sampler2D;

// vUv: 纹理坐标，用来确定每个片段的位置。
// vL, vR, vT, vB: 分别代表当前像素的左侧 (L)、右侧 (R)、顶部 (T)、底部 (B) 邻居像素的纹理坐标。它们可能由顶点着色器传递。
// uVelocity: 输入的速度场纹理，用于存储流体或其他物理场的速度分量。
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
void main() {
  float L = textu
  // L = texture2D(uVelocity, vL).y;: 通过纹理坐标 vL 采样 uVelocity 纹理，并获取其 y 分量（通常表示速度场的垂直分量或某个方向的分量）。
// R = texture2D(uVelocity, vR).y;: 通过纹理坐标 vR 采样 uVelocity 纹理，并获取其 y 分量。
// T = texture2D(uVelocity, vT).x;: 通过纹理坐标 vT 采样 uVelocity 纹理，并获取其 x 分量（通常表示速度场的水平方向分量）。
// B = texture2D(uVelocity, vB).x;: 通过纹理坐标 vB 采样 uVelocity 纹理，并获取其 x 分量。re2D(uVelocity, vL).y;
// 这些操作是用来获取当前像素邻域四个方向上的速度分量，通常是速度场的水平和垂直分量。假设 uVelocity 是一个存储流体速度的纹理，其中 x 和 y 分别表示水平和垂直方向的速度。
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
//  float vorticity = R - L - T + B;: 涡度的计算方式是通过对邻域的速度场进行差分运算，通常涡度 ω 被定义为旋转的一个度量，这里使用了一个简单的差分公式：
// R - L 计算了右侧和左侧速度分量的差异，通常与水平方向的旋转相关。
// T - B 计算了顶部和底部速度分量的差异，通常与垂直方向的旋转相关。
// R - L - T + B 结合了这两个方向上的差异，得出了一个衡量涡旋强度的标量值。
 
//  gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);: 将计算得到的涡度值作为 x 分量输出，创建一个红色的 vec4，其中 vorticity 控制红色通道的强度，绿色和蓝色通道为 0，透明度通道为 1.0。
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
}
// 这段代码计算了每个像素点的涡度，并将其以红色通道的形式输出。涡度值通常用于流体模拟，表示流体流动中的旋转成分。输出的红色通道的强度表示涡度的强弱，可以用于后续的处理（例如，流体的可视化或特效）。