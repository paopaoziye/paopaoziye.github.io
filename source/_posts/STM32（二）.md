---
title: STM32（二）
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
keywords: STM32（二）, STM32, MCU
updated: ''
img: /medias/featureimages/27.webp
date: 2026-06-30 13:55:14
summary: 串行通信
---
# 单片机
## STM32
### STM32（二）
#### 1.UART
**①简介**
>**概述**：全称为**通用异步收发传输器**，收发双方都有引脚`RX`和`TX`，分别用于**接收和发送**数据
{%list%}
UART为异步全双工通信，采用小端传输，即先发送低位，再发送高位
{%endlist%}
{%right%}
STM32串口还有CK、RTS和CTS引脚，CK用于同步模式，RTS和CTS用于硬件流控
{%endright%}
{%warning%}
UART只能实现一对一的数据传输，速度较慢
{%endwarning%}
**②通信协议**
>**概述**：每个数据帧由**起始位**、**数据位**、**校验位**和**停止位**组成，并以一定的速率即**波特率**传输
{%list%}
通常采用8N1，即八数据位、无校验位和一停止位，使用该设置传输Hello字符串的波形如下所示
{%endlist%}
{%right%}
RS232和RS485协议本质上是采用不同电平传输逻辑1和逻辑0的UART协议，抗干扰能力更强，适合长距离传输
{%endright%}
>`RS232`：普通`UART`逻辑`1`为`2v~5v`，逻辑`0`为`0v~0.8v`，`RS232`逻辑`1`为`+3v~+15v`，逻辑`0`为`-3v~-15v`

>`RS485`：使用两根线`A`、`B`生成**差分信号**，当`A`的电平**高于**`B`的电平时，为逻辑`1`，反之为逻辑`0`
{%warning%}
使用串口前数据传输双方需要预先统一波特率，以便正确的传输数据，常用波特率有9600、115200和921600
{%endwarning%}
>**起始位**：当线路空闲时，一直处于**逻辑**`1`状态，发送一个**逻辑**`0`表示开始传输数据

>**数据位**：紧接着**起始位**后，可以发送`8-9`位**数据位**

>**校验位**：如果采用**奇校验/偶校验**，数据位的**最后一位**为校验位，该位应使得数据位中`1`的位数为**奇数/偶数**

