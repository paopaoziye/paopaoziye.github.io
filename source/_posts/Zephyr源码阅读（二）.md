---
title: Zephyr源码阅读（二）
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
  - RTOS
  - Zephyr
categories: RTOS
keywords: Zephyr源码阅读（二）, RTOS, Zephyr
updated: ''
img: /medias/featureimages/37.webp
date: 2026-07-21 22:45:51
summary: 启动流程
---
# RTOS
## Zephyr源码阅读（二）
### 启动流程
**①引言**
>**概述**：本文以`STM32F407VET6`为例探索`Zephyr`的**启动流程**，大致如下所示
{%list%}
硬件复位后，Zephyr依次建立处理器环境、C 运行环境和内核线程环境，并完成各级驱动与系统初始化
{%endlist%}
{%right%}
启动过程中PSP和MSP的指向变化如下所示，最终PSP指向线程栈，MSP指向中断栈
{%endright%}
{%warning%}
z_arm_reset可以调用部分受控的C函数，直到z_prep_c才真正建立C运行环境
{%endwarning%}
![Zephyr启动流程](/image/Zephyr_2.png)
![Zephyr栈指针变化](/image/Zephyr_4.png)
**②上电复位**
>**概述**：`STM32F407VET6`上电后通常会从`0x08000000`处读取`MSP`并跳转到`0x08000004`指向地址
{%list%}
CMake脚本和链接脚本如下所示，向量表vector_table.S的编译产物最终会被置于0x08000000
{%endlist%}
{%right%}
vector_table.S如下所示，易知使用了Zephyr的STM32F407VET6的复位向量为z_arm_reset
{%endright%}
{%warning%}
使用了MCUboot、非零加载偏移或代码分区时，以上结论不一定成立
{%endwarning%}
```cmake
# 位于zephyr/arch/arm/core/CMakeLists.txt
# 由于当前 STM32F407 构建没有启用 CONFIG_ARM_ZIMAGE_HEADER，所以进入 else 分支
# zephyr_linker_sources(ROM_START SORT_KEY 0x0vectors vector_table.ld)表示将 vector_table.ld 注册到 ROM_START 链接区域
# ROM_START 链接区域对应 rom_start 输出节，后续 Zephyr 的主链接脚本会将 rom_start 输出节放在 Flash 起始地址 0x08000000
# Cortex-M 主链接脚本位于zephyr\include\zephyr\arch\arm\cortex_m\scripts\linker.ld
if(CONFIG_ARM_ZIMAGE_HEADER)
zephyr_linker_sources(ROM_START SORT_KEY 0x0vectors zimage_header.ld)
zephyr_linker_sources(ROM_START SORT_KEY 0x1vectors vector_table.ld)
zephyr_linker_sources(ROM_START SORT_KEY 0x2vectors cortex_m/vector_table_pad.ld)
else()
zephyr_linker_sources(ROM_START SORT_KEY 0x0vectors vector_table.ld)
zephyr_linker_sources(ROM_START SORT_KEY 0x1vectors cortex_m/vector_table_pad.ld)
endif()
```
```ld
/* 位于zephyr/arch/arm/core/vector_table.ld */
/* 将向量表起始地址保存为链接符号 _vector_start */
/* 从所有目标文件中收集以 .exc_vector_table 以及以 .exc_vector_table. 开头的输入节，并将其放到当前位置 */
/* 编译后 vector_table.S 产生输入节 .exc_vector_table._vector_table_section，正好被匹配 */
_vector_start = .;
KEEP(*(.exc_vector_table))
KEEP(*(".exc_vector_table.*"))

#if LINKER_ZEPHYR_FINAL && defined(CONFIG_ISR_TABLES_LOCAL_DECLARATION)
INCLUDE isr_tables_vt.ld
#else
KEEP(*(.vectors))
#endif

#ifdef CONFIG_CPU_AARCH32_CORTEX_R
KEEP(*(._bindesc_entry.*))
#endif

_vector_end = .;
```
```arm-gas
; 位于zephyr/arch/arm/core/cortex_m/vector_table.S
#include <zephyr/toolchain.h>
#include <zephyr/linker/sections.h>
#include "vector_table.h"

; 生成当前工具链需要的汇编文件前导信息
_ASM_FILE_PROLOGUE

; 告诉 ARM 工具链代码会保持 ABI 要求的栈对齐
.eabi_attribute Tag_ABI_align_preserved, 1

; 声明全局数据符号 z_main_stack，该栈实际在其他源码中定义
GDATA(z_main_stack)

; 创建输入节.exc_vector_table._vector_table_section，并定义全局符号 _vector_table
SECTION_SUBSEC_FUNC(exc_vector_table,_vector_table_section,_vector_table)

    ; 向量表第一个位置保存主栈栈顶地址
    .word z_main_stack + CONFIG_MAIN_STACK_SIZE

    ; 向量表第二个位置保存 z_arm_reset 的地址
    .word z_arm_reset
```

