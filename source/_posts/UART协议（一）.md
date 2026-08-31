---
title: UART协议（一）
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
categories: UART
keywords: UART协议（一）, 串行协议, UART
updated: ''
img: /medias/featureimages/29.webp
date: 2026-08-11 15:18:55
summary: UART协议简介
---
# 串行协议
## UART协议
### UART协议（一）
#### 1.引言
**①简介**
>**概述**：一种常用的**异步全双工串行通信协议**，主要用于设备间的**点对点数据传输**，采用**低位优先**的数据传输方式
{%list%}
UART通信通常由TX、RX和GND组成，其中TX用于发送数据，RX用于接收数据，连接时发送端TX连接接收端RX
{%endlist%}
>`STM32`的串口外设主要为`USART`，除支持`UART`外，还提供**同步时钟**`CK`以及`RTS/CTS`**硬件流控**功能
{%right%}
UART硬件结构简单且开发成本较低，还可结合RS232和RS485电气接口标准，提升传输距离和抗干扰能力
{%endright%}
>通常采用`TTL`电平，逻辑`1`为`2v~VCC`，逻辑`0`为`0v~0.8v`，`RS232`逻辑`0`为`+3v~+15v`，逻辑`1`为`-3v~-15v`

>`RS485`使用两根线`A`、`B`生成**差分信号**，通常当`A`的电平**高于**`B`的电平时，为逻辑`1`，反之为逻辑`0`
{%warning%}
UART通信速率有限、缺少多设备管理机制且抗干扰能力较弱，不适合高速复杂网络通信
{%endwarning%}
**②帧格式**
>**概述**：每个数据帧由**起始位**、**数据位**、**校验位**和**停止位**组成，并以一定的速率即**波特率**传输
{%list%}
通常采用8N1配置，即8位数据、无校验和1位停止
{%endlist%}
>
{%right%}

{%endright%}
{%warning%}
通信双方必须配置一致，包括波特率、数据位、校验位和停止位等，否则可能导致乱码、校验错误或帧错误
{%endwarning%}
**③应用协议帧**
>
{%list%}

{%endlist%}
>
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
#### 2.
