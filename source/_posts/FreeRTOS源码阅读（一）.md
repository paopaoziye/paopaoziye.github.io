---
title: FreeRTOS源码阅读（一）
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
  - FreeRTOS
categories: RTOS
keywords: FreeRTOS源码阅读（一）, RTOS, FreeRTOS
updated: ''
img: /medias/featureimages/38.webp
date: 2026-06-30 13:55:14
summary: 系统移植和内存管理
---
# FreeRTOS
## FreeRTOS源码阅读（一）
### 1.RTOS
#### 1.1引言
**①裸机开发**
>**概述**：常用的裸机开发模式有**轮询**、**前后台**、**定时器**和**状态机**，如下所示
{%list%}
裸机开发模式代码高度耦合，当一个任务耗时较长或者出现故障时，会阻塞后续任务，导致系统响应延迟
{%endlist%}
{%right%}
中断天然具有最高优先级，且可以通过中断优先级划分实现简单的任务优先级
{%endright%}
{%warning%}
ISR要求简短高效，无法实现复杂逻辑，且中断优先级是静态的，无法动态调整优先级
{%endwarning%}
```c
/* 轮询：所有任务在一个循环中依次执行 */
void main(){ 
    //初始化
    init();
    //主循环
    while(1){
        do_task1();
        do_task2();
    }
}
```
```c
/* 前后台：后台程序在主函数中运行，前台程序通过中断触发 */
void main(){
    //初始化
    init();
    //主循环
    while(1){
        do_task1();
    }
}
//中断处理函数
void task2_irq(){
    do_task2();
}
```
```c
/* 定时器驱动：利用定时器划分时间片，每个任务间隔固定时间执行 */
static int cnt = 0;
void main(){
    //初始化
    init();
    while(1){
        do_tasks();
    }
}
void do_tasks(){
    if(cnt % 2 == 0){
        do_task1();
    }
    else if(cnt % 5 == 0){
        do_task2();
    }
}
void timer_irq(){
    cnt++;
}
```
```c
/* 状态机：将任务分解为多个状态，通过事件触发状态切换 */
static state = 0;
void main(){
    //初始化
    init();
    while(1){
        tasks();
    }  
}
void tasks(){
    switch(state){
        case 0:
            if(do_task1()) state = 1;
        break;
        case 1:
            if(do_task2()) state = 2;
        break;
        case 2:
            state = 0;
        break;
    }
}
```
**②实时操作系统**
>**概述**：保证在**一定时间限制内**完成**特定功能**的操作系统，如`FreeRTOS`和`RT-Thread`等
{%list%}
RTOS分为硬实时系统和软实时系统，前者要求任务必须在绝对截止时间前完成，后者允许偶尔超时
{%endlist%}
{%right%}
相较于裸机系统，RTOS提供任务调度、内存管理以及任务间通信等机制，使得任务之间相互独立且优先级明确
{%endright%}
{%warning%}
RTOS内核本身需要占用一定的ROM和RAM，且任务调度等会增加额外计算负担
{%endwarning%}
```c
void main(){
    //初始化
    init();
    //创建任务
    create_task(task1);
    create_task(task2);
    //启动调度器
    start_scheduler();
}
void task1(void){
    while(1){
        do_task1();
    }
}
void task2(void){
    while(1){
        do_task2();
    }
}
```
**③`FreeRTOS`**
>**概述**：一个**轻量级且完全开源**的`RTOS`，可以在[官网](https://freertos.org/)中下载到**源码**，其**内核源码框架**如下所示，使用`V11.0`版本
{%list%}
FreeRTOS使用优先级驱动的抢占式调度，并不感知任务的截止期限，所以其是软实时操作系统
{%endlist%}
{%right%}
Freertos内核由C语言编写，可移植性较高，通常情况下占⽤4k-9k字节的空间
{%endright%}
{%warning%}
若使用heap.x的动态内存分配，还可能因为内存碎片或分配失败引入不可预测的延迟
{%endwarning%}
```shell
FreeRTOS-Kernel/
├── include/         # 内核头文件
├── examples/        # 一些示例文件
├── tasks.c          # 任务调度核心
├── queue.c          # 队列/信号量实现
├── list.c           # 内核链表
├── timers.c         # 软件定时器
├── event_groups.c   # 事件组
├── stream_buffer.c  # 流缓冲区
└── portable/        # 移植相关
    ├─ [Compiler]/   # 编译器适配
    │  └─ [Arch]/    # 架构适配
    └─ MemMang/      # 内存管理
```
#### 1.2系统移植
**①文件提取**
>**概述**：在**工程根目录**下创建`FreeRTOS`文件夹以及`src`、`inc`和`portable`子文件夹，并将提取相关文件
{%list%}
根据编译器和芯片架构对portable下的文件进行筛选，以Keil MDK编译环境下的STM32F407VET6为例
{%endlist%}
>`Keil MDK`对应上述源码的`portable/RVDS`，从该文件夹下根据**处理器架构**找到对应的`ARM_CM4F`子文件夹
{%right%}
如果需要使用动态内存分配，还需要从portable/MemMang中选取对应的内存管理算法，通常采用heap4.c
{%endright%}
{%warning%}
如果处理器有内存保护单元且需要使用该功能，还需要提取portable/Common/mpu_wrappers.c
{%endwarning%}
```shell
FreeRTOS/
├── inc/             # 存放内核头文件，对应上述源码的include
├── src/             # 存放内核源文件，如tasks.c、list.c和queue.c等
└── portable/        # 移植相关        
    ├─ port.c        # 处理器架构相关的底层操作
    ├─ portmacro.h   # 处理器架构密切相关的宏定义和数据类型
    └─ heap4.c       # 内存管理
```
**②`FreeRTOSConfig.h`**
>**概述**：在`Keil`工程新增`FreeRTOS_CORE`和`FreeRTOS_PORTABLE`分组并添加**对应源文件**以及**头文件路径**
{%list%}
需要自己添加FreeRTOSConfig.h进行内核功能裁剪和配置，可以从示例程序中寻找
{%endlist%}
{%right%}
因为FreeRTOS需要使用自己定义的PendSV、SVC和SysTick中断处理函数，需要在FreeRTOSConfig.h中进行重定向
{%endright%}
{%warning%}
需要将stm32f4xx_it.c中的对应中断处理函数注释掉防止重复定义
{%endwarning%}
```c
#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H

//若编译器为IAR、Keil和GCC，则需要引入stdint.h并声明SystemCoreClock，即CPU 核心时钟频率
#if defined(__ICCARM__) || defined(__CC_ARM) || defined(__GNUC__)
    #include <stdint.h>
    extern uint32_t SystemCoreClock;
#endif

//任务系统配置
#define configUSE_PREEMPTION                                        1                               //使用抢占式调度，即任务可以被高优先级任务中断
#define configUSE_CO_ROUTINES                                       0                               //禁用协程
#define configUSE_TIME_SLICING                                      1                               //使用时间片调度(默认使能)
#define configUSE_PORT_OPTIMISED_TASK_SELECTION                     1                               //使用芯片特定的指令加速最高优先级任务的查找
#define configMAX_PRIORITIES                                        (32)                            //任务优先级数量，优先级为0-31
#define configMINIMAL_STACK_SIZE                                    ((unsigned short)130)           //空闲任务堆栈大小
#define configMAX_TASK_NAME_LEN                                     (16)                            //任务名字符串长度
#define configIDLE_SHOULD_YIELD                                     1                               //空闲任务主动让出CPU使用权给其他同优先级的用户任务
#define INCLUDE_xTaskGetSchedulerState                              1                               //使能调度器状态查询                      
#define INCLUDE_vTaskPrioritySet                                    1                               //使能动态修改任务优先级
#define INCLUDE_uxTaskPriorityGet                                   1                               //使能获取任务当前优先级
#define INCLUDE_vTaskDelete                                         1                               //使能删除任务
#define configUSE_APPLICATION_TASK_TAG                              0                               //禁用任务标签
#define INCLUDE_eTaskGetState                                       1                               //使能任务状态查询
#define INCLUDE_vTaskSuspend                                        1                               //使能挂起/恢复任务
#define INCLUDE_vTaskDelayUntil                                     1                               //使能绝对时间延时
#define INCLUDE_vTaskDelay                                          1                               //使能相对时间延时
#define INCLUDE_xTaskGetSchedulerState                              1                               //使能调度器状态查询                      
#define INCLUDE_vTaskPrioritySet                                    1                               //使能动态修改任务优先级
#define INCLUDE_uxTaskPriorityGet                                   1                               //使能获取任务当前优先级
#define INCLUDE_vTaskDelete                                         1                               //使能删除任务

//系统时钟配置
#define configCPU_CLOCK_HZ                                          (SystemCoreClock)               //CPU主频
#define configTICK_RATE_HZ                                          (1000)                          //系统时钟节拍频率，这里设置为1000，一个TICK就是1ms
#define configUSE_16_BIT_TICKS                                      0                               //系统节拍计数器变量数据类型，1表示为16位无符号整形，0表示为32位无符号整形

//功能模块开关
#define configUSE_TASK_NOTIFICATIONS                                1                               //启用任务通知
#define configUSE_MUTEXES                                           1                               //启用互斥锁
#define configUSE_COUNTING_SEMAPHORES                               1                               //启用计数信号量
#define configUSE_QUEUE_SETS                                        0                               //禁用队列集
#define configUSE_STREAM_BUFFERS                                    0                               //禁用流缓冲
#define configUSE_TICKLESS_IDLE                                     1                               //启用低功耗tickless模式
#define configQUEUE_REGISTRY_SIZE                                   0                               //禁用队列记录
#define configUSE_RECURSIVE_MUTEXES                                 1                               //启用递归互斥信号量
#define configUSE_TIMERS                                            1                               //禁用软件定时器
#define configCHECK_FOR_STACK_OVERFLOW                              0                               //关闭栈溢出检测

//钩子函数配置
#define configUSE_MALLOC_FAILED_HOOK                                0                               //禁用内存分配失败钩子
#define configUSE_IDLE_HOOK                                         0                               //禁用空闲任务钩子函数
#define configUSE_TICK_HOOK                                         0                               //禁用时间片钩子函数
#define INCLUDE_vTaskCleanUpResources                               1                               //启用清理任务资源钩子函数

//内存管理配置
#define configSUPPORT_DYNAMIC_ALLOCATION                            1                               //启用动态内存申请
#define configTOTAL_HEAP_SIZE                                       ((size_t)(20*1024))             //堆内存总大小
                                       
//软件定时器配置
#define configTIMER_TASK_PRIORITY                                   (configMAX_PRIORITIES-1)        //软件定时器任务优先级
#define configTIMER_QUEUE_LENGTH                                    5                               //软件定时器队列长度
#define configTIMER_TASK_STACK_DEPTH                                (configMINIMAL_STACK_SIZE*2)    //软件定时器任务堆栈大小
#define INCLUDE_xTimerPendFunctionCall                              0                               //不允许从中断/任务异步调用函数得到定时器服务任务上下文

//中断相关配置
#ifdef __NVIC_PRIO_BITS
  #define configPRIO_BITS                                           __NVIC_PRIO_BITS                //使用芯片定义的优先级位数
#else
  #define configPRIO_BITS                                           4                               //中断优先级位数设置为4位           
#endif
#define configLIBRARY_LOWEST_INTERRUPT_PRIORITY                     15                              //内核可以管理的中断最低优先级
#define configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY                5                               //内核可管理的最高中断优先级，即0-4优先级任务不允许调用任何RTOS API
//configLIBRARY_LOWEST_INTERRUPT_PRIORITY对应的硬件优先级值
#define configKERNEL_INTERRUPT_PRIORITY                            ( configLIBRARY_LOWEST_INTERRUPT_PRIORITY << (8 - configPRIO_BITS) )
//configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY对应的硬件优先级值
#define configMAX_SYSCALL_INTERRUPT_PRIORITY                       ( configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY << (8 - configPRIO_BITS) )

//中断处理函数重定向宏
#define xPortPendSVHandler                                         PendSV_Handler
#define vPortSVCHandler                                            SVC_Handler
#define xPortSysTickHandler                                        SysTick_Handler

//将毫秒和频率转化为对应TICK数
#define M2T(X)                                                     ((unsigned int)((X)*(configTICK_RATE_HZ/1000.0)))
#define F2T(X)                                                     ((unsigned int)((configTICK_RATE_HZ/(X))))
  
#endif
```
### 2.内存管理
#### 2.1引言
**①管理算法**
>**概述**：`FreeRTOS`提供`5`种不同的**内存管理算法**`heapx.c`，通常采用`heap4.c`，后续主要分析该文件
{%list%}
heap1.c使用静态分配，不进行内存回收；heap2.c回收内存但并不合并内存块，采用最佳匹配算法分配内存
{%endlist%}
{%right%}
heap4.c回收内存并合并内存块，采用首次匹配算法分配内存；heap5.c在heap4.c的基础上支持非连续内存区域
{%endright%}
>`heap2.c`的空闲内存块按照**块的大小**升序排列，`heap4.c`的空闲内存块按照**起始地址大小**升序排列
{%warning%}
heap3.c本质上是对malloc和free的封装，可能引入较大的内存开销，通常为兼容标准库的过渡方案
{%endwarning%}
**②匹配算法**
>**概述**：常用的匹配算法有**最佳匹配算法**、**首次匹配算法**、**最坏匹配算法**和**临近匹配算法**，如下所示
{%list%}
最佳匹配可以减少内部碎片，最坏匹配可以减少外部碎片，临近匹配速度最快且可以避免低地址频繁分配
{%endlist%}
{%right%}
首次匹配速度快于最佳匹配和最坏匹配，且碎片率和稳定性优于临近匹配，所以heap4.c采用首次匹配
{%endright%}
{%warning%}
内存碎片分为内部碎片和外部碎片，前者为已分配但是未使用的部分，后者为未分配但无法使用的部分
{%endwarning%}
```c
//最佳匹配算法：分配大小最接近请求值的空闲块
[空闲链表]
xStart -> [块A:100] -> [块B:200] -> [块C:50] -> pxEnd

1. 遍历链表：
   - 块A: 100 >= 80 (记录为候选)
   - 块B: 200 >= 80 (但200 > 100，不更新候选)
   - 块C: 50  < 80 (跳过)

2. 选择最佳匹配：块A (100字节)

3. 分割块A：
   - 分配80字节 + 块头 => 实际占用88字节（假设8字节对齐）
   - 剩余100 - 88 = 12字节（若小于最小块大小，则不分割）

[分配后链表]
xStart -> [块B:200] -> [块C:50] -> pxEnd
```
```c
//首次匹配算法：从空闲链表的头部开始遍历，选择第一个大小大于请求值的空闲块
[空闲链表]
xStart -> [块A:50] -> [块B:200] -> [块C:100] -> pxEnd

1. 遍历链表：
   - 块A: 50 < 80 (跳过)
   - 块B: 200 >= 80 (选择第一个满足的块，停止遍历)

2. 分割块B：
   - 分配80字节 + 块头 => 实际占用88字节（假设8字节对齐）
   - 剩余200 - 88 = 112字节（作为新空闲块插入链表）

[分配后链表]
xStart -> [块A:50] -> [新空闲块:112] -> [块C:100] -> pxEnd
```
```c
//最坏匹配算法：分配最大的空闲块
[空闲链表]
xStart -> [块A:50] -> [块B:200] -> [块C:100] -> pxEnd

1. 遍历链表找最大块：
   - 块A: 50
   - 块B: 200 （当前最大）
   - 块C: 100

2. 选择最大块：块B (200字节)

3. 分割块B：
   - 分配80字节 + 块头 => 实际占用88字节（假设8字节对齐）
   - 剩余200 - 88 = 112字节（插入链表）

[分配后链表]
xStart -> [块A:50] -> [新空闲块:112] -> [块C:100] -> pxEnd
```
```c
//临近匹配算法：基于首次匹配算法，但是每次查找从上次分配位置继续
[初始链表]
xStart -> [块A:50] -> [块B:200] -> [块C:100] -> [块D:80] -> pxEnd
           ↑
           pxLastFreeBlock

1. 从pxLastFreeBlock（块A）开始遍历：
   - 块A: 50 < 60 (跳过)
   - 块B: 200 >= 60 (选择此块)
   - 更新pxLastFreeBlock指向块B的下一位置（块C）

2. 分割块B：
   - 分配60字节 + 块头 => 实际占用68字节（假设8字节对齐）
   - 剩余200 - 68 = 132字节（插入链表）

[分配后链表]
xStart -> [块A:50] -> [新空闲块:132] -> [块C:100] -> [块D:80] -> pxEnd
                                       ↑
                                       pxLastFreeBlock
```
**③堆初始化**
>**概述**：初始化**哨兵节点**`xStart`和`pxEnd`，并将剩余内存作为**第一个空闲内存块**，最后更新**相关统计信息**
{%list%}
采用静态数组作为堆内存，内存块头部为BlockLink_t，将每个空闲内存块按照地址大小串联为一个单向链表
{%endlist%}
{%right%}
两个哨兵节点的xBlockSize成员均为0，其中xStart节点位于堆内存外部，pxEnd位于堆内存尾部，如下所示
{%endright%}
{%warning%}
内存对齐要求数据起始地址满足一定的规则，若不满足内存对齐，会增加访问内存所需的CPU周期数甚至引发异常
{%endwarning%}
![初始堆内存](/image/Freertos_5.png)
```c
//静态堆内存，位于RAM
static uint8_t ucHeap[ configTOTAL_HEAP_SIZE ];
//块头结构体，用于内存块链表管理
typedef struct A_BLOCK_LINK{
    struct A_BLOCK_LINK * pxNextFreeBlock; 
    size_t xBlockSize;                     
}BlockLink_t;
//空闲内存块链表的起始节点和尾部节点指针
static BlockLink_t xStart;
static BlockLink_t * pxEnd = NULL;
//块头结构体经过内存对齐后的大小，按照8字节对齐
static const size_t xHeapStructSize = ( sizeof( BlockLink_t ) + ( ( size_t ) ( portBYTE_ALIGNMENT - 1 ) ) ) & ~( ( size_t ) portBYTE_ALIGNMENT_MASK );
//堆状态统计变量
static size_t xFreeBytesRemaining = ( size_t ) 0U;             //空闲内存字节数
static size_t xMinimumEverFreeBytesRemaining = ( size_t ) 0U;  //历史最小剩余空闲内存字节数
static size_t xNumberOfSuccessfulAllocations = ( size_t ) 0U;  //成功的内存分配次数
static size_t xNumberOfSuccessfulFrees = ( size_t ) 0U;        //成功的内存释放次数
```
```c
/* 初始化内存堆 */
static void prvHeapInit( void ) 
{
    BlockLink_t * pxFirstFreeBlock;
    portPOINTER_SIZE_TYPE uxStartAddress, uxEndAddress;
    //获取堆内存总大小
    size_t xTotalHeapSize = configTOTAL_HEAP_SIZE;
    //获取堆的起始地址，本质上是32位整型
    uxStartAddress = ( portPOINTER_SIZE_TYPE ) ucHeap;
    //如果堆的起始地址未对齐（8字节对齐），则调整uxAddress使其对齐到下一边界，并调整可用堆的大小
    if( ( uxStartAddress & portBYTE_ALIGNMENT_MASK ) != 0 )
    {
        //先加7，假设uxAddress为0x80000002，变为0x80000009
        uxStartAddress += ( portBYTE_ALIGNMENT - 1 );
        //进行对齐操作，即0x80000009 & 0xFFFFFFF8，变为0x80000008
        uxStartAddress &= ~( ( portPOINTER_SIZE_TYPE ) portBYTE_ALIGNMENT_MASK );
        //如果首地址变化则调整堆的可用大小
        xTotalHeapSize -= ( size_t ) ( uxStartAddress - ( portPOINTER_SIZE_TYPE ) ucHeap );
    }
    //获取初始化xStart节点，将其pxNextFreeBlock指向堆起始地址，并其xBlockSize设置为0
    xStart.pxNextFreeBlock = ( void * )uxStartAddress;
    xStart.xBlockSize = ( size_t ) 0;
    //获取堆的结束地址
    uxEndAddress = uxStartAddress + ( portPOINTER_SIZE_TYPE ) xTotalHeapSize;
    //在堆的结束地址处构建pxEnd节点，其pxNextFreeBlock为NULL，xBlockSize为0
    uxEndAddress -= ( portPOINTER_SIZE_TYPE ) xHeapStructSize;
    uxEndAddress &= ~( ( portPOINTER_SIZE_TYPE ) portBYTE_ALIGNMENT_MASK );
    pxEnd = ( BlockLink_t * ) uxEndAddress;
    pxEnd->xBlockSize = 0;
    pxEnd->pxNextFreeBlock = NULL;
    //将剩余内存初始化为第一个空闲块
    pxFirstFreeBlock = ( BlockLink_t * ) uxStartAddress;
    pxFirstFreeBlock->xBlockSize = ( size_t ) ( uxEndAddress - ( portPOINTER_SIZE_TYPE ) pxFirstFreeBlock );
    pxFirstFreeBlock->pxNextFreeBlock = pxEnd;
    //记录剩余内存
    xMinimumEverFreeBytesRemaining = pxFirstFreeBlock->xBlockSize;
    xFreeBytesRemaining = pxFirstFreeBlock->xBlockSize;
}
```
#### 2.2分配与释放
**①内存块分配**
>**概述**：**从头遍历**空闲链表并分配**第一个符合要求**的空闲内存块，如果空闲内存块过大，还需要进行**内存块分割**
{%list%}
申请内存块的真实所需大小为用户请求大小 + 块头 + 补充字节，补充字节用于满足内存对齐要求
{%endlist%}
{%right%}
heap4.c使用内存块大小的最高位作为内存块是否被分配的标记，当最高位为1时，表明该内存块被分配
{%endright%}
{%warning%}
如果分配的内存块大小减去真实所需大小大于heapMINIMUM_BLOCK_SIZE，需要进行内存块分割控制内部碎片
{%endwarning%}
{%wrong%}
在内存分配前，需要检查申请内存块大小是否会导致堆溢出和整数溢出，且最终的内存块大小最高位不能为1
{%endwrong%}
```c
//定义空闲内存块的最小尺寸，为块头结构体大小的两倍
#define heapMINIMUM_BLOCK_SIZE    ( ( size_t ) ( xHeapStructSize << 1 ) )
//字节的位数
#define heapBITS_PER_BYTE         ( ( size_t ) 8 )
//将size_t的最高位置为1，用于标记内存块是否被分配
#define heapBLOCK_ALLOCATED_BITMASK              ( ( ( size_t ) 1 ) << ( ( sizeof( size_t ) * heapBITS_PER_BYTE ) - 1 ) )
//用于检查内存块是否未分配，当其大小最高位为0时，说明该内存块未分配
#define heapBLOCK_SIZE_IS_VALID( xBlockSize )    ( ( ( xBlockSize ) & heapBLOCK_ALLOCATED_BITMASK ) == 0 )
//用于检查内存块是否已分配，当其大小最高位为1时，说明该内存块已分配
#define heapBLOCK_IS_ALLOCATED( pxBlock )        ( ( ( pxBlock->xBlockSize ) & heapBLOCK_ALLOCATED_BITMASK ) != 0 )
//将内存块标记为已分配
#define heapALLOCATE_BLOCK( pxBlock )            ( ( pxBlock->xBlockSize ) |= heapBLOCK_ALLOCATED_BITMASK )
//将内存块标记为未分配
#define heapFREE_BLOCK( pxBlock )                ( ( pxBlock->xBlockSize ) &= ~heapBLOCK_ALLOCATED_BITMASK )
```
```c
/* 内存块分配 */
void * pvPortMalloc( size_t xWantedSize )
{
    BlockLink_t * pxBlock;
    BlockLink_t * pxPreviousBlock;
    BlockLink_t * pxNewBlockLink;
    void * pvReturn = NULL;
    size_t xAdditionalRequiredSize;
    //计算最终的内存块大小，如果合理且不会出现溢出则为请求大小 + 块头 + 补充字节，反之为0
    if( xWantedSize > 0 )
    {
        //检查用户请求大小 + 块头是否会导致整数溢出
        if( heapADD_WILL_OVERFLOW( xWantedSize, xHeapStructSize ) == 0 )
        {
            xWantedSize += xHeapStructSize;
            //检查是否字节对齐，如果需要则补充字节xAdditionalRequiredSize
            //假设用户请求了10个字节，则对齐填充为8 - 10 & 0x07 = 6，最后变为16字节
            if( ( xWantedSize & portBYTE_ALIGNMENT_MASK ) != 0x00 )
            {
                //计算补充字节
                xAdditionalRequiredSize = portBYTE_ALIGNMENT - ( xWantedSize & portBYTE_ALIGNMENT_MASK );
                //检查用户请求大小 + 块头 + 补充字节是否会溢出
                if( heapADD_WILL_OVERFLOW( xWantedSize, xAdditionalRequiredSize ) == 0 )
                {
                    xWantedSize += xAdditionalRequiredSize;
                }
                //反之设置为0
                else
                {
                    xWantedSize = 0;
                }
            }
        }
        //反之设置为0
        else
        {
            xWantedSize = 0;
        }
    }
    //暂停任务调度
    vTaskSuspendAll();
    {
        //如果pxEnd == NULL说明堆并未初始化，需要进行堆的初始化
        if( pxEnd == NULL )
        {
            prvHeapInit();
        }
        //最终的xWantedSize最高位不能为1
        if( heapBLOCK_SIZE_IS_VALID( xWantedSize ) != 0 )
        {
            //xWantedSize大于0且不会导致堆溢出
            if( ( xWantedSize > 0 ) && ( xWantedSize <= xFreeBytesRemaining ) )
            {
                //遍历空闲链表，找到第一个xBlockSize大于xWantedSize的空闲内存块
                pxPreviousBlock = &xStart;
                pxBlock = xStart.pxNextFreeBlock;
                while( ( pxBlock->xBlockSize < xWantedSize ) && ( pxBlock->pxNextFreeBlock != NULL ) )
                {
                    pxPreviousBlock = pxBlock;
                    pxBlock = pxBlock->pxNextFreeBlock;
                }
                //如果pxBlock != pxEnd则说明找到了合适的内存块
                if( pxBlock != pxEnd )
                {
                    //计算返回地址（需要跳过表头BlockLink_t），并且将该内存块从空闲列表中移除
                    pvReturn = ( void * ) ( ( ( uint8_t * )pxPreviousBlock->pxNextFreeBlock ) + xHeapStructSize );
                    pxPreviousBlock->pxNextFreeBlock = pxBlock->pxNextFreeBlock;
                    //如果该内存块剩余空间大于heapMINIMUM_BLOCK_SIZE，则分割内存块
                    if( ( pxBlock->xBlockSize - xWantedSize ) > heapMINIMUM_BLOCK_SIZE )
                    {
                        //构造新块头
                        pxNewBlockLink = ( void * ) ( ( ( uint8_t * ) pxBlock ) + xWantedSize );
                        //分割内存块
                        pxNewBlockLink->xBlockSize = pxBlock->xBlockSize - xWantedSize;
                        pxBlock->xBlockSize = xWantedSize;
                        //将分割出的内存块放回空闲列表
                        pxNewBlockLink->pxNextFreeBlock = pxPreviousBlock->pxNextFreeBlock;
                        pxPreviousBlock->pxNextFreeBlock = pxNewBlockLink;
                    }
                    //更新空闲内存信息
                    xFreeBytesRemaining -= pxBlock->xBlockSize;
                    if( xFreeBytesRemaining < xMinimumEverFreeBytesRemaining )
                    {
                        xMinimumEverFreeBytesRemaining = xFreeBytesRemaining;
                    }
                    //将块标记为已分配
                    heapALLOCATE_BLOCK( pxBlock );
                    //将pxBlock从空闲链表彻底移除
                    pxBlock->pxNextFreeBlock = NULL;
                    //增加xNumberOfSuccessfulAllocations
                    xNumberOfSuccessfulAllocations++;
                }
            }
        }
    }
    //恢复任务调度
    ( void ) xTaskResumeAll();
    return pvReturn;
}
```
**②内存块释放**
>**概述**：找到释放内存块**真正的起始地址**，并使用`prvInsertBlockIntoFreeList`将其添加到空闲链表
{%list%}
用户使用的内存不包含块头BlockLink_t，所以需要将用户传入地址前移xHeapStructSize得到内存块真实起始地址
{%endlist%}
{%right%}
可以定义configHEAP_CLEAR_MEMORY_ON_FREE将清除释放内存块内容防止信息外泄
{%endright%}
{%warning%}
在对内存块进行释放操作前，需要检查其地址有效性并检查其是否被分配以及是否不在空闲链表中
{%endwarning%}
```c
/* 内存块释放 */
void vPortFree( void * pv )
{
    //puc用于字节级别的地址计算，pxLink用于访问内存块的管理信息
    uint8_t * puc = ( uint8_t * ) pv;
    BlockLink_t * pxLink;
    //确保释放内存有效
    if( pv != NULL )
    {
        //找到内存块真正的起始地址
        puc -= xHeapStructSize;
        pxLink = ( void * ) puc;
        //确认块确实被分配以及pxLink->pxNextFreeBlock == NULL即内存块不在空闲链表中，防止块重复释放
        if( heapBLOCK_IS_ALLOCATED( pxLink ) != 0 )
        {
            if( pxLink->pxNextFreeBlock == NULL )
            {
                //将其标记为空闲
                heapFREE_BLOCK( pxLink );
                //如果定义了configHEAP_CLEAR_MEMORY_ON_FREE，将释放内存全部填充0
                #if ( configHEAP_CLEAR_MEMORY_ON_FREE == 1 )
                {
                    if( heapSUBTRACT_WILL_UNDERFLOW( pxLink->xBlockSize, xHeapStructSize ) == 0 )
                    {
                        ( void ) memset( puc + xHeapStructSize, 0, pxLink->xBlockSize - xHeapStructSize );
                    }
                }
                #endif
                //暂停调度并将该内存块通过prvInsertBlockIntoFreeList添加到空闲链表
                vTaskSuspendAll();
                {
                    xFreeBytesRemaining += pxLink->xBlockSize;
                    prvInsertBlockIntoFreeList( ( ( BlockLink_t * ) pxLink ) );
                    //增加xNumberOfSuccessfulFrees
                    xNumberOfSuccessfulFrees++;
                }
                //恢复调度
                ( void ) xTaskResumeAll();
            }
        }
    }
}
```
**③内存块合并**
>**概述**：遍历空闲链表找到其**插入位置**，并尝试进行**前驱块/后继块**和插入块的合并，最后将其插入空闲链表
{%list%}
空闲链表将内存块按照地址从低到高排列
{%endlist%}
{%right%}
当插入内存块的起始地址/结束地址等于其前驱块的结束地址/后继块的起始地址，说明需要发生内存块合并
{%endright%}
{%warning%}
如果需要合并后继块时后继块为pxEnd，只简单更新pxBlockToInsert->pxNextFreeBlock为pxEnd而不进行合并
{%endwarning%}
```c
/* 将释放的内存块重新插入空闲列表，并执行前后相邻块的合并 */
static void prvInsertBlockIntoFreeList( BlockLink_t * pxBlockToInsert ) 
{
    //puc用于字节级别的地址计算，pxIterator用于访问内存块的管理信息
    BlockLink_t * pxIterator;
    uint8_t * puc;
    //遍历空闲列表，使得pxIterator的地址小于插入块，pxIterator->pxNextFreeBlock的地址大于插入块
    //即pxIterator指向前驱块，pxIterator->pxNextFreeBlock指向后驱块
    for( pxIterator = &xStart; pxIterator->pxNextFreeBlock < pxBlockToInsert; pxIterator = pxIterator->pxNextFreeBlock )
    {

    }
    puc = ( uint8_t * ) pxIterator;
    //如果前驱块的结束地址等于待插入块的起始地址，则合并两个内存块
    //pxBlockToInsert更新为pxIterator，即后续处理以前驱块为主
    if( ( puc + pxIterator->xBlockSize ) == ( uint8_t * ) pxBlockToInsert )
    {
        pxIterator->xBlockSize += pxBlockToInsert->xBlockSize;
        pxBlockToInsert = pxIterator;
    }
    puc = ( uint8_t * ) pxBlockToInsert;
    //如果待插入块的结束地址等于后继块的起始地址
    if( ( puc + pxBlockToInsert->xBlockSize ) == ( uint8_t * )pxIterator->pxNextFreeBlock )
    {
        //若后继块不为pxEnd，合并两个内存块
        if( pxIterator->pxNextFreeBlock != pxEnd )
        {
            pxBlockToInsert->xBlockSize += pxIterator->pxNextFreeBlock->xBlockSize;
            pxBlockToInsert->pxNextFreeBlock = pxIterator->pxNextFreeBlock->pxNextFreeBlock;
        }
        //反之只更新pxBlockToInsert->pxNextFreeBlock为pxEnd
        else
        {
            pxBlockToInsert->pxNextFreeBlock = pxEnd;
        }
    }
    //反之将更新pxBlockToInsert->pxNextFreeBlock为后继块
    else
    {
        pxBlockToInsert->pxNextFreeBlock = pxIterator->pxNextFreeBlock;
    }
    //如果没有发生前向合并，更新前驱块的pxNextFreeBlock指针
    if( pxIterator != pxBlockToInsert )
    {
        pxIterator->pxNextFreeBlock = pxBlockToInsert;
    }
}
```

