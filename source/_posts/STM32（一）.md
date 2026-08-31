---
title: STM32（一）
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
  - STM32
  - 单片机
categories: MCU
keywords: STM32（一）, STM32, 单片机, MCU
updated: ''
img: /medias/featureimages/27.webp
date: 2026-06-30 13:55:14
summary: 空白工程构建
---
# 单片机
## STM32
### STM32（一）
#### 1.标准库工程
**①引言**
>**概述**：标准库`SPL`是官方提供的**C语言函数封装库**，通过**结构体和宏定义**封装了底层的硬件寄存器
{%list%}
芯片型号为STM32F407VET6，采用Cortex-M4架构，主频为168MHz，搭载了512KB的Flash和192KB的SRAM
{%endlist%}
>在[STM32官网](https://www.st.com/content/st_com/en.html)下搜索`STSW-STM32065`下载`STM32F4xx standard peripherals library`即`F4`系列的标准库
{%right%}
标准库的抽象程度很低、基本是对寄存器的赋值操作，执行效率高，编译出来的机器码非常精简
{%endright%}
{%warning%}
由于标准库本身工作量小，所以其开发效率低且可移植性较差，故官方已经不再对其进行维护
{%endwarning%}
**②文件提取**
>**概述**：创建**工程文件夹**以及**子文件夹**`FWLIB`、`MYLIB`、`CMSIS`和`USER`，并从**标准库**中提取相关文件
{%list%}
FWLIB存放标准库，MYLIB存放自定义外设库，CMSIS存放内核与底层支持相关，USER存放主函数等
{%endlist%}
>`CMSIS`主要用于存放`Cortex-M4`内核通用文件、芯片特定头文件以及`GCC`启动文件等

>`USER`通常用于存放`main.c`、**中断服务函数**文件以及**系统配置**文件等
{%right%}

{%endright%}
{%warning%}
不同编译环境需要的startup_stm32f40_41xxx.s是不同的，Linux/Windows需要选择gcc_ride7/arm下的
{%endwarning%}

```shell
STM32F407VET6_SPL_Project/
├── FWLIB/                            
│   ├── inc/                         # /Libraries/STM32F4xx_StdPeriph_Driver/inc所有文件
│   └── src/                         # /Libraries/STM32F4xx_StdPeriph_Driver/src所有文件
├── CMSIS/                            
│   ├── startup_stm32f40_41xxx.s     # 位于Libraries/CMSIS/Device/ST/STM32F4xx/Source/Templates/arm
│   ├── stm32f4xx.h                  # 位于Libraries/CMSIS/Device/ST/STM32F4xx/Include
│   ├── system_stm32f4xx.h           # 位于Libraries/CMSIS/Device/ST/STM32F4xx/Include
│   ├── system_stm32f4xx.c           # 位于Libraries/CMSIS/Device/ST/STM32F4xx/Source/Templates 
│   ├── core_cm4.h                   # 位于Libraries/CMSIS/Include
│   ├── core_cmFunc.h                # 位于Libraries/CMSIS/Include
│   ├── core_cmInstr.h               # 位于Libraries/CMSIS/Include
│   └── core_cmSimd                  # 位于Libraries/CMSIS/Include
├── USER/
│   ├── main.c                       # 位于Project/STM32F4xx_StdPeriph_Templates
│   ├── stm32f4xx_conf.h             # 位于Project/STM32F4xx_StdPeriph_Templates
│   ├── stm32f4xx_it.c               # 位于Project/STM32F4xx_StdPeriph_Templates
│   └── stm32f4xx_it.h               # 位于Project/STM32F4xx_StdPeriph_Templates
└── MYLIB/
```
**③Windows下编译**
>**概述**：在`USER`下新建工程，选择芯片包`STM32F407VETx`，创建**子文件夹对应分组**并添加对应**源文件**和**头文件路径**
{%list%}
定义全局宏STM32F40_41xxx和USE_STDPERIPH_DRIVER，前者声明芯片所属系列，后者表示启用标准库
{%endlist%}
{%right%}
根据编译提示信息修改stm32f4xx.h、stm32f4xx_it.c和main.c，如下所示
{%endright%}
{%warning%}
需要将stm32f4xx_fmc.c从工程中移除，因为只有STM32F42和STM32F43系列才使用该文件
{%endwarning%}
{%wrong%}
编译前需要在项目设置的target选项卡中检查编译器版本是否为5
{%endwrong%}
```c
/* stm32f4xx_it.c */
//#include "main.h"

//void SysTick_Handler(void)
//{
//  TimingDelay_Decrement();
//}
```
```c
/* stm32f4xx.h */
//使用标准库1.8版本不会有这个问题
//#define  DBGMCU_APB2_FZ_DBG_TIM1_STOP        DBGMCU_APB1_FZ_DBG_TIM1_STOP    
//#define  DBGMCU_APB2_FZ_DBG_TIM8_STOP        DBGMCU_APB1_FZ_DBG_TIM8_STOP
//#define  DBGMCU_APB2_FZ_DBG_TIM9_STOP        DBGMCU_APB1_FZ_DBG_TIM9_STOP
//#define  DBGMCU_APB2_FZ_DBG_TIM10_STOP       DBGMCU_APB1_FZ_DBG_TIM10_STOP
//#define  DBGMCU_APB2_FZ_DBG_TIM11_STOP       DBGMCU_APB1_FZ_DBG_TIM11_STOP
```
```c
/* main.c */
#include "stm32f4xx.h" 
int main(void){
  while(1){

  }
  return 0;
}
```
**④Linux下编译**
>概述：在**工程根目录下**新建
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
{%wrong%}

{%endwrong%}
```
/* Entry Point */
ENTRY(Reset_Handler)

/* Highest address of the user mode stack */
_estack = 0x20020000;    /* end of RAM */

/* Generate a link error if heap and stack don't fit into RAM */
_Min_Heap_Size = 0x200;  /* required amount of heap  */
_Min_Stack_Size = 0x400; /* required amount of stack */

/* Specify the memory areas */
MEMORY
{
  CCMRAM (xrw) : ORIGIN = 0x10000000, LENGTH = 64K
  RAM (xrw)    : ORIGIN = 0x20000000, LENGTH = 128K
  FLASH (rx)   : ORIGIN = 0x08000000, LENGTH = 512K
}

/* Define output sections */
SECTIONS
{
  /* The startup code goes first into FLASH */
  .isr_vector :
  {
    . = ALIGN(4);
    KEEP(*(.isr_vector)) /* Startup code */
    . = ALIGN(4);
  } >FLASH

  /* The program code and other data goes into FLASH */
  .text :
  {
    . = ALIGN(4);
    *(.text)           /* .text sections (code) */
    *(.text*)          /* .text* sections (code) */
    *(.rodata)         /* .rodata sections (constants, strings, etc.) */
    *(.rodata*)        /* .rodata* sections (constants, strings, etc.) */
    *(.glue_7)         /* glue arm to thumb code */
    *(.glue_7t)        /* glue thumb to arm code */
    *(.eh_frame)
    KEEP (*(.init))
    KEEP (*(.fini))
    . = ALIGN(4);
    _etext = .;        /* define a global symbols at end of code */
  } >FLASH

  /* used by the startup to initialize data */
  _sidata = LOADADDR(.data);

  /* Initialized data sections goes into RAM, load LMA copy after code */
  .data : 
  {
    . = ALIGN(4);
    _sdata = .;        /* create a global symbol at data start */
    *(.data)           /* .data sections */
    *(.data*)          /* .data* sections */
    . = ALIGN(4);
    _edata = .;        /* define a global symbol at data end */
  } >RAM AT> FLASH

  /* Uninitialized data section */
  .bss :
  {
    . = ALIGN(4);
    _sbss = .;         /* define a global symbol at bss start */
    __bss_start__ = _sbss;
    *(.bss)
    *(.bss*)
    *(COMMON)
    . = ALIGN(4);
    _ebss = .;         /* define a global symbol at bss end */
    __bss_end__ = _ebss;
  } >RAM
}
```
```makefile
# ==============================================================================
# 项目名称与编译器配置
# ==============================================================================
TARGET = Template

CC = arm-none-eabi-gcc
AS = arm-none-eabi-gcc -x assembler-with-cpp
OBJCOPY = arm-none-eabi-objcopy
SIZE = arm-none-eabi-size

# ==============================================================================
# 硬件与编译参数配置
# ==============================================================================
CPU = -mcpu=cortex-m4
FPU = -mfpu=fpv4-sp-d16
FLOAT-ABI = -mfloat-abi=hard
MCU = $(CPU) -mthumb $(FPU) $(FLOAT-ABI)

# 宏定义 (非常关键：开启标准库和指定芯片型号)
C_DEFS =  \
-DUSE_STDPERIPH_DRIVER \
-DSTM32F40_41xxx

# 头文件搜索路径 (根据你的目录结构)
C_INCLUDES =  \
-ICMSIS \
-IFWLIB/inc \
-IUSER \
-IMYLIB

# 编译优化级别与调试信息
OPT = -O0 -g
CFLAGS = $(MCU) $(C_DEFS) $(C_INCLUDES) $(OPT) -Wall -fdata-sections -ffunction-sections

# 链接器参数
LDSCRIPT = STM32F407VETx_FLASH.ld
LDFLAGS = $(MCU) -specs=nano.specs -T$(LDSCRIPT) -Wl,-Map=$(TARGET).map,--cref -Wl,--gc-sections

# ==============================================================================
# 源文件收集
# ==============================================================================
# 用户与系统 C 文件
C_SOURCES = \
USER/main.c \
USER/stm32f4xx_it.c \
CMSIS/system_stm32f4xx.c

# 自动获取 FWLIB/src 下所有的 .c 文件
C_SOURCES += $(wildcard FWLIB/src/*.c)

# 汇编启动文件
ASM_SOURCES = CMSIS/startup_stm32f40_41xxx.s

# ==============================================================================
# 编译规则 (请勿随意修改下方内容)
# ==============================================================================
BUILD_DIR = build
OBJECTS = $(addprefix $(BUILD_DIR)/,$(notdir $(C_SOURCES:.c=.o)))
vpath %.c $(sort $(dir $(C_SOURCES)))

OBJECTS += $(addprefix $(BUILD_DIR)/,$(notdir $(ASM_SOURCES:.s=.o)))
vpath %.s $(sort $(dir $(ASM_SOURCES)))

all: $(BUILD_DIR)/$(TARGET).elf $(BUILD_DIR)/$(TARGET).hex $(BUILD_DIR)/$(TARGET).bin

$(BUILD_DIR)/%.o: %.c | $(BUILD_DIR) 
	$(CC) -c $(CFLAGS) $< -o $@

$(BUILD_DIR)/%.o: %.s | $(BUILD_DIR)
	$(AS) -c $(CFLAGS) $< -o $@

$(BUILD_DIR)/$(TARGET).elf: $(OBJECTS)
	$(CC) $(OBJECTS) $(LDFLAGS) -o $@
	$(SIZE) $@

$(BUILD_DIR)/%.hex: $(BUILD_DIR)/%.elf | $(BUILD_DIR)
	$(OBJCOPY) -O ihex $< $@

$(BUILD_DIR)/%.bin: $(BUILD_DIR)/%.elf | $(BUILD_DIR)
	$(OBJCOPY) -O binary -S $< $@

$(BUILD_DIR):
	mkdir $@

clean:
	rm -rf $(BUILD_DIR)
```

#### 2.HAL库工程
**①引言**
>**概述**：
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
**②文件提取**
>**概述**：
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
#### 3.STM32CubeMX
**①资料下载**
>**概述**：
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
