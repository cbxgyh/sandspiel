// A dependency graph that contains any wasm must all be imported
// asynchronously. This `bootstrap.js` file does the single async import, so
// that no one else needs to worry about it again.

// 态导入 (import())：
//
// import() 是 ES2020 引入的一个动态导入语法，允许你按需加载模块。在这里，它用于异步加载 index.js 文件。
// import("./index.js") 返回一个 Promise，该 Promise 会在模块成功加载后解析。如果加载失败，它会被拒绝并抛出错误
import("./index.js").catch(e =>
  console.error("Error importing `index.js`:", e)
);
