---
title: FreeRTOS源码阅读（三）
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
keywords: FreeRTOS源码阅读（三）, RTOS, FreeRTOS
updated: ''
img: /medias/featureimages/38.webp
date: 2026-06-30 13:55:14
summary: 任务系统（二）
---
# FreeRTOS
## FreeRTOS源码阅读（三）
### 任务系统（二）
#### 1.任务删除
**①简介**
>**概述**：`FreeRTOS`提供`vTaskDelete`删除**指定任务**或者**当前任务**，如下所示
{%list%}
vTaskDelete将任务从就绪列表和事件列表中移除，如果任务不为pxCurrentTCB，则直接释放其TCB和栈
{%endlist%}
{%right%}
如果删除任务为pxCurrentTCB，将其转移到无序列表xTasksWaitingTermination并立马触发任务切换
{%endright%}
{%warning%}
不能直接释放pxCurrentTCB的TCB和栈，因为代码此时正在使用pxCurrentTCB的栈
{%endwarning%}
```c
/* 删除当前任务或指定任务 */
void vTaskDelete( TaskHandle_t xTaskToDelete )
{
    TCB_t * pxTCB;
    //进入临界区
    taskENTER_CRITICAL();
    {
        //根据xTaskToDelete获取TCB指针，如果xTaskToDelete为NULL，则获取当前运行任务的TCB
        pxTCB = prvGetTCBFromHandle( xTaskToDelete );
        //将任务从就绪列表中移除，如果该优先级列表为空，则清除对应的优先级位图标志
        if( uxListRemove( &( pxTCB->xStateListItem ) ) == ( UBaseType_t ) 0 )
        {
            taskRESET_READY_PRIORITY( pxTCB->uxPriority );
        }
        //如果任务正在等待某个事件，则将其从对应的事件列表中移除
        if( listLIST_ITEM_CONTAINER( &( pxTCB->xEventListItem ) ) != NULL )
        {
            ( void ) uxListRemove( &( pxTCB->xEventListItem ) );
        }
        //如果删除任务为当前任务，将任务添加到无序列表xTasksWaitingTermination并增加uxDeletedTasksWaitingCleanUp
        if( pxTCB == pxCurrentTCB )
        {
            vListInsertEnd( &xTasksWaitingTermination, &( pxTCB->xStateListItem ) );
            ++uxDeletedTasksWaitingCleanUp;
        }
        //如果删除的是其他任务，递减当前任务计数器并重置下一个任务唤醒时间（因为可能删除的任务正在阻塞）
        else
        {
            --uxCurrentNumberOfTasks;
            prvResetNextTaskUnblockTime();
        }
    }
    //退出临界区
    taskEXIT_CRITICAL();
    //如果删除的不是正在运行的任务，则释放其TCB和栈
    if( pxTCB != pxCurrentTCB )
    {
        prvDeleteTCB( pxTCB );
    }
    //如果调度器被启动且删除的是正在运行的任务，立马切换任务切换
    if( xSchedulerRunning != pdFALSE )
    {
        if( pxTCB == pxCurrentTCB )
        {
            portYIELD_WITHIN_API();
        }
    }
}
```
**②延迟清理**
>**概述**：如果`vTaskDelete`删除对象为`pxCurrentTCB`，其清理工作由**空闲任务**完成，如下所示
{%list%}
prvCheckTasksWaitingTermination会不断从xTasksWaitingTermination提取任务并进行资源释放
{%endlist%}
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
```c
/* 清理被删除任务资源 */
static void prvCheckTasksWaitingTermination( void )
{
    #if ( INCLUDE_vTaskDelete == 1 )
    {
        TCB_t * pxTCB;
        //当待清理任务数量不为0
        while( uxDeletedTasksWaitingCleanUp > ( UBaseType_t ) 0U )
        {
            //进入临界区
            taskENTER_CRITICAL();
            {
                //获取xTasksWaitingTermination列表首个任务
                pxTCB = listGET_OWNER_OF_HEAD_ENTRY( ( &xTasksWaitingTermination ) );
                //从列表中移除任务并更新相关信息
                ( void ) uxListRemove( &( pxTCB->xStateListItem ) );
                --uxCurrentNumberOfTasks;
                --uxDeletedTasksWaitingCleanUp;
            }
            //退出临界区
            taskEXIT_CRITICAL();
            //释放任务栈和TCB
            prvDeleteTCB( pxTCB );
        }
    }
    #endif
}
```
#### 2.任务延时
**①`vTaskDelay`**
>**概述**：`FreeRTOS`提供`vTaskDelay`实现任务的**相对延时**，即从`vTaskDelay`的**调用时刻**开始计算延时时间
{%list%}
vTaskDelay调用prvAddCurrentTaskToDelayedList将任务添加到延时或者挂起列表并触发任务切换
{%endlist%}
{%right%}
FreeRTOS维护两个延时列表，分别管理Tick未溢出/溢出的延时任务，当xTickCount发生回绕时，会交换两个列表
{%endright%}
{%warning%}
如果xTicksToDelay为0，该函数只执行任务切换即主动让出CPU
{%endwarning%}
```c
/* 任务的相对延时 */
void vTaskDelay( const TickType_t xTicksToDelay )
{
    BaseType_t xAlreadyYielded = pdFALSE;
    //如果xTicksToDelay大于0
    if( xTicksToDelay > ( TickType_t ) 0U )
    {
        //暂停调度器并将任务添加到延迟列表
        vTaskSuspendAll();
        {
            prvAddCurrentTaskToDelayedList( xTicksToDelay, pdFALSE );
        }
        //唤醒调度器，如果调度器恢复过程中出现更高优先级任务则进行任务切换
        xAlreadyYielded = xTaskResumeAll();
    }
    //若调度器恢复过程中没有触发切换或者xTicksToDelay为0，则主动切换
    if( xAlreadyYielded == pdFALSE )
    {
        portYIELD_WITHIN_API();
    }
}
```
```c
/* 将任务插入阻塞列表或挂起列表 */
static void prvAddCurrentTaskToDelayedList( TickType_t xTicksToWait,                    //需要阻塞的TICK数
                                            const BaseType_t xCanBlockIndefinitely )    //是否允许无限期阻塞
{
    TickType_t xTimeToWake;
    const TickType_t xConstTickCount = xTickCount;
    //将任务从就绪列表中移除并清空位图
    if( uxListRemove( &( pxCurrentTCB->xStateListItem ) ) == ( UBaseType_t ) 0 )
    {
        portRESET_READY_PRIORITY( pxCurrentTCB->uxPriority, uxTopReadyPriority ); 
    }
    //如果任务需要无限等待，将其加入无序列表xSuspendedTaskList
    if( ( xTicksToWait == portMAX_DELAY ) && ( xCanBlockIndefinitely != pdFALSE ) )
    {
        listINSERT_END( &xSuspendedTaskList, &( pxCurrentTCB->xStateListItem ) );
    }
    //不需要无限阻塞
    else
    {
        //将状态列表项的值设置为唤醒时间
        xTimeToWake = xConstTickCount + xTicksToWait;
        listSET_LIST_ITEM_VALUE( &( pxCurrentTCB->xStateListItem ), xTimeToWake );
        //如果唤醒时间溢出，则将其插入有序列表pxOverflowDelayedTaskList
        if( xTimeToWake < xConstTickCount )
        {
            vListInsert( pxOverflowDelayedTaskList, &( pxCurrentTCB->xStateListItem ) );
        }
        //反之插入有序列表pxDelayedTaskList
        else
        {
            vListInsert( pxDelayedTaskList, &( pxCurrentTCB->xStateListItem ) );
            //更新下次任务唤醒时间
            if( xTimeToWake < xNextTaskUnblockTime )
            {
                xNextTaskUnblockTime = xTimeToWake;
            }
        }
    }
}
```
**②`xTaskDelayUntil`**
>**概述**：`FreeRTOS`提供`xTaskDelayUntil`实现任务的**绝对延时**，确保任务以**精确的时间间隔**执行
{%list%}
若当前时刻未超出下次唤醒时间，该任务会被添加到阻塞列表并执行任务切换让出CPU，其执行流如下所示
{%endlist%}
{%right%}
若当前时刻超出下次唤醒时间，该函数依旧会执行任务切换让出CPU保证调度的公平性
{%endright%}
{%warning%}
需要传入外部变量pxPreviousWakeTime保存任务上次唤醒时间，且只能在循环外初始化一次
{%endwarning%}
```c
/* 任务的绝对延时 */
BaseType_t xTaskDelayUntil( TickType_t * const pxPreviousWakeTime,   //上次唤醒时间，会被该函数更新
                            const TickType_t xTimeIncrement )        //唤醒的时间间隔
{
    TickType_t xTimeToWake;
    BaseType_t xAlreadyYielded, xShouldDelay = pdFALSE;
    //暂停调度器
    vTaskSuspendAll();
    {
        //获取当前时间
        const TickType_t xConstTickCount = xTickCount;
        //计算下次唤醒时间为 上次唤醒时间 + 指定时间间隔
        xTimeToWake = *pxPreviousWakeTime + xTimeIncrement;
        //如果xConstTickCount小于上次唤醒时间，说明计数器发生了溢出回绕
        //pxPreviousWakeTime  - 溢出时间点 - xConstTickCount
        if( xConstTickCount < *pxPreviousWakeTime )
        {
            //如果下次唤醒时间也发生了回绕且大于xConstTickCount，说明需要阻塞
            //pxPreviousWakeTime  - 溢出时间点 - xConstTickCount - xTimeToWake
            if( ( xTimeToWake < *pxPreviousWakeTime ) && ( xTimeToWake > xConstTickCount ) )
            {
                xShouldDelay = pdTRUE;
            }
        }
        //计数器没有发生溢出回绕
        else
        {
            //如果下次唤醒时间发生了回绕或者下次唤醒时间大于xConstTickCount
            //xTimeToWake - xConstTickCount - 溢出时间点 - xTimeToWake
            //xTimeToWake - xConstTickCount - xTimeToWake - 溢出时间点
            if( ( xTimeToWake < *pxPreviousWakeTime ) || ( xTimeToWake > xConstTickCount ) )
            {
                xShouldDelay = pdTRUE;
            }
        }
        //更新下次的唤醒时间
        *pxPreviousWakeTime = xTimeToWake;
        //如果xShouldDelay为TRUE，将任务添加到延迟列表
        if( xShouldDelay != pdFALSE )
        {
            prvAddCurrentTaskToDelayedList( xTimeToWake - xConstTickCount, pdFALSE );
        }
    }
    //恢复调度
    xAlreadyYielded = xTaskResumeAll();
    //若调度器恢复过程中没有触发切换，则主动切换
    //如果xShouldDelay == pdFALSE，说明任务已经错过了唤醒时间，但是
    if( xAlreadyYielded == pdFALSE )
    {
        portYIELD_WITHIN_API();
    }
    return xShouldDelay;
}
```
```c
//假设一个任务函数如下所示，其执行流如下所示
//时间：0ms----------------5ms----------------10ms------------15ms------------
//执行：[工作][阻塞--------][唤醒并工作][阻塞--][唤醒并工作------------][不阻塞但让出CPU]
void task_5ms(void *pvParameters){
    TickType_t xLastWakeTime;
    const TickType_t xFrequency = pdMS_TO_TICKS( 5 );
    //初始化唤醒时间
    xLastWakeTime = xTaskGetTickCount();
    while(1){
        xTaskDelayUntil( &xLastWakeTime, xFrequency );
        do_somework();
    }
}
```
#### 3.任务挂起
**①简介**
>**概述**：`FreeRTOS`提供`vTaskSuspend`挂起**指定任务**或者**当前任务**，如下所示
{%list%}
vTaskSuspend将任务从就绪列表和事件列表中移除，并将其转移到无序列表xSuspendedTaskList
{%endlist%}
{%right%}
如果挂起任务为pxCurrentTCB，若xSchedulerRunning为pdTRUE则进行任务切换，反之更新pxCurrentTCB
{%endright%}
{%warning%}
需要注意xSchedulerRunning和uxSchedulerSuspended的区别，前者只会被vTaskStartScheduler设置
{%endwarning%}
```c
/* 挂起当前任务或指定任务 */
void vTaskSuspend( TaskHandle_t xTaskToSuspend )
{
    TCB_t * pxTCB;
    //进入临界区
    taskENTER_CRITICAL();
    {
        //获取TCB，如果xTaskToSuspend为NULL，则获取当前运行任务的TCB
        pxTCB = prvGetTCBFromHandle( xTaskToSuspend );
        //将任务从就绪列表中移除，若该任务为该优先级下最后一个任务，重置该优先级的位图
        if( uxListRemove( &( pxTCB->xStateListItem ) ) == ( UBaseType_t ) 0 )
        {
            taskRESET_READY_PRIORITY( pxTCB->uxPriority );
        }        
        //若任务在某个事件列表中，将其从中移除
        if( listLIST_ITEM_CONTAINER( &( pxTCB->xEventListItem ) ) != NULL )
        {
            ( void ) uxListRemove( &( pxTCB->xEventListItem ) );
        }
        //将其添加无序列表xSuspendedTaskList
        vListInsertEnd( &xSuspendedTaskList, &( pxTCB->xStateListItem ) );
        //如果启用了任务通知功能
        #if ( configUSE_TASK_NOTIFICATIONS == 1 )
        {
            BaseType_t x;
            //遍历该任务所有通知状态，将taskWAITING_NOTIFICATION的成员修改为taskNOT_WAITING_NOTIFICATION
            for( x = 0; x < configTASK_NOTIFICATION_ARRAY_ENTRIES; x++ )
            {
                if( pxTCB->ucNotifyState[ x ] == taskWAITING_NOTIFICATION )
                {
                    pxTCB->ucNotifyState[ x ] = taskNOT_WAITING_NOTIFICATION;
                }
            }
        }
        #endif 
    }
    //退出临界区
    taskEXIT_CRITICAL();
    //如果调度器已经启动，重置下一个任务的唤醒时间，因为可能挂起的是被阻塞的任务
    if( xSchedulerRunning != pdFALSE )
    {
        taskENTER_CRITICAL();
        {
            prvResetNextTaskUnblockTime();
        }
        taskEXIT_CRITICAL();
    }
    //如果挂起任务为当前任务
    if( pxTCB == pxCurrentTCB )
    {
        //调度器已经被启动则执行任务切换
        if( xSchedulerRunning != pdFALSE )
        {
            portYIELD_WITHIN_API();
        }
        //如果调度器没有运行则直接更新pxCurrentTCB
        else
        {
            //如果所有任务都被挂起，则将pxCurrentTCB置为NULL
            if( listCURRENT_LIST_LENGTH( &xSuspendedTaskList ) == uxCurrentNumberOfTasks ) 
            {
                pxCurrentTCB = NULL;
            }
            //反之将当前任务设置为下一个优先级最高的任务
            else
            {
                vTaskSwitchContext();
            }
        }
    }
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

```
**②挂起恢复**
>**概述**：`FreeRTOS`提供`vTaskResume`唤醒**其他被挂起的任务**，如下所示
{%list%}
vTaskResume将任务从挂起列表中转移到就绪列表，如果该任务优先级高于pxCurrentTCB则进行任务切换
{%endlist%}
{%warning%}
prvTaskIsTaskSuspended用于判断任务是否真正处于挂起状态，因为任务可能因为无限等待队列等加入挂起列表
{%endwarning%}
{%right%}
如果任务在中断中被唤醒，其事件列表项会被加入xPendingReadyList，随后由调度器将其添加到就绪列表
{%endright%}
```c
/* 唤醒指定任务 */
void vTaskResume( TaskHandle_t xTaskToResume )
{
    //获取任务TCB并确认其非空
    TCB_t * const pxTCB = xTaskToResume;
    //如果被唤醒任务不为当前运行任务且有效
    if( ( pxTCB != pxCurrentTCB ) && ( pxTCB != NULL ) )
    {
        //进入临界区
        taskENTER_CRITICAL();
        {
            //检查任务确实被挂起
            if( prvTaskIsTaskSuspended( pxTCB ) != pdFALSE )
            {
                //将其从挂起列表中移除并将其添加到就绪列表
                ( void ) uxListRemove( &( pxTCB->xStateListItem ) );
                prvAddTaskToReadyList( pxTCB );
                //如果被唤醒任务优先级高于当前运行任务，则进行任务切换
                if( pxTCB->uxPriority >= pxCurrentTCB->uxPriority )
                {
                    taskYIELD_IF_USING_PREEMPTION();
                }
            }
        }
        //退出临界区
        taskEXIT_CRITICAL();
    }
}
```
```c
/* 判断任务是否处于挂起状态 */
static BaseType_t prvTaskIsTaskSuspended( const TaskHandle_t xTask )
{
    BaseType_t xReturn = pdFALSE;
    const TCB_t * const pxTCB = xTask;
    //确保任务在挂起列表
    if( listIS_CONTAINED_WITHIN( &xSuspendedTaskList, &( pxTCB->xStateListItem ) ) != pdFALSE )
    {
        //确保任务不在xPendingReadyList，即收到唤醒信号
        if( listIS_CONTAINED_WITHIN( &xPendingReadyList, &( pxTCB->xEventListItem ) ) == pdFALSE )
        {
            //确保任务的事件列表项没有被任何列表包含
            if( listIS_CONTAINED_WITHIN( NULL, &( pxTCB->xEventListItem ) ) != pdFALSE ) 
            {
                xReturn = pdTRUE;
            }
        }
    }
    return xReturn;
}
```
#### 4.任务通知
**①简介**
>**概述**：每个`TCB`中都有`ulNotifiedValue`和`ucNotifyState`成员，前者为**任务通知值**，后者为**对应的通知状态**
{%list%}
有三种任务通知状态即没有等待通知、正在等待通知和已收到通知但尚未处理，任务初始状态为没有等待通知
{%endlist%}
{%right%}
任务通知值可以作为数据载体，直接传递数据或数据指针，也可以作为状态指示器，从而实现轻量级队列和信号量
{%endright%}
{%warning%}
虽然任务通知性能较高，但是只能实现一对一的通信且没有缓冲区，可能会造成数据丢失
{%endwarning%}
```c
//任务控制块
typedef struct tskTaskControlBlock       
{
    //任务通知相关
    #if ( configUSE_TASK_NOTIFICATIONS == 1 )
        //通知数据值
        volatile uint32_t ulNotifiedValue[ configTASK_NOTIFICATION_ARRAY_ENTRIES ];
        //状态标识
        volatile uint8_t ucNotifyState[ configTASK_NOTIFICATION_ARRAY_ENTRIES ];
    #endif
}tskTCB;
typedef tskTCB TCB_t;
```
```c
//任务通知状态
#define taskNOT_WAITING_NOTIFICATION    ( ( uint8_t ) 0 )    //当前任务没有等待通知
#define taskWAITING_NOTIFICATION        ( ( uint8_t ) 1 )    //当前任务正在等待通知
#define taskNOTIFICATION_RECEIVED       ( ( uint8_t ) 2 )    //当前任务已收到通知但尚未处理
```
**②等待任务通知**
>**概述**：如果**通知值**为`0`，将状态修改为`taskWAITING_NOTIFICATION`并**阻塞等待**，**等待结束或被唤醒**后读取通知值
{%list%}
若通知值非0，根据xClearCountOnExit对其进行处理并将状态修改为taskNOT_WAITING_NOTIFICATION
{%endlist%}
{%right%}
xClearCountOnExit为pdTRUE会将通知值清零，反之减一，前者通常用于传递数据，后者通常用于模拟信号量
{%endright%}
{%warning%}
只有当通知值为0时，ulTaskGenericNotifyTake才会导致任务阻塞等待
{%endwarning%}
```c
/* 等待任务通知 */
uint32_t ulTaskGenericNotifyTake( UBaseType_t uxIndexToWait,     //通知索引
                                  BaseType_t xClearCountOnExit,  //清除方式
                                  TickType_t xTicksToWait )      //超时时间
{
    uint32_t ulReturn;
    //进入临界区
    taskENTER_CRITICAL();
    {
        //如果对应的任务通知值为0
        if( pxCurrentTCB->ulNotifiedValue[ uxIndexToWait ] == 0UL )
        {
            //将任务的通知状态数组对应成员修改为taskWAITING_NOTIFICATION即正在等待通知
            pxCurrentTCB->ucNotifyState[ uxIndexToWait ] = taskWAITING_NOTIFICATION;
            //如果需要阻塞等待
            if( xTicksToWait > ( TickType_t ) 0 )
            {
                //将任务加入阻塞列表且允许无限阻塞
                prvAddCurrentTaskToDelayedList( xTicksToWait, pdTRUE );
                //触发任务调度
                portYIELD_WITHIN_API();
            }
        }
    }
    //退出临界区
    taskEXIT_CRITICAL();
    //退出临界区后，如果触发了任务调度则会进行任务切换
    //执行到这里，第一种情况是任务被阻塞后，任务由于超时或者接收到通知被唤醒
    //第二种情况是任务通知值不为0，任务没有被阻塞
    //进入临界区，保证通知值操作的原子性
    taskENTER_CRITICAL();
    {
        //读取任务通知值
        ulReturn = pxCurrentTCB->ulNotifiedValue[ uxIndexToWait ];
        //如果通知值非零，说明接收到了通知，反之说明超时
        if( ulReturn != 0UL )
        {
            //如果设置了xClearCountOnExit，将通知值设置为0，反之减一
            if( xClearCountOnExit != pdFALSE )
            {
                pxCurrentTCB->ulNotifiedValue[ uxIndexToWait ] = 0UL;
            }
            else
            {
                pxCurrentTCB->ulNotifiedValue[ uxIndexToWait ] = ulReturn - ( uint32_t ) 1;
            }
        }
        //无论是否收到通知，都将通知状态数组对应成员修改为taskNOT_WAITING_NOTIFICATION
        pxCurrentTCB->ucNotifyState[ uxIndexToWait ] = taskNOT_WAITING_NOTIFICATION;
    }
    //退出临界区
    taskEXIT_CRITICAL();
    return ulReturn;
}
```
**③发送任务通知**
>**概述**：将状态修改为`taskNOTIFICATION_RECEIVED`并更新**通知值**，如果目标任务正在**阻塞等待**则唤醒该任务
{%list%}
通过传入不同的eAction对通知值做出不同的操作，详细如下所示
{%endlist%}
{%right%}
常用eAction有eIncrement和eSetValueWithOverwrite，前者用于模拟信号量，后者用于数据传输
{%endright%}
{%warning%}
若eAction为eSetValueWithoutOverwrite且任务已经接收到别的任务通知，会返回pdFAIL
{%endwarning%}
```c
/* 向指定任务发送任务通知 */
BaseType_t xTaskGenericNotify( TaskHandle_t xTaskToNotify,                //目标任务
                               UBaseType_t uxIndexToNotify,               //通知索引
                               uint32_t ulValue,                          //通知操作值
                               eNotifyAction eAction,                     //操作类型
                               uint32_t * pulPreviousNotificationValue )  //返回之前的通知值
{
    TCB_t * pxTCB;
    BaseType_t xReturn = pdPASS;
    uint8_t ucOriginalNotifyState;
    pxTCB = xTaskToNotify;
    //进入临界区
    taskENTER_CRITICAL();
    {
        //保存修改前的通知值
        if( pulPreviousNotificationValue != NULL )
        {
            *pulPreviousNotificationValue = pxTCB->ulNotifiedValue[ uxIndexToNotify ];
        }
        //保存修改前的通知状态并将其修改为taskNOTIFICATION_RECEIVED
        ucOriginalNotifyState = pxTCB->ucNotifyState[ uxIndexToNotify ];
        pxTCB->ucNotifyState[ uxIndexToNotify ] = taskNOTIFICATION_RECEIVED;
        //根据eAction修改目标任务通知值
        switch( eAction )
        {
            //位或操作
            case eSetBits:
                pxTCB->ulNotifiedValue[ uxIndexToNotify ] |= ulValue;
                break;
            //递增
            case eIncrement:
                ( pxTCB->ulNotifiedValue[ uxIndexToNotify ] )++;
                break;
            //直接覆盖
            case eSetValueWithOverwrite:
                pxTCB->ulNotifiedValue[ uxIndexToNotify ] = ulValue;
                break;
            //如果任务尚未接收任务通知，则修改，反之返回pdFAIL
            case eSetValueWithoutOverwrite:
                if( ucOriginalNotifyState != taskNOTIFICATION_RECEIVED )
                {
                    pxTCB->ulNotifiedValue[ uxIndexToNotify ] = ulValue;
                }
                else
                {
                    xReturn = pdFAIL;
                }
                break;
            //仅唤醒，不修改
            case eNoAction:
                break;
            default:
                break;
        }
        //若目标任务正在阻塞等待通知
        if( ucOriginalNotifyState == taskWAITING_NOTIFICATION )
        {
            //将其从阻塞列表移除并加入对应就绪列表
            listREMOVE_ITEM( &( pxTCB->xStateListItem ) );
            prvAddTaskToReadyList( pxTCB );
            //更新下一次任务唤醒时间
            #if ( configUSE_TICKLESS_IDLE != 0 )
            {
                prvResetNextTaskUnblockTime();
            }
            #endif
            //如果目标任务优先级高于正在运行任务，触发任务调度
            if( pxTCB->uxPriority > pxCurrentTCB->uxPriority )
            {
                taskYIELD_IF_USING_PREEMPTION();
            }
        }
    }
    //退出临界区
    taskEXIT_CRITICAL();
    return xReturn;
}
```