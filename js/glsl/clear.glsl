

precision highp float;
precision mediump sampler2D;

vUv: 这是传入的纹理坐标，通常由顶点着色器传递。
uTexture: 输入的纹理，使用 sampler2D 类型，可能是场景中的颜色纹理。
uWind: 输入的风场或其他场景数据的纹理，存储着压力值。
value: 一个浮动常数，可能用来调整最终结果的强度。

varying vec2 vUv;
uniform sampler2D uTexture;
uniform sampler2D uWind;
uniform float value;
void main() {
  float pressure = texture2D(uWind, vUv).z;
  pressure *= 512.;
  pressure *= pressure;
  gl_FragColor = value * (texture2D(uTexture, vUv) + vec4(pressure));
}