// 这段代码的作用是根据 window.devicePixelRatio 的值来动态设置 ratio，并将其导出
let ratio = 4;
// window.devicePixelRatio 是浏览器提供的一个属性，它表示设备的像素比率。具体来说，它是设备的物理像素与逻辑像素（CSS像素）之间的比例。
// 如果设备的 devicePixelRatio 大于 1，通常表示该设备是高分辨率屏幕（如 Retina 屏幕）。此时，我们将 ratio 设置为 3，这是为了适应不同分辨率的屏幕，提供更好的图形渲染效果。
if (window.devicePixelRatio > 1) {
  ratio = 3;
}
export { ratio };
