---
title: Rust学习笔记（一）
toc: true
indent: true
top: false
comments: true
archive: true
cover: false
mathjax: false
pin: false
top_meta: false
bottom_meta: false
sidebar:
  - toc
tag:
  - 《Rust 权威学习指南》
  - Rust
categories: 编程语言
keywords: Rust学习笔记（一）, 《Rust 权威学习指南》, Rust, 编程语言
updated: ''
img: /medias/featureimages/30.webp
date: 2026-07-19 01:32:03
summary: Rust基础
---
# 编程语言
## Rust学习笔记
### Rust学习笔记（一）
#### 1.引言
**①简介**
>**概述**：`Rust`是一门强调**运行效率**、**内存安全**和**并发安全**的编程语言，主要面向系统级开发
{%list%}
RUST的主要特性为所有权，即每个值只能有一个所有者，所有者离开作用域后，内存自动释放
{%endlist%}
{%right%}
Rust的所有权机制通过规定数据的归属、转移和释放方式，在没有垃圾回收器的情况下保证内存安全
{%endright%}
{%warning%}
Rust的学习曲线陡峭，编译速度较慢，且经常会出现代码逻辑没有明显问题，但无法编译通过的情况
{%endwarning%}
![所有权机制](/image/Rust_1.png)
**②环境配置**
>**概述**：以`Ubuntu 24.04`为例构建`Rust`的开发环境，主要就是安装`rustc`、`cargo`和`rustup`
{%list%}
rustup是Rust的工具链管理器，负责安装、更新和切换不同版本的 Rust，以及添加交叉编译目标和组件
{%endlist%}
{%right%}
cargo是Rust的项目管理工具，负责创建项目、管理依赖、编译、运行、测试和发布等
{%endright%}
{%warning%}
rustc是Rust的编译器，但是日常主要使用cargo，它会自动调用rustc完成编译
{%endwarning%}
```shell
# 安装依赖
sudo apt update
sudo apt install -y \
    build-essential \
    curl \
    git \
    pkg-config \
    libssl-dev

# 使用 rustup 安装 Rust，出现选项时选择 1 表明安装稳定版 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 让环境变量生效
source "$HOME/.cargo/env" 
```
**③Hello world**
>**概述**：运行如下命令创建并编译`Hello world`工程，其**目录结构**如下所示
{%list%}
Cargo.toml是项目配置文件，用于记录项目名称、版本和依赖等信息
{%endlist%}
{%right%}
cargo check会完成语法检查、类型检查、借用检查和依赖分析，比cargo build快很多，适合频繁使用
{%endright%}
>除此之外还有`cargo fmt`、`cargo clippy`和`cargo test`可用于**格式化**、**静态检查**和**代码验证**
{%warning%}
cargo build生成的是调试版本，cargo build --release生成的是优化版本，后者性能更好但编译更耗时
{%endwarning%}
```shell
# 创建新项目
cargo new hello_rust
cd hello_rust

# 格式化检查代码格式是否符合 rustfmt 规范，但不会自动修改文件
# -- 表示把后面的参数传给 Clippy/Rust 编译器
# 如果需要自动格式化则运行 cargo fmt
cargo fmt --check

# 快速检查语法、类型、所有权和借用等问题
cargo check 

# 静态检查，检查潜在错误和不推荐的代码写法
# -D warnings表示将所有警告提升为错误
cargo clippy -- -D warnings

#  编译并运行项目中的测试代码（需要自己编写）
cargo test

# 编译项目
cargo build

# 运行项目
cargo run
```
```shell
hello_rust/
├── Cargo.toml
└── src/
    └── main.rs
```
```rust
fn main() {
    println!("Hello, world!");
}
```