>**停止位**：紧接着**数据位**后，发送`0.5/1/1.5/2`位**逻辑**`1`，表示数据**发送完毕**
```shell
空闲 起始位                     停止位  空闲
       |                          |
[1][1][0][0][0][0][1][0][0][1][0][1][1][1] ->数据位为00010010，即'H'的小端序（H的ASCII码为01001000）
[1][1][0][1][0][1][0][0][1][1][0][1][1][1] ->数据位为10100110，即'e'的小端序
[1][1][0][0][0][1][1][0][1][1][0][1][1][1] ->数据位为00110110，即'l'的小端序
[1][1][0][0][0][1][1][0][1][1][0][1][1][1] ->数据位为00110110，即'l'的小端序
[1][1][0][1][1][1][1][0][1][1][0][1][1][1] ->数据位为11110110，即'o'的小端序
```
**③模块配置**
>**概述**：先初始化对应的`GPIO`引脚，`TX`引脚为**复用推挽输出**，`RX`引脚为**上拉输入**，再配置`USART`本身
{%list%}
可以在数据手册的引脚分布表中和用户手册的IO配置表查询对应引脚编号和配置方式
{%endlist%}
{%right%}
可以使用AFIO模块对引脚进行重映射，USART1的TX和RX引脚默认为PA9和PA10，重映射后为PB6和PB7
{%endright%}
{%warning%}
RX引脚最好使用上拉输入模式，因为根据UASRT通信协议，串口空闲时需要保持高电平
{%endwarning%}
```c
void Usart1_Init(){
  //打开GPIO时钟
  RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA,ENABLE);
  //初始化引脚，TX引脚设置为复用推挽输出
  GPIO_InitTypeDef gpio_init_struct = {0};
  gpio_init_struct.GPIO_Pin = GPIO_Pin_9;
  gpio_init_struct.GPIO_Mode = GPIO_Mode_AF_PP;
  gpio_init_struct.GPIO_Speed = GPIO_Speed_10MHz;
  GPIO_Init(GPIOA,&gpio_init_struct);
  //RX引脚设置为输入上拉
  gpio_init_struct.GPIO_Pin = GPIO_Pin_10;
  gpio_init_struct.GPIO_Mode = GPIO_Mode_IPU;
  GPIO_Init(GPIOA,&gpio_init_struct);
  //打开串口时钟
  RCC_APB2PeriphClockCmd(RCC_APB2Periph_USART1,ENABLE);
  //初始化串口，设置波特率、硬件流控、收发模式、校验位、停止位和数据位
  USART_InitTypeDef usart_init_struct = {0};
  usart_init_struct.USART_BaudRate = 115200;
  usart_init_struct.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
  usart_init_struct.USART_Mode = USART_Mode_Rx | USART_Mode_Tx;
  usart_init_struct.USART_Parity = USART_Parity_No;
  usart_init_struct.USART_Stop_Bits = USART_StopBits_1;
  usart_init_struct.USART_Word_Length = USART_WordLength_8b;
  USART_Init(USART1,&usart_init_struct);
  //使能串口
  USART_Cmd(USART1,ENABLE);
}
```
```c
void Usart1_Init(){
  //打开AFIO的时钟
  RCC_APB2PeriphClockCmd(RCC_APB2Periph_AFIO,ENABLE)
  //开启USART1的重映射
  GPIO_PinRemapConfig(GPIO_Remap_USART1,ENABLE)
  //配置PA6、PA7，并设置串口，略
}
```
**④收发数据**
>**概述**：核心函数为`My_USART_SendBytes`和`My_USART_ReceiveBytes`，如下所示
{%list%}
发送数据时，数据先进入发送数据寄存器，随后进入移位寄存器，最后一位一位发送出去，接受数据流程类似
{%endlist%}
{%right%}
串口主要标志位有TXE、TC和RXNE，分别标识发送寄存器为空、数据发送完成和接收寄存器非空
{%endright%}
{%warning%}
当出现奇偶校验错、帧格式错误、噪声错和溢出错误时，PE、FE、NE和ORE标志位会被置为1
{%endwarning%}
>`PE`通常由双方**奇偶校验设置不匹配**导致，`FE`通常由双方**波特率不匹配**导致

>`NE`通常由**环境噪声和信号质量差**导致，`ORE`通常由**软件响应慢和中断被阻塞**导致
```c
/* 使用串口发送多个字符 */
void My_USART_SendBytes(USART_TypeDef *USARTx, const uint8_t *pData, uint16_t Size)
{
  if(Size == 0) return;

  for(uint16_t i=0; i < Size; i++){
    //忙等待直到发送数据寄存器为空
    while(USART_GetFlagStatus(USARTx, USART_FLAG_TXE) == RESET);
    //将当前字节写入发送寄存器，后续硬件会自动开始发送
    USART_SendData(USARTx, pData[i]);
  }
  //忙等待直到数据发送完成
  while(USART_GetFlagStatus(USARTx, USART_FLAG_TC) == RESET);
}

```
```c
/* 使用串口接收多个字符 */
uint16_t My_USART_ReceiveBytes(USART_TypeDef *USARTx, uint8_t *pDataOut, 
                               uint16_t Size, int Timeout)
{
  uint32_t expireTime;
  //初始化systick寄存器
  Delay_Init();
  //计算过期时间
  if(Timeout >= 0)
  {
    expireTime = GetTick() + Timeout;
  }
  //记录接收的字节数
  uint16_t i = 0;
  //不断接收数据直到超时
  do{
    //如果接收寄存器非空则提取数据
    if(USART_GetFlagStatus(USARTx, USART_FLAG_RXNE) == SET)
    {
      pDataOut[i++] = USART_ReceiveData(USARTx);
      
      if(i==Size) break;
    }
  }while(Timeout < 0 || GetTick() < expireTime);

  return i;
}
```
#### 2.IIC
**①简介**
>**概述**：全称为**内部集成电路**，主要由**时钟线**`SCL`和**数据线**`SDA`组成，可以同时连接**多个设备**，如下所示
{%list%}
IIC为同步半双工通信，采用大端传输，可以实现一对多的数据传输，速度比UART快，比SPI慢
{%endlist%}
>设备被分为**主设备**和**从设备**，主设备**发起和主导**通信（控制`SCL`线），**同一时刻**只能有一个主设备
{%right%}
SCL和SDA线都接上拉电阻，且所有的SCL和SDA引脚都被设置为开漏输出，从而实现逻辑线与，进行一对多的通信
{%endright%}
>**逻辑线与**：以`SCL`线为例，只要有**一个设备**的`SCL`引脚为**低电平**，`SCL`线将从**高电平变为低电平**
{%warning%}
只有主设备才能控制SCL线，从设备SCL引脚均被置为1，当一个设备控制SDA线时，其他设备的SDA引脚都置为1
{%endwarning%}
{%wrong%}
如果采用推挽输出，必须所有设备的引脚为高电平才能将SCL/SDA线变为低电平，一个设备无法影响电路状态
{%endwrong%}
```shell
                                                                                [VDD]
                                                                                  |
                                                                                 [R]
                                                                                  |
----------------------------------------------------------------------------------+SCL线
    |          |         |                                         |
    [设备1]    [设备2]    [设备3]                ...                [设备N]
          |         |          |                                         |
----------------------------------------------------------------------------------+SDA线
                                                                                  |
                                                                                 [R]
                                                                                  |
                                                                                [VDD]
```
**②通信协议**
>**概述**：每个数据帧由**起始位**、**数据位**、**应答位**和**停止位**组成，**时序图**如下所示
{%list%}
起始时SCL线和SDA线都处于逻辑1状态，接收到起始信号后，SCL线开始产生时钟信号
{%endlist%}
{%right%}
发送的第一个数据位前7位为设备地址，第8位为读写位，1表示读，0表示写
{%endright%}
>每个设备都有一个**设备地址**，其中有几个**保留地址**有特殊作用，如**广播地址**`0x00`
{%warning%}
接收应答位前，接收方将SDA引脚置1释放SDA线，发送方将SDA引脚置0发送应答信号
{%endwarning%}
{%wrong%}
发送数据和应答位时，只能在SCL线为低电平期间修改SDA线
{%endwrong%}
>**起始位**：`SCL`线为**逻辑**`1`期间，**主设备**将`SDA`线由**逻辑**`1`变为**逻辑**`0`，表示**开始通信**

