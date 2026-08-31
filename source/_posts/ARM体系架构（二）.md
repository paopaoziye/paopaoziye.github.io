---
title: ARM体系架构（二）
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
  - ARM体系架构
categories: 处理器架构
keywords: ARM体系架构（二）, ARM体系架构, 处理器架构
updated: ''
img: /medias/featureimages/20.webp
date: 2026-08-20 11:29:30
summary: ARM指令系统
---
# 处理器架构
## ARM体系架构
### ARM体系架构（二）
#### 指令系统
**①简介**
>**概述**：`Arm`指令系统规定指令的**编码方式**、**操作数形式**及**执行效果**，用于控制处理器完成各类操作
{%list%}
汇编语言使用便于阅读和编写的助记符表示机器指令，并通过汇编器转化为处理器能够执行的机器码
{%endlist%}
{%right%}
从语法和用途上看，汇编源文件通常包含标签、伪指令、数据定义、汇编器指令和处理器指令等内容
{%endright%}
>**标签**：用于指示**代码或数据所在位置**，便于**分支**、**函数调用**和**数据访问**，如`_start:`

>**伪指令**：一种**没有独立机器指令编码**的便捷写法，汇编器会将其转换成**一条或多条实际指令**，如`LDR`

>**数据定义**：用于在目标文件中生成**常量**、**字符串**、**数组**或**预留存储空间**，如`.space`

>**汇编器指令**：用于控制汇编器如何**组织代码**、**数据**和**符号**等内容，本身不由处理器执行，如`.text`

>**处理器指令**：处理器能够**直接执行**的指令，经过汇编后会生成**对应的二进制指令编码**，如`ADD`
{%warning%}
操作数形式不同，助记符可能具有不同含义，如LDR R0, [R1]是处理器指令，而LDR R0, =value是伪指令
{%endwarning%}
{%wrong%}
如果在代码路径中插入.word等数据而没有使用分支跳过，其可能被当作指令执行，导致程序异常
{%endwrong%}
**②指令**
>**概述**：`Arm`**指令格式**可抽象为`指令助记符{后缀或限定符} 操作数列表`，`{}`表示**可选项**
{%list%}
指令助记符表示操作类型，操作数可以是寄存器、立即数、内存地址或标签，具体数量和形式取决于指令
{%endlist%}
{%right%}
指令后缀用于设置条件执行、标志更新或数据处理方式，限定符用于指定编码宽度或操作数组织形式
{%endright%}
>`S`后缀表示指令执行后更新相应的`N/Z/C/V`**条件标志**，有些指令如`CMP`无需`S`也会更新条件标志

>**条件后缀**表示指令会根据`N/Z/C/V`条件标志决定是否执行，如`EQ`表示`Z=1`时执行

>`T32`某些指令同时存在`16`位和`32`位编码，可以使用**宽度限定符**，`.N/.W`表示使用`16/32`位编码
{%warning%}
后缀和限定符没有一套适用于所有Arm指令的固定组合，必须以目标指令集和对应指令的语法说明为准
{%endwarning%}
>如`A32`大部分指令都可以直接添加**条件后缀**，而`T32`的某些指令**的条件执行**需要配合`IT`块

>`A64`条件分支需要使用**点号形式**如`B.EQ`，且部分指令将**条件码作为操作数**如`CSEL X0, X1, X2, EQ`

**③操作数**
>**概述**：操作数是指令的处理对象，可以提供**输入数据**、**保存结果**、**计算内存地址**或**指定程序跳转目标**
{%list%}
操作数主要可以分为寄存器操作数、立即数操作数、内存地址操作数和标签操作数等
{%endlist%}
>**寄存器操作数**：表示数据存放在**寄存器**中，如`ADD R0, R1, R2`

>**立即数操作数**：表示直接写在指令中的**常量**，通常以`#`开头，如`MOVS R0, #10`

>**内存地址操作数**：表示数据存放在对应的**内存**中，通常使用**方括号**，如`LDR R0, [R1]`

>**标签操作数**：使用**符号名称**表示代码或数据的位置，如`B loop`
{%right%}
部分指令允许先对寄存器值进行移位，再将结果参与运算，类似地内存地址操作数也可以进行偏移等操作
{%endright%}
{%warning%}
寄存器范围、立即数大小和内存寻址形式都会受到目标指令集及具体指令编码的限制
{%endwarning%}
>对于`A32`中的部分数据处理指令，立即数采用`12`位编码，由`8`位**常数**和`4`位**旋转量**组成

>`8`位常数首先扩展为`32`位，再**循环右移旋转量两倍**的位数

>例如`0x23000000`可以由`0x00000023`循环右移`8`位得到，此时编码中的旋转量为`4`

