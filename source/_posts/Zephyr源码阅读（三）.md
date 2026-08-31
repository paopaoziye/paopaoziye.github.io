---
title: Zephyr源码阅读（三）
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
keywords: Zephyr源码阅读（三）, RTOS, Zephyr
updated: ''
img: /medias/featureimages/37.webp
date: 2026-07-27 16:02:44
summary: 内存模块初始化
---
# RTOS
## Zephyr源码阅读（三）
### 内存模块（一）
#### 简介
**①引言**
>**概述**：`z_cstart`
{%list%}

{%endlist%}
{%right%}

{%endright%}
{%warning%}

{%endwarning%}
```c
/* 位于 */
SYS_INIT_NAMED(statics_init_pre, statics_init, PRE_KERNEL_1, CONFIG_KERNEL_INIT_PRIORITY_OBJECTS);
```
```c
/* 位于 */
#define SYS_INIT_NAMED(name, init_fn_, level, prio)                                       \
	static const Z_DECL_ALIGN(struct init_entry)                                      \
		Z_INIT_ENTRY_SECTION(level, prio, 0) __used __noasan                      \
		Z_INIT_ENTRY_NAME(name) = {.init_fn = (init_fn_), .dev = NULL}            \

```
```c
/* 位于 */
static int statics_init(void)
{
	STRUCT_SECTION_FOREACH(k_heap, heap) {
#if defined(CONFIG_DEMAND_PAGING) && !defined(CONFIG_LINKER_GENERIC_SECTIONS_PRESENT_AT_BOOT)
		/* Some heaps may not present at boot, so we need to wait for
		 * paging mechanism to be initialized before we can initialize
		 * each heap.
		 */
		extern bool z_sys_post_kernel;
		bool do_clear = z_sys_post_kernel;

		/* During pre-kernel init, z_sys_post_kernel == false,
		 * initialize if within pinned region. Otherwise skip.
		 * In post-kernel init, z_sys_post_kernel == true, skip those in
		 * pinned region as they have already been initialized and
		 * possibly already in use. Otherwise initialize.
		 */
		if (lnkr_is_pinned((uint8_t *)heap) &&
		    lnkr_is_pinned((uint8_t *)&heap->wait_q) &&
		    lnkr_is_region_pinned((uint8_t *)heap->heap.init_mem,
					  heap->heap.init_bytes)) {
			do_clear = !do_clear;
		}

		if (do_clear)
#endif /* CONFIG_DEMAND_PAGING && !CONFIG_LINKER_GENERIC_SECTIONS_PRESENT_AT_BOOT */
		{
			k_heap_init(heap, heap->heap.init_mem, heap->heap.init_bytes);
		}
	}
	return 0;
}
```
