use cfg_if::cfg_if;
// 这两个函数用来计算给定方向的右侧（顺时针）或左侧（逆时针）的邻近方向。方向由 (i32, i32) 表示，这里假设 (0, 1) 是向上、 (1, 0) 是向右，依此类推。adjacency_right 和 adjacency_left 的作用是找到当前方向顺时针或逆时针旋转 90 度后的方向。


// 如果输入是 (0, 1)（向上），右侧方向就是 (1, 1)（向右上）。
// 如果输入是 (1, 1)（向右上），右侧方向是 (1, 0)（向右）。
// 以此类推，旋转 90 度得到顺时针的右侧邻近方向。
pub fn adjacency_right(dir: (i32, i32)) -> (i32, i32) {
    match dir {
        (0, 1) => (1, 1),
        (1, 1) => (1, 0),
        (1, 0) => (1, -1),
        (1, -1) => (0, -1),
        (0, -1) => (-1, -1),
        (-1, -1) => (-1, 0),
        (-1, 0) => (-1, 1),
        (-1, 1) => (0, 1),
        _ => (0, 0),
    }
}

// 这段代码与 adjacency_right 相似，但它返回的是逆时针方向的邻近位置。
// 比如，输入 (0, 1)（向上），左侧方向是 (-1, 1)（向左上）。
pub fn adjacency_left(dir: (i32, i32)) -> (i32, i32) {
    match dir {
        (0, 1) => (-1, 1),
        (1, 1) => (0, 1),
        (1, 0) => (1, 1),
        (1, -1) => (1, 0),
        (0, -1) => (1, -1),
        (-1, -1) => (0, -1),
        (-1, 0) => (-1, -1),
        (-1, 1) => (-1, 0),
        _ => (0, 0),
    }
}


// join_dy_dx 和 split_dy_dx
// 这两个函数负责在不同的数值表示和方向之间进行转换，主要用于将两个方向的值合并成一个 u8 或从一个 u8 恢复成两个方向值。

// 该函数将 dx 和 dy 两个方向值（取值范围是 -1、0、1）合并成一个 u8 值。通过这种方式，可以方便地存储和传递方向。
// 例如，如果 dx = 1 和 dy = 0，那么 join_dy_dx(1, 0) 会计算为 ((1 + 1) * 3 + (0 + 1)) = 7，返回 7。
pub fn join_dy_dx(dx: i32, dy: i32) -> u8 {
    (((dx + 1) * 3) + (dy + 1)) as u8
}


// 该函数将 u8 类型的方向值解码成 dx 和 dy 两个整数，恢复方向。
// 例如，split_dy_dx(7) 会将 7 分解回 (1, 0)。
pub fn split_dy_dx(s: u8) -> (i32, i32) {
    let s: i32 = s as i32;

    let dx: i32 = (s / 3) - 1;

    let dy: i32 = (s % 3) - 1;

    (dx, dy)
}

cfg_if! {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    if #[cfg(feature = "console_error_panic_hook")] {
        extern crate console_error_panic_hook;
        // pub use self::console_error_panic_hook::set_once as set_panic_hook;
    } else {
        #[inline]
         pub fn set_panic_hook() {}
    }
}
