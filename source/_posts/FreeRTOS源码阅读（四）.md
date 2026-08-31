---
title: FreeRTOS源码阅读（四）
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
keywords: FreeRTOS源码阅读（四）, RTOS, FreeRTOS
updated: ''
img: /medias/featureimages/38.webp
date: 2026-06-30 13:55:14
summary: 队列
---
# FreeRTOS
## FreeRTOS源码阅读（四）
### 队列
#### 1.引言
**①简介**
>**概述**：`FreeRTOS`队列是一种**线程安全**的`FIFO`数据传输机制，用于**任务间的通信**，其定义如下所示
{%list%}
FreeRTOS的信号量是一种特殊的队列，其u成员采用SemaphoreData_t而不是QueuePointers_t
{%endlist%}
{%right%}
创建信号量和队列的接口如下所示， 信号量/互斥量本质上是长度为最大计数值/1，队列项大小为0的队列
{%endright%}
{%warning%}
每个队列都有因其满或空而阻塞的任务列表，当任务因为该队列阻塞时，其xEventListItem会进入对应列表
{%endwarning%}
>每个任务的`xEventListItem`的值在`prvInitialiseNewTask`中被初始化为`configMAX_PRIORITIES - uxPriority`
```c
//队列相关
typedef struct QueuePointers
{
    int8_t * pcTail;                                      //指向队列存储区域的末尾
    int8_t * pcReadFrom;                                  //指向下一次读取数据的位置
} QueuePointers_t;
//信号量相关
typedef struct SemaphoreData
{
    TaskHandle_t xMutexHolder;                            //指向持有该信号量的任务
    UBaseType_t uxRecursiveCallCount;                     //递归调用计数
} SemaphoreData_t;
/* 队列结构体定义 */
typedef struct QueueDefinition 
{
    int8_t * pcHead;                                     //指向队列存储区的起始地址       
    int8_t * pcWriteTo;                                  //指向下一个写入位置       
    //普通队列和信号量的区别所在
    union
    {
        QueuePointers_t xQueue;    
        SemaphoreData_t xSemaphore; 
    }u;
    List_t xTasksWaitingToSend;                         //因队列满而阻塞的发送任务列表
    List_t xTasksWaitingToReceive;                      //因队列空而阻塞的接收任务列表
    volatile UBaseType_t uxMessagesWaiting;             //队列中的有效消息数量
    UBaseType_t uxLength;                               //队列总容量
    UBaseType_t uxItemSize;                             //每个队列项的大小
    volatile int8_t cRxLock;                            //接收锁                
    volatile int8_t cTxLock;                            //发送锁              
} xQUEUE;
typedef xQUEUE Queue_t;
```
```c
//创建普通队列，队列类型为queueQUEUE_TYPE_BASE
#define xQueueCreate( uxQueueLength, uxItemSize )    xQueueGenericCreate( ( uxQueueLength ), ( uxItemSize ), ( queueQUEUE_TYPE_BASE ) )
//创建信号量
#define xSemaphoreCreateCounting( uxMaxCount, uxInitialCount )    xQueueCreateCountingSemaphore( ( uxMaxCount ), ( uxInitialCount ) )
//创建互斥量
#define xSemaphoreCreateMutex()    xQueueCreateMutex( queueQUEUE_TYPE_MUTEX )
/* 创建计数型信号量 */
QueueHandle_t xQueueCreateCountingSemaphore( const UBaseType_t uxMaxCount,        //最大计数值
                                             const UBaseType_t uxInitialCount )   //初始计数值
{
    QueueHandle_t xHandle = NULL;
    //参数的有效性检查
    if( ( uxMaxCount != 0 ) &&
        ( uxInitialCount <= uxMaxCount ) )
    {
        //创建长度为uxMaxCount，队列项大小为0的队列，并将队列类型标记queueQUEUE_TYPE_COUNTING_SEMAPHORE
        xHandle = xQueueGenericCreate( uxMaxCount, queueSEMAPHORE_QUEUE_ITEM_LENGTH, queueQUEUE_TYPE_COUNTING_SEMAPHORE );
        //若队列创建成功，初始化有效消息计数为uxInitialCount
        if( xHandle != NULL )
        {
            ( ( Queue_t * ) xHandle )->uxMessagesWaiting = uxInitialCount;
        }
    }
    return xHandle;
}
/* 创建互斥量 */
QueueHandle_t xQueueCreateMutex( const uint8_t ucQueueType )
{
    QueueHandle_t xNewQueue;
    //创建一个长度为1，队列项大小为0的队列
    const UBaseType_t uxMutexLength = ( UBaseType_t ) 1, uxMutexSize = ( UBaseType_t ) 0;
    xNewQueue = xQueueGenericCreate( uxMutexLength, uxMutexSize, ucQueueType );
    //初始化互斥量
    prvInitialiseMutex( ( Queue_t * ) xNewQueue );
    return xNewQueue;
}
```
**②`xQueueGenericCreate`**
>**概述**：`FreeRTOS`创建**普通队列**、**信号量**和**互斥量**本质上都是调用`xQueueGenericCreate`，如下所示
{%list%}
xQueueGenericCreate为队列分配Queue_t和数据存储区的内存，并调用prvInitialiseNewQueue初始化队列成员
{%endlist%}
{%right%}
初始化完成后，信号量的uxMessagesWaiting被初始化为初始计数值，互斥量的uxMessagesWaiting被初始化为1
{%endright%}
{%warning%}
队列和信号量被初始化后内存示意图如下所示，前者有数据存储区而后者没有
{%endwarning%}
```c
普通队列:[Queue_t][ data_1 ][ data_2 ]....[ data_N ]
                 |                       |         |
                 pcHead/pcWriteTo        pcReadFrom pcTail
信号量  :[Queue_t]
        |
        pcHead/pcWriteTo
```
```c
/* 队列通用创建函数：检查参数的合理性 → 为队列分配Queue_t和数据存储区的内存 → 定位数据存储区位置并初始化队列 */
QueueHandle_t xQueueGenericCreate( const UBaseType_t uxQueueLength,  //队列容量即项目数上限
                                   const UBaseType_t uxItemSize,     //每个项目的大小（以字节为单位）
                                   const uint8_t ucQueueType )       //队列类型
{
    Queue_t * pxNewQueue = NULL;
    size_t xQueueSizeInBytes;
    uint8_t * pucQueueStorage;
    //确保队列容量大于0且不会导致算术溢出
    if( ( uxQueueLength > ( UBaseType_t ) 0 ) &&
          ( ( SIZE_MAX / uxQueueLength ) >= uxItemSize ) &&
          ( ( SIZE_MAX - sizeof( Queue_t ) ) >= ( uxQueueLength * uxItemSize ) ) )
    {
        //计算数据存储区大小并分配队列结构和数据存储区内存
        xQueueSizeInBytes = ( size_t ) ( uxQueueLength * uxItemSize ); 
        pxNewQueue = ( Queue_t * ) pvPortMalloc( sizeof( Queue_t ) + xQueueSizeInBytes ); 
        //如果内存分配成功
        if( pxNewQueue != NULL )
        {
            //定位数据存储区位置并初始化队列
            pucQueueStorage = ( uint8_t * ) pxNewQueue;
            pucQueueStorage += sizeof( Queue_t ); 
            prvInitialiseNewQueue( uxQueueLength, uxItemSize, pucQueueStorage, ucQueueType, pxNewQueue );
        }
    }
    return pxNewQueue;
}
```
```c
/* 初始化一个队列 */
static void prvInitialiseNewQueue( const UBaseType_t uxQueueLength,  //队列容量
                                   const UBaseType_t uxItemSize,     //项目大小
                                   uint8_t * pucQueueStorage,        //数据存储区起始位置
                                   const uint8_t ucQueueType,        //队列类型
                                   Queue_t * pxNewQueue )            //返回的队列句柄
{
    ( void ) ucQueueType;
    //若uxItemSize为0，说明为信号量或者互斥量
    if( uxItemSize == ( UBaseType_t ) 0 )
    {
        pxNewQueue->pcHead = ( int8_t * ) pxNewQueue;
    }
    //反之为队列
    else
    {
        pxNewQueue->pcHead = ( int8_t * ) pucQueueStorage;
    }
    //设置队列长度和项大小
    pxNewQueue->uxLength = uxQueueLength;
    pxNewQueue->uxItemSize = uxItemSize;
    //初始化队列
    ( void ) xQueueGenericReset( pxNewQueue, pdTRUE );
}
```
```c
/* 重置一个队列 */
BaseType_t xQueueGenericReset( QueueHandle_t xQueue,   //需要处理的队列句柄
                               BaseType_t xNewQueue )  //标识是否为新队列
{
    BaseType_t xReturn = pdPASS;
    Queue_t * const pxQueue = xQueue;
    //确保队列有效且队列容量大于等于1且不会溢出
    if( ( pxQueue != NULL ) &&
        ( pxQueue->uxLength >= 1U ) &&
        ( ( SIZE_MAX / pxQueue->uxLength ) >= pxQueue->uxItemSize ) )
    {
        //进入临界区
        taskENTER_CRITICAL();
        {
            //初始化队列末尾指针、消息计数、写入位置、读取位置和两个锁
            pxQueue->u.xQueue.pcTail = pxQueue->pcHead + ( pxQueue->uxLength * pxQueue->uxItemSize ); 
            pxQueue->uxMessagesWaiting = ( UBaseType_t ) 0U;
            pxQueue->pcWriteTo = pxQueue->pcHead;
            pxQueue->u.xQueue.pcReadFrom = pxQueue->pcHead + ( ( pxQueue->uxLength - 1U ) * pxQueue->uxItemSize ); 
            pxQueue->cRxLock = queueUNLOCKED;
            pxQueue->cTxLock = queueUNLOCKED;
            //如果传入队列不是新队列
            if( xNewQueue == pdFALSE )
            {
                //如果发送等待队列不为空，尝试将等待队列中最高优先级的任务移动到就序列表并触发调度
                if( listLIST_IS_EMPTY( &( pxQueue->xTasksWaitingToSend ) ) == pdFALSE )
                {
                    if( xTaskRemoveFromEventList( &( pxQueue->xTasksWaitingToSend ) ) != pdFALSE )
                    {
                        queueYIELD_IF_USING_PREEMPTION();
                    }
                }
            }
            //反之初始化两个等待队列
            else
            {
                vListInitialise( &( pxQueue->xTasksWaitingToSend ) );
                vListInitialise( &( pxQueue->xTasksWaitingToReceive ) );
            }
        }
        //退出临界区
        taskEXIT_CRITICAL();
    }
    //反之返回pdFAIL
    else
    {
        xReturn = pdFAIL;
    }
    return xReturn;
}
```
```c
/* 初始化一个互斥量 */
static void prvInitialiseMutex( Queue_t * pxNewQueue )
{
    //确认队列句柄有效
    if( pxNewQueue != NULL )
    {
        //持有者为NULL
        pxNewQueue->u.xSemaphore.xMutexHolder = NULL;
        //标记队列类型为互斥量
        pxNewQueue->uxQueueType = queueQUEUE_IS_MUTEX;
        //递归计数初始化为0
        pxNewQueue->u.xSemaphore.uxRecursiveCallCount = 0;
        //发送空消息，通过xQueueGenericSend将uxMessagesWaiting从0变为1
        ( void ) xQueueGenericSend( pxNewQueue, NULL, ( TickType_t ) 0U, queueSEND_TO_BACK );
    }
}
```
**③队列读写**
>**概述**：`FreeRTOS`提供`prvCopyDataToQueue`和`prvCopyDataFromQueue`向队列**读写数据**，如下所示
{%warning%}
prvCopyDataToQueue可以操作普通队列、信号量和互斥量，prvCopyDataFromQueue只能操作普通队列
{%endwarning%}
{%list%}
对于信号量和互斥量，prvCopyDataToQueue仅增加其可用消息计数，对于普通队列，还需要进行数据的拷贝
{%endlist%}
{%right%}
对于互斥量，prvCopyDataToQueue还需要调用xTaskPriorityDisinherit恢复持有任务优先级并清除其持有者标记
{%endright%}
```c
/* 向队列写数据 */
static BaseType_t prvCopyDataToQueue( Queue_t * const pxQueue,    //队列句柄
                                      const void * pvItemToQueue, //写入数据的指针
                                      const BaseType_t xPosition )//写入位置
{
    BaseType_t xReturn = pdFALSE;
    UBaseType_t uxMessagesWaiting;
    //获取队列的有效消息数
    uxMessagesWaiting = pxQueue->uxMessagesWaiting;
    //如果队列为信号量等无数据队列
    if( pxQueue->uxItemSize == ( UBaseType_t ) 0 )
    {
        //如果队列类型为互斥量，恢复任务原始优先级并清除其持有者标记
        #if ( configUSE_MUTEXES == 1 )
        {
            if( pxQueue->uxQueueType == queueQUEUE_IS_MUTEX )
            {
                xReturn = xTaskPriorityDisinherit( pxQueue->u.xSemaphore.xMutexHolder );
                pxQueue->u.xSemaphore.xMutexHolder = NULL;
            }
        }
        #endif 
    }
    //如果写入位置为队列尾部
    else if( xPosition == queueSEND_TO_BACK )
    {
        //将数据复制到写入位置并更新写指针
        ( void ) memcpy( ( void * ) pxQueue->pcWriteTo, pvItemToQueue, ( size_t ) pxQueue->uxItemSize ); 
        pxQueue->pcWriteTo += pxQueue->uxItemSize;                                                       
        //如果写指针到达末尾，则自动回绕
        if( pxQueue->pcWriteTo >= pxQueue->u.xQueue.pcTail )                                             
        {
            pxQueue->pcWriteTo = pxQueue->pcHead;
        }
    }
    //如果写入位置为队首或采用覆盖写入
    else
    {
        //将数据复制到读指针指向位置并更新读指针
        ( void ) memcpy( ( void * ) pxQueue->u.xQueue.pcReadFrom, pvItemToQueue, ( size_t ) pxQueue->uxItemSize ); 
        pxQueue->u.xQueue.pcReadFrom -= pxQueue->uxItemSize;
        //环形缓冲区回绕处理
        if( pxQueue->u.xQueue.pcReadFrom < pxQueue->pcHead ) 
        {
            pxQueue->u.xQueue.pcReadFrom = ( pxQueue->u.xQueue.pcTail - pxQueue->uxItemSize );
        }
        //如果采用覆盖写入，需要减少可用消息计数，因为后续需要统一加一
        if( xPosition == queueOVERWRITE )
        {
            if( uxMessagesWaiting > ( UBaseType_t ) 0 )
            {
                --uxMessagesWaiting;
            }
        }
    }
    //增加可用消息计数
    pxQueue->uxMessagesWaiting = uxMessagesWaiting + ( UBaseType_t ) 1;
    return xReturn;
}
```
```c
/* 从队列读取数据 */
static void prvCopyDataFromQueue( Queue_t * const pxQueue,
                                  void * const pvBuffer )
{
    //当队列为普通队列
    if( pxQueue->uxItemSize != ( UBaseType_t ) 0 )
    {
        //更新读指针
        pxQueue->u.xQueue.pcReadFrom += pxQueue->uxItemSize;           
        //环形缓冲区回绕处理
        if( pxQueue->u.xQueue.pcReadFrom >= pxQueue->u.xQueue.pcTail ) 
        {
            pxQueue->u.xQueue.pcReadFrom = pxQueue->pcHead;
        }
        //将数据拷贝到用户缓冲区
        ( void ) memcpy( ( void * ) pvBuffer, ( void * ) pxQueue->u.xQueue.pcReadFrom, ( size_t ) pxQueue->uxItemSize ); 
    }
}
```
**④队列锁定**
>**概述**：每个队列都有`cRxLock`和`cTxLock`用于保护队列的`xTasksWaitingToSend`和`xTasksWaitingToReceive`
{%list%}
FreeRTOS提供xQueueGenericSendFromISR和xQueueReceiveFromISR在中断中读取/写入队列，如下所示
{%endlist%}
{%right%}
当中断成功读写队列时，若队列被锁定，则仅仅递增对应锁计数，等到prvUnlockQueue时再唤醒等待队列任务
{%endright%}
{%warning%}
ISR要求简洁短小，所以当有更高优先级任务在中断中被唤醒时，仅仅做标记提示用户进行任务切换
{%endwarning%}
{%wrong%}
中断中不能阻塞，所以如果队列读写失败则直接返回pdFAIL
{%endwrong%}
```c
//队列锁定状态常量定义
#define queueUNLOCKED             ( ( int8_t ) -1 )
#define queueLOCKED_UNMODIFIED    ( ( int8_t ) 0 )
/* 锁定队列 */
#define prvLockQueue( pxQueue )                            \
    taskENTER_CRITICAL();                                  \
    {                                                      \
        if( ( pxQueue )->cRxLock == queueUNLOCKED )        \
        {                                                  \
            ( pxQueue )->cRxLock = queueLOCKED_UNMODIFIED; \
        }                                                  \
        if( ( pxQueue )->cTxLock == queueUNLOCKED )        \
        {                                                  \
            ( pxQueue )->cTxLock = queueLOCKED_UNMODIFIED; \
        }                                                  \
    }                                                      \
    taskEXIT_CRITICAL()
/* 解锁队列 */
static void prvUnlockQueue( Queue_t * const pxQueue )
{
    //进入临界区
    taskENTER_CRITICAL();
    {
        int8_t cTxLock = pxQueue->cTxLock;
        //当发送锁计数大于0，说明有中断调用了xQueueGenericSendFromISR
        //若xTasksWaitingToReceive非空，不断唤醒其中优先级最高的任务
        //若有更高优先级任务被唤醒，将xYieldPending置为pdTRUE表示有任务切换请求
        while( cTxLock > queueLOCKED_UNMODIFIED )
        {
            if( listLIST_IS_EMPTY( &( pxQueue->xTasksWaitingToReceive ) ) == pdFALSE )
            {
                if( xTaskRemoveFromEventList( &( pxQueue->xTasksWaitingToReceive ) ) != pdFALSE )
                {
                    vTaskMissedYield();
                }
            }
            else
            {
                break;
            }
            --cTxLock;
        }
        //将cTxLock置为0
        pxQueue->cTxLock = queueUNLOCKED;
    }
    //退出临界区
    taskEXIT_CRITICAL();
    //进入临界区
    taskENTER_CRITICAL();
    {
        int8_t cRxLock = pxQueue->cRxLock;
        //当接收锁计数大于0，说明有中断调用了xQueueReceiveFromISR
        //若xTasksWaitingToSend非空，不断唤醒其中优先级最高的任务
        //若有更高优先级任务被唤醒，将xYieldPending置为pdTRUE表示有任务切换请求
        while( cRxLock > queueLOCKED_UNMODIFIED )
        {
            if( listLIST_IS_EMPTY( &( pxQueue->xTasksWaitingToSend ) ) == pdFALSE )
            {

                if( xTaskRemoveFromEventList( &( pxQueue->xTasksWaitingToSend ) ) != pdFALSE )
                {
                    vTaskMissedYield();
                }
                --cRxLock;
            }
            else
            {
                break;
            }
        }
        //将cRxLock置为0
        pxQueue->cRxLock = queueUNLOCKED;
    }
    //退出临界区
    taskEXIT_CRITICAL();
}
```
```c
/* 中断中读取队列 */
BaseType_t xQueueGenericSendFromISR( QueueHandle_t xQueue,
                                     const void * const pvItemToQueue,
                                     BaseType_t * const pxHigherPriorityTaskWoken,
                                     const BaseType_t xCopyPosition )
{
    BaseType_t xReturn;
    UBaseType_t uxSavedInterruptStatus;
    Queue_t * const pxQueue = xQueue;
    //屏蔽同等和更低优先级的中断并保存原始中断状态
    uxSavedInterruptStatus = portSET_INTERRUPT_MASK_FROM_ISR();
    {
        //如果队列非满或者采用覆盖写入
        if( ( pxQueue->uxMessagesWaiting < pxQueue->uxLength ) || ( xCopyPosition == queueOVERWRITE ) )
        {
            //获取队列的发送锁
            const int8_t cTxLock = pxQueue->cTxLock;
            const UBaseType_t uxPreviousMessagesWaiting = pxQueue->uxMessagesWaiting;
            //拷贝数据到队列中
            ( void ) prvCopyDataToQueue( pxQueue, pvItemToQueue, xCopyPosition );
            //如果队列的发送锁未被占有
            //将xTasksWaitingToReceive中最高优先级任务从中移除并转移到就绪列表
            //如果该任务优先级更高则将pxHigherPriorityTaskWoken置为pdTRUE
            if( cTxLock == queueUNLOCKED )
            {                                    
                if( listLIST_IS_EMPTY( &( pxQueue->xTasksWaitingToReceive ) ) == pdFALSE )
                {
                    if( xTaskRemoveFromEventList( &( pxQueue->xTasksWaitingToReceive ) ) != pdFALSE )
                    {
                        if( pxHigherPriorityTaskWoken != NULL )
                        {
                            *pxHigherPriorityTaskWoken = pdTRUE;
                        }
                    }
                }
                ( void ) uxPreviousMessagesWaiting;                           
            }
            //反之递增发送锁
            else
            {
                prvIncrementQueueTxLock( pxQueue, cTxLock );
            }
            xReturn = pdPASS;
        }
        //中断中不能阻塞，所以直接返回pdFAIL
        else
        {
            xReturn = errQUEUE_FULL;
        }
    }
    //恢复中断状态
    portCLEAR_INTERRUPT_MASK_FROM_ISR( uxSavedInterruptStatus );    
    return xReturn;
}
```
```c
/* 中断中写入队列 */
BaseType_t xQueueReceiveFromISR( QueueHandle_t xQueue,
                                 void * const pvBuffer,
                                 BaseType_t * const pxHigherPriorityTaskWoken )
{
    BaseType_t xReturn;
    UBaseType_t uxSavedInterruptStatus;
    Queue_t * const pxQueue = xQueue;
    //屏蔽同等和更低优先级的中断并保存原始中断状态
    uxSavedInterruptStatus = portSET_INTERRUPT_MASK_FROM_ISR();
    {
        //如果队列非空
        const UBaseType_t uxMessagesWaiting = pxQueue->uxMessagesWaiting;
        if( uxMessagesWaiting > ( UBaseType_t ) 0 )
        {
            //获取队列的接收锁
            const int8_t cRxLock = pxQueue->cRxLock;
            //从队列中拷贝数据
            prvCopyDataFromQueue( pxQueue, pvBuffer );
            pxQueue->uxMessagesWaiting = uxMessagesWaiting - ( UBaseType_t ) 1;
            //如果队列的接收锁未被占有
            //将xTasksWaitingToSend中最高优先级任务从中移除并转移到就绪列表
            //如果该任务优先级更高则将pxHigherPriorityTaskWoken置为pdTRUE
            if( cRxLock == queueUNLOCKED )
            {
                if( listLIST_IS_EMPTY( &( pxQueue->xTasksWaitingToSend ) ) == pdFALSE )
                {
                    if( xTaskRemoveFromEventList( &( pxQueue->xTasksWaitingToSend ) ) != pdFALSE )
                    {
                        if( pxHigherPriorityTaskWoken != NULL )
                        {
                            *pxHigherPriorityTaskWoken = pdTRUE;
                        }
                    }
                }
            }
            //反之递增接收锁
            else
            {
                prvIncrementQueueRxLock( pxQueue, cRxLock );
            }
            xReturn = pdPASS;
        }
        //中断中不能阻塞，所以直接返回pdFAIL
        else
        {
            xReturn = pdFAIL;
        }
    }
    portCLEAR_INTERRUPT_MASK_FROM_ISR( uxSavedInterruptStatus );
    return xReturn;
}
```
**⑤阻塞管理**
>**概述**：当任务**被队列阻塞**时会调用`vTaskPlaceOnEventList`将其按照**优先级大小**加入对应**事件列表**，如下所示
{%list%}
vTaskPlaceOnEventList将任务事件列表项加入事件管理列表，将状态列表项加入阻塞列表或挂起列表
{%endlist%}
{%right%}
当任务成功读写队列时，会调用xTaskRemoveFromEventList唤醒对应事件列表中优先级最高的任务
{%endright%}
{%warning%}
若调度器被挂起，xTaskRemoveFromEventList会将唤醒任务先转移到xPendingReadyList且不会更新下次唤醒时间
{%endwarning%}
```c
/* 将当前任务插入有序事件列表 */
void vTaskPlaceOnEventList( List_t * const pxEventList,
                            const TickType_t xTicksToWait )
{
    //将任务按照优先级插入对应事件列表
    vListInsert( pxEventList, &( pxCurrentTCB->xEventListItem ) );
    //将任务插入阻塞列表或挂起列表
    prvAddCurrentTaskToDelayedList( xTicksToWait, pdTRUE );
}
```
```c
/* 唤醒事件列表中优先级最高的任务 */
BaseType_t xTaskRemoveFromEventList( const List_t * const pxEventList )
{
    TCB_t * pxUnblockedTCB;
    BaseType_t xReturn;

    //获取事件列表头部任务并移除
    pxUnblockedTCB = listGET_OWNER_OF_HEAD_ENTRY( pxEventList ); 
    listREMOVE_ITEM( &( pxUnblockedTCB->xEventListItem ) );
    //如果调度器正在运行
    if( uxSchedulerSuspended == ( UBaseType_t ) pdFALSE )
    {
        //将任务从阻塞列表转移到就绪列表
        listREMOVE_ITEM( &( pxUnblockedTCB->xStateListItem ) );
        prvAddTaskToReadyList( pxUnblockedTCB );
        //更新下一个任务唤醒时间
        #if ( configUSE_TICKLESS_IDLE != 0 )
        {
            prvResetNextTaskUnblockTime();
        }
        #endif
    }
    //如果调度器挂起，则将其添加到xPendingReadyList，后续在xTaskResumeAll中统一处理
    else
    {

        listINSERT_END( &( xPendingReadyList ), &( pxUnblockedTCB->xEventListItem ) );
    }
    //如果移除任务优先级高于正在运行的任务，则将xYieldPending置为pdTRUE，说明需要进行任务切换
    if( pxUnblockedTCB->uxPriority > pxCurrentTCB->uxPriority )
    {
        xReturn = pdTRUE;
        xYieldPending = pdTRUE;
    }
    else
    {
        xReturn = pdFALSE;
    }
    return xReturn;
}

```
#### 2.生产者接口
**①简介**
>**概述**：`FreeRTOS`提供`xSemaphoreGive`和`xQueueSend`**释放信号量/互斥量**和**向队列发送数据**，如下所示
{%list%}
xSemaphoreGive和xQueueSend本质上调用的接口都是xQueueGenericSend
{%endlist%}
{%right%}
释放信号量和互斥量的最大等待时间为semGIVE_BLOCK_TIME即0，表示不可阻塞
{%endright%}
{%warning%}
只有获取互斥量的任务才能释放互斥量
{%endwarning%}
```c
//释放信号量和互斥量
#define xSemaphoreGive( xSemaphore )    xQueueGenericSend( ( QueueHandle_t ) ( xSemaphore ), NULL, semGIVE_BLOCK_TIME, queueSEND_TO_BACK )
//向普通队列传递数据
#define xQueueSend( xQueue, pvItemToQueue, xTicksToWait )    xQueueGenericSend( ( xQueue ), ( pvItemToQueue ), ( xTicksToWait ), queueSEND_TO_BACK )
```
```c
/* 通用队列发送函数 */
BaseType_t xQueueGenericSend( QueueHandle_t xQueue,             //队列句柄
                              const void * const pvItemToQueue, //要发送的数据指针
                              TickType_t xTicksToWait,          //最大等待时间
                              const BaseType_t xCopyPosition )  //数据插入位置
{
    BaseType_t xEntryTimeSet = pdFALSE, xYieldRequired;
    TimeOut_t xTimeOut;
    Queue_t * const pxQueue = xQueue;
    
    //不断循环尝试发送消息，直到成功或超时
    for( ; ; )
    {
        //进入临界区
        taskENTER_CRITICAL();
        {
            //如果队列非满或采用覆盖写入
            if( ( pxQueue->uxMessagesWaiting < pxQueue->uxLength ) || ( xCopyPosition == queueOVERWRITE ) )
            {
                //将数据写入队列
                xYieldRequired = prvCopyDataToQueue( pxQueue, pvItemToQueue, xCopyPosition );
                //如果有任务正在等待队列数据且需要进行任务切换，则触发调度
                if( listLIST_IS_EMPTY( &( pxQueue->xTasksWaitingToReceive ) ) == pdFALSE )
                {
                    if( xTaskRemoveFromEventList( &( pxQueue->xTasksWaitingToReceive ) ) != pdFALSE )
                    {
                        queueYIELD_IF_USING_PREEMPTION();
                    }
                }
                //如果prvCopyDataToQueue处理互斥量时需要进行任务切换，则触发调度
                else if( xYieldRequired != pdFALSE )
                {
                    queueYIELD_IF_USING_PREEMPTION();
                }
                //退出临界区
                taskEXIT_CRITICAL();
                return pdPASS;
            }
            //若队列已满且未采用覆盖模式
            else
            {
                //如果不允许阻塞，退出临界区并返回errQUEUE_FULL
                if( xTicksToWait == ( TickType_t ) 0 )
                {
                    taskEXIT_CRITICAL();
                    return errQUEUE_FULL;
                }
                //如果允许阻塞且任务首次进入阻塞分支，初始化超时计时器，并设置xEntryTimeSet为pdTRUE
                else if( xEntryTimeSet == pdFALSE )
                {
                    vTaskInternalSetTimeOutState( &xTimeOut );
                    xEntryTimeSet = pdTRUE;
                }
                //如果后续再次进入阻塞分支，什么也不做
                else
                {
                }
            }
        }
        //退出临界区
        taskEXIT_CRITICAL();
        //挂起任务调度器
        vTaskSuspendAll();
        //锁定队列
        prvLockQueue( pxQueue );
        //如果任务未超时
        if( xTaskCheckForTimeOut( &xTimeOut, &xTicksToWait ) == pdFALSE )
        {
            //如果队列依旧为满
            if( prvIsQueueFull( pxQueue ) != pdFALSE )
            {
                //将当前任务放入队列的发送等待列表
                vTaskPlaceOnEventList( &( pxQueue->xTasksWaitingToSend ), xTicksToWait );
                //解锁队列
                prvUnlockQueue( pxQueue );
                //恢复调度器，如果需要则立即进行任务切换
                if( xTaskResumeAll() == pdFALSE )
                {
                    portYIELD_WITHIN_API();
                }
            }
            //如果队列有空闲则解锁队列并恢复调度器
            else
            {
                prvUnlockQueue( pxQueue );
                ( void ) xTaskResumeAll();
            }
        }
        //如果任务超时，解锁队列，恢复调度并返回errQUEUE_FULL
        else
        {
            prvUnlockQueue( pxQueue );
            ( void ) xTaskResumeAll();
            return errQUEUE_FULL;
        }
    } 
}
```
**②快速阶段**
>**概述**：若队列可以被写入则**写入数据**并返回`pdPASS`，反之返回`errQUEUE_FULL`或初始化`xTimeOut`进入**慢速阶段**
{%list%}
prvCopyDataToQueue成功写入数据后，会从xTasksWaitingToReceive唤醒其中优先级最高的任务
{%endlist%}
{%right%}
若唤醒任务优先级高于pxCurrentTCB或prvCopyDataToQueue处理互斥量时需要切换任务，则挂起PendSV中断
{%endright%}
{%warning%}
因为在快速过程中需要修改队列的uxMessagesWaiting等成员，所以需要在临界区内完成
{%endwarning%}
```c
/* 通用队列发送函数 */
BaseType_t xQueueGenericSend( QueueHandle_t xQueue,             //队列句柄
                              const void * const pvItemToQueue, //要发送的数据指针
                              TickType_t xTicksToWait,          //最大等待时间
                              const BaseType_t xCopyPosition )  //数据插入位置
{
    BaseType_t xEntryTimeSet = pdFALSE, xYieldRequired;
    TimeOut_t xTimeOut;
    Queue_t * const pxQueue = xQueue;
    
    //不断循环尝试发送消息，直到成功或超时
    for( ; ; )
    {
        //进入临界区
        taskENTER_CRITICAL();
        {
            //如果队列非满或采用覆盖写入即可以向队列写入数据
            if( ( pxQueue->uxMessagesWaiting < pxQueue->uxLength ) || ( xCopyPosition == queueOVERWRITE ) )
            {
                //将数据写入队列
                xYieldRequired = prvCopyDataToQueue( pxQueue, pvItemToQueue, xCopyPosition );
                //如果有任务正在等待队列数据且需要进行任务切换，则挂起PendSV中断
                if( listLIST_IS_EMPTY( &( pxQueue->xTasksWaitingToReceive ) ) == pdFALSE )
                {
                    if( xTaskRemoveFromEventList( &( pxQueue->xTasksWaitingToReceive ) ) != pdFALSE )
                    {
                        queueYIELD_IF_USING_PREEMPTION();
                    }
                }
                //如果prvCopyDataToQueue处理互斥量时需要进行任务切换，则挂起PendSV中断
                else if( xYieldRequired != pdFALSE )
                {
                    queueYIELD_IF_USING_PREEMPTION();
                }
                //退出临界区
                taskEXIT_CRITICAL();
                return pdPASS;
            }
            //反之表示队列不允许写入数据
            else
            {
                //如果不允许阻塞，退出临界区并返回errQUEUE_FULL
                if( xTicksToWait == ( TickType_t ) 0 )
                {
                    taskEXIT_CRITICAL();
                    return errQUEUE_FULL;
                }
                //如果允许阻塞且任务首次进入阻塞分支，初始化超时计时器，并设置xEntryTimeSet为pdTRUE
                else if( xEntryTimeSet == pdFALSE )
                {
                    vTaskInternalSetTimeOutState( &xTimeOut );
                    xEntryTimeSet = pdTRUE;
                }
                //如果后续再次进入阻塞分支，什么也不做
                else
                {
                }
            }
        }
        //退出临界区
        taskEXIT_CRITICAL();
        //后续为慢速阶段的逻辑，略
    } 
}
```
**③慢速阶段**
>**概述**：如果**队列已满**且**允许阻塞**，则初始化**超时判断结构**`xTimeOut`并进入慢速阶段
{%list%}
任务未超时时，若队列依旧为满，将任务加入队列的发送等待列表和阻塞列表并触发任务切换，反之继续循环尝试
{%endlist%}
{%right%}
慢速阶段采用挂起任务调度器和队列锁取代临界区，主要保护的是vTaskPlaceOnEventList这一步操作
{%endright%}
{%warning%}
进入慢速阶段vTaskSuspendAll前，可能会有其他任务或中断从队列中读取数据，所以需要重新判断队列是否为满
{%endwarning%}
{%wrong%}
如果任务超时，则恢复调度并解锁队列，最后返回errQUEUE_FULL
{%endwrong%}
```c
BaseType_t xQueueGenericSend( QueueHandle_t xQueue,             //队列句柄
                              const void * const pvItemToQueue, //要发送的数据指针
                              TickType_t xTicksToWait,          //最大等待时间
                              const BaseType_t xCopyPosition )  //数据插入位置
{
    BaseType_t xEntryTimeSet = pdFALSE, xYieldRequired;
    TimeOut_t xTimeOut;
    Queue_t * const pxQueue = xQueue;
    
    //不断循环尝试发送消息，直到成功或超时
    for( ; ; )
    {
        //上述阶段为快速阶段，已经初始化完超时结构xTimeOut
        //在这个地方可能会被其他中断打断，可能是Systick中断切换到其他任务，也可能是其他用户中断
        //其他任务或者中断处理程序可能对队列进行读写，所以需要重新判断队列是否为满
        //挂起任务调度器
        vTaskSuspendAll();
        //锁定队列
        prvLockQueue( pxQueue );
        //如果任务未超时，xTaskCheckForTimeOut是有临界区保护的
        if( xTaskCheckForTimeOut( &xTimeOut, &xTicksToWait ) == pdFALSE )
        {
            //如果队列依旧为满，prvIsQueueFull也是有临界区保护的
            if( prvIsQueueFull( pxQueue ) != pdFALSE )
            {
                //将当前任务放入队列的发送等待列表和阻塞列表，没有临界区保护，但是有队列锁的保护
                vTaskPlaceOnEventList( &( pxQueue->xTasksWaitingToSend ), xTicksToWait );
                //解锁队列
                prvUnlockQueue( pxQueue );
                //恢复调度器，如果xTaskResumeAll没有触发任务调度，则主动触发任务调度
                if( xTaskResumeAll() == pdFALSE )
                {
                    portYIELD_WITHIN_API();
                }
            }
            //如果队列有空闲则解锁队列并恢复调度器，后续重新进入循环进入快速模式
            else
            {
                prvUnlockQueue( pxQueue );
                ( void ) xTaskResumeAll();
            }
        }
        //如果任务超时，解锁队列，恢复调度并返回errQUEUE_FULL
        else
        {
            prvUnlockQueue( pxQueue );
            ( void ) xTaskResumeAll();
            return errQUEUE_FULL;
        }
    } 
}
```
#### 3.消费者接口
**①简介**
>**概述**：`FreeRTOS`提供`xQueueReceive`**从队列读取数据**，`xSemaphoreTake`**获取信号量/互斥量**，如下所示
{%list%}
xSemaphoreTake本质上是xQueueSemaphoreTake的封装
{%endlist%}
{%right%}
与释放信号量/互斥量不同的是，获取信号量/互斥量允许阻塞
{%endright%}
```c
//获取信号量和互斥量
#define xSemaphoreTake( xSemaphore, xBlockTime )    xQueueSemaphoreTake( ( xSemaphore ), ( xBlockTime ) )
```
**②快速阶段**
>**概述**：若队列非空则**读取数据**并返回`pdPASS`，反之返回`errQUEUE_EMPTY`或初始化`xTimeOut`进入**慢速阶段**
{%list%}
对于普通队列，需要调用prvCopyDataFromQueue从中拷贝数据，对于信号量仅仅减少uxMessagesWaiting即可
{%endlist%}
{%right%}
成功获取资源后会从xTasksWaitingToSend唤醒其中优先级最高的任务，若其优先级更高则挂起PendSV中断
{%endright%}
{%warning%}
成功获取互斥量后，将当前任务设置为互斥量的持有者并递增其互斥量持有计数
{%endwarning%}
```c
BaseType_t xQueueReceive( QueueHandle_t xQueue,
                          void * const pvBuffer,
                          TickType_t xTicksToWait )
{
    BaseType_t xEntryTimeSet = pdFALSE;
    TimeOut_t xTimeOut;
    Queue_t * const pxQueue = xQueue;
    //不断循环尝试从队列中接收数据
    for( ; ; )
    {
        //进入临界区
        taskENTER_CRITICAL();
        {
            const UBaseType_t uxMessagesWaiting = pxQueue->uxMessagesWaiting;
            //如果有效消息计数大于0，说明队列有数据
            if( uxMessagesWaiting > ( UBaseType_t ) 0 )
            {
                //从队列中读取数据并更新有效消息计数
                prvCopyDataFromQueue( pxQueue, pvBuffer );
                pxQueue->uxMessagesWaiting = uxMessagesWaiting - ( UBaseType_t ) 1;
                //如果有任务正在等待向队列发送数据，唤醒其中优先级最高的任务
                //如果该任务优先级更高，挂起PendSV中断
                if( listLIST_IS_EMPTY( &( pxQueue->xTasksWaitingToSend ) ) == pdFALSE )
                {
                    if( xTaskRemoveFromEventList( &( pxQueue->xTasksWaitingToSend ) ) != pdFALSE )
                    {
                        queueYIELD_IF_USING_PREEMPTION();
                    }
                }
                //退出临界区并返回pdPASS
                taskEXIT_CRITICAL();
                return pdPASS;
            }
            //如果队列为空
            else
            {
                //不可阻塞
                if( xTicksToWait == ( TickType_t ) 0 )
                {
                    //退出临界区并返回pdPASSerrQUEUE_EMPTY
                    taskEXIT_CRITICAL();
                    return errQUEUE_EMPTY;
                }
                //如果需要阻塞且没有设置超时结构，则初始化超时结构并将xEntryTimeSet设置为pdTRUE
                else if( xEntryTimeSet == pdFALSE )
                {
                    vTaskInternalSetTimeOutState( &xTimeOut );
                    xEntryTimeSet = pdTRUE;
                }
                else
                {
                }
            }
        }
        //退出临界区
        taskEXIT_CRITICAL();
    } 
}
```
```c
BaseType_t xQueueSemaphoreTake( QueueHandle_t xQueue,
                                TickType_t xTicksToWait )
{
    BaseType_t xEntryTimeSet = pdFALSE;
    TimeOut_t xTimeOut;
    Queue_t * const pxQueue = xQueue;
    #if ( configUSE_MUTEXES == 1 )
        BaseType_t xInheritanceOccurred = pdFALSE;
    #endif
    //不断循环
    for( ; ; )
    {
        //进入临界区
        taskENTER_CRITICAL();
        {
            //获取信号量计数
            const UBaseType_t uxSemaphoreCount = pxQueue->uxMessagesWaiting;
            //如果信号量计数大于0
            if( uxSemaphoreCount > ( UBaseType_t ) 0 )
            {
                //减少信号量计数
                pxQueue->uxMessagesWaiting = uxSemaphoreCount - ( UBaseType_t ) 1;
                //如果队列为互斥量，将当前任务设置为互斥量的持有者并递增其互斥量持有计数
                #if ( configUSE_MUTEXES == 1 )
                {
                    if( pxQueue->uxQueueType == queueQUEUE_IS_MUTEX )
                    {
                        pxQueue->u.xSemaphore.xMutexHolder = pvTaskIncrementMutexHeldCount();
                    }
                }
                #endif
                //如果有任务正在向队列发送数据且需要进行任务切换，则触发调度
                if( listLIST_IS_EMPTY( &( pxQueue->xTasksWaitingToSend ) ) == pdFALSE )
                {
                    if( xTaskRemoveFromEventList( &( pxQueue->xTasksWaitingToSend ) ) != pdFALSE )
                    {
                        queueYIELD_IF_USING_PREEMPTION();
                    }
                }
                //退出临界区并返回pdPASS
                taskEXIT_CRITICAL();
                return pdPASS;
            }
            //如果信号量计数为0
            else
            {
                //如果不允许阻塞，退出临界区并返回errQUEUE_EMPTY
                if( xTicksToWait == ( TickType_t ) 0 )
                {
                    taskEXIT_CRITICAL();
                    return errQUEUE_EMPTY;
                }
                //如果需要阻塞且没有设置超时结构，则初始化超时结构并将xEntryTimeSet设置为pdTRUE
                else if( xEntryTimeSet == pdFALSE )
                {
                    vTaskInternalSetTimeOutState( &xTimeOut );
                    xEntryTimeSet = pdTRUE;
                }
                //如果后续再次进入阻塞分支，什么也不做
                else
                {
                }
            }
        }
        //退出临界区
        taskEXIT_CRITICAL();
    } 
}

```
**③慢速阶段**
>**概述**：如果**队列为空**且**允许阻塞**，则初始化**超时判断结构**`xTimeOut`并进入慢速阶段
{%list%}
任务未超时时，若队列依旧为空，将任务加入队列的接收等待列表和阻塞列表并触发任务切换，反之继续循环尝试
{%endlist%}
{%right%}
如果对象是互斥量，当任务未超时且队列依旧为空时，还会触发优先级继承，即暂时提高互斥量持有者的优先级
{%endright%}
{%warning%}
如果对象是互斥量，当任务超时且触发了优先级继承时，需要恢复互斥量持有者的优先级
{%endwarning%}
{%wrong%}
如果任务超时，则恢复调度并解锁队列，最后返回errQUEUE_EMPTY
{%endwrong%}
```c
BaseType_t xQueueReceive( QueueHandle_t xQueue,
                          void * const pvBuffer,
                          TickType_t xTicksToWait )
{
    BaseType_t xEntryTimeSet = pdFALSE;
    TimeOut_t xTimeOut;
    Queue_t * const pxQueue = xQueue;
    //不断循环尝试从队列中接收数据
    for( ; ; )
    {
        //暂停任务调度
        vTaskSuspendAll();
        //锁住队列
        prvLockQueue( pxQueue );
        //如果没有超时
        if( xTaskCheckForTimeOut( &xTimeOut, &xTicksToWait ) == pdFALSE )
        {
            //如果队列为空
            if( prvIsQueueEmpty( pxQueue ) != pdFALSE )
            {
                //将当前任务放入队列的接收等待列表和阻塞列表，没有临界区保护，但是有队列锁的保护
                vTaskPlaceOnEventList( &( pxQueue->xTasksWaitingToReceive ), xTicksToWait );
                prvUnlockQueue( pxQueue );
                //恢复任务调度并判断是否需要进行任务切换
                if( xTaskResumeAll() == pdFALSE )
                {
                    portYIELD_WITHIN_API();
                }
            }
            //如果队列非空则解锁队列并恢复调度器，后续重新进入循环进入快速模式
            else
            {
                prvUnlockQueue( pxQueue );
                ( void ) xTaskResumeAll();
            }
        }
        //如果已经超时
        else
        {
            //解锁队列并恢复任务调度
            prvUnlockQueue( pxQueue );
            ( void ) xTaskResumeAll();
            //如果队列为空并返回errQUEUE_EMPTY
            if( prvIsQueueEmpty( pxQueue ) != pdFALSE )
            {
                return errQUEUE_EMPTY;
            }
        }
    } 
}

```
```c
BaseType_t xQueueSemaphoreTake( QueueHandle_t xQueue,
                                TickType_t xTicksToWait )
{
    BaseType_t xEntryTimeSet = pdFALSE;
    TimeOut_t xTimeOut;
    Queue_t * const pxQueue = xQueue;
    #if ( configUSE_MUTEXES == 1 )
        BaseType_t xInheritanceOccurred = pdFALSE;
    #endif
    //不断循环
    for( ; ; )
    {
        //暂停所有任务调度并锁定队列
        vTaskSuspendAll();
        prvLockQueue( pxQueue );
        //如果没有超时
        if( xTaskCheckForTimeOut( &xTimeOut, &xTicksToWait ) == pdFALSE )
        {
            //如果队列为空
            if( prvIsQueueEmpty( pxQueue ) != pdFALSE )
            {
                //如果当前队列为互斥量，触发优先级继承
                #if ( configUSE_MUTEXES == 1 )
                {
                    if( pxQueue->uxQueueType == queueQUEUE_IS_MUTEX )
                    {
                        taskENTER_CRITICAL();
                        {
                            xInheritanceOccurred = xTaskPriorityInherit( pxQueue->u.xSemaphore.xMutexHolder );
                        }
                        taskEXIT_CRITICAL();
                    }
                }
                #endif 
                //将任务加入队列等待队列并解锁队列
                vTaskPlaceOnEventList( &( pxQueue->xTasksWaitingToReceive ), xTicksToWait );
                prvUnlockQueue( pxQueue );
                //恢复调度，如果需要进行任务切换则触发调度
                if( xTaskResumeAll() == pdFALSE )
                {
                    portYIELD_WITHIN_API();
                }
            }
            //如果队列不为空，解锁队列并恢复调度
            else
            {
                prvUnlockQueue( pxQueue );
                ( void ) xTaskResumeAll();
            }
        }
        //如果超时
        else
        {
            //解锁队列并恢复调度
            prvUnlockQueue( pxQueue );
            ( void ) xTaskResumeAll();
            //如果队列为空
            if( prvIsQueueEmpty( pxQueue ) != pdFALSE )
            {
                //如果队列为互斥量且之前触发了优先级继承，恢复任务的优先级
                #if ( configUSE_MUTEXES == 1 )
                {
                    if( xInheritanceOccurred != pdFALSE )
                    {
                        taskENTER_CRITICAL();
                        {
                            UBaseType_t uxHighestWaitingPriority;
                            uxHighestWaitingPriority = prvGetDisinheritPriorityAfterTimeout( pxQueue );
                            vTaskPriorityDisinheritAfterTimeout( pxQueue->u.xSemaphore.xMutexHolder, uxHighestWaitingPriority );
                        }
                        taskEXIT_CRITICAL();
                    }
                }
                #endif
                //返回errQUEUE_EMPTY
                return errQUEUE_EMPTY;
            }
        }
    } 
}
```
#### 4.优先级反转
**①简介**
>**概述**：优先级反转指高优先级任务`H`**被迫等待**低优先级任务`L`的现象，通常发生在任务共享**互斥锁**保护的资源时
{%list%}
当L获取互斥锁后，H投入运行抢占L，发现互斥锁被占用，会被阻塞让出CPU资源给L
{%endlist%}
{%warning%}
倘若有一个优先级介于两者之间的任务M，M投入运行抢占L导致L无法释放互斥锁，H也就无法投入运行
{%endwarning%}
{%right%}
FreeRTOS在互斥量中实现了优先级继承机制解决该问题，如下所示
{%endright%}
**②优先级继承**
>**概述**：当一个任务`H`试图**获取互斥量**时发现持有互斥量的任务`L`**优先级低于**`H`，会暂时将`L`的优先级提升为`H`
{%list%}
任务通过xQueueSemaphoreTake获取互斥量时会调用xTaskPriorityInherit试图触发优先级继承，如下所示
{%endlist%}
{%right%}
将L的状态列表项转移到H对应优先级的就绪列表，并更新L的优先级和事件列表项的值
{%endright%}
{%warning%}
如果L的优先级大于H但是L的基础优先级小于H，说明L已经被另一个优先级更高的任务提升了优先级
{%endwarning%}
```c
//任务控制块
typedef struct tskTaskControlBlock       
{
    /* 其余成员略 */
    //互斥量相关
    #if ( configUSE_MUTEXES == 1 )
        UBaseType_t uxBasePriority;                   //基础优先级 
        UBaseType_t uxMutexesHeld;                    //任务持有的互斥量数目
    #endif
}tskTCB;
typedef tskTCB TCB_t;
```
```c
/* 优先级继承 */
BaseType_t xTaskPriorityInherit( TaskHandle_t const pxMutexHolder )
{
    //获取任务TCB
    TCB_t * const pxMutexHolderTCB = pxMutexHolder;
    BaseType_t xReturn = pdFALSE;
    //确保持有互斥量的任务依旧存在
    if( pxMutexHolder != NULL )
    {
        //如果持有者的当前优先级小于试图获取互斥量任务的优先级，说明需要进行优先级继承
        if( pxMutexHolderTCB->uxPriority < pxCurrentTCB->uxPriority )
        {
            //如果持有者的事件列表项没有被占用，将其设置为configMAX_PRIORITIES - pxCurrentTCB->uxPriority
            if( ( listGET_LIST_ITEM_VALUE( &( pxMutexHolderTCB->xEventListItem ) ) & taskEVENT_LIST_ITEM_VALUE_IN_USE ) == 0UL )
            {
                listSET_LIST_ITEM_VALUE( &( pxMutexHolderTCB->xEventListItem ), ( TickType_t ) configMAX_PRIORITIES - ( TickType_t ) pxCurrentTCB->uxPriority ); 
            }
            //如果持有者在就绪列表中
            if( listIS_CONTAINED_WITHIN( &( pxReadyTasksLists[ pxMutexHolderTCB->uxPriority ] ), &( pxMutexHolderTCB->xStateListItem ) ) != pdFALSE )
            {
                //将其从原本的就绪列表中移除并更新优先级位图
                if( uxListRemove( &( pxMutexHolderTCB->xStateListItem ) ) == ( UBaseType_t ) 0 )
                {
                    portRESET_READY_PRIORITY( pxMutexHolderTCB->uxPriority, uxTopReadyPriority );
                }
                //将持有者的优先级提升至与当前运行任务相同并插入对应的就绪列表
                pxMutexHolderTCB->uxPriority = pxCurrentTCB->uxPriority;
                prvAddTaskToReadyList( pxMutexHolderTCB );
            }
            //如果持有者处于阻塞或挂起状态，仅仅更新其优先级
            else
            {
                pxMutexHolderTCB->uxPriority = pxCurrentTCB->uxPriority;
            }
            xReturn = pdTRUE;
        }
        //如果持有者的当前优先级大于试图获取互斥量任务的优先级但是其基础优先级更小，说明已经发生了优先级继承
        else
        {
            if( pxMutexHolderTCB->uxBasePriority < pxCurrentTCB->uxPriority )
            {
                xReturn = pdTRUE;
            }
        }
    }
    return xReturn;
}
```
**③优先级恢复**
>**概述**：当`L`**成功释放互斥量**会调用`xTaskPriorityDisinherit`恢复其优先级，如下所示
{%list%}
当任务释放所有互斥锁时，恢复其优先级和事件列表项的值，并将其转移到原本的就绪列表中
{%endlist%}
{%right%}
当H获取互斥量超时时，若有比L优先级更高的任务正在等待互斥量，则将L更新为对应优先级，反之恢复其优先级
{%endright%}
{%warning%}
H获取互斥量超时试图更新L的优先级时，需要确保L只持有一个互斥量
{%endwarning%}
```c
/* 任务成功获取互斥量后进行的优先级恢复 */
BaseType_t xTaskPriorityDisinherit( TaskHandle_t const pxMutexHolder )
{
    TCB_t * const pxTCB = pxMutexHolder;
    BaseType_t xReturn = pdFALSE;
    //确保持有互斥量的任务依旧存在
    if( pxMutexHolder != NULL )
    {
        //减少任务的互斥锁持有计数
        ( pxTCB->uxMutexesHeld )--;
        //确保任务发生了优先级继承
        if( pxTCB->uxPriority != pxTCB->uxBasePriority )
        {
            //只有当任务释放所有互斥锁，才恢复优先级
            //因为假设L拥有两个互斥锁x和y，其优先级为2，试图获取x/y任务将其优先级提升为4/5
            //如果此时释放x，将其优先级恢复为2，则y的优先级继承失效
            if( pxTCB->uxMutexesHeld == ( UBaseType_t ) 0 )
            {
                //将其从对应的就绪列表中移除并更新优先级位图
                if( uxListRemove( &( pxTCB->xStateListItem ) ) == ( UBaseType_t ) 0 )
                {
                    portRESET_READY_PRIORITY( pxTCB->uxPriority, uxTopReadyPriority );
                }
                //恢复优先级
                pxTCB->uxPriority = pxTCB->uxBasePriority;
                //恢复任务事件列表项的值
                listSET_LIST_ITEM_VALUE( &( pxTCB->xEventListItem ), ( TickType_t ) configMAX_PRIORITIES - ( TickType_t ) pxTCB->uxPriority );
                //将其插入对应的就绪列表
                prvAddTaskToReadyList( pxTCB );
                xReturn = pdTRUE;
            }
        }
    }
    return xReturn;
}
```
```c
/* 计算队列等待接收列表中的最高优先级 */
static UBaseType_t prvGetDisinheritPriorityAfterTimeout( const Queue_t * const pxQueue )
{
    UBaseType_t uxHighestPriorityOfWaitingTasks;
    //如果队列接收等待队列不为空，获取其中任务的最高优先级
    if( listCURRENT_LIST_LENGTH( &( pxQueue->xTasksWaitingToReceive ) ) > 0U )
    {
        uxHighestPriorityOfWaitingTasks = ( UBaseType_t ) configMAX_PRIORITIES - ( UBaseType_t ) listGET_ITEM_VALUE_OF_HEAD_ENTRY( &( pxQueue->xTasksWaitingToReceive ) );
    }
    //反之返回tskIDLE_PRIORITY
    else
    {
        uxHighestPriorityOfWaitingTasks = tskIDLE_PRIORITY;
    }
    return uxHighestPriorityOfWaitingTasks;
}
```
```c
void vTaskPriorityDisinheritAfterTimeout( TaskHandle_t const pxMutexHolder,
                                          UBaseType_t uxHighestPriorityWaitingTask )
{
    TCB_t * const pxTCB = pxMutexHolder;
    UBaseType_t uxPriorityUsedOnEntry, uxPriorityToUse;
    const UBaseType_t uxOnlyOneMutexHeld = ( UBaseType_t ) 1;
    //确保持有互斥量的任务依旧存在
    if( pxMutexHolder != NULL )
    {
        //如果持有者的基础优先级低于等待任务的优先级，则优先级恢复为等待任务的优先级，反之恢复为任务原本的优先级
        if( pxTCB->uxBasePriority < uxHighestPriorityWaitingTask )
        {
            uxPriorityToUse = uxHighestPriorityWaitingTask;
        }
        else
        {
            uxPriorityToUse = pxTCB->uxBasePriority;
        }
        //判断是否需要进行优先级恢复
        if( pxTCB->uxPriority != uxPriorityToUse )
        {
            //确保任务此时只持有一个互斥锁
            //假设L拥有两个互斥锁x和y，其优先级为2，试图获取x/y任务将其优先级提升为4/5
            //如果试图获取x的任务超时，需要将其优先级设置为3（等待列表任务最高优先级为3）
            //此时y的优先级继承依旧失效了
            if( pxTCB->uxMutexesHeld == uxOnlyOneMutexHeld )
            {
                //保存任务之前使用的优先级并设置其优先级
                uxPriorityUsedOnEntry = pxTCB->uxPriority;
                pxTCB->uxPriority = uxPriorityToUse;
                //如果事件列表项未被占用，则更新其值
                if( ( listGET_LIST_ITEM_VALUE( &( pxTCB->xEventListItem ) ) & taskEVENT_LIST_ITEM_VALUE_IN_USE ) == 0UL )
                {
                    listSET_LIST_ITEM_VALUE( &( pxTCB->xEventListItem ), ( TickType_t ) configMAX_PRIORITIES - ( TickType_t ) uxPriorityToUse ); 
                }
                //如果任务在就绪列表中
                if( listIS_CONTAINED_WITHIN( &( pxReadyTasksLists[ uxPriorityUsedOnEntry ] ), &( pxTCB->xStateListItem ) ) != pdFALSE )
                {
                    //将其从对应的就绪列表中移除并更新优先级位图
                    if( uxListRemove( &( pxTCB->xStateListItem ) ) == ( UBaseType_t ) 0 )
                    {
                        portRESET_READY_PRIORITY( pxTCB->uxPriority, uxTopReadyPriority );
                    }
                    //将其插入对应的就绪列表
                    prvAddTaskToReadyList( pxTCB );
                }
            }
        }
    }
}
```