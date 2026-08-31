---
title: STM32（四）
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
categories: MCU
keywords: STM32（四）, STM32, MCU
updated: ''
img: /medias/featureimages/27.webp
date: 2026-06-30 13:55:14
summary: HAL库
---
# 单片机
## STM32
### STM32（四）
#### 1.工程构建
**①简介**
>**概述**：`HAL`库也称为**硬件抽象层**，相较于**标准库**拥有更高的**抽象整合水平**，便于程序的**跨系列移植**
{%list%}
HAL库旨在改变标准外设库带来各系列芯片操作函数结构差异大、分化大、不利于跨系列移植的情况
{%endlist%}
{%warning%}
HAL库依赖于标准库和其他基础库，虽然开发效率和移植性较好，但是执行效率较低且代码量较大
{%endwarning%}
{%right%}
STM还推出了LL库，相较于HAL库代码更轻量级且执行效率更高，但是不匹配复杂外设，可以和HAL库结合使用
{%endright%}
**②文件提取**
>**概述**：以`STM32F407VET6`为例，在[官网](https://www.st.com/en/embedded-software/stm32cubef4.html)搜索`STM32CubeF7`即可下载对应系列的`HAL`库固件包
{%list%}
创建工程文件夹以及子文件夹CMSIS、HALLIB、MYLIB和USER，并从固件包中提取文件如下所示
{%endlist%}
{%right%}
在USER下创建keil工程，选择对应芯片包，创建对应分组，添加源文件、头文件路径和全局宏即可
{%endright%}
>全局宏为`USE_HAL_DRIVER,STM32F407xx`，分别表示使用`HAL`库并指示**芯片型号**
{%warning%}
添加HALLIB的源文件时，需要略过其中的stm32f4xx_hal_timebase_tim_template等四个模板文件
{%endwarning%}
```shell
Project/
├── HALLIB/                            
│   ├── Inc/                         # Drivers/STM32F4xx_HAL_Driver/Inc所有文件，可以忽略Legacy文件夹
│   └── Src/                         # Drivers/STM32F4xx_HAL_Driver/Src所有文件，可以忽略Legacy文件夹
├── CMSIS/                            
│   ├── startup_stm32f407xx.s        # 位于Drivers/CMSIS/Device/ST/STM32F4xx/Source/Templates/arm
│   ├── cmsis_armcc.h                # 位于Drivers/CMSIS/Include
│   ├── cmsis_armclang.h             # 位于Drivers/CMSIS/Include
│   ├── cmsis_compiler.h             # 位于Drivers/CMSIS/Include
│   ├── cmsis_version.h              # 位于Drivers/CMSIS/Include
│   ├── core_cm4.h                   # 位于Drivers/CMSIS/Include
│   └── mpu_armv7.h                  # 位于Drivers/CMSIS/Include
│
├── USER/
│   ├── main.c                       # 位于Projects/STM32F4-Discovery/Templates/Src
│   ├── system_stm32f4xx.c           # 位于Projects/STM32F4-Discovery/Templates/Src
│   ├── stm32f4xx_it.c               # 位于Projects/STM32F4-Discovery/Templates/Src
│   ├── stm32f4xx_hal_msp.c          # 位于Projects/STM32F4-Discovery/Templates/Src
│   ├── stm32f4xx.h                  # 位于Drivers/CMSIS/Device/ST/STM32F4xx/Include
│   ├── system_stm32f4xx.h           # 位于Drivers/CMSIS/Device/ST/STM32F4xx/Include
│   ├── stm32f407xx.h                # 位于Drivers/CMSIS/Device/ST/STM32F4xx/Include
│   ├── stm32f4xx_hal_conf.h         # 位于Projects/STM32F4-Discovery/Templates/Inc
│   └── stm32f4xx_it.h               # 位于Projects/STM32F4-Discovery/Templates/Inc
│   
└── MYLIB/
```
**③启动流程**
>**概述**：类似于标准库，系统上电后将`MSP`设置为`__initial_sp`并跳转到`Reset_Handler`执行
{%list%}
类似的，Reset_Handler调用SystemInit配置FPU、系统时钟和重定位中断向量表，最后跳转到__main
{%endlist%}
{%right%}
__main将FLASH中已初始化的全局变量拷贝到RAM中并清零BSS段，最后跳转到用户定义的main函数
{%endright%}
{%warning%}
与标准库的SystemInit不同，HAL库不会启用并配置外部高速时钟，而是一直使用内部高速时钟
{%endwarning%}

```arm-gas
; Reset handler
Reset_Handler    PROC
                 EXPORT  Reset_Handler             [WEAK]
        IMPORT  SystemInit
        IMPORT  __main

                 LDR     R0, =SystemInit
                 BLX     R0
                 LDR     R0, =__main
                 BX      R0
                 ENDP

```
```c
void SystemInit(void)
{
    //如果芯片支持FPU且启用了FPU，则允许全权限访问浮点单元
    #if (__FPU_PRESENT == 1) && (__FPU_USED == 1)
        SCB->CPACR |= ((3UL << 10*2)|(3UL << 11*2)); 
    #endif
    //启用内部高速时钟
    RCC->CR |= (uint32_t)0x00000001;
    //复位外部时钟配置寄存器
    RCC->CFGR = 0x00000000;
    //禁用外部高速时钟、时钟安全系统和锁相环
    RCC->CR &= (uint32_t)0xFEF6FFFF;
    //复位PLL配置寄存器
    RCC->PLLCFGR = 0x24003010;
    //禁用外部晶振的旁路模式
    RCC->CR &= (uint32_t)0xFFFBFFFF;
    //关闭所有时钟中断
    RCC->CIR = 0x00000000;
    //中断向量表重定位
#ifdef VECT_TAB_SRAM
    SCB->VTOR = SRAM_BASE | VECT_TAB_OFFSET;
#else
    SCB->VTOR = FLASH_BASE | VECT_TAB_OFFSET;
#endif
}
```
**④测试程序**
>**概述**：编写`LED`闪烁脚本测试`HAL`库移植情况，使用引脚为`PB2`和`PC5`，如下所示
{%list%}
使用HAL库必须在主函数中先调用HAL_Init，启用指令缓存和数据缓存、设置中断优先级分组并开启SysTick
{%endlist%}
{%right%}
启用指令缓存和数据缓存可以减少CPU从FLASH取指和从RAM读数据的次数，以提升CPU的效率
{%endright%}
{%warning%}
且如果需要使用外部高速晶振，还需要自定义SystemClock_Config并调用，否则只能使用内部高速晶振
{%endwarning%}
```c
/* 函数声明 */
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
/* 主函数 */
int main(void)
{
    HAL_Init();                 //初始化HAL库
    SystemClock_Config();       //配置系统时钟启用外部晶振
    MX_GPIO_Init();             //初始化GPIO
    //主循环
    while(1)
    {
        //点亮PC5，熄灭PB2
        HAL_GPIO_WritePin(GPIOC, GPIO_PIN_5, GPIO_PIN_SET);
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_2, GPIO_PIN_RESET);
        HAL_Delay(500);
        //点亮PC5，熄灭PB2
        HAL_GPIO_WritePin(GPIOC, GPIO_PIN_5, GPIO_PIN_RESET);
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_2, GPIO_PIN_SET);
        HAL_Delay(500);
    }
}

/* 系统时钟配置 (针对25MHz外部晶振) */
void SystemClock_Config(void)
{
    //声明两个结构体，分别用于配置振荡器和PLL、系统时钟和总线时钟
    RCC_OscInitTypeDef RCC_OscInitStruct = {0};
    RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};
    //配置振荡器和PLL
    RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSE;    //时钟源选择HSE即外部高速晶振
    RCC_OscInitStruct.HSEState = RCC_HSE_ON;                      //启用HSE
    RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;                  //开启PLL
    RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSE;          //PLL时钟源选择HSE
    RCC_OscInitStruct.PLL.PLLM = 25;                              //PLL输入分频系数为25，即输入PLL的频率为1MHz
    RCC_OscInitStruct.PLL.PLLN = 336;                             //PLL倍频系数，即PLL输出频率为336MHz
    RCC_OscInitStruct.PLL.PLLP = RCC_PLLP_DIV2;                   //系统时钟分频系数，即系统时钟频率为168MHz
    RCC_OscInitStruct.PLL.PLLQ = 7;                               //USB/SDIO/RNG时钟分频系数，即48MHz
    HAL_RCC_OscConfig(&RCC_OscInitStruct);
    //配置系统时钟
    RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_SYSCLK | RCC_CLOCKTYPE_HCLK |
                                  RCC_CLOCKTYPE_PCLK1 | RCC_CLOCKTYPE_PCLK2;    //要配置的时钟：系统时钟、AHB总线时钟、APB1总线时钟、APB2总线时钟
    RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;                   //系统时钟源选择PLL输出，即168MHz
    RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;                          //AHB分频系数，即AHB时钟频率为168MHz
    RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV4;                           //APB1分频系数，即APB1时钟频率为42MHz
    RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV2;                           //APB2分频系数，即APB2时钟频率为84MHz
    HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_5);
}

/* GPIO初始化 */
static void MX_GPIO_Init(void)
{
    //使能GPIOB和GPIOC的时钟
    __HAL_RCC_GPIOB_CLK_ENABLE();
    __HAL_RCC_GPIOC_CLK_ENABLE();
    //配置PB2
    GPIO_InitTypeDef GPIO_InitStruct = {0};
    GPIO_InitStruct.Pin = GPIO_PIN_2;               //引脚编号
    GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;     //通用推挽输出
    GPIO_InitStruct.Pull = GPIO_NOPULL;             //无上下拉电阻
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;   //引脚翻转速度为高速
    HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);
    //配置PC5
    GPIO_InitStruct.Pin = GPIO_PIN_5;
    HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);
    //初始为低电平
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_2, GPIO_PIN_RESET);
    HAL_GPIO_WritePin(GPIOC, GPIO_PIN_5, GPIO_PIN_RESET);
}
```
```c
HAL_StatusTypeDef HAL_Init(void)
{
    //启用指令缓存
#if (INSTRUCTION_CACHE_ENABLE != 0U)
    __HAL_FLASH_INSTRUCTION_CACHE_ENABLE();
#endif 
    //启用数据缓存
 #if (DATA_CACHE_ENABLE != 0U)
    __HAL_FLASH_DATA_CACHE_ENABLE();
#endif 
    //启用预取缓冲区
#if (PREFETCH_ENABLE != 0U)
    __HAL_FLASH_PREFETCH_BUFFER_ENABLE();
#endif 
    //设置中断优先级分组
    HAL_NVIC_SetPriorityGrouping(NVIC_PRIORITYGROUP_4);
    //初始化SysTick并将其优先级设置为0x0FU即最低优先级
    HAL_InitTick(TICK_INT_PRIORITY);
    //供开发者使用的初始化回调函数
    HAL_MspInit();
    return HAL_OK;
}
```
