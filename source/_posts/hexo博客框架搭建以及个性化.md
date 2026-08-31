---
title: Hexo个人博客搭建
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
  - Hexo
  - 静态博客框架
categories: 工作流
keywords: Hexo个人博客搭建, Hexo, 静态博客框架, 工作流
updated: ''
img: /medias/featureimages/18.webp
date: 2023-11-07 17:33:24
summary: HEXO博客搭建全流程
---

# Hexo
## Hexo个人博客搭建
### 1.博客部署
#### 1.1环境配置
{%list%}
安装hexo的依赖
{%endlist%}
**①windows环境**
>安装`Node.js`和`Git`，并通过`xx -v`检测其是否在**环境变量**中
{%list%}
如果不在，则需要手动将其bin文件夹路径添加到系统变量中的path变量中
{%endlist%}
>设置`npm`的**镜像源**
```shell
# 查看npm的配置
npm config list
# 默认源
npm config set registry https://registry.npmjs.org
# 临时改变镜像源
npm --registry=https://registry.npm.taobao.org
# 永久设置为淘宝镜像源
npm config set registry https://registry.npm.taobao.org
```
**②Linux环境**
>安装`Node.js`和`Git`，若使用**源码安装**，则需要添加**软链接**
{%list%}
类似于windows的环境变量，Linux在指定位置找对应的命令
{%endlist%}
>设置`npm`的**镜像源**，**同上**
#### 1.2Hexo配置
**①Hexo安装**
>在`git bash/shell`中输入`npm install -g hexo-cli`

**②博客初始化**
>选择一个**位置**用于存放**博客文件夹**
```shell
#新建文件夹
mkdir <新建文件夹的名称> 
#初始化文件夹
hexo init <新建文件夹的名称>
#在该文件夹中安装博客所需要的依赖文件
cd <新建文件夹的名称>
npm install 
```
#### 1.3GitHub设置
**①创建仓库**
>**名字**必须是`<用户名>.github.io`

**②配置Git用户名和邮箱**
>如果**之前配置过**则**不用配置**，否则需要配置

#### 1.4本地文件夹与GitHub建立连接
**①插件安装**
>在**博客目录**下的`git bash/shell`中输入命令`npm install hexo-deployer-git --save`

**②SSH密钥设置**
>并在`git bash/shell`中输入`ssh -T git@github.com`测试是否连接成功

**③修改Hexo配置文件**
>打开`_config.yml`，滑到**文件最底部**，填入**如下代码**
```yaml
type: git
repo: git@github.com:Github用户名/github用户名.github.io.git  
//也可使用https地址，如：https://github.com/Github用户名/Github用户名.github.io.git            
branch: master
```
**④上传博客**
>在**博客目录**下的`git bash/shell`中输入**命令**`hexo d`
{%list%}
上传成功后，在浏览器中打开https://<用户名>.github.io，即可查看上传的网页
{%endlist%}
***
### 2.博客个性化
#### 2.1主题设置
**①主题安装**
>在**博客目录**下的`git bash/shell`中输入如下**命令**
{%list%}
这里选择的是matery主题，有两个版本，稳定版本和最新版本 (不定期更新优化)，自主选择版本
{%endlist%}
```shell
git clone https://github.com/blinkfox/hexo-theme-matery themes/matery     # 稳定版
git clone -b develop https://github.com/blinkfox/hexo-theme-matery themes/matery   #最新版(不定期进行优化更新)
```
**②修改博客主题**
>将**博客配置文件**`_config`中的`theme`值修改为**下载主题**的**文件夹名**
{%list%}
其他博客配置文件修改可见官网
{%endlist%}
{%right%}
修改博客配置文件后要运行执行hexo clean && hexo g，重新生成博客文件
{%endright%}
{%warning%}
注意博客配置文件在博客根目录下，对应主题也有相应配置文件在主题文件夹中
{%endwarning%}

#### 2.2插件配置
**①搜索**
>**下载**：`npm install hexo-generator-search --save`

>**配置**：在**博客配置文件**中，新增以下的**配置项**
```yaml
search:
  path: search.xml
  field: post
```
**②中文链接转拼音**
>**下载**：`npm i hexo-permalink-pinyin --save`