>**数据位**：**开始通信**或者**接收到应答信号**后，**主设备/从设备**发送`8`位**数据位**

>**应答位**：每接收一个**数据位**，**接收方**都会发送`1`位**应答位**，若为**逻辑**`0`，表示接收**成功**

>**停止位**：`SCL`线为**逻辑**`1`期间，**主设备**将`SDA`线由**逻辑**`0`变为**逻辑**`1`，表示**结束通信**
```shell
    空闲 起始位                                               主机释放SDA并等待  从机拉低SDA应答
    |   |                                                    |                 |
SCL:[1][1][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1]
SDA:[1][1][0][0][0][1][1][1][1][1][1][1][1][0][0][0][0][1][1][1][1][1][1][1][1][0][0]
             |                                         |
             寻址阶段：从机地址为0111100                 读写位：1表示读
                                                                            主机拉高SCL并发送停止位
                                                                            |
SCL:[0][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1][0][1][1][1][1][1]
SDA:[0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][1][1][1][1][1][1][0][0][0][1][1][1]
    |                                               |                 |           
    发送数据：数据为00000000                         主机释放SDA并等待   从机拉低SDA应答
```
**③模块配置**
>**概述**：先初始化对应的`GPIO`引脚，`SCL`和`SDA`均配置为**复用开漏输出**，再配置`IIC`本身
{%list%}
STM32的硬件IIC支持标准模式和快速模式，前者速率最高为100kbps，后者速率最高为400kbps
{%endlist%}
{%right%}
同理可以采用AFIO模块对IIC1引脚进行重映射，默认SCL和SDA引脚为PB6和PB7，重映射后为PB8和PB9
{%endright%}
{%warning%}
只有在快速模式下才能设置时钟信号的占空比，即一个周期内低电平:高电平的比例，通常采用2:1
{%endwarning%}
```c
void I2C_Init(void){
  //打开GPIOB时钟
  RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB,ENABLE);
  //初始化引脚，PB6和PB7均设置为复用开漏模式
  GPIO_InitTypeDef gpio_init_struct;
  gpio_init_struct.GPIO_Pin = GPIO_Pin_6 | GPIO_Pin_7;
  gpio_init_struct.GPIO_Mode = GPIO_Mode_AF_OD;
  gpio_init_struct.GPIO_Speed = GPIO_Speed_2MHz;
  GPIO_Init(GPIOB,&gpio_init_struct);
  //打开IIC时钟并复位
  RCC_APB1PeriphClockCmd(RCC_APB1Periph_I2C1,ENABLE);
  RCC_APB1PeriphResetCmd(RCC_APB1Periph_I2C1,ENABLE);
  RCC_APB1PeriphResetCmd(RCC_APB1Periph_I2C1,DISABLE);
  //设置IIC
  I2C_InitTypeDef iic_init_struct;
  iic_init_struct.I2C_ClockSpeed = 400000;            //波特率，自动进入快速模式
  iic_init_struct.I2C_Mode = I2C_Mode_I2C;            //模式采用标准IIC模式
  iic_init_struct.I2C_DutyCycle = I2C_DutyCycle_2;    //占空比采用2:1
  I2C_Init(I2C1,&iic_init_struct);
  //使能IIC
  I2C_Cmd(I2C1,ENABLE);
}
```
**④发送数据**
>**概述**：当**总线空闲**时，依次发送**起始位**、**从机地址**、**相关数据**和**停止位**，如下所示
{%list%}
发送起始位前，需要通过BUSY标志位确认总线空闲，发送起始位后，需要通过SB标志位确认起始位发送成功
{%endlist%}
{%right%}
发送从机地址后，需要通过ADDR标志位确认寻址成功，且ADDR标志位被置位后硬件会主动拉低SCL线
{%endright%}
>硬件主动拉低`SCL`线给软件处理**地址匹配**的响应时间，需要通过读取`SR1`和`SR2`**手动清除**该标志
{%warning%}
发送数据前，需要确认上一个数据是否被应答，并且在发送最后一个数据后通过BTF标志位确认是否发送完成
{%endwarning%}
{%wrong%}
AF标志位用于检测数据位是否被应答，该标志位不会被硬件自动清除，第一次检测该标志前需要手动清除该标志位
{%endwrong%}
```c
/* 使用IIC向从机发送多个字节 */
int My_I2C_SendBytes(I2C_TypeDef *I2Cx, uint8_t Addr, const uint8_t *pData, uint16_t Size){
  //1.等待总线空闲并发送起始位
  //等待总线空闲
  while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_BUSY) == SET);
  //发送起始位
  I2C_GenerateSTART(I2Cx, ENABLE);
  //确认起始位已经发送成功
  while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_SB) == RESET);

  //2.清除AF标志位并发送从机地址和读写位，等待寻址成功或者失败
  //需要手动清除AF标志，因为AF标志位不会被硬件自动清除，防止之前的ACK应答失败影响该次传输
  I2C_ClearFlag(I2Cx, I2C_FLAG_AF);
  //发送从机地址和写操作位0
  I2C_SendData(I2Cx, Addr & 0xfe);
  //不断循环直到寻址成功或者寻址失败
  while(1){
    //寻址成功则退出循环
    if(I2C_GetFlagStatus(I2Cx, I2C_FLAG_ADDR) == SET){
      break;
    }
    //应答失败标识寻址失败，发送停止位并返回-1
    if(I2C_GetFlagStatus(I2Cx, I2C_FLAG_AF) == SET){
      I2C_GenerateSTOP(I2Cx, ENABLE);
      return -1;
    }
  }

  //3.清除ADDR标志位，当ADDR标志位被设置后，硬件会拉低SCL线，给软件处理地址匹配事件
  I2C_ReadRegister(I2Cx, I2C_Register_SR1);
  I2C_ReadRegister(I2Cx, I2C_Register_SR2);

  //4.清除ADDR标志位后，开始发送数据
  //对于每个数据，发送前都需要检测上一个数据是否被响应，随后当发送寄存器为空时开始发送数据
  for(uint16_t i=0; i<Size; i++){
    //等待上一个数据应答成功以及发送数据寄存器为空
    while(1){
      //如果上一个数据应答失败，发送停止位并返回-2
      if(I2C_GetFlagStatus(I2Cx, I2C_FLAG_AF) == SET){
        I2C_GenerateSTOP(I2Cx, ENABLE);
        return -2; // 数据被拒收
      }
      //当发送数据寄存器为空时，开始发送数据
      if(I2C_GetFlagStatus(I2Cx, I2C_FLAG_TXE) == SET){
        break;
      }
    }
    //发送数据
    I2C_SendData(I2Cx, pData[i]);
  }

  //5.检测最后一个数据是否被应答以及是否发送完毕
  while(1){
    //如果数据被拒收则发送停止位并返回-2
    if(I2C_GetFlagStatus(I2Cx, I2C_FLAG_AF) == SET){
        I2C_GenerateSTOP(I2Cx, ENABLE);
        return -2;  
    }
    //如果数据发送完毕则退出
    if(I2C_GetFlagStatus(I2Cx, I2C_FLAG_BTF) == SET){
      break;
    }
  }

  //6.发送停止位
  I2C_GenerateSTOP(I2Cx, ENABLE);
  return 0; // 成功
}
```
**⑤接收数据**
>**概述**：发送**起始位**和**从机地址**，随后等待**从机发送数据**、**做出应答**并**读取数据**，最后发送**停止位**，如下所示
{%list%}
假设需要从从机读取n个数据，前n-1个字节主机需要回复ACK，最后一个字节主机需要回复NAK
{%endlist%}
{%right%}
需要在数据被完全接收即RXNE置位之前设置回复ACK还是NAK，硬件接收完数据后自动回复ACK还是NAK
{%endright%}
{%warning%}
如果调用I2C_GenerateSTOP时有数据正在被接收，硬件会等待该数据接收完成后再发送停止位
{%endwarning%}
{%wrong%}
接收最后一个字节前，需要暂停中断并立即设置停止位以及回复ACK还是NAK
{%endwrong%}

