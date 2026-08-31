---
title: RISC-V体系架构（一）
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
  - RISC-V体系架构
categories: 处理器架构
keywords: RISC-V体系架构（一）, RISC-V体系架构, 处理器架构
updated: ''
img: /medias/featureimages/16.webp
date: 2026-07-27 16:07:18
summary: RISC-V体系架构简介
---
# 处理器架构
## ARM体系架构
### ARM体系架构（一）
#### 1.引言
**①简介**
>**概述**：一种基于**精简指令集**的处理器架构设计，强调**指令简单**、**执行高效**和**低功效**


主要可分为`Cortex-A`、`Cortex-R`和`Cortex-M`三种系列
{%list%}
Cortex-M定位为微控制器，功耗、成本和体积都非常小，常用于物联网设备，后续主要关注该系列
{%endlist%}
>`Cortex-M`只支持`MPU`，即只提供**内存区域保护**而不能提供**虚拟地址到物理地址的转换**
{%right%}
Cortex-A定位为高性能应用处理器，支持MMU和多核从而运行复杂的操作系统，常用于智能手机等复杂设备
{%endright%}
>此外还有`Cortex-X`系列，可以理解为`Cortex-A`的定制升级版，但是牺牲了**功耗和芯片面积**来换取**绝对性能**
{%warning%}
Cortex-R定位为高性能实时处理器，响应速度极快且可靠性较高，常用于对安全性和实时性要求极高的领域如航天
{%endwarning%}
**②指令集**
>**概述**：主要可分为`ARM`、`Thumb`、`Thumb-2`和`A64`这几种指令集，这里主要关注前三者即`AArch32`
{%list%}
ARM/Thumb为32/16或32位定长指令集，前者功能最全且性能最高，后者代码优势为密度较低即占用内存较少
{%endlist%}
{%right%}
Thumb-2在Thumb的基础上引入了大量32位指令，完美结合了Thumb指令集的高代码密度和ARM指令集的高性能
{%endright%}
>`Thumb-2`指令集在`Cortex-M`系列中是**默认且唯一**的选择，且该指令集**向后兼容**`Thumb`
{%warning%}
A64为32位定长指令集，但是操作的是64位宽度的地址、数据和寄存器，从而访问远大于4GB的内存地址空间
{%endwarning%}
{%wrong%}
如果在Cortex-M中试图执行ARM指令，会触发硬件故障异常
{%endwrong%}
**③指令集切换**
>**概述**：`Cortex-A`和`Cortex-R`支持`ARM`和`Thumb/Thumb-2`多种指令集，需要根据应用场景**切换指令集**
{%list%}
ARM架构通过修改程序计数器最低有效位切换指令集，若其为0/1，表示后续使用ARM/Thumb和Thumb-2指令集
{%endlist%}
{%right%}
因为ARM架构指令集都是16位或32位对齐的即地址最低有效位为0，所以可以使用该位作为指令的切换标志位
{%endright%}
{%warning%}
Cortex-A和Cortex-R在发生异常时，都会自动切换到ARM指令集再去执行异常处理程序
{%endwarning%}
{%wrong%}
对于AArch64架构只支持A64指令集或者Cortex-M系列只支持Thumb-2指令集的情况，是不存在指令集切换的
{%endwrong%}
#### 2.寄存器
**①经典ARM架构**
>**概述**：可分为**通用寄存器**`R0-R12`、**堆栈寄存器**`SP`、**链接寄存器**`LR`、**程序计数器**`PC`和**程序状态寄存器**`xPSR`
{%list%}
经典ARM架构有如下七种处理器模式，其中用户模式处于用户态，其余模式处于特权态
{%endlist%}
{%right%}
每个异常模式都有备份的SP、LR和SPSR寄存器，且快中断模式还有部分备份的通用寄存器，以加速/省略保存现场
{%endright%}
>备份的`SP`可以确保其有**独立的栈空间**，备份的`LR`确保发生**嵌套中断**时返回地址被覆盖

