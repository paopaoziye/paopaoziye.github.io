---
title: C语言学习笔记（一）
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
  - C语言
  - 《C和指针》
categories: 编程语言
keywords: C语言学习笔记（一）, C语言, 《C和指针》, 编程语言
updated: ''
date: 2023-11-07 17:33:24
img: /medias/featureimages/0.webp
summary: C语言基础
---
# 编程语言
## C语言学习笔记
### C语言学习笔记（一）
#### 1.编译流程
**①引言**
>**概述**：编译就是将**源代码**即`.c`文件转化为计算机可执行的**机器指令**如`.exe`或`.out`文件
{%list%}
编译主要分为预处理、编译、汇编和链接四个阶段，这里主要以Ubuntu 22.04环境下的GCC编译器为例
{%endlist%}
{%right%}
如果不需要关心具体细节，可以使用gcc hello.c -o hello完成以下文件的整个编译流程
{%endright%}
>编译完成后，直接在当前文件夹下运行`./hello`即可运行该可执行文件
{%warning%}
在执行上述操作之前，需要确保安装了build-essential软件包，包含了GCC编译器以及一些必要的库
{%endwarning%}
```c
#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}
```
**②预处理**
>**概述**：预处理的`GCC`命令为`gcc -E hello.c -o hello.i`，主要处理以`#`开头的指令
{%list%}
预处理的核心工作为宏定义与展开、文件包含、条件编译和剥离注释等
{%endlist%}
{%right%}
预处理阶段并不会进行语法检查和类型检查，本质上是进行一些文本替换和清理工作
{%endright%}
{%warning%}
打开hello.i可以看到该文件被拓展到几百行，新增的代码主要是预处理器将stdio.h及其依赖无脑粘贴到对应位置
{%endwarning%}
```c
// 预处理前
#define PI 3.14159
#define MAX_BUFFER 1024

double area = PI * 2 * 2;
int buf[MAX_BUFFER];

// 预处理后
double area = 3.14159 * 2 * 2;
int buf[1024];
```
**③编译**
>**概述**：编译的`GCC`命令为`gcc -S hello.i -o hello.s`，主要是将**C语言代码**转化为对应架构的**汇编代码**
{%list%}
编译的核心工作为词法分析、语法分析和语义分析，最后进行一些优化并生成目标代码
{%endlist%}
{%right%}
编译过程中，编译器会对代码进行一定优化如剔除死代码和函数内联等，可以使用`-O`控制优化程度，如下所示
{%endright%}
{%warning%}
若编译器判断某个变量在代码执行阶段不会被修改，则会将其存入寄存器中提升访问速度，但不一定是合理的
{%endwarning%}
{%wrong%}
编译器只会考虑软件逻辑，所以当一个变量会被硬件、中断或者其他线程修改时进行上述优化会出现逻辑错误
{%endwrong%}
```c
/* 常量折叠：将能提前计算好的值计算好 */
// 优化前
int seconds_per_day = 60 * 60 * 24;
int a = 10;
int b = a + 5;
// 优化后
int seconds_per_day = 86400; // 直接算出结果
int b = 15;                  // 变量 a 被传播并替换
```
```c
/* 函数内联：因为函数调用是有开销的，所以对于短小且频繁调用的函数，编译器会直接展开 */
// 优化前
inline int square(int x) { return x * x; }
int main() {
    int res = square(5);
}
// 优化后
int main() {
    int res = 25; // 先内联变成了 5 * 5，再被常量折叠为 25
}
```
```c
/* 寄存器优化：将不会被代码改变的变量存入寄存器中 */
// 优化前
uint32_t *status_reg = (uint32_t *)0x40021000;
while (*status_reg == 0) {
    // 死循环，等待硬件将寄存器的值置为 1
}
//优化后
uint32_t temp = *status_reg; // 只去内存读一次，随后把值存到CPU内部寄存器中
while (temp) {
    // 无限死循环，再也不会去读取 0x40021000 这个内存地址了！
}
```
**④汇编**
>**概述**：汇编的`GCC`命令为`gcc -c hello.c -o hello.o`，主要是将**汇编代码**转化为**机器语言**
{%list%}
汇编器的输出的目标文件通常为ELF格式，这个格式的文件通常被分为不同的段如代码段和数据段等
{%endlist%}
{%right%}
可以采用反汇编工具objdump -d hello.o查看目标文件，结果如下所示，分别为指令地址、机器码和汇编指令
{%endright%}
{%warning%}
目标文件中的指令地址为相对地址，并且某些未知地址会被设置为0作为占位符，等待链接的时候被设置
{%endwarning%}
{%wrong%}
每个.c文件是独立编译的，汇编阶段结束后，只知道自己内部的函数和变量地址
{%endwrong%}
```nasm
hello.o:     file format elf64-x86-64


Disassembly of section .text:

0000000000000000 <main>:
   0:	f3 0f 1e fa          	endbr64 
   4:	55                   	push   %rbp
   5:	48 89 e5             	mov    %rsp,%rbp
   8:	48 8d 05 00 00 00 00 	lea    0x0(%rip),%rax        # f <main+0xf>
   f:	48 89 c7             	mov    %rax,%rdi
  12:	e8 00 00 00 00       	call   17 <main+0x17>
  17:	b8 00 00 00 00       	mov    $0x0,%eax
  1c:	5d                   	pop    %rbp
  1d:	c3                   	ret    
```
**⑤链接**
>**概述**：链接的`GCC`命令为`gcc hello.o -o hello`，主要是将**目标文件**和**库文件**组合拼装为一个**可执行文件**
{%list%}
目标文件中有个符号表，记录了该文件定义或引用了那些符号（全局变量和函数），可分为强符号和弱符号
{%endlist%}
>强符号就是**初始化的全局变量**和**所有函数**，弱符号就是**未初始化的全局变量**
{%right%}
链接的核心工作为符号解析和重定位，其中符号解析主要是将每个符号的引用与对应的符号定义精确关联起来
{%endright%}
>**重定位**：将多个`.o`文件中**相同的段**合并随后为所有的符号分配**绝对地址**，最后遍历代码**填补占位符**
{%warning%}
链接器不允许同名的强符号，如果一个强符号和多个弱符号同名，链接器会选择强符号
{%endwarning%}
{%wrong%}
如果有多个弱符号同名，链接器会任选其中一个，这个很容易导致隐蔽bug
{%endwrong%}
```c
/* ------ main.c ------ */
int x = 10; // 强符号：初始化的全局变量
void foo();

int main() {
    foo();
    return 0;
}

/* ------ utils.c ------ */
int x;      // 弱符号：未初始化的全局变量（名字和 main.c 里的 x 冲突）
            // 链接器会默默将此处的 x 映射到 main.c 里的 x 的地址！

void foo() { // 强符号
    x = 20;  // 表面上改的是 utils.c 的 x，实际把 main.c 的 x 给改了！
}
```
#### 2.程序内存布局
**①引言**
>**概述**：
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
