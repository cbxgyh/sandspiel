import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
// 由配置定义了应用中不同的页面以及组件：
//
// /info/：显示 Info 组件。
// /bench：显示 BenchmarkRunner 组件。
// /browse：由 BrowseRouter 处理，显示 Browse 组件，并且包含 Menu 组件。
// /admin：由 AdminRouter 处理，显示 Admin 组件，包含 Menu。
// /login 和 /__/auth/handler：由 SigninRouter 处理，显示 SignInScreen 组件，包含 Menu。
import Info from "./components/info";
import { Index } from "./components/ui";
import Browse from "./components/browse";
import Admin from "./components/admin";
import Menu from "./components/menu";
import SignInScreen from "./components/signin";
import BenchmarkRunner from "./components/benchmarkRunner";

// 在代码末尾，sizeMap 是一个数组 [2, 5, 10, 18, 30, 45]，
// 可能用于页面中某些组件的尺寸控制或者选择。它被导出，以便其他模块可以使用
let sizeMap = [2, 5, 10, 18, 30, 45];

function BrowseRouter({ match, location }) {
  return (
    <Menu>
      <Browse location={location} />
    </Menu>
  );
}

function AdminRouter({ match, location }) {
  return (
    <Menu>
      <Admin location={location} />
    </Menu>
  );
}

function SigninRouter({ match, location }) {
  return (
    <Menu>
      <SignInScreen location={location} />
    </Menu>
  );
}

function AppRouter() {
  return (
    <Router>
      <Route path="/" component={Index} />
      <Route
        exact
        path="/info/"
        component={() => (
          <Menu>
            <Info />
          </Menu>
        )}
      />
      <Route exact path="/bench" component={BenchmarkRunner} />
      <Route path="/browse" component={BrowseRouter} />
      <Route path="/admin" component={AdminRouter} />
      <Route path="/login" component={SigninRouter} />
      <Route path="/__/auth/handler" component={SigninRouter} />
    </Router>
  );
}

ReactDOM.render(<AppRouter />, document.getElementById("ui"));

export { sizeMap };