>`SPSR`用于保存**发生异常时**的`CPSR`，异常结束执行返回指令时，处理器会根据`SPSR`的内容**自动恢复**`CPSR`
{%warning%}
绝大多数16位Thumb指令只能访问R0-R7，只有很少的Thumb指令可以访问R8-R12，32位的指令则不受该限制
{%endwarning%}
{%wrong%}
用户态需要通过异常切换到特权态，因为其不能修改CPSR，特权态之间可以模拟异常返回流程相互切换
{%endwrong%}
**②`Cortex-M`**
>**概述**：`Cortex-M`相较于**经典ARM架构**更加简洁，没有**备份寄存器**但是引入了`CONTROL`等**特殊功能寄存器**
{%list%}
Cortex-M只有异常模式和线程模式两种处理器模式，前者一直处于特权态，后者可以是用户态也可以是特权态
{%endlist%}
>`SP`分为`MSP`和`PSP`，触发异常进入**异常模式**时使用`MSP`，返回**线程模式**时需要根据**异常返回值**使用`MSP`或`PSP`

>`xPSR`可分为`APSR`、`IPSR`和`EPSR`三个子寄存器，分别记录**算术运算单元**、**中断相关**和**所处指令集**状态

>`CONTROL`的`D1`位用于控制**堆栈指针选择**，`D0`位用于控制**特权态和用户态**的选择，其余位保留
{%right%}
上电复位后，Cortex-M处理器处于特权态线程模式且使用MSP，需要主动修改CONTROL寄存器才能进入用户态
{%endright%}
{%warning%}
BASEPRI、PRIMASK和FAULTMASK为中断屏蔽寄存器，通常使用BASEPRI屏蔽低于或等于某个优先级的中断
{%endwarning%}

