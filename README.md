<div align="center">

# 文字解离 · Text Transmorph

**把文字拆成点阵粒子，再让它们重新聚成下一句。**

纯前端 · 浏览器内导出 GIF / WebM / MP4

<img src="assets/demo.gif" width="720" alt="文字解离效果演示：Transmorph 溶解重组为「文字解离重组动画」" />

<sub>↑ 实时引擎渲染，导出结果与预览逐帧一致</sub>

</div>

---

## 这个项目是什么

一个把中英文文字渲染成点阵粒子的小工具。文字会在多组短语之间以「溶解 → 飞散 → 重新聚拢」的动画平滑切换，全部在浏览器里实时计算，并能一键导出成动图或视频。

- **8 种运动方式** —— 随机散开、径向爆炸、径向收敛、重力下落、垂直交叉、水平交叉、旋转漩涡（极坐标弧线）、直接变形
- **活的动画细节** —— 静止时点阵轻微呼吸浮动、溶解时粒子错峰成波、飞行途中缩放起伏
- **多行文字 · 多种画布** —— 段内用 `|` 换行；横幅 / 16:9 / 1:1 / 9:16 四种输出尺寸预设
- **三种导出格式** —— GIF / WebM / MP4，浏览器内完成，无需上传或装软件
- **液态玻璃界面** —— 深 / 浅色主题，自定义下拉与实时滑块；尊重 `prefers-reduced-motion`
- **可作为库嵌入** —— 框架无关的 `text-transmorph` 包，把同一套引擎接到任意 canvas 上

## 快速开始

```bash
npm install
npm run dev          # → http://localhost:5174
```

打开页面后，右侧控制台可调文案 / 运动方式 / 缓动 / 颜色 / 时长，再点导出区下载 GIF / WebM / MP4。配置会自动存到 localStorage，刷新即恢复；「复制分享链接」把整套参数编码进 URL。

更多命令：`npm test`（108 个单元测试） / `npm run build`（静态产物到 `dist/`） / `npm run build:lib`（库产物到 `dist-lib/`）。

## 作为库使用

包名 `text-transmorph` 在 npm 上可用，框架无关、不带 UI，适合接到任意 canvas 上。

### 通过 npm 安装

```bash
npm install text-transmorph
```

```ts
import { createTextTransmorph } from 'text-transmorph'

const tm = createTextTransmorph(document.querySelector('#stage'), {
  phrases: ['文字解离', 'Text Transmorph'],
  backgroundColor: '#e2483d',
  gradient: true,
  movement: 'explode',
})

tm.set({ dotSize: 9, gridSpacing: 13 })   // 热更新
tm.pause() / tm.play()                    // 播放控制
tm.renderAt(1234)                         // 手动驱动：推进到任意时间点
tm.durationMs()                           // 当前时间轴总时长
tm.destroy()                              // 释放循环与观察器
```

`exports` 字段同时提供 ESM 与 UMD 入口，TypeScript 类型随 `import type` 自动拿到；构建产物体积约 33 kB（gzip 10 kB）。

### 在本仓库内调试

```bash
npm run build:lib   # 产出 dist-lib/text-transmorph.js（ESM）与 .umd.cjs
```

```ts
import { createTextTransmorph } from './dist-lib/text-transmorph.js'
```

### 选项

| 选项 | 默认 | 说明 |
|------|------|------|
| `autoplay` | `true` | 创建后立即播放 |
| `playOnView` | `false` | 画布离开视口时暂停，滚入视口时恢复 |
| `respectReducedMotion` | `true` | 系统开启「减少动态效果」时冻结在首帧 |
| `loop` | `true` | 循环播放时间轴；`false` 时播完停在最后一个短语 |

其余选项即控制台的参数集（`phrases`、`movement`、`transitionMs`、`holdMs`、`seed`、`dotSize`、`gridSpacing` 等）。

更底层的能力（自定义 Canvas 2D context、自定义文字栅格化、纯离线渲染）由 `Engine`、`sampleWithRasterizer`、`ParticleSystem` 等导出提供。