>**配置**：在**博客配置文件**中，新增以下的**配置项**
```yaml
permalink_pinyin:
  enable: true
  separator: '-' # default: '-'
```
**③文章字数统计插件**
>**下载**：`npm i --save hexo-wordcount`

>**配置**：在**博客配置文件**中，新增以下的**配置项**
```yaml
wordCount:
  enable: false # 将这个值设置为 true 即可.
  postWordCount: true
  min2read: true
  totalCount: true
```
#### 2.3自定义标签设置
**①步骤**
>在**主题目录下**新建`scripts`目录，并**此目录下**新建`block.js`文件，填入**以下代码**
```js
hexo.extend.tag.register('wrong', function(args, content){
    var className =  args.join(' ');
    var formattedContent = content.replace(/\n/g, '<br>');  // 将换行符替换为 <br> 标签
    return '<div class="uk-alert uk-alert-danger"><i class="fas fa-exclamation-triangle"></i> ' + formattedContent + '</div>';
  }, {ends: true});
  
  hexo.extend.tag.register('right', function(args, content){
    var className =  args.join(' ');
    var formattedContent = content.replace(/\n/g, '<br>');  // 将换行符替换为 <br> 标签
    return '<div class="uk-alert uk-alert-success"><i class="fa fa-check-circle"></i> ' + formattedContent + '</div>';
  }, {ends: true});
  
  hexo.extend.tag.register('warning', function(args, content){
    var className =  args.join(' ');
    var formattedContent = content.replace(/\n/g, '<br>');  // 将换行符替换为 <br> 标签
    return '<div class="uk-alert uk-alert-warning"><i class="fa fa-exclamation-circle"></i> ' + formattedContent + '</div>';
  }, {ends: true});

  hexo.extend.tag.register('list', function(args, content){
    var className =  args.join(' ');
    var formattedContent = content.replace(/\n/g, '<br>');  // 将换行符替换为 <br> 标签
    return '<div class="uk-alert uk-alert-list"><i class="fas fa-list-ul"></i> ' +'<br>'+formattedContent + '</div>';
  }, {ends: true});
```
>在`head.ejs`文件**添加**以下`css`样式：
```html
<style type="text/css">
        .uk-alert {
            margin-bottom: 5px;
            padding: 5px;
            background: #ebf7fd;
            color: #2d7091;
            border: 0px solid #ffffff;
            border-radius: 4px;
            text-shadow: 0 1px 0 #ffffff;
        }
        .uk-alert-success {
            background: rgba(120, 199, 9, 0.1);
            color: rgba(120, 199, 9);
            border-left: 6px solid rgba(120, 199, 9);
            font-weight: 600;
        }
        .uk-alert-warning {
            background: #FFF8E9;
            color: #FFB91F;
            border-left: 6px solid #FFB91F;
            font-weight: 600;
        }
        .uk-alert-danger {
            background: #FFE6E6;
            color: #FF7979;
            border-left: 6px solid#FF7979;
            font-weight: 600;
        }
        .uk-alert-list {
            background: #ECF7FE;
            color: #3CACF4;
            border-left: 6px solid#3CACF4;
            font-weight: 600;
        }
 </style>
```
**②解析**
{%list%}
以warning部分作为例子
{%endlist%}
>**`block.js`文件**：其中`warning`决定了**正文中的书写格式**；`div class`决定了**容器（背景）的名字**；`i class`决定了**图标的样式**