**③过程调用标准**
>**概述**：`Cortex-M`要求**调用者**保存`R0-R3`、`R12`和`LR`，**被调用者**保存`R4-R11`，详细如下所示
{%list%}
函数调用过程中使用R0-R3传递参数，R0-R1传递返回值，如果对应寄存器空间不足则使用栈空间
{%endlist%}
{%right%}
使用高级语言如C时，编译器会自动遵循该标准，而使用汇编和C交互时，我们编写汇编函数时必须遵循该标准
{%endright%}
{%warning%}
如果调用者在函数调用后还需要使用R0-R3等，需要提前保存，同理如果函数需要使用R4-R11，也需要提前保存
{%endwarning%}
```riscv
;; 主程序（调用者）
.syntax unified
.cpu cortex-m3
.thumb

.global _start

_start:
    ; 设置栈指针（通常在启动代码中完成，这里模拟）
    LDR SP, =stack_top

    ; 1. 准备参数：前4个通过 R0-R3 传递
    MOVS R0, #1      ; 第一个参数 a = 1
    MOVS R1, #2      ; 第二个参数 b = 2  
    MOVS R2, #3      ; 第三个参数 c = 3
    MOVS R3, #4      ; 第四个参数 d = 4
    
    ; 2. 第5个参数通过栈传递
    MOVS R4, #5
    PUSH {R4}        ; 将第5个参数 e = 5 压栈

    ; 3. 调用函数
    BL calculate
    
    ; 4. 清理栈空间（移除之前压栈的参数）
    ADD SP, SP, #4   ; 栈指针调整，清理一个参数（4字节）
    
    ; 5. 此时 R0 中包含返回值，可以继续使用
    ; 这里我们简单地进入无限循环
end_loop:
    B end_loop

;; calculate 函数（被调用者）
;; 函数原型：int calculate(int a, int b, int c, int d, int e);
;; 参数：
;;   R0 = a, R1 = b, R2 = c, R3 = d, [SP] = e
;; 返回值：R0 = 计算结果
.thumb_func
calculate:
    ; === 函数开场 ===
    ; 1. 保存需要使用的被调用者保存寄存器
    PUSH {R4-R6, LR}   ; 保存 R4,R5,R6 和返回地址(LR)
    
    ; === 函数体 ===
    ; 2. 从栈中获取第5个参数 e
    LDR R4, [SP, #16]  ; SP + 16 指向第5个参数（R4-R6,LR 各占4字节）
    
    ; 3. 使用需要保存的寄存器进行计算
    ; 计算: result = (a + b) * (c + d) + e
    ADD R5, R0, R1     ; R5 = a + b  (使用R5，已在开场保存)
    ADD R6, R2, R3     ; R6 = c + d  (使用R6，已在开场保存)
    MUL R5, R6, R5     ; R5 = (a+b) * (c+d)
    ADD R0, R5, R4     ; R0 = 结果 + e，同时准备返回值
    
    ; === 函数收场 ===
    ; 4. 恢复保存的寄存器
    POP {R4-R6, PC}    ; 恢复 R4,R5,R6，并将LR弹出到PC中实现返回


```
#### 3.指令系统
**①指令格式**
>**概述**：`ARM`指令**标准语法格式**为`<指令助记符>{<执行条件>}{S} <目标寄存器>,<操作数>{,<第二个操作数>}`
{%list%}
<>内的项是必须的，{}内的项是可选的，其中指令助记符说明了指令的核心功能，目标寄存器用于存放结果
{%endlist%}
{%right%}
执行条件标识该指令只有在CPSR中的特定条件标志满足该条件时才会执行，是ARM架构实现高效分支的关键特性
{%endright%}
{%warning%}
S后缀标识该指令执行后需要更新CPSR中的条件标志位，但是比较指令如CMP不需要该后缀也会更新CPSR
{%endwarning%}
**②寻址方式**
>**概述**：指示指令如何获取**操作数**，可分为**立即数寻址**、**寄存器寻址**、**寄存器间接寻址**等，如下所示
{%list%}
指令的长度是有限的，所以能用于编码立即数的长度也是有限的，32位指令通常只有12位的长度用于表示立即数
{%endlist%}
{%right%}
为了表示更大范围的数，将其拆分为8位常数和4位旋转位移值，8位常数按照旋转位移值的两倍进行循环位移
{%endright%}
>如`0x23000000`可以看作一个`8`位常数`0x00000023`循环右移`8`位得到
{%warning%}
立即数有一定的限制，在使用前需要判断其是否合法，较大的数最好采用伪指令LDR Rd, =constant
{%endwarning%}
```riscv
; 1.立即数寻址：操作数是一个直接编码在指令中的常数值
MOV R0, #0xFF               ;表示R0 = 0xFF
; 2.寄存器寻址：操作数的值就是寄存器的内容
MOV R3, R4                  ;R3 = R4
; 3.寄存器间接寻址：寄存器的内容是一个内存地址，操作数位于该地址指向的内存中
LDR R0, [R1]                ;从R1中存储的地址起始处加载一个32位字到R0
; 4.基址寄存器偏移寻址：寄存器的内容是一个内存地址，但是该地址为寄存器的内容加上一个偏移量
LDR R0, [R1, #4]            ;R0 = memory[R1 + 4]
LDR R0, [R1, R2]            ;R0 = memory[R1 + R2]
LDR R0, [R1, R2, LSL #2]    ;R0 = memory[R1 + R2*4]
; 5.基址寄存器变址寻址：访问后会自动更新基址寄存器
LDR R0, [R1, #4]!           ;R0 = memory[R1 + 4]且R1 = R1 + 4
LDR R0, [R1], #4            ;R0 = memory[R1]且R1 = R1 + 4
```
**③伪指令**
>**概述**：伪指令可分为**数据定义型**、**指令替代型**和**汇编控制型**，常用伪指令如下所示
{%list%}
指令替代型伪指令可以像ARM指令一样使用，在汇编过程中会被转化为一个或多个等效的真实指令
{%endlist%}
{%right%}
汇编文件中可以使用[标签]:定义一个标签，用于标记一个位置的地址，通常用于标记函数入口和数据起始位置
{%endright%}
{%warning%}
汇编控制型伪指令本身并不生成机器码，而是控制汇编过程如代码/数据在内存中的布局和编译器的行为等
{%endwarning%}
```riscv
; 1.数据定义型：在内存中分配空间并初始化数据
.byte 0x12, 0x34, 0x56        ;在内存中存放连续的三个字节12 34 56
.hword 0x1234                 ;在内存中存放一个半字0x1234
.word label_name              ;存放一个标签的地址（长度为一个字）
.string "Hello!"              ;分配7个字节用于保存Hello!，包括结尾的\0
.space 100, 0                 ;分配100个字节，全部初始化为0
; 2.指令替代型：类似于编译器提供的语法糖
LDR Rd, =constant             ;将任意32位立即数加载到寄存器
ADR Rd, label                 ;将基于PC的一个标签的地址加载到寄存器，但是标签地址与当前PC值偏移量需要在±4095字节内
ADRL Rd, label                ;ADR的增强版，可以加载更大范围内的地址
NOP                           ;执行空操作，常用于延时、对齐代码或占位
PUSH {R0-R3,LR}               ;将寄存器R0、R1、R2、R3和LR的值，按照特定的顺序压入当前栈中
POP {R0-R3}                   ;从栈中弹出数据，恢复到寄存器R0、R1、R2和R3中
; 3.汇编控制型：控制汇编器的行为和组织程序结构
.global _start                ;声明一个全局符号_start，_start为程序入口地址
.extern main                  ;声明一个外部符号main
.section .text/.data          ;定义一个代码段（只读可执行）/已初始化数据段（可读写不可执行）
.section .bss                 ;定义一个未初始化数据段（可读写不可执行）
.section .rodata              ;定义一个只读数据段（只读不可执行）
.align 3                      ;将当前位置对其到2^3字节边界
.end                          ;标记汇编文件的结束，之后的任何内容都会被汇编器忽略
```
**④简易脚本**
>**概述**：以下为一个打印`Hello, ARM!`的汇编脚本，分别使用**系统调用**和**C标准库**，详细如下所示
{%list%}
主要由数据段和代码段组成，其中_start是ELF格式可执行文件的默认入口点，由操作系统加载器直接调用
{%endlist%}
{%right%}
如果需要使用C库，程序入口点需要使用main而不是_start，C运行时库会完成环境初始化并调用该程序
{%endright%}
{%warning%}
使用C库后程序本质上是一个被调用的函数，所以如果调用了其他函数需要将LR压入栈中保存并最后弹出给PC返回
{%endwarning%}
```riscv
;文件名： hello.s
;描述： 一个简单的ARM汇编程序，使用系统调用打印字符串并退出。
;
;

;数据段
.data
msg:
    .asciz "Hello, ARM!\n"      ;一个C风格字符串
len = . - msg                   ;字符串长度

;代码段
.text
.global _start                  ;声明全局符号_start
;主函数标签为_start，即程序入口点
_start:
    ;调用系统调用sys_write打印字符串msg
    MOV R7, #4                  ;系统调用号4（sys_write）写入R7
    MOV R0, #1                  ;文件描述符1(标准输出 stdout)
    LDR R1, =msg                ;加载msg的地址到R1
    LDR R2, =len                ;加载字符串长度len的值到R2
    SWI 0                       ;执行软中断，触发系统调用
    ;调用系统调用sys_exit退出程序
    MOV R7, #1                  ;系统调用号1（sys_exit）写入R7
    MOV R0, #0                  ;加载退出状态码0(表示成功)到R0
    SWI 0                       ;执行软中断，触发系统调用
```
```riscv
;文件名： hello_c.s
;描述： 一个简单的ARM汇编程序，调用C库函数打印字符串并退出
;编译： as -o hello_c.o hello_c.s && gcc -o hello_c hello_c.o
;运行： 

;数据段
.section .data
msg:
    .asciz "Hello, ARM!\n"      ;一个C风格字符串

;代码段
.section .text
.global main                    ;声明全局符号main
;主函数标签为main，即程序入口点
main:
    ;因为后续要使用BL会破坏LR，而该脚本是被C库调用的，后续可能需要返回，所以需要保存LR
    push {lr}                   ;将链接寄存器LR压栈保存

    ;调用C库函数printf打印字符串
    ldr r0, =msg                ;加载msg的地址到R1
    bl printf                   ;调用printf函数

    ;调用C库函数exit退出程序
    mov r0, #0                  ;加载退出状态码0到R1
    bl exit                     ;调用exit函数

    ;虽然调用了exit后该脚本不会不会返回到这里，但是如果exit调用失败，我们仍然需要返回
    pop {pc}                    @ 从栈中恢复pc（返回地址）

```
#### 4.常用指令
**①数据处理**
>**概述**：常用指令有`ADD`、`SUB`、`AND`、`ORR`、`EOR`、`BIC`和`CMP`，用于执行**算数和逻辑运算**，详细如下所示
{%list%}
比较和测试指令如CMP只设置程序状态寄存器的条件标志且并不存储结果
{%endlist%}
{%right%}
先使用比较或带S后缀的指令，再使用带执行条件的指令可实现条件分支和循环等复杂逻辑，如下所示
{%endright%}
{%warning%}
CMP Rn, Operand2完全等价于SUBS Rz, Rn, Operand2，其中Rz为没有被使用的临时寄存器
{%endwarning%}
```riscv
ADD R2, R1, R0    ;R2 = R1 + R0
SUB R2, R1, R0	  ;R2 = R1 - R0
AND R2, R1, R0	  ;R2 = R1 & R0
ORR R2, R1, R0	  ;R2 = R1 | R0
EOR R2, R1, R0	  ;R2 = R1 ^ R0
BIC R2, R1, R0    ;R2 = R1 & (~R0)
```
```riscv
;分支判断
CMP   r0, r1
BEQ   equal       ;如果 r0 == r1 则跳转 equal
BNE   not_equal   ;如果 r0 != r1 则跳转 not_equal
;短暂空循环延时
MOVS r0, #1000    ;将R0初始化为1000
delay:
SUBS r0, r0, #1   ;递减R0并设置标志位，当R0为0时，Z标志位被设置为1
BNE  delay        ;当Z为1即R0为0时，不成立，退出循环
```
**②数据读写**
>**概述**：常用指令有`MOV`、`LDR`、`STR`、`LDM`和`STM`，用于在**寄存器和内存之间**传输数据，详细如下所示
{%list%}
MOV用于读写寄存器，LDR和STR用于读写内存，LDM和STM用于批量读写内存
{%endlist%}
{%right%}
PUSH和POP为堆栈操作指令，实际上是LDM和STM的别名，但是只能用于操作SP寄存器
{%endright%}
{%warning%}
使用LDR和STR可以使用B和H后缀指示读写长度，使用LDM和STM时需要使用IA和DB后缀指示地址增长方向
{%endwarning%}
{%wrong%}
MOV只能访问R0-R15这些通用寄存器，如果需要访问特殊寄存器，需要使用MRS和MSR，如下所示
{%endwrong%}
>`Cortex-M`系列`MOV`只能访问`SP`，不能直接访问`MSP`和`PSP`
```riscv
; 1.读写寄存器
MOV R1, R0           ;R1 = R0 
MOV R1, #0x10        ;R1 = 0x10 
MRS r2, PSP          ;R2 = PSP
MSR PSP, r3          ;PSP = R2
; 2.读内存
LDR R1, [R0]         ;从R0地址起始处读32位全字到R1
LDRB R1, [R0]        ;从R0地址起始处读8位字节(零扩展)
LDRH R1, [R0]        ;从R0地址起始处读16位半字(零扩展)
LDMIA R0!, {R1-R4}   ;从R0地址连续读数据并依次写入R1,R2,R3,R4，每次写入寄存器后递增R0
LDMDB R0!, {R1-R4}   ;从R0地址连续读数据并依次写入R1,R2,R3,R4，每次写入寄存器前递减R0
POP {R0-R3, PC}      ;等价于 LDMIA SP!, {R0-R3, PC}
; 3.写内存
STR R1, [R0]         ;将R1的32位写入R0地址
STRB R1, [R0]        ;写8位字节
STRH R1, [R0]        ;写16位半字
STMIA R0!, {R1-R4}   ;将R1-R4连续写入R0地址，每次写入内存后递增R0
STMDB R0!, {R1-R4}   ;将R1-R4连续写入R0地址，每次写入内存前递减R0
PUSH {R0-R3, LR}     ;等价于 STMDB SP!, {R0-R3, LR}
```
**③分支跳转**
>**概述**：常用指令有`B`、`BL`、`BX`和`BLX`，用于改变**程序执行流程**，详细如下所示
{%list%}
B表示直接跳转，L表示跳转前会将下一条指令地址存入LR寄存器，X表示会根据跳转地址切换处理器状态
{%endlist%}
{%right%}
B指令常用于跳转和循环，BL常用于函数调用，BX常用于函数返回，BLX常用于跨指令集的函数调用
{%endright%}
{%warning%}
以label为媒介跳转的范围是有限的，但是现代工具链通常会自动将其转换为合理的格式，如下所示
{%endwarning%}
>`B far_target`可能被自动转换为`LDR r0, =far_target`和`BX r0`或者`LDR pc, =far_target`
{%wrong%}
以Rm为媒介的跳转是绝对跳转，如果代码重定位失败会导致跳转到非法位置从而引起程序崩溃
{%endwrong%}
```riscv
B label                ;直接跳转到标签处，类似于goto
BL label               ;将下一条指令地址（返回地址）存入LR寄存器，然后跳转到标签处，不会切换ARM/Thumb状态
BX Rm                  ;跳转到寄存器指定的地址（通常是LR），并根据Rm的最低位切换ARM/Thumb状态
BLX function_name/Rm   ;将下一条指令地址（返回地址）存入LR寄存器，然后跳转指定地址，并根据其最低位切换ARM/Thumb状态
```
#### 5.异常中断
**①中断处理器**
>**概述**：`Cortex-M`系列中断处理器为`NVIC`，`Cortex-A/R`系列中断处理器为`GIC`，这里主要关注前者
{%list%}
NVIC支持N个中断请求IRQ、一个不可屏蔽中断NMI、一个Systick定时器中断和多个系统异常如SVC指令
{%endlist%}
{%right%}
为了使得中断可以被CPU响应，需要分别对中断源、中断控制器和CPU进行中断使能设置
{%endright%}
{%warning%}
当发生x中断但是CPU无法响应该中断或者x中断被更高优先级的中断打断时，该中断会被暂时挂起等待CPU处理
{%endwarning%}

