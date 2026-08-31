---
title: FreeRTOS源码阅读（二）
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
keywords: FreeRTOS源码阅读（二）, RTOS, FreeRTOS
updated: ''
img: /medias/featureimages/38.webp
date: 2026-06-30 13:55:14
summary: 任务系统（一）
---
# FreeRTOS
## FreeRTOS源码阅读（二）
### 任务系统（一）
#### 1.列表结构
**①简介**
>**概述**：`FreeRTOS`重要的一种**数据结构**，详细见`list.c`和`list.h`，其定义如下所示
{%list%}
列表实际上为一双向链表，有一个哨兵节点xListEnd，当列表被初始化时，其值被设置为portMAX_DELAY
{%endlist%}
{%right%}
哨兵节点类型为MiniListItem_t，没有所属列表和任务，用以节省内存
{%endright%}
```c
/* 列表项定义 */
struct xLIST;                           //列表前向定义
//列表项定义
struct xLIST_ITEM
{          
    TickType_t xItemValue;              //列表项的值
    struct xLIST_ITEM *  pxNext;        //指向下一个列表项
    struct xLIST_ITEM *  pxPrevious;    //指向前一个列表项
    void * pvOwner;                     //指向拥有该列表项的任务等
    struct xLIST *  pxContainer;        //指向拥有该列表项的列表             
};
typedef struct xLIST_ITEM ListItem_t;
/* 列表定义 */
typedef struct xLIST
{     
    volatile UBaseType_t uxNumberOfItems;     //列表项的数目，由于其动态变化，需要volatile修饰
    ListItem_t * configLIST_VOLATILE pxIndex; //用于遍历列表的当前指针
    MiniListItem_t xListEnd;                  //哨兵节点，不实际存储数据，作仅作为结束标记
}List_t;
/* 最小列表项 */
struct xMINI_LIST_ITEM
{
    TickType_t xItemValue;
    struct xLIST_ITEM * configLIST_VOLATILE pxNext;
    struct xLIST_ITEM * configLIST_VOLATILE pxPrevious;
};
typedef struct xMINI_LIST_ITEM MiniListItem_t;
```
```c
/* 链表初始化 */
void vListInitialise( List_t * const pxList )
{
    //pxIndex指向哨兵节点
    pxList->pxIndex = ( ListItem_t * ) &( pxList->xListEnd ); 
    //将哨兵节点的xItemValue设置为一特殊值表示该列表被初始化
    pxList->xListEnd.xItemValue = portMAX_DELAY;
    //哨兵节点的前后指针均指向自己
    pxList->xListEnd.pxNext = ( ListItem_t * ) &( pxList->xListEnd );     
    pxList->xListEnd.pxPrevious = ( ListItem_t * ) &( pxList->xListEnd ); 
    //列表项数目初始化为0
    pxList->uxNumberOfItems = ( UBaseType_t ) 0U;
}
/* 列表项初始化 */
void vListInitialiseItem( ListItem_t * const pxItem )
{
    //将其所属容器设置为NULL
    pxItem->pxContainer = NULL;
}
```
**②列表插入**
>**概述**：列表有两种插入方式`vListInsertEnd`和`vListInsert`，前者用于管理**无序列表**，后者用于管理**有序列表**
{%list%}
vListInsertEnd将新节点插入到pxIndex之前，即列表的逻辑尾部，vListInsert保证列表项按其值升序排列
{%endlist%}
{%right%}
如果列表项的值为portMAX_DELAY，vListInsert直接将该列表项插入到哨兵节点之前
{%endright%}
```c
/* 将列表项插入指定列表的pxIndex指向的前一个位置，即列表的逻辑尾部 */
void vListInsertEnd( List_t * const pxList,                 
                     ListItem_t * const pxNewListItem )
{
    //获取列表的当前列表项指针
    ListItem_t * const pxIndex = pxList->pxIndex;
    //将指定列表项插入到pxIndex所指节点之前
    pxNewListItem->pxNext = pxIndex;
    pxNewListItem->pxPrevious = pxIndex->pxPrevious;
    pxIndex->pxPrevious->pxNext = pxNewListItem;
    pxIndex->pxPrevious = pxNewListItem;
    //更新列表项所有者以及列表的列表项数量
    pxNewListItem->pxContainer = pxList;
    ( pxList->uxNumberOfItems )++;
}
/* 将指定列表项插入指定列表，并保证列表项按照其xItemValue升序排列 */
void vListInsert( List_t * const pxList,
                  ListItem_t * const pxNewListItem )
{
    //用于存储插入位置
    ListItem_t * pxIterator;
    //获取指定列表项的xItemValue
    const TickType_t xValueOfInsertion = pxNewListItem->xItemValue;
    //如果该值为portMAX_DELAY，则将pxIterator设置为哨兵节点的前驱节点
    //反之从哨兵节点开始遍历，将pxIterator设置为第一个xItemValue大于插入节点的节点的前驱节点
    if( xValueOfInsertion == portMAX_DELAY )
    {
        pxIterator = pxList->xListEnd.pxPrevious;
    }
    else
    {
        for( pxIterator = ( ListItem_t * ) &( pxList->xListEnd ); pxIterator->pxNext->xItemValue <= xValueOfInsertion; pxIterator = pxIterator->pxNext ) 
        {
        }
    }
    //将指定节点插入到pxIterator节点之后
    pxNewListItem->pxNext = pxIterator->pxNext;
    pxNewListItem->pxNext->pxPrevious = pxNewListItem;
    pxNewListItem->pxPrevious = pxIterator;
    pxIterator->pxNext = pxNewListItem;
    //更新相关信息
    pxNewListItem->pxContainer = pxList;
    ( pxList->uxNumberOfItems )++;
}
```
**③辅助操作**
>**概述**：`FreeRTOS`在`list.h`中定义了一系列**宏函数**用于操作列表，如下所示
{%list%}
listGET_OWNER_OF_NEXT_ENTRY用于后移列表的pxIndex并返回其所有者，通常用于无序列表的FIFO
{%endlist%}
{%right%}
listGET_HEAD_ENTRY用于获取列表哨兵节点的下一节点，通常用于从有序列表中获取最高优先级任务
{%endright%}
{%warning%}
listREMOVE_ITEM只会将指定节点从列表中移除，并不会释放节点内存
{%endwarning%}
```c
//设置指定列表项的所有者
#define listSET_LIST_ITEM_OWNER( pxListItem, pxOwner )    ( ( pxListItem )->pvOwner = ( void * ) ( pxOwner ) )
//读取指定列表项的所有者
#define listGET_LIST_ITEM_OWNER( pxListItem )             ( ( pxListItem )->pvOwner )
//设置指定列表项的值
#define listSET_LIST_ITEM_VALUE( pxListItem, xValue )     ( ( pxListItem )->xItemValue = ( xValue ) )
//读取指定列表项的值
#define listGET_LIST_ITEM_VALUE( pxListItem )             ( ( pxListItem )->xItemValue )
//获取指定列表项的下一个列表项
#define listGET_NEXT( pxListItem )                        ( ( pxListItem )->pxNext )
//检查指定列表项是否属于指定列表
#define listIS_CONTAINED_WITHIN( pxList, pxListItem )    ( ( ( pxListItem )->pxContainer == ( pxList ) ) ? ( pdTRUE ) : ( pdFALSE ) )
//获取指定列表项的所属列表
#define listLIST_ITEM_CONTAINER( pxListItem )            ( ( pxListItem )->pxContainer )
//返回第一个有效列表项
#define listGET_HEAD_ENTRY( pxList )                      ( ( ( pxList )->xListEnd ).pxNext )
//返回第一个有效列表项的值
#define listGET_ITEM_VALUE_OF_HEAD_ENTRY( pxList )        ( ( ( pxList )->xListEnd ).pxNext->xItemValue )
//获取第一个有效列表项的所有者
#define listGET_OWNER_OF_HEAD_ENTRY( pxList )            ( ( &( ( pxList )->xListEnd ) )->pxNext->pvOwner )
//获取哨兵节点指针
#define listGET_END_MARKER( pxList )                      ( ( ListItem_t const * ) ( &( ( pxList )->xListEnd ) ) )
//判断列表是否为空
#define listLIST_IS_EMPTY( pxList )                       ( ( ( pxList )->uxNumberOfItems == ( UBaseType_t ) 0 ) ? pdTRUE : pdFALSE )
//获取当前列表长度
#define listCURRENT_LIST_LENGTH( pxList )                 ( ( pxList )->uxNumberOfItems )
//检查列表是否初始化
#define listLIST_IS_INITIALISED( pxList )                ( ( pxList )->xListEnd.xItemValue == portMAX_DELAY )
/* 后移列表的pxIndex并返回其所有者，若遇到哨兵节点则跳过，通常用于遍历列表 */
#define listGET_OWNER_OF_NEXT_ENTRY( pxTCB, pxList )                                           \
    {                                                                                          \
        List_t * const pxConstList = ( pxList );                                               \
        ( pxConstList )->pxIndex = ( pxConstList )->pxIndex->pxNext;                           \
        if( ( void * ) ( pxConstList )->pxIndex == ( void * ) &( ( pxConstList )->xListEnd ) ) \
        {                                                                                      \
            ( pxConstList )->pxIndex = ( pxConstList )->pxIndex->pxNext;                       \
        }                                                                                      \
        ( pxTCB ) = ( pxConstList )->pxIndex->pvOwner;                                         \
    }
/*从列表中移除某个列表项，若pxIndex指向该列表项需要将其指向该列表项的前一个列表项 */
#define listREMOVE_ITEM( pxItemToRemove ) \
    {                                     \
        List_t * const pxList = ( pxItemToRemove )->pxContainer;                 \
                                                                                 \
        ( pxItemToRemove )->pxNext->pxPrevious = ( pxItemToRemove )->pxPrevious; \
        ( pxItemToRemove )->pxPrevious->pxNext = ( pxItemToRemove )->pxNext;     \
        if( pxList->pxIndex == ( pxItemToRemove ) )                              \
        {                                                                        \
            pxList->pxIndex = ( pxItemToRemove )->pxPrevious;                    \
        }                                                                        \
                                                                                 \
        ( pxItemToRemove )->pxContainer = NULL;                                  \
        ( pxList->uxNumberOfItems )--;                                           \
    }
```
#### 2.任务创建
**①任务管理**
>**概述**：**任务控制块**如下所示，其中重要成员为`pxTopOfStack`、`uxPriority`、`xStateListItem`和`xEventListItem`
{%list%}
xStateListItem用于将任务挂载到与任务状态相关的列表中，xEventListItem将任务挂载到与事件等待相关的列表中
{%endlist%}
{%right%}
FreeRTOS提供两种基本任务列表，即就序列表和延迟列表，其中每个优先级都有对应就绪列表
{%endright%}
{%warning%}
pxTopOfStack必须为TCB_t的第一个成员，便于汇编函数读取该成员
{%endwarning%}
```c
//任务控制块
typedef struct tskTaskControlBlock       
{
  volatile StackType_t * pxTopOfStack;              //任务栈顶指针
  ListItem_t xStateListItem;                        //状态列表项
  ListItem_t xEventListItem;                        //事件列表项
  UBaseType_t uxPriority;                           //当前优先级
  StackType_t * pxStack;                            //任务栈起始地址，用于栈的释放
  char pcTaskName[ configMAX_TASK_NAME_LEN ];       //任务名称数组
  //其余成员略
}tskTCB;
typedef tskTCB TCB_t;
```
```c
//任务管理列表
static List_t pxReadyTasksLists[ configMAX_PRIORITIES ];        //就绪列表数组
static List_t xDelayedTaskList1;                                //延迟列表1
static List_t xDelayedTaskList2;                                //延迟列表2
static List_t * volatile pxDelayedTaskList;                     //当前延迟列表指针 
static List_t * volatile pxOverflowDelayedTaskList;             //溢出延迟列表指针
static List_t xPendingReadyList;                                //若某任务在中断中被唤醒，不会直接存入就绪列表，而是先进入该列表
```
**②`xTaskCreate`**
>**概述**：`FreeRTOS`提供`xTaskCreate`动态创建任务，代码如下所示
{%list%}
创建任务的主要工作为分配任务栈和TCB，并初始化TCB相关成员，最后将任务加入就绪列表
{%endlist%}
{%right%}
先分配的对象位于低地址，所以对于从高地址向低地址增长的栈，需要先分配栈防止其在增长过程中破坏TCB
{%endright%}
```c
/* 任务创建：为任务分配栈和TCB → 初始化任务（TCB各个成员等） → 将该任务加入就绪任务列表，返回值为pdPASS则创建成功 */
BaseType_t xTaskCreate( TaskFunction_t pxTaskCode,                   //任务指针函数
                        const char * const pcName,                   //任务名称
                        const configSTACK_DEPTH_TYPE usStackDepth,   //栈的深度，即字数（一个字32位）
                        void * const pvParameters,                   //任务参数
                        UBaseType_t uxPriority,                      //任务优先级
                        TaskHandle_t * const pxCreatedTask )         //返回的任务句柄
{
    TCB_t * pxNewTCB;
    BaseType_t xReturn;
    //动态分配任务栈内存，StackType_t为32位无符号整型
    StackType_t * pxStack;
    pxStack = pvPortMallocStack( ( ( ( size_t ) usStackDepth ) * sizeof( StackType_t ) ) ); 
    //如果任务栈分配成功
    if( pxStack != NULL )
    {
        //分配TCB
        pxNewTCB = ( TCB_t * ) pvPortMalloc( sizeof( TCB_t ) ); 
        //TCB分配成功
        if( pxNewTCB != NULL )
        {
            //清空TCB
            memset( ( void * ) pxNewTCB, 0x00, sizeof( TCB_t ) );
            //设置pxStack成员
            pxNewTCB->pxStack = pxStack;
        }
        //若TCB分配失败，则释放栈内存
        else
        {
            vPortFreeStack( pxStack );
        }
    }
    //栈分配失败则直接将pxNewTCB置为NULL
    else
    {
        pxNewTCB = NULL;
    }
    //如果TCB和任务栈分配成功
    if( pxNewTCB != NULL )
    {
        //初始化TCB相关成员
        prvInitialiseNewTask( pxTaskCode, pcName, ( uint32_t ) usStackDepth, pvParameters, uxPriority, pxCreatedTask, pxNewTCB, NULL );
        //将任务加入就绪列表
        prvAddNewTaskToReadyList( pxNewTCB );
        //返回值设置为pdPASS
        xReturn = pdPASS;
    }
    //分配失败则返回errCOULD_NOT_ALLOCATE_REQUIRED_MEMORY
    else
    {
        xReturn = errCOULD_NOT_ALLOCATE_REQUIRED_MEMORY;
    }
    return xReturn;
}
```
**③`prvInitialiseNewTask`**
>**概述**：初始化`TCB`各成员，如`xStateListItem`和`pxTopOfStack`，并调用`pxPortInitialiseStack`**初始化任务堆栈**
{%list%}
将xEventListItem的值初始化为configMAX_PRIORITIES - uxPriority，确保优先级高的任务在事件列表中靠前
{%endlist%}
{%right%}
pxPortInitialiseStack对任务栈进行初始化，即构造任务上下文和异常返回帧，使其在首次调度时能正确启动
{%endright%}
{%warning%}
设置栈顶pxTopOfStack时，需要确保其是内存对齐的（8字节对齐）
{%endwarning%}
```c
/* 初始化新创建任务：计算栈顶地址并进行内存对齐 → 复制任务名称 → 检查并设置优先级和基础优先级 → 初始化并设置任务的列表项成员 → 初始化堆栈模拟异常返回帧 */
static void prvInitialiseNewTask( TaskFunction_t pxTaskCode,              //任务指针函数
                                  const char * const pcName,              //任务名称
                                  const uint32_t ulStackDepth,            //堆栈深度
                                  void * const pvParameters,              //任务参数
                                  UBaseType_t uxPriority,                 //任务优先级
                                  TaskHandle_t * const pxCreatedTask,     //返回的任务句柄
                                  TCB_t * pxNewTCB,                       //任务TCB指针
                                  const MemoryRegion_t * const xRegions ) //MPU内存区域，没有启用
{
    StackType_t * pxTopOfStack;
    UBaseType_t x;
    //计算栈顶位置
    pxTopOfStack = &( pxNewTCB->pxStack[ ulStackDepth - ( uint32_t ) 1 ] );
    //地址对齐处理，这里是向前对齐，即若pxTopOfStack为0x80001003，会被设置为0x80001000
    pxTopOfStack = ( StackType_t * ) ( ( ( portPOINTER_SIZE_TYPE ) pxTopOfStack ) & ( ~( ( portPOINTER_SIZE_TYPE ) portBYTE_ALIGNMENT_MASK ) ) ); 
    //如果提供了任务名称，则将其复制到pxNewTCB->pcTaskName
    if( pcName != NULL )
    {
        //逐字符复制
        for( x = ( UBaseType_t ) 0; x < ( UBaseType_t ) configMAX_TASK_NAME_LEN; x++ )
        {
            pxNewTCB->pcTaskName[ x ] = pcName[ x ];
            if( pcName[ x ] == ( char ) 0x00 )
            {
                break;
            }
        }
        //确保一定有终止符
        pxNewTCB->pcTaskName[ configMAX_TASK_NAME_LEN - 1 ] = '\0';
    }
    //检查优先级是否有效，如果优先级超出范围即0~31，则设置为最大允许优先级31
    if( uxPriority >= ( UBaseType_t ) configMAX_PRIORITIES )
    {
        uxPriority = ( UBaseType_t ) configMAX_PRIORITIES - ( UBaseType_t ) 1U;
    }
    pxNewTCB->uxPriority = uxPriority;
    //如果启用了互斥量，则设置基础优先级，用于保存任务的原始优先级
    #if ( configUSE_MUTEXES == 1 )
    {
        pxNewTCB->uxBasePriority = uxPriority;
    }
    #endif 
    //初始化任务的状态列表项和事件列表项，其中xEventListItem的值被设置为configMAX_PRIORITIES - uxPriority，使得uxPriority越大的任务在事件列表排序越靠前（因为其是升序排列）
    //其中xStateListItem的值只有在其被阻塞时设置，设置为任务的唤醒时间
    vListInitialiseItem( &( pxNewTCB->xStateListItem ) );
    vListInitialiseItem( &( pxNewTCB->xEventListItem ) );
    listSET_LIST_ITEM_OWNER( &( pxNewTCB->xStateListItem ), pxNewTCB );
    listSET_LIST_ITEM_VALUE( &( pxNewTCB->xEventListItem ), ( TickType_t ) configMAX_PRIORITIES - ( TickType_t ) uxPriority ); 
    listSET_LIST_ITEM_OWNER( &( pxNewTCB->xEventListItem ), pxNewTCB );
    //初始化堆栈，模拟异常返回帧
    pxNewTCB->pxTopOfStack = pxPortInitialiseStack( pxTopOfStack, pxTaskCode, pvParameters );
    //如果提供了pxCreatedTask参数，则将TCB地址赋给他
    if( pxCreatedTask != NULL )
    {
        *pxCreatedTask = ( TaskHandle_t ) pxNewTCB;
    }
}
```
**④`prvAddNewTaskToReadyList`**
>**概述**：将**新任务**添加到**对应就绪列表**中，并根据系统状态进行**任务切换**等操作
{%list%}
如果该任务为系统第一个任务，则将pxCurrentTCB设置为该任务并初始化各个任务管理列表
{%endlist%}
{%right%}
当新任务优先级高于当前运行任务时，若调度器未运行，直接将pxCurrentTCB设置为该任务，反之进行任务切换
{%endright%}
{%warning%}
这里需要修改全局数据如pxCurrentTCB以及任务管理列表，所以需要使用taskENTER_CRITICAL暂时关闭中断
{%endwarning%}
{%wrong%}
taskENTER_CRITICAL只能屏蔽优先级低于configMAX_SYSCALL_INTERRUPT_PRIORITY的中断，通常为5
{%endwrong%}
```c
/* 将新创建的任务添加到对应就绪列表中：如果pxCurrentTCB为空或新任务优先级更高且调度器未启动则直接将pxCurrentTCB设置为新任务 → 将任务加入对应优先级列表 → 如果新任务优先级更高且调度器正在运行则触发任务切换 */
static void prvAddNewTaskToReadyList( TCB_t * pxNewTCB )
{
    //关闭中断进入临界区
    taskENTER_CRITICAL();
    {
        //增加uxCurrentNumberOfTasks即任务总数
        uxCurrentNumberOfTasks++;
        //如果pxCurrentTCB为空，将pxCurrentTCB设置为新任务
        //如果新任务为系统第一个任务，则还要初始化各个列表
        if( pxCurrentTCB == NULL )
        {
            pxCurrentTCB = pxNewTCB;
            if( uxCurrentNumberOfTasks == ( UBaseType_t ) 1 )
            {
                prvInitialiseTaskLists();
            }
        }
        //如果pxCurrentTCB不为空，说明系统有正在执行的任务
        //如果此时调度器未启动且pxCurrentTCB的优先级小于新任务，则直接将pxCurrentTCB设置为新任务
        else
        {
            //如果调度器未启动
            if( xSchedulerRunning == pdFALSE )
            {
                //如果pxCurrentTCB的优先级小于新任务
                if( pxCurrentTCB->uxPriority <= pxNewTCB->uxPriority )
                {
                    pxCurrentTCB = pxNewTCB;
                }
            }
        }
        //增加uxTaskNumber，将任务按照优先级插入就绪列表
        uxTaskNumber++;
        prvAddTaskToReadyList( pxNewTCB );
    }
    //退出临界区
    taskEXIT_CRITICAL();
    //如果调度器已经启动且新任务优先级更高，则触发任务切换
    if( xSchedulerRunning != pdFALSE )
    {
        if( pxCurrentTCB->uxPriority < pxNewTCB->uxPriority )
        {
            taskYIELD_IF_USING_PREEMPTION();
        }
    }
}
```
```c
//将任务添加到对应优先级的就绪列表
#define prvAddTaskToReadyList( pxTCB )                                                                 \
    /* 更新对应优先级位图 */                                                                            \
    taskRECORD_READY_PRIORITY( ( pxTCB )->uxPriority );                                                \
    /* 将任务插入到对应优先级列表的逻辑尾部，确保先来的先执行 */                                           \
    listINSERT_END( &( pxReadyTasksLists[ ( pxTCB )->uxPriority ] ), &( ( pxTCB )->xStateListItem ) ); 
```
#### 3.启动调度
**①`vTaskStartScheduler`**
>**概述**：创建**空闲任务**并初始化`xNextTaskUnblockTime`和`xTickCount`等变量，最后调用`xPortStartScheduler`
{%list%}
vTaskStartScheduler将xSchedulerRunning设置为pdTRUE标志调度器的启动
{%endlist%}
{%right%}
空闲任务优先级为最低即0，主要任务为清理被删除任务的资源，且会主动让出CPU给其余同优先级任务
{%endright%}
{%warning%}
这里需要临时关闭中断，防止在系统初始化完成前执行Systick等中断处理函数（后续会开启开中断）
{%endwarning%}
```c
/* 启动RTOS内核调度器：创建空闲任务并设置为最低优先级 → 临时禁止中断并初始化xNextTaskUnblockTime、xTickCount和xSchedulerRunning → 调用xPortStartScheduler */
void vTaskStartScheduler( void )
{
    BaseType_t xReturn;
    //创建空闲任务，并将其设置为最低优先级portPRIVILEGE_BIT即0
    xReturn = xTaskCreate( prvIdleTask,
                            configIDLE_TASK_NAME,
                            configMINIMAL_STACK_SIZE,
                            ( void * ) NULL,
                            portPRIVILEGE_BIT,  
                            &xIdleTaskHandle );
    //确保空闲任务创建成功
    if( xReturn == pdPASS )
    {
        //临时禁止中断
        portDISABLE_INTERRUPTS();
        //初始化下一个任务解除阻塞时间为最大值，表示没有任务在阻塞
        xNextTaskUnblockTime = portMAX_DELAY;
        //设置调度器状态为运行
        xSchedulerRunning = pdTRUE;
        //初始化系统TICK计数器为0
        xTickCount = ( TickType_t ) configINITIAL_TICK_COUNT;
        //启动调度器
        xPortStartScheduler();
    }
}
```
```c
/* 空闲任务 */
static portTASK_FUNCTION( prvIdleTask, pvParameters )
{
    ( void ) pvParameters;
    for( ; ; )
    {
        //清理已终止的任务
        prvCheckTasksWaitingTermination();
        //同优先级有其他就绪任务时主动让出CPU
        #if ( ( configUSE_PREEMPTION == 1 ) && ( configIDLE_SHOULD_YIELD == 1 ) )
        {
            if( listCURRENT_LIST_LENGTH( &( pxReadyTasksLists[ tskIDLE_PRIORITY ] ) ) > ( UBaseType_t ) 1 )
            {
                taskYIELD();
            }
        }
        #endif
    }
}
```
**②`xPortStartScheduler`**
>**概述**：设置`PendSV`和`SysTick`中断优先级并初始化`SysTick`，最后执行`prvStartFirstTask`
{%list%}
vPortSetupTimerInterrupt先禁用SysTick，随后设置其计数值和重载值，最后启动SysTick
{%endlist%}
{%right%}
prvStartFirstTask将MSP设置为主栈初始值，随后设置CONTROL并开启中断，最后主动触发SVC异常
{%endright%}
{%warning%}
PendSV和SysTick被设置为硬件允许的最低中断优先级，确保其不会打断用户中断和SVC中断
{%endwarning%}
```c
/* 启动调度器：设置PendSV和SysTick中断优先级 → 初始化SysTick定时器和临界区嵌套计数器 → 启动第一个任务 */
BaseType_t xPortStartScheduler( void )
{
    //设置SHPR3寄存器，将PendSV和SysTick中断优先级设置为最低，此处为15
    portNVIC_SHPR3_REG |= portNVIC_PENDSV_PRI;
    portNVIC_SHPR3_REG |= portNVIC_SYSTICK_PRI;
    //初始化并启动SysTick定时器
    vPortSetupTimerInterrupt();
    //初始化临界区嵌套计数器
    uxCriticalNesting = 0;
    //启动第一个任务
    prvStartFirstTask();
    return 0;
}
```
```c
__weak void vPortSetupTimerInterrupt( void )
{
    //禁用SysTick并清除其计数值
    portNVIC_SYSTICK_CTRL_REG = 0UL;
    portNVIC_SYSTICK_CURRENT_VALUE_REG = 0UL;
    //设置重载值并启动SysTick
    portNVIC_SYSTICK_LOAD_REG = ( configSYSTICK_CLOCK_HZ / configTICK_RATE_HZ ) - 1UL;
    portNVIC_SYSTICK_CTRL_REG = ( portNVIC_SYSTICK_CLK_BIT_CONFIG | portNVIC_SYSTICK_INT_BIT | portNVIC_SYSTICK_ENABLE_BIT );
}
```
```c
/* 启动第一个任务：从向量表中取出初始栈顶值写入MSP → 设置 CONTROL 寄存器确保SVC异常处理期间使用MSP，当前为特权级 → 启用IRQ和FIQ → 主动触发SVC异常 */
__asm void prvStartFirstTask( void )
{
    //确保编译器保持8字节栈对齐
    PRESERVE8
    //将MSP设置为向量表中的初始值
    ldr r0, =0xE000ED08         //0xE000ED08为向量表偏移寄存器地址
    ldr r0, [ r0 ]              //读取向量表基地址
    ldr r0, [ r0 ]              //读取向量表第一项即主栈指针
    msr msp, r0                 //将MSP设置为该地址
    //设置 CONTROL 寄存器确保后续运行在特权级且使用MSP
    //在此之前继承裸机运行状态，通常情况下裸机程序运行在特权级，使用MSP，模式为线程模式
    mov r0, #0
    msr control, r0
    //启用IRQ和FIQ中断
    cpsie i
    cpsie f
    //内存屏障和指令屏障，确保前面的操作完成后才执行后续指令
    dsb
    isb
    //主动触发SVC异常，模式由线程模式变为异常处理模式（异常处理模式必须使用MSP，线程模式可以使用MSP也可以使用PSP）
    svc 0
    nop
    nop
}
```
**③`vPortSVCHandler`**
>**概述**：`SCV`异常处理函数，用于**启动第一个任务**，为从`FreeRTOS`进入到**用户任务**的核心函数
{%list%}
从pxCurrentTCB的栈中恢复任务上下文，并将PSP设置为对应栈顶地址，最后取消中断屏蔽并进行异常返回
{%endlist%}
{%right%}
R14被设置为0xfffffffd，表示返回线程模式并使用PSP作为后续栈指针
{%endright%}
{%warning%}
异常返回时，ARM处理器会自动依次从指定的栈中恢复R0-R3、R12、LR、PC和xPSR，即成功跳转到任务函数入口
{%endwarning%}
{%wrong%}
任务的链接寄存器被设置为prvTaskExitError，用于防止任务意外退出
{%endwrong%}
```c
/* 任务堆栈初始化，用于模拟任务第一次被调度时的异常返回帧 */
//+------------------------+ ← pxStack（堆栈起始，低地址）
//|                        |
//|      未初始化空间       |
//|                        |
//+------------------------+ ← 返回的 pxTopOfStack（当前栈顶）
//|         R4             |
//|         R5             |
//|        ....            |
//|         R11            |
//+------------------------+
//|      EXC_RETURN        |
//+------------------------+
//|         R0             |
//+------------------------+
//|         R1             |
//|         R2             |
//|         R3             |
//|         R12            |
//+------------------------+
//|         LR             |
//+------------------------+
//|         PC             |
//+------------------------+
//|         xPSR           |
//+------------------------+ ← 初始 pxTopOfStack（高地址）
StackType_t * pxPortInitialiseStack( StackType_t * pxTopOfStack,
                                     TaskFunction_t pxCode,
                                     void * pvParameters )
{
    //填充程序状态寄存器xPSR，将其设置为0x01000000，确保其处于Thumb模式
    pxTopOfStack--;
    *pxTopOfStack = portINITIAL_XPSR;    
    //填充程序计数器PC，设置为任务函数地址，并清除最低位确保其为Thumb地址
    pxTopOfStack--;
    *pxTopOfStack = ( ( StackType_t ) pxCode ) & portSTART_ADDRESS_MASK;
    //填充链接寄存器LR，设置为prvTaskExitError，防止任务错误返回
    pxTopOfStack--;
    *pxTopOfStack = ( StackType_t ) prvTaskExitError;  
    //为寄存器 R0-R3和 R12 预留空间，并将 R0 设置为pvParameters
    pxTopOfStack -= 5;                            
    *pxTopOfStack = ( StackType_t ) pvParameters; 
    //设置异常返回值，表示返回线程模式，使用PSP
    pxTopOfStack--;
    *pxTopOfStack = portINITIAL_EXC_RETURN;
    //为R4-R11预留空间
    pxTopOfStack -= 8; 
    return pxTopOfStack;
}
```
```c
/* SVC中断处理函数 */
__asm void vPortSVCHandler( void )
{
    //确保编译器保持8字节栈对齐
    PRESERVE8
    //将R0设置为当前运行任务的栈顶地址
    ldr r3, =pxCurrentTCB
    ldr r1, [ r3 ]
    ldr r0, [ r1 ]
    //从任务栈中恢复 R4-R11 和 R14 寄存器
    //由于ARM进出异常硬件会自动保存某些寄存器，所以ARM任务上下文仅为 R4-R11 和 R14 寄存器
    ldmia r0!, {r4-r11,r14}
    //将PSP更新为取出上述寄存器后的任务栈顶指针
    msr psp, r0
    //内存屏障
    isb
    //将 BASEPRI 寄存器设置为0，表示不屏蔽任何中断
    mov r0, #0
    msr basepri, r0
    //使用 EXC_RETURN 值返回，切换到线程模式并使用PSP作为栈指针
    //硬件会自动从 PSP 中恢复R0-R3, R12, LR, PC, xPSR寄存器
    bx r14
}
```
```c
//错误处理函数
static void prvTaskExitError( void )
{
    //禁止中断并进入死循环
    portDISABLE_INTERRUPTS();
    for( ; ; )
    {
    }
}
```
#### 4.任务调度
**①`SysTick`**
>**概述**：`xPortStartScheduler`会调用`vPortSetupTimerInterrupt`初始化并启动`SysTick`，即**启动任务调度**
{%list%}
SysTick每隔一段时间触发一次中断，其中断处理函数如下所示，根据xTaskIncrementTick的返回结果触发任务切换
{%endlist%}
{%right%}
调度器运行时，vPortSetupTimerInterrupt会增加xTickCount并唤醒应该被唤醒的任务，反之仅增加xPendedTicks
{%endright%}
{%warning%}
如果有更高优先级任务被唤醒、有其他同优先级就绪任务或者xSwitchRequired为true，则触发任务调度
{%endwarning%}
```c
//当处理器收到中断后，会从向量表中查找对应的中断服务程序
//硬件自动将xPSR、PC、LR、R12和R3-R0保存到PSP中（因为进入中断前使用PSP，如果是使用MSP就保存到MSP中）
//将SP更新为MSP，从线程模式切换到异常处理模式，并且将R14设置为对应的特殊值0xFFFFFFFD（因为进入异常前的状态为线程模式+使用PSP）
//随后跳转执行ISR
/* Systick中断处理函数 */
void xPortSysTickHandler( void )
{
    //屏蔽低优先级中断
    vPortRaiseBASEPRI();
    {
        //递增SysTick计数器，若需要进行任务切换则挂起一个PendSV异常
        if( xTaskIncrementTick() != pdFALSE )
        {
            portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
        }
    }
    //中断恢复，过后会立马处理被挂起的异常，通常为PendSV异常
    vPortClearBASEPRIFromISR();
}
```
```c
/* 每个TICK需要处理的事务 */
BaseType_t xTaskIncrementTick( void )
{
    TCB_t * pxTCB;
    TickType_t xItemValue;
    BaseType_t xSwitchRequired = pdFALSE;
    //如果调度器正在运行，检查是否有任务需要被唤醒
    if( uxSchedulerSuspended == ( UBaseType_t ) pdFALSE )
    {
        //增加xTickCount
        const TickType_t xConstTickCount = xTickCount + ( TickType_t ) 1;
        xTickCount = xConstTickCount;
        //如果xConstTickCount为0，说明TICK计数器溢出，交换延时列表
        if( xConstTickCount == ( TickType_t ) 0U ) 
        {
            taskSWITCH_DELAYED_LISTS();
        }
        //若xConstTickCount大于xNextTaskUnblockTime说明有任务需要解除阻塞
        if( xConstTickCount >= xNextTaskUnblockTime )
        {
            for( ; ; )
            {
                //如果阻塞列表为空，将xNextTaskUnblockTime设置为portMAX_DELAY
                if( listLIST_IS_EMPTY( pxDelayedTaskList ) != pdFALSE )
                {
                    xNextTaskUnblockTime = portMAX_DELAY;
                    break;
                }
                //反之试图唤醒阻塞列表的第一个任务（任务被加入阻塞列表时其状态列表项的值会被设置为其唤醒时间）
                else
                {
                    //获取阻塞列表的第一个任务（哨兵节点之后的任务）以及其阻塞时间
                    pxTCB = listGET_OWNER_OF_HEAD_ENTRY( pxDelayedTaskList ); 
                    xItemValue = listGET_LIST_ITEM_VALUE( &( pxTCB->xStateListItem ) );
                    //如果没有达到该任务的唤醒时间，则将xNextTaskUnblockTime置为该任务的唤醒时间并退出循环
                    if( xConstTickCount < xItemValue )
                    {
                        xNextTaskUnblockTime = xItemValue;
                        break; 
                    }
                    //将任务从延时列表中溢出
                    listREMOVE_ITEM( &( pxTCB->xStateListItem ) );
                    //将任务从对应事件列表中移除
                    if( listLIST_ITEM_CONTAINER( &( pxTCB->xEventListItem ) ) != NULL )
                    {
                        listREMOVE_ITEM( &( pxTCB->xEventListItem ) );
                    }
                    //将其加入对应就绪列表，但是和prvAddNewTaskToReadyList不同，不会进行任务切换
                    prvAddTaskToReadyList( pxTCB );
                    //如果该任务优先级高于当前运行任务，则将xSwitchRequired置为pdTRUE表明需要进行任务切换
                    #if ( configUSE_PREEMPTION == 1 )
                    {
                        if( pxTCB->uxPriority > pxCurrentTCB->uxPriority )
                        {
                            xSwitchRequired = pdTRUE;
                        }
                    }
                    #endif
                }
            }
        }
        //如果启用了时间片轮转调度，且同优先级就绪任务超过一个，则将xSwitchRequired置为pdTRUE表明需要进行任务切换
        //注意之前已经将被唤醒的任务加入到对应就绪列表，所以如果同优先级任务被唤醒也会进行任务切换
        #if ( ( configUSE_PREEMPTION == 1 ) && ( configUSE_TIME_SLICING == 1 ) )
        {
            if( listCURRENT_LIST_LENGTH( &( pxReadyTasksLists[ pxCurrentTCB->uxPriority ] ) ) > ( UBaseType_t ) 1 )
            {
                xSwitchRequired = pdTRUE;
            }
        }
        #endif  
        //如果xYieldPending不为pdFALSE则说明有待处理的任务切换请求，将xSwitchRequired置为pdTRUE表明需要进行任务切换
        #if ( configUSE_PREEMPTION == 1 )
        {
            if( xYieldPending != pdFALSE )
            {
                xSwitchRequired = pdTRUE;
            }
        }
        #endif 
    }
    //若调度器被挂起，则仅仅递增xPendedTicks
    else
    {
        ++xPendedTicks;
    }
    return xSwitchRequired;
}
```
**②`PendSV`中断**
>**概述**：`FreeRTOS`的**任务切换**实际上就是触发`PendSV`中断，**异常处理函数**如下所示
{%list%}
将任务上下文R4-R11和R14保存到任务栈中，并调用vTaskSwitchContext更新pxCurrentTCB
{%endlist%}
{%right%}
vTaskSwitchContext将pxCurrentTCB更新为最高优先级任务列表的下一个任务，保证了同优先级任务的FIFO
{%endright%}
{%warning%}
由于过程中需要调用vTaskSwitchContext，所以需要保存R0-R3，即调用者需要保存的函数
{%endwarning%}
```c
//当处理器收到中断后，会从向量表中查找对应的中断服务程序
//硬件自动将xPSR、PC、LR、R12和R3-R0保存到PSP中（因为进入中断前使用PSP，如果是使用MSP就保存到MSP中）
//将SP更新为MSP，从线程模式切换到异常处理模式，并且将R14设置为对应的特殊值0xFFFFFFFD（因为进入异常前的状态为线程模式+使用PSP）
//随后跳转执行ISR
/* Pendsv异常处理函数 */
__asm void xPortPendSVHandler( void )
{
    extern uxCriticalNesting;
    extern pxCurrentTCB;
    extern vTaskSwitchContext;
    PRESERVE8
    //1.保存当前任务上下文到任务栈中
    //获取当前任务进程栈指针R0和TCB地址R2
    mrs r0, psp
    isb
    ldr r3, =pxCurrentTCB
    ldr r2, [ r3 ]
    //将 R4-R11 和 R14 寄存器保存到任务栈中并更新TCB中的pxTopOfStack成员
    stmdb r0!, {r4-r11, r14}
    str r0, [ r2 ]
    //临时保存 R0和 R3 到 MSP，并屏蔽低优先级中断
    stmdb sp!, {r0, r3}
    mov r0, #configMAX_SYSCALL_INTERRUPT_PRIORITY
    msr basepri, r0
    dsb
    isb
    //调用vTaskSwitchContext更新pxCurrentTCB指向新任务
    bl vTaskSwitchContext
    //取消中断屏蔽并从主栈中恢复 R0 和 R3
    mov r0, #0
    msr basepri, r0
    ldmia sp!, {r0, r3}
    //获取新任务的TCB指针和任务栈指针
    ldr r1, [ r3 ]
    ldr r0, [ r1 ]  
    //从新任务栈中恢复 R4-R11 和 R14 寄存器
    ldmia r0!, {r4-r11, r14}
    //更新 PSP 为新任务栈
    msr psp, r0
    isb
    //使用 EXC_RETURN 值返回，切换到线程模式并使用PSP作为栈指针
    //硬件会自动从 PSP 中恢复R0-R3, R12, LR, PC, xPSR寄存器即切换到新的任务
    bx r14
}
```
```c
/* 选择下一个要执行的任务 */
void vTaskSwitchContext( void )
{
    //如果调度器被挂起，将xYieldPending置为pdTRUE，表示有切换请求待处理
    if( uxSchedulerSuspended != ( UBaseType_t ) pdFALSE )
    {
        xYieldPending = pdTRUE;
    }
    //反之将xYieldPending置为pdFALSE，并且将当前运行任务切换为下一个优先级最高的任务
    else
    {
        xYieldPending = pdFALSE;
        taskSELECT_HIGHEST_PRIORITY_TASK();
    }
}
//将pxCurrentTCB设置为下一个最高优先级任务
//这里使用clz指令加速最高优先级的寻找，clz指令可以返回32位无符号整数前导0的数量，比如说__clz(0x00000001) = 31，此时最高优先级为0
//这里使用listGET_OWNER_OF_NEXT_ENTRY获取下一个任务，即增加列表的pxIndex并返回其所有者，保证同优先级任务先来先运行
#define taskSELECT_HIGHEST_PRIORITY_TASK()                                                  \
{                                                                                           \
    UBaseType_t uxTopPriority;                                                              \
    /* 找到最高有效优先级 */                                                                 \
    portGET_HIGHEST_PRIORITY( uxTopPriority, uxTopReadyPriority );                          \
    /* 从指定优先级列表中获取下一个任务并将其赋予pxCurrentTCB */                               \
    listGET_OWNER_OF_NEXT_ENTRY( pxCurrentTCB, &( pxReadyTasksLists[ uxTopPriority ] ) );   \
} 
```
**③调度器控制**
>**概述**：`FreeRTOS`提供`vTaskSuspendAll`和`xTaskResumeAll`暂停和恢复调度器的运行，如下所示
{%list%}
vTaskSuspendAll仅仅递增uxSchedulerSuspended，当代码涉及到调度器时会检测该变量并进行不同的处理
{%endlist%}
{%right%}
当需要恢复调度时，xTaskResumeAll将xPendingReadyList所有任务转移到对应就绪列表，并处理累计的Tick事件
{%endright%}
{%warning%}
当有优先级不小于pxCurrentTCB的任务就绪时或处理Tick事件过程中判断需要进行任务切换，挂起PendSV异常
{%endwarning%}
```c
/* 挂起任务调度器，暂停所有任务调度 */
void vTaskSuspendAll( void )
{   
    //递增调度器挂起计数器
    ++uxSchedulerSuspended;
}
```
```c
/* 恢复被挂起的调度器 */
BaseType_t xTaskResumeAll( void )
{
    TCB_t * pxTCB = NULL;
    //用于标记该函数执行过程中是否执行了任务切换
    BaseType_t xAlreadyYielded = pdFALSE;
    //进入临界区
    taskENTER_CRITICAL();
    {
        //减少挂起次数
        --uxSchedulerSuspended;
        //当挂起次数为0时，说明需要恢复调度
        if( uxSchedulerSuspended == ( UBaseType_t ) pdFALSE )
        {
            //确保系统中确实有任务存在
            if( uxCurrentNumberOfTasks > ( UBaseType_t ) 0U )
            {
                //将xPendingReadyList中的所有任务转移到就绪列表，即调度器挂起期间/中断处理中变为就绪状态的任务
                //如果有更高优先级任务就绪，则将xYieldPending置为true
                while( listLIST_IS_EMPTY( &xPendingReadyList ) == pdFALSE )
                {
                    //获取首个挂起任务（哨兵节点后的任务）
                    pxTCB = listGET_OWNER_OF_HEAD_ENTRY( ( &xPendingReadyList ) ); 
                    //将其从事件列表中移除
                    listREMOVE_ITEM( &( pxTCB->xEventListItem ) );
                    //将其从挂起列表中移除并添加都就绪列表
                    listREMOVE_ITEM( &( pxTCB->xStateListItem ) );
                    prvAddTaskToReadyList( pxTCB );
                    //如果该任务优先级大于等于当前运行任务，则将xYieldPending置为pdTRUE说明需要进行任务切换
                    if( pxTCB->uxPriority >= pxCurrentTCB->uxPriority )
                    {
                        xYieldPending = pdTRUE;
                    }
                }
                //如果pxTCB不为空，说明从xPendingReadyList中转移了任务，需要重置下一次唤醒任务时间
                if( pxTCB != NULL )
                {
                    prvResetNextTaskUnblockTime();
                }
                //处理累积的Tick事件，即调用xPendedTicks次xTaskIncrementTick
                {
                    //获取暂停调度的TICK值
                    TickType_t xPendedCounts = xPendedTicks; 
                    //不断模拟TICK中断调用xTaskIncrementTick
                    if( xPendedCounts > ( TickType_t ) 0U )
                    {
                        do
                        {
                            //如果返回值不为pdFALSE说明需要进行任务切换
                            if( xTaskIncrementTick() != pdFALSE )
                            {
                                xYieldPending = pdTRUE;
                            }
                            --xPendedCounts;
                        }while( xPendedCounts > ( TickType_t ) 0U );
                        xPendedTicks = 0;
                    }
                }
                //执行实际切换并将xAlreadyYielded置为pdTRUE，表明xTaskResumeAll过程中已经执行了任务切换
                if( xYieldPending != pdFALSE )
                {
                    #if ( configUSE_PREEMPTION != 0 )
                    {
                        xAlreadyYielded = pdTRUE;
                    }
                    #endif
                    //挂起一个PendSV异常
                    taskYIELD_IF_USING_PREEMPTION();
                }
            }
        }
    }
    //退出临界区
    taskEXIT_CRITICAL();
    return xAlreadyYielded;
}
```