```c
/* 使用IIC从从机读取多个字节 */
int My_I2C_ReceiveBytes(I2C_TypeDef *I2Cx, uint8_t Addr, uint8_t *pBuffer, uint16_t Size){
  //1.等待总线空闲并发送起始位
  //等待总线空闲
  while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_BUSY) == SET);
  //发送起始位
  I2C_GenerateSTART(I2Cx, ENABLE);
  //等待起始位发送完成
  while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_SB) == RESET);

  //2.清除AF标志位并发送从机地址和读写位，等待寻址成功或者失败
  //需要手动清除AF标志，因为AF标志位不会被硬件自动清除，防止之前的ACK应答失败影响该次传输
  I2C_ClearFlag(I2Cx, I2C_FLAG_AF);
  ////发送从机地址和读操作位1
  I2C_SendData(I2Cx, Addr | 0x01);
  //不断循环直到寻址成功或者寻址失败
  while(1){
    //寻址成功则退出循环
    if(I2C_GetFlagStatus(I2Cx, I2C_FLAG_ADDR) == SET){
      break;
    }
    //应答失败标识寻址失败，发送停止位并返回-1
    if(I2C_GetFlagStatus(I2Cx, I2C_FLAG_AF) == SET){
      I2C_GenerateSTOP(I2Cx, ENABLE);
      return -1;
    }
  }
  //3.开始读取数据
  //如果只读取一个字节：设置NAK -> 清除ADDR标志并设置停止位 ->
  if(Size == 1){
    //向ACK写0，标识对于当前接收的字节回复NAK
    //需要提前设置，否则当前字节接收完成后在设置只能影响到下一字节
    I2C_AcknowledgeConfig(I2Cx, DISABLE);
    //需要使用中断保护该时序，因为假设在清除ADDR后发生了中断
    //从机发送数据后，主机由于没有设置发送停止位导致不符合协议时序
    __disable_irq();
    //清除ADDR，从机开始发送数据
    I2C_ReadRegister(I2Cx, I2C_Register_SR1);
    I2C_ReadRegister(I2Cx, I2C_Register_SR2);
    //设置发送停止位，调用该函数后，硬件会等待当前字节接收完成再发送停止位
    I2C_GenerateSTOP(I2Cx, ENABLE);
    __enable_irq();
    //等待RxNE置位，即字节接收完成，此时由于设置
    while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_RXNE) == RESET);
    //读取数据
    pBuffer[0] = I2C_ReceiveData(I2Cx);
  }
  //如果接收的字节数大于1
  else{
    //向ACK写1，标识对于当前接收的字节回复ACK
    //同理需要提前设置
    I2C_AcknowledgeConfig(I2Cx, ENABLE);
    //清除ADDR，从机开始发送数据
    I2C_ReadRegister(I2Cx, I2C_Register_SR1);
    I2C_ReadRegister(I2Cx, I2C_Register_SR2);
    //读取前n - 1个字节，且由于设置了ACK，前n - 1个字节主机会自动回复ACK
    for(uint16_t i=0; i<Size-1; i++){
      //当接收第 n - 1个字节时，需要暂停中断，防止处理最后一个字节时被中断打断
      if(i==Size-2)
      {
        __disable_irq();
      }
      // 等待RxNE置位
      while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_RXNE) == RESET);
      // 读取
      pBuffer[i] = I2C_ReceiveData(I2Cx);
    }
    //向ACK写0，表示最后一个字节回复NAK
    //如果在这里被中断打断，主机还是会回复ACK，从机还会继续发送数据
    I2C_AcknowledgeConfig(I2Cx, DISABLE);
    //设置发送停止位
    //如果在这里被中断打断，机由于没有设置发送停止位导致不符合协议时序
    I2C_GenerateSTOP(I2Cx, ENABLE);
    __enable_irq();
    //等待RxNE置位，即最后一个字节被接收完成
    while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_RXNE) == RESET);
    pBuffer[Size-1] = I2C_ReceiveData(I2Cx);
  }
  return 0;
}
```
#### 3.SPI
**①简介**
>**概述**：全称为**串行外设接口**，主要由**时钟线**`SCLK`、**输出线**`SDO`、**输入线**`SDI`和**片选线**`SS`组成
{%list%}
SPI为同步全双工通信，可以实现一对多的数据传输，速度最快，需要较多的线口
{%endlist%}
{%right%}
提供并控制时钟信号的设备为主设备，其他设备为从设备，主设备通过片选线来确定要通信的从设备，低电平有效
{%endright%}
{%warning%}
同一时间只能有一个从设备与主设备通信，即其余从设备的片选线应该为高电平
{%endwarning%}

