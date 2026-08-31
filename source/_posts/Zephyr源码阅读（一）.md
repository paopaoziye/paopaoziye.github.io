---
title: Zephyr源码阅读（一）
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
  - Zephyr
categories: RTOS
keywords: Zephyr源码阅读（一）, RTOS, Zephyr
updated: ''
img: /medias/featureimages/37.webp
date: 2026-06-30 13:55:14
summary: Zephyr移植
---
# RTOS
## Zephyr源码阅读（一）
### Zephyr简介
**①简介**
>**概述**：由`Linux`基金会托管的开源`RTOS`，可以在[官方仓库](github.com/zephyrproject-rtos/zephyr)获取其源码，**代码架构**如下所示
{%list%}
Zephyr采用类似Linux的Kconfig配置系统，支持模块化开发，并且包含丰富的组件如蓝牙和Wi-Fi等
{%endlist%}
{%right%}
Zephyr采用统一的驱动接口以及设备树，并且代码高度抽象，便于代码移植
{%endright%}
{%warning%}
由于其复杂的抽象层，Zephyr的RAM/Flash占用通常比FreeRTOS等简单实时操作系统高
{%endwarning%}
```shell
zephyrproject/
├── .west/               # west 工作区配置，负责管理 Zephyr 及其依赖仓库
├── bootloader/          # 引导加载程序（通常为 MCUboot），负责安全启动、固件升级和 OTA
├── modules/             # 外部模块，如 HAL 库、中间件、文件系统、加密库等
├── tools/               # 开发辅助工具和脚本
└── zephyr/              # Zephyr RTOS 核心源码
    ├── arch/            # 不同 CPU 架构的底层实现，如上下文切换、中断处理等
    ├── boards/          # 官方开发板支持文件，如设备树、Kconfig 和默认配置
    ├── drivers/         # 各类硬件外设驱动，如 GPIO、UART、SPI、I2C、ADC 等
    ├── dts/             # 通用设备树源码（DeviceTree）及设备树绑定文件（Bindings）
    ├── include/         # Zephyr 对外提供的公共 API 头文件
    ├── kernel/          # RTOS 内核，实现线程调度、同步、定时器和内存管理等核心功能
    ├── lib/             # 通用基础库，如 C 库扩展、算法和常用工具函数
    ├── samples/         # 官方示例程序，适合学习和验证功能
    ├── scripts/         # 构建、配置和开发所需的 Python 脚本及工具
    ├── soc/             # 各厂商 SoC 的底层支持代码
    ├── subsys/          # 上层子系统，如蓝牙、USB、网络协议栈、Shell、文件系统等
    ├── tests/           # 官方测试用例，用于验证内核和各功能模块
    └── ...
```
![Zephyr架构](/image/Zephyr_1.png)
**②环境配置**
>**概述**：以`Ubuntu 24.04`为例构建`Zephyr 4.4.0`的开发环境，`SDK`版本为`1.0.1`，如下所示
{%list%}
West是Zephyr官方提供的元工具，用于统一管理源码、构建、烧录和调试整个Zephyr工程
{%endlist%}
{%right%}
使用虚拟环境可以使得每个Zephyr工作区有自己的Python环境，不会污染Ubuntu系统环境
{%endright%}
{%warning%}
每次进入zephyrproject文件夹下进行开发时都需要使用source .venv/bin/activate重新激活虚拟环境
{%endwarning%}
```shell
# 更新系统
sudo apt update
sudo apt upgrade

# 安装 Zephyr 所需依赖
sudo apt install --no-install-recommends \
    git cmake ninja-build gperf \
    ccache dfu-util device-tree-compiler \
    wget python3-dev python3-pip python3-setuptools \
    python3-tk python3-wheel xz-utils file \
    make gcc gcc-multilib g++-multilib \
    libsdl2-dev libmagic1 \
    python3-venv

# 创建 Zephyr 工作区
mkdir -p ~/Workspace/zephyrproject
cd ~/Workspace/zephyrproject

# 创建 Python 虚拟环境
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip

# 安装 west 并初始化 Zephyr
pip install west
west init ~/Workspace/zephyrproject
cd ~/Workspace/zephyrproject
west update
west zephyr-export

# 安装 Python 依赖
pip install -r zephyr/scripts/requirements.txt

# 安装 Zephyr SDK
mkdir -p ~/Workspace/zephyr-sdk
cd ~/Workspace/zephyr-sdk
wget https://github.com/zephyrproject-rtos/sdk-ng/releases/download/v1.0.1/zephyr-sdk-1.0.1_linux-x86_64_gnu.tar.xz
tar -xf zephyr-sdk-1.0.1_linux-x86_64_gnu.tar.xz
cd zephyr-sdk-1.0.1
./setup.sh
echo 'export ZEPHYR_SDK_INSTALL_DIR=$HOME/Workspace/zephyr-sdk/zephyr-sdk-1.0.1' >> ~/.bashrc
source ~/.bashrc
```
**③简易工程**
>**概述**：以一块`STM32F407VET6`开发板为例，构建一个`LED`闪烁工程，如下所示
{%list%}
app.overlay用于描述应用使用的硬件资源，并覆盖开发板默认的设备树配置
{%endlist%}
{%right%}
prj.conf用于配置Zephyr内核及各功能模块，决定工程启用哪些功能和驱动
{%endright%}
{%warning%}
建议使用Zephyr的API，而不是STM32的HAL库，充分发挥Zephyr的硬件抽象能力
{%endwarning%}
{%wrong%}
该处使用的板卡外部晶振频率为25MHz，而Zephyr的black_f407ve默认为8MHz晶振，需要进行修改
{%endwrong%}
```
~/Workspace/zephyrproject/
└── app/
    └── led_demo/
        ├── CMakeLists.txt
        ├── prj.conf
        ├── app.overlay
        └── src/
            └── main.c
```
```c
/*
 * main.c
 *
 * 演示如何使用 Zephyr GPIO API 控制两个 LED。
 *
 * Green LED : PC5（低电平点亮）
 * Blue  LED : PB2（低电平点亮）
 */

#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>

/*
 * 从 DeviceTree 的 aliases 节点中获取 LED。
 *
 * 对应 app.overlay：
 *
 * aliases {
 *     led0 = &green_led;
 *     led1 = &blue_led;
 * };
 */
#define LED_GREEN_NODE DT_ALIAS(led0)
#define LED_BLUE_NODE  DT_ALIAS(led1)

/*
 * 根据 DeviceTree 节点生成 GPIO 描述符。
 *
 * gpio_dt_spec 结构体中包含：
 *   - GPIO 控制器
 *   - GPIO 引脚编号
 *   - GPIO 配置标志（如 GPIO_ACTIVE_LOW）
 */
static const struct gpio_dt_spec led_green =
    GPIO_DT_SPEC_GET(LED_GREEN_NODE, gpios);

static const struct gpio_dt_spec led_blue =
    GPIO_DT_SPEC_GET(LED_BLUE_NODE, gpios);

int main(void)
{
    /*
     * 将两个 LED 配置为 GPIO 输出模式。
     *
     * GPIO_OUTPUT_INACTIVE 表示：
     * 初始化后输出"非激活"状态。
     *
     * 由于 LED 配置为 GPIO_ACTIVE_LOW，
     * 因此非激活状态对应高电平，即 LED 熄灭。
     */
    gpio_pin_configure_dt(&led_green, GPIO_OUTPUT_INACTIVE);
    gpio_pin_configure_dt(&led_blue, GPIO_OUTPUT_INACTIVE);

    while (1)
    {
        /*
         * 翻转两个 LED 的状态。
         *
         * 每执行一次，LED 都会在亮/灭之间切换。
         * Zephyr 会根据 GPIO_ACTIVE_LOW 自动完成电平转换，
         * 应用程序无需关心实际输出的是高电平还是低电平。
         */
        gpio_pin_toggle_dt(&led_green);
        gpio_pin_toggle_dt(&led_blue);

        /* 延时 500 ms */
        k_msleep(500);
    }
}
```
```devicetree
/*
 * app.overlay
 *
 * 为 STM32F407VET6 配置：
 *   - 外部高速晶振 HSE：25 MHz
 *   - 系统主频：168 MHz
 *   - Green LED：PC5（低电平点亮）
 *   - Blue  LED：PB2（低电平点亮）
 */

/ {
    /*
     * 为 LED 创建逻辑别名。
     * 应用程序通过 DT_ALIAS(led0/led1) 获取 LED，
     * 不需要关心具体 GPIO 引脚。
     */
    aliases {
        led0 = &green_led;
        led1 = &blue_led;
    };

    /*
     * GPIO LED 设备节点。
     */
    leds {
        compatible = "gpio-leds";

        /* Green LED：PC5（Active Low） */
        green_led: green_led {
            gpios = <&gpioc 5 GPIO_ACTIVE_LOW>;
            label = "Green LED";
        };

        /* Blue LED：PB2（Active Low） */
        blue_led: blue_led {
            gpios = <&gpiob 2 GPIO_ACTIVE_LOW>;
            label = "Blue LED";
        };
    };
};

/*
 * 外部高速晶振 HSE 为 25 MHz。
 */
&clk_hse {
    clock-frequency = <DT_FREQ_M(25)>;
    status = "okay";
};

/*
 * PLL 时钟配置：
 *
 * PLL 输入频率 = 25 MHz / 25 = 1 MHz
 * PLL VCO 频率 = 1 MHz × 336 = 336 MHz
 * SYSCLK       = 336 MHz / 2 = 168 MHz
 * PLL48CLK     = 336 MHz / 7 = 48 MHz
 */
&pll {
    clocks = <&clk_hse>;

    div-m = <25>;
    mul-n = <336>;
    div-p = <2>;
    div-q = <7>;

    status = "okay";
};

/*
 * 将 PLL 作为系统时钟源。
 *
 * SYSCLK = 168 MHz
 * HCLK   = 168 MHz
 * PCLK1  = 42 MHz
 * PCLK2  = 84 MHz
 */
&rcc {
    clocks = <&pll>;
    clock-frequency = <DT_FREQ_M(168)>;

    ahb-prescaler = <1>;
    apb1-prescaler = <4>;
    apb2-prescaler = <2>;
};
```
```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.20.0)

# 找到并加载 Zephyr 构建系统
find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})

# 定义工程名称
project(led_demo)

# 将 src/main.c 加入编译
target_sources(app PRIVATE
    src/main.c
)
```
```kconfig
# prj.conf
# 启用 GPIO 子系统
CONFIG_GPIO=y
```
**④编译与烧写**
>**概述**：`Zephyr`采用`west`进行`编译`、`烧写`和`调试`，通常采用`OpenOCD`作为烧录后端
{%list%}
连接板卡和电脑后，可以采用lsusb命令查看调试器是否被Linux正确识别，此处采用CMSIS-DAP调试器
{%endlist%}
{%right%}
west会根据开发板配置自动调用对应的烧录工具完成程序下载
{%endright%}
{%warning%}
Zephyr的black_f407ve板级配置默认使用ST-Link作为调试器，需要修改相关配置才能使用west flash
{%endwarning%}
```shell
# 进入 Zephyr 工作区并激活 Python 虚拟环境
cd ~/Workspace/zephyrproject
source .venv/bin/activate

# 编译工程
# -p always标识清除旧的构建缓存，重新生成整个工程
# -b black_f407ve指定目标开发板
# app/led_demo为应用程序所在目录
west build -p always -b black_f407ve/stm32f407xx app/led_demo

# 1.直接使用 OpenOCD 进行烧录
openocd \
    -f interface/cmsis-dap.cfg \
    -f target/stm32f4x.cfg \
    -c "program build/zephyr/zephyr.hex verify reset exit"

# 2.直接使用 pyOCD 进行烧录，通常需要通过 pip install pyocd 下载先
pyocd flash --target stm32f407vetx build/zephyr/zephyr.hex

# 3.修改 Zephyr 的 OpenOCD 配置 openocd.cfg 再使用 west flash 进行烧录，详细如下所示
cd ~/Workspace/zephyrproject/zephyr/boards/others/black_f407ve/support
vim openocd.cfg 
cd ~/Workspace/zephyrproject
west flash
```
```tcl
#
# OpenOCD configuration for Black F407VE + CMSIS-DAP
#

source [find interface/cmsis-dap.cfg]

transport select swd

source [find target/stm32f4x.cfg]

reset_config srst_only srst_nogate

$_TARGETNAME configure -event gdb-attach {
    echo "Debugger attaching: halting execution"
    reset halt
    gdb_breakpoint_override hard
}

$_TARGETNAME configure -event gdb-detach {
    echo "Debugger detaching: resuming execution"
    resume
}
```