>**`head.ejs`文件**：主要决定**网页表现**出的**具体样式**
{%right%}
详细可询问ChatGPT
{%endright%}
**③示例**
```
{%wrong%}
错误
{%endwrong%}
{%right%}
正确
{%endright%}
{%warning%}
警告
{%endwarning%}
{%list%}
列表项
{%endlist%}
```
{%wrong%}
错误
{%endwrong%}
{%right%}
正确
{%endright%}
{%warning%}
警告
{%endwarning%}
{%list%}
列表项
{%endlist%}
#### 2.4其他配置
**①自定义鼠标样式**
>**概述**：[致美化](https://zhutix.com/)下载**鼠标样式**，放在`source/medias`目录，随后在`themes\matery\source\css`下`my.css`文件添加
```css
*{
    cursor: url("/medias/mouse/Arrow.ico"),auto!important;
}
:active{
    cursor: url("/medias/imgs/Hand.ico"),auto!important;
}
```
***
### 3.博客书写
#### 3.1Front-matter
>在**博客根目录**下`scaffolds`文件夹下新增/修改`post.md`文件，即可修改**默认样式**，**详细样式**如下
```yaml
title: 文章名称
seo_title: seo名称
toc: true            # 是否生成目录
indent: true         # 是否首行缩进
comments: true       # 是否允许评论
archive: true        # 是否显示在归档
cover: false         # 是否显示封面
mathjax: false       # 是否渲染公式
pin: false           # 是否首页置顶
top_meta: false      # 是否显示顶部信息
bottom_meta: false   # 是否显示尾部信息
sidebar: [toc]
tag:
  - 标签一
  - 标签二
categories: 分组
keywords: 文章关键词
date: 2021-13-13 00:00
updated: 2021-13-13 00:00
description: 文章摘要
icons: [fas fa-fire red, fas fa-star green]
references:
  - title: 参考资料名称
    url: https://参考资料地址
headimg: https://文章头图
thumbnail: https://右侧缩略图
```
#### 3.2正文修饰
**①标题**
>`#`为**一级标题**，`##`为**二级标题**,以此类推
{%list%}
最多六级，且#和文字之间要有空格
{%endlist%}

**②加粗与倾斜**
```
*[文本]* #倾斜
**[文本]** #加粗
***[文本]*** #加粗倾斜
```
**③引用**
>`>`后添加**空格**和**引用内容**
{%list%}
不同的引用以及正文使用换行隔开
{%endlist%}
```
> 树1

> 树2
```

> 树1

> 树2

**④超链接**
>**格式**：`[Link Text](link-address)`

[参考文章](https://106.15.109.213/2020/07/25/markdown%E8%AF%AD%E6%B3%95%E4%BB%8B%E7%BB%8D/#6-%E5%BC%95%E7%94%A8%E6%AE%B5%E8%90%BD)

**⑤插入图片**
```
#单张图片
！[Figure](URL www.xxx.com)
#figure此处的文字有时作为图片标题显示，有时不显示，optional，可留空
#URL处也可以不填写url，也可以选择上传本地图片，此时只需填写相对路径即可，
#相对路径指的是在与此markdown文档同路径下的相对路径，可在此md文档同路径下新建img文件夹，
#在此处填/img/xx.png 具体情况具体分析，或许在主题配置文件中亦有提及*

#多张图片
{% gi total n1-n2-... %}
  ![](url)
  ![](url)
  ![](url)
  ![](url)
  ![](url)
{% endgi %}
#total为图片总的数量,n1为第一行的图片数量,n2为第二行的图片数量
```
**⑥锚点**
>**格式**：`[显示内容](#标题)`
{%list%}
锚点与链接基本相同，区别在于锚点是在文章内部相互传送，但只能传送到n级标题的位置
{%endlist%}
{%right%}
注意此处#代表的是‘标题’这一性质，而非标题的级别，因此不必加n个#来体现标题等级
{%endright%}
**⑦代码块**
>**概述**：以**三个反引号**包围，并在**开头的三个反引号**后添加**语言类型**，如`cpp`、`c`和`python`等
{%warning%}
如果不添加语言类型，无法实现代码高亮
{%endwarning%}
{%right%}
如果想要修改代码高亮样式，可以取prism官网下载css文件替换/修改主题文件夹中的source/libs/prism/prism.css
{%endright%}
{%list%}
需要修改hexo根目录下的配置文件，相关部分设置如下，这里采用的是prismjs，需要关闭highlight选项
{%endlist%}
```yaml
highlight:
  enable: false
  line_number: true
  auto_detect: true
  tab_replace: ''
  wrap: true
  hljs: false
prismjs:
  enable: true 
  preprocess: true
  line_number: true
  tab_replace: ''
```
### 4.网络优化
#### 4.1