**②通信协议**
>**概述**：对数据帧的格式**没有具体规定**，只需要设置**时钟极性**`CPOL`、**时钟相位**`CPHA`、**传输顺序**和**数据宽度**即可
{%list%}
时钟极性即时钟线空闲时为高电平还是低电平，时钟相位即在时钟线第一边沿还是第二边沿采集数据
{%endlist%}
{%right%}
具体的数据帧格式由从设备规定，根据规定发送对应的数据帧即可
{%endright%}
>以`93C46`存储器为例，其**指令格式**为`1:[操作码]:[地址码]:[数据码]`，**读操作码**为`10`，**写操作码**为`01`
{%warning%}
SPI通信过程中，主设备向从设备写一次数据，从设备就会回一次数据，该数据可以被读取，也可以丢弃
{%endwarning%}
**③模块配置**
>**概述**：先初始化对应的`GPIO`引脚，`SCLK`和`SDO`均配置为**复用推挽输出**，`SDI`配置为**上拉输入**，再配置`SPI`本身
{%list%}
SPI1默认SCL、SDI和SDO引脚为PA5、PA6和PA7，重映射后为PB3、PB4和PB5，使用PA15控制从设备片选
{%endlist%}
{%right%}
SPI的数据宽度、时钟极性、时钟相位和比特位传输顺序等由从设备决定，可以根据其手册中的数据传输示例获取
{%endright%}
{%warning%}
单片机作为主机时也需要设置片选信号，通常采用软件方式并将内部NSS引脚拉高
{%endwarning%}
```c
void SPI1_Init(void){
  //开启GPIOA的时钟
  RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);
  //将PA5和PA7设置为复用推挽输出
  GPIO_InitTypeDef gpio_init_struct = {0};
  gpio_init_struct.GPIO_Pin = GPIO_Pin_5 | GPIO_Pin_7;
  gpio_init_struct.GPIO_Mode = GPIO_Mode_AF_PP;
  gpio_init_struct.GPIO_Speed = GPIO_Speed_2MHz;
  GPIO_Init(GPIOA,&gpio_init_struct);
  //将PA6设置为上拉输入
  gpio_init_struct.GPIO_Pin = GPIO_Pin_6;
  gpio_init_struct.GPIO_Mode = GPIO_Mode_IPU;
  gpio_init_struct.GPIO_Speed = GPIO_Speed_2MHz;
  GPIO_Init(GPIOA,&gpio_init_struct);
  //将PA15设置为通用推挽输出
  gpio_init_struct.GPIO_Pin = GPIO_Pin_15;
  gpio_init_struct.GPIO_Mode = GPIO_Mode_Out_PP;
  gpio_init_struct.GPIO_Speed = GPIO_Speed_2MHz;
  GPIO_Init(GPIOA,&gpio_init_struct);
  //开启SPI1的时钟
  RCC_APB2PeriphClockCmd(RCC_APB2Periph_SPI1, ENABLE);
  //设置SPI1
  SPI_InitTypeDef SPI_InitStructure = {0};
  SPI_InitStructure.SPI_Mode = SPI_Mode_Master;                       //采用主模式
  SPI_InitStructure.SPI_Direction = SPI_Direction_2Lines_FullDuplex;  //全双工
  SPI_InitStructure.SPI_DataSize = SPI_DataSize_8b;                   //数据宽度为8位
  SPI_InitStructure.SPI_CPOL = SPI_CPOL_High;                         //时钟极性为高极性
  SPI_InitStructure.SPI_CPHA = SPI_CPHA_2Edge;                        //时钟相位为第二边沿
  SPI_InitStructure.SPI_NSS = SPI_NSS_Soft;                           //采用软件NSS
  SPI_InitStructure.SPI_FirstBit = SPI_FirstBit_MSB;                  //先发送低比特位
  SPI_InitStructure.SPI_BaudRatePrescaler = SPI_BaudRatePrescaler_64; //采用64分频，时钟频率为1.125MHz
  SPI_Init(SPI1, &SPI_InitStructure);
  //使能SPI1
  SPI_Cmd(SPI1, ENABLE);
  //使用软件NSS模式时，使用该接口将内部NSS引脚拉高，避免SPI进入从模式
  SPI_NSSInternalSoftwareConfig(SPI1, SPI_NSSInternalSoft_Set);
}
```

