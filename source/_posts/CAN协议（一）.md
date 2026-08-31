---
title: CAN协议（一）
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
  - 串行协议
categories: CAN
keywords: CAN协议（一）, 串行协议, CAN
updated: ''
img: /medias/featureimages/29.webp
date: 2026-06-30 13:55:14
summary: CAN协议简介
---
# 串行协议
## CAN协议
### CAN协议（一）
#### 1.引言
**①简介**
>**概述**：`CAN`是一种**面向消息**、支持**多节点共享总线**、具有**优先级仲裁**和**强错误处理能力**的串行通信协议
{%list%}
每个CAN节点由控制器和收发器组成，前者负责处理协议逻辑，后者负责把数字信号转换为差分信号
{%endlist%}
>`CAN`总线没有主从设备之分，并且由于其使用**差分信号**传输消息，所以`CAN`总线**抗干扰能力**非常强
{%right%}
CAN使用报文ID表示消息的类型和优先级，各个节点可以通过筛选CAN ID选择自己关心的消息
{%endright%}
{%warning%}
CAN总线的核心局限是带宽与有效载荷过小，在数据密集型的场景下适应性不足
{%endwarning%}
![CAN协议简介](/image/CAN_1.png)
**②总线仲裁**
>**概述**：当多个节点**同时发送**消息时，它们会在**仲裁字段**中逐位比较，最终由**优先级最高**的报文继续发送
{%list%}
每个节点在发送逻辑位的同时也会读取总线状态，如果发送1但是读取到总线状态0就会立即退出竞争
{%endlist%}
>`CAN`总线有两种逻辑状态即**显性**`0`和**隐性**`1`，当多个节点同时发送**不同电平**时，前者会覆盖后者
{%right%}
退出竞争的节点不会破坏获胜节点已经发送的内容，即获胜报文可以继续完成传输，也称为无破坏仲裁
{%endright%}
>由上述流程易知，先发送`1`优先级较低，也就是说`CAN ID`的数值越小，报文的**优先级**越高
{%warning%}
如果高优先级报文发送过于频繁，会导致低优先级报文不断仲裁失败，得不到发送机会从而导致较大延迟
{%endwarning%}
**③Bus-off机制**
>**概述**：当`CAN`节点发送错误过多时**控制器主动停止通信**，避免它不断制造**错误帧**干扰总线通信
{%list%}
CAN控制器使用发送错误计数器TEC和接收错误计数器REC判断节点的故障严重程度
{%endlist%}
{%right%}
检测到错误时对应计数器增加，随着计数的累积，CAN节点会逐渐进入到Bus-off状态，详细如下所示
{%endright%}
{%warning%}
发送节点造成总线错误的风险更大，所以发送错误通常会使TEC增长得更快，即Bus-off主要由TEC决定
{%endwarning%}
#### 2.通信协议
**①简介**
>**概述**：`CAN`**协议帧**是节点在总线上交换信息的基本格式，主要可分为**数据帧**、**远程帧**、**错误帧**和**过载帧**
{%list%}
数据帧主要用于发送实际数据，远程
{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}

**②经典CAN**
>**概述**：经典`CAN`也称`CAN CC`，可分为`CAN 2.0A`和`CAN 2.0B`，分别支持`11/29`位**标识符**
{%list%}
经典CAN单帧最多携带8字节数据，常见最高位速率为1Mbit/s
{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}

**③CAN FD**
>**概述**：`CAN FD`
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