**③`z_arm_reset`**
>**概述**：负责建立`Cortex‑M`的早期运行环境，设置`MSP`和`PSP`，随后**屏蔽普通中断**最后跳转到`z_prep_c`
{%list%}
该函数主要是将Cortex‑M从复位后的不确定状态整理成Zephyr可以继续启动的早期运行环境
{%endlist%}
{%right%}
MPU栈保护会在栈中预留一段保护区域以检测栈溢出，栈填充会在栈中填充魔术字0xAA便于计算栈用量
{%endright%}
{%warning%}
启动早期需要屏蔽中断，因为中断系统尚未完全初始化，若进入ISR，可能会访问无效数据或破坏栈等
{%endwarning%}
>`MSP`此时还指向`z_main_stack`，而`Zephyr`希望中断栈为`z_interrupt_stacks`

>**运行时中断向量表**、`NVIC`和**外设驱动**等尚未配置，`ISR`此时访问设备可能产生错误

>`Zephyr`内核状态尚未建立，`ISR`若调用内核`API`或触发调度会有风险

>`.bss`段还没有清零，`.data`段还没有复制，`ISR`使用的**全局变量**可能无效
```arm-gas
; 位于zephyr/arch/arm/core/cortex_m/reset.S
; 在 .text._reset_section 中定义函数符号 z_arm_reset
SECTION_SUBSEC_FUNC(TEXT,_reset_section,z_arm_reset)

; 在相同的位置定义另一个入口符号 __start
SECTION_SUBSEC_FUNC(TEXT,_reset_section,__start)

; 如果启用了启动时架构硬件初始化，则清零 CONTROL：
; 进入特权线程模式、选择 MSP，并清除其他 CONTROL 状态位
; 执行 ISB，确保 CONTROL 的修改对后续指令立即生效
#if defined(CONFIG_INIT_ARCH_HW_AT_BOOT)
    movs.n r0, #0
    msr CONTROL, r0
    isb
; 如果 CPU 支持栈指针限制寄存器，则清除 MSP 和 PSP 的栈边界限制
#if defined(CONFIG_CPU_CORTEX_M_HAS_SPLIM)
    movs.n r0, #0
    msr MSPLIM, r0
    msr PSPLIM, r0
#endif
#endif

; 如果 SoC 提供超早期复位钩子，则调用对应钩子函数，此时栈和 RAM 尚未准备好
#if defined(CONFIG_SOC_EARLY_RESET_HOOK)
    bl soc_early_reset_hook
#endif

; 如果启用了 Suspend-to-RAM，则临时将 MSP 指向中断栈为休眠恢复检查函数提供可用栈
; 然后调用 arch_pm_s2ram_resume 尝试恢复休眠前的 CPU 上下文继续执行
; Suspend-to-RAM 指 CPU 和大部分外设停止工作，但 RAM 继续供电，以保留系统运行状态
#if defined(CONFIG_PM_S2RAM)
    ldr r0, =z_interrupt_stacks + CONFIG_ISR_STACK_SIZE + MPU_GUARD_ALIGN_AND_SIZE
    msr msp, r0

    bl arch_pm_s2ram_resume
#endif
    
    ; 重新将 z_main_stack 的栈顶地址赋予 MSP
    ldr r0, =z_main_stack + CONFIG_MAIN_STACK_SIZE
    msr msp, r0

; 如果启用了线程调试信息，则将 z_sys_post_kernel 清零告诉 RTOS 感知调试器系统目前仍处于内核启动阶段
#if defined(CONFIG_DEBUG_THREAD_INFO)
    movs.n r0, #0
    ldr r1, =z_sys_post_kernel
    strb r0, [r1]
#endif

; 如果 SoC 提供普通复位钩子，则调用对应钩子函数
#if defined(CONFIG_SOC_RESET_HOOK)
    bl soc_reset_hook
#endif

; 如果启用了启动时初始化架构硬件
; 如果 CPU 带有 ARM MPU 则先关闭 MPU，清除 bootloader、调试器或前一个程序可能遗留的内存访问限制
; 调用 z_arm_init_arch_hw_at_boot 初始化 Cortex‑M 核心寄存器和系统控制模块
#if defined(CONFIG_INIT_ARCH_HW_AT_BOOT)
#if defined(CONFIG_CPU_HAS_ARM_MPU)
    movs.n r0, #0
    ldr r1, =_SCS_MPU_CTRL
    str r0, [r1]
    dsb
#endif 
    bl z_arm_init_arch_hw_at_boot
#endif

; 如果是 ARMv6‑M 或 ARMv8‑M Baseline 则启用 PRIMASK 屏蔽所有可屏蔽中断（除了 NMI 和 HardFault 中断）
; 如果是 ARMv7‑M 或 ARMv8‑M Mainline 则启用 BASEPRI 屏蔽优先级数值大于等于 _EXC_IRQ_DEFAULT_PRIO 的中断
; 如果两种架构都不匹配，则进入错误分支
#if defined(CONFIG_ARMV6_M_ARMV8_M_BASELINE)
    cpsid i
#elif defined(CONFIG_ARMV7_M_ARMV8_M_MAINLINE)
    movs.n r0, #_EXC_IRQ_DEFAULT_PRIO
    msr BASEPRI, r0
#else
#error Unknown ARM architecture
#endif

; 如果要求启动阶段初始化看门狗，则调用板级 ARM 看门狗初始化函数
#ifdef CONFIG_WDOG_INIT
    bl z_arm_watchdog_init
#endif

; 如果启用了栈初始化，则使用 0xAA 填充中断栈区域便于后续检测栈使用量和栈溢出
#ifdef CONFIG_INIT_STACKS
    ldr r0, =z_interrupt_stacks
    ldr r1, =0xaa
    ldr r2, =CONFIG_ISR_STACK_SIZE + MPU_GUARD_ALIGN_AND_SIZE
    bl arch_early_memset
#endif

    ; 将中断栈顶部地址赋予 PSP
    ldr r0, =z_interrupt_stacks
    ldr r1, =CONFIG_ISR_STACK_SIZE + MPU_GUARD_ALIGN_AND_SIZE
    adds r0, r0, r1
    msr PSP, r0

    ; 修改 CONTROL 寄存器，让线程模式的栈指针使用 PSP
    mrs r0, CONTROL
    movs r1, #(2 | CONTROL_ARM_PAC_MASK | CONTROL_ARM_BTI_MASK)
    orrs r0, r1 /* CONTROL_SPSEL_Msk */
    msr CONTROL, r0

    ; 刷新指令流水线确保后续指令使用新的栈指针配置
    isb

    ; 跳转到 z_prep_c 进行 C 环境的初始化，此时 cortex M 内核的状态为特权级、线程模式、使用 PSP 且普通可配置中断被屏蔽
    bl z_prep_c
```
**④`z_prep_c`**
>**概述**：负责建立完整的`C`**运行环境**即`.bss`段和`.data`段并初始化**向量表**、**中断控制器**和**某些硬件**
{%list%}
SRAM向量表即把原本位于Flash的中断向量表复制到SRAM，并使VTOR寄存器指向SRAM中的副本
{%endlist%}
{%right%}
SRAM可写，可在运行时修改中断入口，便于运行时修改向量项和进行向量表重定位
{%endright%}
{%warning%}
如果不初始化BSS段和DATA段，访问普通全局变量会得到随机值导致程序行为不符合预期
{%endwarning%}
```c
/* 位于zephyr/arch/arm/core/cortex_m/prep_c.c */
/* 建立完整的C运行环境并初始化向量表、中断控制器和 FPU 等硬件 */
FUNC_NORETURN void z_prep_c(void)
{
	/* 调用平台或 SoC 的早期准备钩子 */
	soc_prep_hook();

	/* 设置 VTOR 寄存器即向量表地址，如果启用了 SRAM 向量表，则先将 Flash 中的向量表复制到 SRAM 再设置 VTOR 寄存器 */
	relocate_vector_table();

/* 初始化浮点硬件状态，若开放了 FPU 访问权限，该函数会配置 CPACR 启动 FPU 的硬件访问权限 */
#if defined(CONFIG_CPU_HAS_FPU)
	z_arm_floating_point_init();
#endif

    /* 将 BSS 段清零 */
	arch_bss_zero();

	/* 在 XIP 构建中，将 DATA 段初始值从 Flash 复制到 RAM */
	arch_data_copy();

/* 中断控制器初始化，如果为 Cortex-M 标准内核，则调用 z_arm_interrupt_init，反之调用 z_soc_irq_init */
#if defined(CONFIG_ARM_CUSTOM_INTERRUPT_CONTROLLER)
	z_soc_irq_init();
#else
	z_arm_interrupt_init();
#endif

/* 初始化架构 Cache */
#if CONFIG_ARCH_CACHE
	arch_cache_init();
#endif

/* 使用 DWT 启用空指针访问检测 */
#ifdef CONFIG_NULL_POINTER_EXCEPTION_DETECTION_DWT
	z_arm_debug_enable_null_pointer_detection();
#endif

    /* 调用 z_cstart，进入 Zephyr 内核初始化阶段 */
	z_cstart();

    /* z_cstart 正常不会返回 */
	CODE_UNREACHABLE;
}
```
**⑤`z_cstart`**
>**概述**：负责完成`Zephyr`**内核**、**设备**和**线程系统**等的早期初始化，并最终切换到`z_main_thread`线程
{%list%}
Zephyr的初始化系统本质上是一个编译时注册、链接时排序、启动时依次执行的机制，如下图所示
{%endlist%}
{%right%}
Zephyr的系统和设备共用一套初始化机制，只是前者对应init_entry结构体的dev成员为空
{%endright%}
{%warning%}
每个级别内部初始化项会按照优先级大小排列，其优先级数值越小，初始化越早
{%endwarning%}
```c
/* 位于zephyr/kernel/init.c */
/* 负责完成 Zephyr 内核启动所需的分级初始化和多线程环境准备，并将执行流切换到主线程 */
__boot_func FUNC_NO_STACK_PROTECTOR FUNC_NORETURN void z_cstart(void)
{
	/* gcov 覆盖率统计相关初始化 */
	gcov_static_init();

	/* 执行所有 INIT_LEVEL_EARLY 级别的初始化函数， */
	z_sys_init_run_level(INIT_LEVEL_EARLY);

	/* 架构相关初始化 */
	arch_kernel_init();

	/* 初始化日志功能 */
	LOG_CORE_INIT();

/* 如果启用了多线程，则先创建一个dummy thread，该线程不会被加入就绪队列 */
/* dummy thread 为首次上下文切换提供一个可保存但随后会被丢弃的当前线程上下文*/
#if defined(CONFIG_MULTITHREADING)
	z_dummy_thread_init(&_thread_dummy);
#endif

	/* 给所有静态 device 对象做内核对象层面的初始化 */
	z_device_state_init();

	/* 留给 SOC 和 board 的早期初始化钩子函数，允许 SOC 和 board 在内核初始化过程中执行特定的初始化操作 */
	soc_early_init_hook();
	board_early_init_hook();

	/* 执行所有 INIT_LEVEL_PRE_KERNEL_1 级别初始化函数 */
	z_sys_init_run_level(INIT_LEVEL_PRE_KERNEL_1);

/* 如果启用了对称多处理（SMP），则进行 SMP 初始化 */
#if defined(CONFIG_SMP)
	arch_smp_init();
#endif

	/* 执行所有 INIT_LEVEL_PRE_KERNEL_2 级别的初始化函数 */
	z_sys_init_run_level(INIT_LEVEL_PRE_KERNEL_2);

/* 如果启用了编译器栈保护，则生成随机的栈 Canary 用于检测函数栈帧被覆盖 */
#ifdef CONFIG_REQUIRES_STACK_CANARIES
	uintptr_t stack_guard;

	z_early_rand_get((uint8_t *)&stack_guard, sizeof(stack_guard));
	__stack_chk_guard = stack_guard;
	__stack_chk_guard <<= 8;
#endif

/* 如果配置要求 boot 阶段就能使用 timing API，则在这里初始化并启动 timing 子系统 */
#ifdef CONFIG_TIMING_FUNCTIONS_NEED_AT_BOOT
	timing_init();
	timing_start();
#endif

/* 如果启用了多线程，则调用 prepare_multithreading 函数初始化多线程环境，随后调用 switch_to_main_thread 切换到 z_main_thread 线程执行 */
/* 如果没有启用多线程，则直接调用 bg_thread_main 函数执行内核的后台线程逻辑 */
#ifdef CONFIG_MULTITHREADING
	switch_to_main_thread(prepare_multithreading());
#else
/* 如果某些CPU架构要求没有多线程时，需要使用某种架构专用方式切换栈、设置上下文、调整执行状态再进入 bg_thread_main 则进入这个分支 */
#ifdef ARCH_SWITCH_TO_MAIN_NO_MULTITHREADING
	ARCH_SWITCH_TO_MAIN_NO_MULTITHREADING(bg_thread_main, NULL, NULL, NULL);
#else
	/* 调用 bg_thread_main 函数进入 main 函数，不存在线程概念 */
	bg_thread_main(NULL, NULL, NULL);

	/* bg_thread_main返回后，关闭中断并停留在无限循环中，避免启动入口继续执行不存在的后续流程 */
	irq_lock();
	while (true) {
	}
#endif
#endif
	/* 告诉编译器理论上执行流永远不会到达这里 */
	CODE_UNREACHABLE;
}
```
![Zephyr初始化流程](/image/Zephyr_3.png)
**⑥`bg_thread_main`**
>**概述**：完成`POST_KERNEL`和`APPLICATION`级别的初始化，初始化**静态线程**并进入`main`函数
{%list%}
如果启动了多线程，还需要调用prepare_multithreading初始化调度器和z_main_thread主线程
{%endlist%}
{%right%}
随后调用switch_to_main_thread切换到主线程，而主线程的入口函数就是bg_thread_main
{%endright%}
{%warning%}
单核系统下，_kernel.ready_q.cache始终缓存下一个运行的线程，会被调度器直接访问，不允许为NULL
{%endwarning%}
```c
/* 位于zephyr/kernel/init.c */
/* 完成 POST_KERNEL 和 APPLICATION 级别及可选的多核初始化，建立静态线程并最终进入应用程序的 main 函数 */
__boot_func static void bg_thread_main(void *unused1, void *unused2, void *unused3)
{
	/* 用于消除函数三个参数均未使用的编译器的警告 */
	ARG_UNUSED(unused1);
	ARG_UNUSED(unused2);
	ARG_UNUSED(unused3);

/* 如果启用了 MMU，则初始化内存管理元数据， */
#ifdef CONFIG_MMU
	z_mem_manage_init();
#endif 

    /* 标记系统已离开 PRE_KERNEL 阶段、进入 POST_KERNEL 阶段 */
	z_sys_post_kernel = true;

/* 如果启用了 IRQ 卸载机制，则进行相关初始化 */
#if CONFIG_IRQ_OFFLOAD
	arch_irq_offload_init();
#endif

    /* 进行 POST_KERNEL 级别的系统初始化 */
	z_sys_init_run_level(INIT_LEVEL_POST_KERNEL);

	/* SoC 与板级后期初始化钩子函数 */
	soc_late_init_hook();
	board_late_init_hook();

/* 标记正常随机数服务已经可用，后续线程计算栈指针随机偏移可以使用 sys_rand_get 函数 */
#if defined(CONFIG_STACK_POINTER_RANDOM) && (CONFIG_STACK_POINTER_RANDOM != 0)
	z_stack_adjust_initialized = 1;
#endif

    /* 打印开机 LOGO */
	boot_banner();

/* GNU 静态构造函数支持，确保 C++ 全局对象的构造在 main() 之前完成 */
#ifdef CONFIG_STATIC_INIT_GNU
	z_static_init_gnu();
#endif 

	/* 执行 APPLICATION 级别的系统初始化 */
	z_sys_init_run_level(INIT_LEVEL_APPLICATION);

	/* 初始化静态线程的运行上下文和控制块，“静态线程对象和描述信息已经存在，但线程上下文尚未建立，也尚未完成调度登记 */
	z_init_static_threads();

/* 内核数据缓存一致性断言 */
#ifdef CONFIG_KERNEL_COHERENCE
	__ASSERT_NO_MSG(sys_cache_is_mem_coherent(&_kernel));
#endif

/* 如果启用了多核且没有配置延迟启动，则启动其他 CPU 核心，随后执行所有注册在 INIT_LEVEL_SMP 的多核相关初始化项 */
#ifdef CONFIG_SMP
	if (!IS_ENABLED(CONFIG_SMP_BOOT_DELAY)) {
		z_smp_init();
	}
	z_sys_init_run_level(INIT_LEVEL_SMP);
#endif

/* 如果启用了MMU，则进行内存管理的收尾工作 */
#ifdef CONFIG_MMU
	z_mem_manage_boot_finish();
#endif

/* 进入 main 函数，如果配置了启动参数需要先进行参数解析生成 argc 和 argv */
#ifdef CONFIG_BOOTARGS
	extern int main(int, char **);
	extern char **prepare_main_args(int *argc);

	int argc = 0;
	char **argv = prepare_main_args(&argc);
	(void)main(argc, argv);
#else
	extern int main(void);
	(void)main();
#endif

	/* 当 main 函数返回时（如嵌入式测试用例或简单的轮询任务），取消 z_main_thread 的必需属性，使主线程能够正常结束，而不会因 essential 线程退出而触发系统致命错误 */
	z_thread_essential_clear(&z_main_thread);

	/* 覆盖率数据转储 */
#ifdef CONFIG_COVERAGE_DUMP
	gcov_coverage_dump();
#elif defined(CONFIG_COVERAGE_SEMIHOST)
	gcov_coverage_semihost();
#endif 
}
```
```c
/* 位于zephyr/kernel/init.c */
/* 负责建立多线程运行环境并准备主线程 */
__boot_func static char *prepare_multithreading(void)
{
    /* 保存主线程初始化后的栈指针，供后续上下文切换使用 */
	char *stack_ptr;

	/* 初始化调度器及其就绪队列 */
	z_sched_init();

/* 如果是单核系统，将 ready_q.cache 设置为 z_main_thread */
/* 如果是单核系统，ready_q.cache 始终缓存下一次应该运行的线程，线程调度和上下文切换代码会直接读取该指针，因此它不允许为 NULL */
#ifndef CONFIG_SMP
	_kernel.ready_q.cache = &z_main_thread;
#endif 
    /* 初始化主线程的线程控制块、栈和初始上下文，入口函数为 bg_thread_main，优先级为 CONFIG_MAIN_THREAD_PRIORITY */
    /* K_ESSENTIAL 表示主线程为关键线程，如果它在该属性清除前异常终止，内核会触发致命错误，线程名为 "main" */
	stack_ptr = z_setup_new_thread(
		&z_main_thread, z_main_stack, K_THREAD_STACK_SIZEOF(z_main_stack), bg_thread_main,
		NULL, NULL, NULL, CONFIG_MAIN_THREAD_PRIORITY, K_ESSENTIAL, "main");
    
    /* 标记主线程当前不处于睡眠或超时等待状态 */
	z_mark_thread_as_not_sleeping(&z_main_thread);

    /* 将主线程加入调度器就绪队列 */
	z_ready_thread(&z_main_thread);

    /* 初始化CPU0的软件运行环境，包括空闲线程、中断栈、CPU编号及相关调度状态 */
	z_init_cpu(0);

    /* 返回主线程的初始栈指针，供 switch_to_main_thread 切换使用 */
	return stack_ptr;
}
```
```c
/* 位于zephyr/kernel/init.c */
/* 完成系统的首次线程切换，使 CPU 从启动流程转入 Zephyr 主线程运行 */
__boot_func static FUNC_NORETURN void switch_to_main_thread(char *stack_ptr)
{
/* 如果架构提供了专用的首次线程切换函数，则进入架构实现，STM32F407VET6会进入该分支 */
/* 反之触发一次调度和上下文切换，调度器会从就绪队列中选出并切换到 z_main_thread */
#ifdef CONFIG_ARCH_HAS_CUSTOM_SWAP_TO_MAIN
	arch_switch_to_main_thread(&z_main_thread, stack_ptr, bg_thread_main);
#else
	ARG_UNUSED(stack_ptr);
	z_swap_unlocked();
#endif                    
     
    /* 告诉编译器程序不会运行到这里 */
	CODE_UNREACHABLE;
}
```