**②中断优先级**
>**概述**：`NVIC`将中断优先级分为**抢占优先级**和**子优先级**，需要设置**优先级分组**即这俩部分**占用的位数**，如下所示
{%list%}
当两个中断同时发生，抢占优先级高的中断先执行，若抢占优先级相同，则子优先级高的中断先执行
{%endlist%}
{%right%}
NVIC支持中断嵌套，即高抢占优先级中断可以打断低抢占优先级中断从而被CPU响应
{%endright%}
{%warning%}
中断优先级数值越小，优先级越高，且执行过程中只能设置一次中断分组，通常在系统初始化函数/主函数中被调用
{%endwarning%}
```c
/*
* STM32F103的中断分组配置 
* 配置中断优先级分组：抢占优先级和子优先级
* 形参如下：
* @arg NVIC_PriorityGroup_0:        0 bit  for 抢占优先级
*                                   4 bits for 子优先级
* @arg NVIC_PriorityGroup_1:        1 bit  for 抢占优先级
*                                   3 bits for 子优先级
* @arg NVIC_PriorityGroup_2:        2 bits for 抢占优先级
*                                   2 bits for 子优先级
* @arg NVIC_PriorityGroup_3:        3 bits for 抢占优先级
*                                   1 bit  for 子优先级
* @arg NVIC_PriorityGroup_4:        4 bits for 抢占优先级
*                                   0 bit  for 子优先级
* @ 注意 如果优先级分组为 0，则抢占优先级就不存在，优先级就全部由子优先级控制
*/
void NVIC_PriorityGroupConfig(uint32_t NVIC_PriorityGroup)
{
    /* 检查参数*/
    assert_param(IS_NVIC_PRIORITY_GROUP(NVIC_PriorityGroup));
    /* 设置优先级分组*/ 
    SCB->AIRCR = AIRCR_VECTKEY_MASK | NVIC_PriorityGroup;
}

```
**③中断响应流程**
>**概述**：中断被响应后，`NVIC`**自动保存上下文**，并跳转到对应的**中断服务程序**运行，异常返回时**自动恢复上下文**
{%list%}
进入ISR前，NCIC会自动保存上下文到栈中即R0-R3、R12、LR、PC和xPSR，并更新xPSR的IPSR为当前异常号
{%endlist%}
{%right%}
进入ISR前，LR会根据发生异常时的状态被更新为一个特殊值，用于指示返回时使用的栈指针和处理器模式
{%endright%}
{%warning%}
进入ISR前，会强制切换到异常处理模式并使用MSP，异常返回时根据LR的值返回到原来的状态
{%endwarning%}
```c
/* 任务函数 */
void thread_task(void) {
    while(1) {
        // 1. 线程模式下运行，使用PSP
        int x = calculate();
        
        // 2. 此时 UART 中断发生
        // 3. 硬件自动完成以下操作：
        //    - 保存 R0-R3,R12,LR,PC,xPSR 到 PSP 栈
        //    - 切换 SP 到 MSP
        //    - 切换为处理器模式
        //    - 更新 IPSR = UART_IRQn
        //    - LR = 0xFFFFFFED（因为从线程模式+PSP进入）
        //    - 跳转到 UART_IRQHandler
    }
}

/* 中断服务程序 */
void UART_IRQHandler(void) {
    // 4. 执行到这里时，已经处于：
    //    - 处理器模式 ✓
    //    - 使用 MSP ✓
    //    - LR = 0xFFFFFFED ✓
    
    // 5. 处理中断
    uint8_t data = UART->DR;
    
    // 6. 返回时，执行 BX LR
    //    硬件看到 LR=0xFFFFFFED，知道要：
    //    - 恢复之前保存的寄存器
    //    - 切换回线程模式
    //    - 切换回 PSP
    //    - 从之前的位置继续执行
}
```