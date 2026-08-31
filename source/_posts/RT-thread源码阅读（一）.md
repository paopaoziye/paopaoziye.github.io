---
title: RT-Thread源码阅读（一）
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
  - RTT
categories: RTOS
keywords: RT-Thread源码阅读（一）, RTOS, RTT
updated: ''
img: /medias/featureimages/22.webp
date: 2026-06-30 13:55:14
summary: RT-Thread
---
# RTOS
## RT-thread源码阅读
### RT-thread源码阅读（一）
#### 1.引言
**①简介**
>**概述**：`RT-thread`是一款**完全开源**的国产`RTOS`，可以在[官网](https://www.rt-thread.org/)中下载到**源码**，此处采用`NANO 3.1.5`版本
{%list%}
分为NANO、标准版和Smart三个版本，其中NANO版本只有类似于FreeRTOS的操作系统内核
{%endlist%}
{%right%}
标准版在Nano的基础上提供了多种组件如文件系统和设备驱动框架等，以及多种功能的软件包如MQTT等
{%endright%}
{%warning%}
Smart版本需要运行在支持MMU的硬件上，可以实现多进程并将其和内核隔离，类似于一个简易的Linux
{%endwarning%}
**②环境配置**
>**概述**：
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
**③简易工程**
>**概述**：
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
#### 2.启动流程
**①简介**
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

**③后续处理**
>**概述**：
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}