**④内存寻址**
>**概述**：用于计算**加载和存储指令**实际访问的内存地址，通常由**基址寄存器**、**偏移量**和**写回方式**共同决定
{%list%}
常见寻址方式有基址寻址、立即数偏移、寄存器偏移、缩放寄存器偏移、前变址和后变址等，如下所示
{%endlist%}
{%right%}
在A32/T32的部分加载指令中，还可以使用PC作为基址进行相对寻址，以访问代码附近的常量或只读数据
{%endright%}
{%warning%}
地址偏移量通常以字节为单位，其取值范围、可用寄存器和移位方式受具体指令及指令编码限制
{%endwarning%}

```arm-gas
;基址寻址：直接将基址寄存器中的值作为内存地址
LDR R0, [R1]                ; R0 = memory[R1]

;立即数偏移寻址：将基址寄存器与立即数偏移相加得到内存地址
LDR R0, [R1, #4]            ; R0 = memory[R1 + 4]
LDR R0, [R1, #-4]           ; R0 = memory[R1 - 4]

;寄存器偏移寻址：将基址寄存器与偏移寄存器相加得到内存地址
LDR R0, [R1, R2]            ; R0 = memory[R1 + R2]

;缩放寄存器偏移寻址：先对偏移寄存器进行移位，再与基址寄存器相加
LDR R0, [R1, R2, LSL #2]    ; R0 = memory[R1 + R2 * 4]

;前变址寻址：先计算新地址并写回基址寄存器，再使用新地址访问内存
LDR R0, [R1, #4]!           ; R1 = R1 + 4 随后 R0 = memory[R1]

;后变址寻址：先使用原基址访问内存，再更新基址寄存器
LDR R0, [R1], #4            ; R0 = memory[R1] 随后 R1 = R1 + 4

;多寄存器寻址：从连续内存中加载多个寄存器，或者将多个寄存器保存到连续内存中
LDMIA R0!, {R1-R4}           ; 连续加载多个寄存器
STMIA R0!, {R1-R4}           ; 连续存储多个寄存器
PUSH  {R4-R7, LR}            ; 将多个寄存器压入栈
POP   {R4-R7, PC}            ; 从栈中恢复多个寄存器
```
**⑤`Hello Arm`**
>**概述**：以下分别通过`Linux`**系统调用**和`C`**标准库**输出`Hello Arm!`，面向`32`位`AArch32 Linux`环境
{%list%}
程序主要由只读数据段和代码段组成，前者保存字符串，后者保存处理器指令
{%endlist%}
{%right%}
如果需要使用C库，程序入口点需要使用main而不是_start，C运行时库会完成环境初始化并调用该程序
{%endright%}
{%warning%}
函数调用会改写LR，需要返回的函数必须保存返回地址，并在公共函数调用边界保持SP按8字节对齐
{%endwarning%}
{%wrong%}
系统调用编号与ABI相关，将本例直接用于AArch64或裸机环境会导致程序无法运行
{%endwrong%}
```bash
# 运行系统调用版本
sudo apt update
sudo apt install gcc-arm-linux-gnueabihf \
    binutils-arm-linux-gnueabihf \
    libc6-dev-armhf-cross \
    qemu-user
arm-linux-gnueabihf-as -o hello.o hello.s
arm-linux-gnueabihf-ld -e _start -o hello hello.o
qemu-arm ./hello

# 运行 C 标准库版本
arm-linux-gnueabihf-gcc -static -no-pie -o hello_c hello_c.s
qemu-arm ./hello_c
```
```arm-gas
@ 系统调用版本
.syntax unified
.arch armv7-a
.arm

.section .rodata
msg:
    .ascii "Hello Arm!\n"
.equ len, . - msg

.section .text
.global _start
.type _start, %function

_start:
    @ write(1, msg, len)
    MOV R0, #1
    LDR R1, =msg
    MOV R2, #len
    MOV R7, #4
    SVC #0

    @ exit(0)
    MOV R0, #0
    MOV R7, #1
    SVC #0

.size _start, . - _start

.section .note.GNU-stack,"",%progbits
```
```arm-gas
@ C库版本
.syntax unified
.arch armv7-a
.arm

.section .rodata
msg:
    .asciz "Hello Arm!"

.section .text
.global main
.type main, %function
.extern puts

main:
    @ 同时保存R4和LR，使SP仍保持8字节对齐
    PUSH {R4, LR}

    @ puts("Hello Arm!")
    LDR R0, =msg
    BL puts

    @ main返回0
    MOV R0, #0
    POP {R4, PC}

.size main, . - main

.section .note.GNU-stack,"",%progbits
```