**④数据收发**
>**概述**：核心函数为`My_SPI_MasterTransmitReceive`，如下所示
{%list%}
根据SPI通信协议，当从机收到主机的一个数据后，会立马返回一个数据
{%endlist%}
{%right%}
如果只想接收数据，可以发送一些无效数据给从设备
{%endright%}
```c
void My_SPI_MasterTransmitReceive(SPI_TypeDef *SPIx, const uint8_t *pDataTx, uint8_t *pDataRx, uint16_t Size){
  //1.使能SPI1并发送第一个字节
  SPI_Cmd(SPIx, ENABLE);
  SPI_I2S_SendData(SPIx, pDataTx[0]);

  //2.发送剩下size - 1个字节并接收前size - 1个字节
  for(uint16_t i=0; i<Size-1; i++){
    //当发送寄存器为空时，发送下一个字节
    while(SPI_I2S_GetFlagStatus(SPIx, SPI_I2S_FLAG_TXE) == RESET);
    SPI_I2S_SendData(SPIx, pDataTx[i+1]);
    //当接收寄存器非空，接收从机发送的上一个字节
    while(SPI_I2S_GetFlagStatus(SPIx, SPI_I2S_FLAG_RXNE) == RESET);
    pDataRx[i] = SPI_I2S_ReceiveData(SPIx);
  }
  
  //3.读取最后一个字节
  while(SPI_I2S_GetFlagStatus(SPIx, SPI_I2S_FLAG_RXNE) == RESET);
  pDataRx[Size-1] = SPI_I2S_ReceiveData(SPIx);

  //4.断开总开关
  SPI_Cmd(SPIx, DISABLE);
}
```
#### 4.软件IIC
**①简介**
>**概述**：使用`GPIO`引脚和**软件延时**模拟`IIC`时序从而实现`IIC`通信，定义如下所示
{%right%}
软件IIC可以使用任意GPIO引脚，灵活性更高，且易于移植和调试，而且可以规避某些MCU硬件IIC不稳定的问题
{%endright%}
{%warning%}
软件IIC时序由CPU产生，需要占用CPU且精度和速度不如硬件IIC
{%endwarning%}
```c
typedef struct{
  GPIO_TypeDef *SCL_GPIOx; //SCL引脚的组编号
  uint16_t SCL_GPIO_Pin;   //SCL引脚的引脚编号
  GPIO_TypeDef *SDA_GPIOx; //SCL引脚的组编号
  uint16_t SDA_GPIO_Pin;   //SDA引脚的引脚编号
}SI2C_TypeDef;
//控制SCL线
#define scl_w(v) GPIO_WriteBit(SI2C->SCL_GPIOx, SI2C->SCL_GPIO_Pin, ((v)?Bit_SET:Bit_RESET))
//控制SDA线
#define sda_w(v) GPIO_WriteBit(SI2C->SDA_GPIOx, SI2C->SDA_GPIO_Pin, ((v)?Bit_SET:Bit_RESET))
//读取SCL线
#define scl_r ((GPIO_ReadInputDataBit(SI2C->SCL_GPIOx, SI2C->SCL_GPIO_Pin) == Bit_SET) ? 1 : 0)
//读取SDA线
#define sda_r ((GPIO_ReadInputDataBit(SI2C->SDA_GPIOx, SI2C->SDA_GPIO_Pin) == Bit_SET) ? 1 : 0)
//粗略的us级延迟函数
void delay(uint32_t us) { for(uint32_t i = 0; i<8*us; i++); }
```
```c
/* 软件IIC初始化 */
void My_SI2C_Init(SI2C_TypeDef *SI2C){
  //使能SCL引脚的时钟
  if(SI2C->SCL_GPIOx == GPIOA){
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);
  }
  else if(SI2C->SCL_GPIOx == GPIOB){
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);
  }
  else if(SI2C->SCL_GPIOx == GPIOC){
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOC, ENABLE);
  }
  else if(SI2C->SCL_GPIOx == GPIOD){
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOD, ENABLE);
  }
  //使能SDA引脚的时钟
  if(SI2C->SDA_GPIOx == GPIOA){
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);
  }
  else if(SI2C->SDA_GPIOx == GPIOB){
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);
  }
  else if(SI2C->SDA_GPIOx == GPIOC){
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOC, ENABLE);
  }
  else if(SI2C->SDA_GPIOx == GPIOD){
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOD, ENABLE);
  }
  //初始化SCL引脚为输出开漏模式
  GPIO_InitTypeDef GPIO_InitStruct = {0};
  GPIO_InitStruct.GPIO_Pin = SI2C->SCL_GPIO_Pin;
  GPIO_InitStruct.GPIO_Mode = GPIO_Mode_Out_OD;
  GPIO_InitStruct.GPIO_Speed = GPIO_Speed_2MHz;
  GPIO_Init(SI2C->SCL_GPIOx, &GPIO_InitStruct);
  //初始化SDA引脚为输出开漏模式
  GPIO_InitStruct.GPIO_Pin = SI2C->SDA_GPIO_Pin;
  GPIO_InitStruct.GPIO_Mode = GPIO_Mode_Out_OD;
  GPIO_InitStruct.GPIO_Speed = GPIO_Speed_2MHz;
  GPIO_Init(SI2C->SDA_GPIOx, &GPIO_InitStruct);
  //将SDA和SCL都置为高电平，标识总线空闲
  GPIO_WriteBit(SI2C->SDA_GPIOx, SI2C->SDA_GPIO_Pin, Bit_SET);
  GPIO_WriteBit(SI2C->SCL_GPIOx, SI2C->SCL_GPIO_Pin, Bit_SET);
}
```
**②信号模拟**
>**概述**：
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
```c
/* 模拟起始信号：SDA在SCL高电平期间产生下降沿 */
//SCL----
//SDA--
//     --
void Soft_I2C_Start(void){
  //将SCL线和SDA线拉高并延迟1us
  scl_w(1);
  sda_w(1);
  delay(2);
  //仅仅拉低SDA线并延迟1us
  sda_w(0);
  delay(2);
  //拉低SCL，准备发送数据
  scl_w(0);
}
/* 模拟结束信号：SDA在SCL高电平期间产生上升沿 */
//SCL----
//SDA  --
//   --
void Soft_I2C_Start(void){
  //将SCL线拉高，SDA线拉低，为产生上升沿做准备
  scl_w(1);
  sda_w(0);
  delay(2);
  //仅仅拉低SDA线并延迟1us
  sda_w(1);
  delay(2);
  //拉低SCL，因为SDA线在SCL为低电平时产生变化不会有其他作用，较为安全
  scl_w(0);
}
/* 发送应答信号 */
//
//--
//
//--
void Soft_I2C_Ack(void){
  //
  scl_w(0);
  delay();
}
```
③