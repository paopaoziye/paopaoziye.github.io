---
title: Modbus协议（一）
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
categories: Modbus
keywords: Modbus协议（一）, 串行协议, Modbus
updated: ''
img: /medias/featureimages/29.webp
date: 2026-06-30 13:55:14
summary: Modbus协议简介
---
# 串行协议
## Modbus协议
### Modbus协议（一）
#### 1.引言
**①简介**
>**概述**：一种**软件协议**，采用**主从模式**，常见的`Modbus`版本有`Modbus RTU`、`Modbus ASCII`和`Modbus TCP/IP`
{%list%}
Modbus RTU和Modbus ASCII运行在串口上，前者以二进制传输数据，速度快，后者以ASCII字符传输，可读性强
{%endlist%}
{%right%}
Modbus TCP/IP运行在以太网上，把Modbus的数据打包进标准的TCP/IP协议中，支持远程通信
{%endright%}
{%warning%}
Modbus是严格的主从架构，从站只有接收到属于自己地址的请求时才会回答，所以需要主设备不断轮询从设备
{%endwarning%}
**②数据类型**
>**概述**：`Modbus`将设备内部的所有数据分为**线圈状态**
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
数字量输入、数字量输出1、模拟量输入和模拟量输出16
Modbus 把设备内部的所有数据，极其精简地分为了四种类型（这也是编程时最常打交道的部分）：

线圈状态 (Coils)：1 个比特（0 或 1），可读可写。比如控制一个继电器的开和关。

离散输入 (Discrete Inputs)：1 个比特（0 或 1），只读。比如读取一个限位开关当前是碰上了还是没碰上。

输入寄存器 (Input Registers)：16 位数据，只读。比如读取当前的温度或压力数值。

保持寄存器 (Holding Registers)：16 位数据，可读可写。比如你设定设备需要达到的目标转速。
**③通信协议**
>**概述**：
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
设备地址、功能码（访问哪一类寄存器、读写、数量）、数据和校验码