<div align="center">

# 文字解离 · Text Transmorph

**把文字拆成点阵粒子，再让它们重新聚成下一句。**

纯前端 · 零后端 · 浏览器内导出 GIF / WebM / MP4

<img src="assets/demo.gif" width="720" alt="文字解离效果演示：Transmorph 溶解重组为「文字解离重组动画」" />

<sub>↑ 实时引擎渲染，导出结果与预览逐帧一致</sub>

</div>

---

## 这是什么

一个把中英文文字渲染成**点阵粒子**的小工具。文字会在多组短语之间以「溶解 → 飞散 → 重新聚拢」的动画平滑切换，全部在浏览器里实时计算，并能一键导出成动图或视频。

- **8 种运动方式** —— 随机散开、径向爆炸、径向收敛、重力下落、垂直交叉、水平交叉、旋转漩涡（极坐标弧线）、直接变形。其中**旋转漩涡**在 16:5 宽幅下点阵基本处于同一水平线上，弧线不易被察觉；推荐在横屏 16:9 / 1:1 / 竖屏 9:16 上用，方有清晰的螺旋感。
- **活的动画细节** —— 静止时点阵轻微呼吸浮动、溶解时粒子错峰成波、飞行途中缩放起伏
- **多行文字 · 多种画布** —— 段内用 `|` 换行；横幅 / 16:9 / 1:1 / 9:16 四种输出尺寸预设
- **三种导出格式** —— GIF / WebM / MP4，全部在浏览器内完成，无需上传或装软件（GIF 异步逐帧导出，带进度）
- **导出即所见** —— 预览与导出共用同一套渲染引擎，逐帧一致
- **一键分享 · 自动记忆** —— 配置存进 localStorage，刷新即恢复；「复制分享链接」把整套参数编码进 URL
- **液态玻璃界面** —— 深 / 浅色双主题（可跟随系统），自定义下拉（支持键盘导航）与实时滑块；尊重 `prefers-reduced-motion`
- **零配置部署** —— 构建产物是纯静态文件，可直接丢到任意静态托管

## 30 秒上手

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器（Vite HMR）
```

打开终端给出的本地地址，在右侧控制台输入文案、调参数、点导出即可。
标题栏右上角的 ☾ / ☀ 可在深 / 浅色主题间切换，选择会记忆在本地。

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发服务器（Vite HMR） |
| `npm test` | 运行单元测试（Vitest，106 个用例，纯核心逻辑） |
| `npm run lint` | ESLint 静态检查 |
| `npm run build` | TypeScript 类型检查 + 生产构建，输出到 `dist/` |
| `npm run build:lib` | 构建可嵌入库（ESM + UMD + 类型声明），输出到 `dist-lib/` |
| `npm run preview` | 本地预览 `dist/` 生产构建 |

## 作为库使用

`src/lib/` 是框架无关的嵌入 API —— 不含界面，只提供「指定参数 → 在 canvas 上播放动效」的能力。完整用法见 `examples/basic.html`（`npm run dev` 后访问 `/examples/basic.html`）。

### 通过 npm 安装

包已发布到 npm（仓库名见 [CHANGELOG](./CHANGELOG.md)）：

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

tm.set({ dotSize: 9, gridSpacing: 13 })   // 热更新，结构性参数自动重采样
tm.pause() / tm.play()                    // 播放控制
tm.renderAt(1234)                         // 手动驱动：推进到任意时间点
tm.durationMs()                           // 当前时间轴总时长
tm.destroy()                              // 释放循环与观察器
```

`package.json` 的 `exports` 字段同时提供了 ESM 与 UMD 两路入口，TypeScript 类型随 `import type` 自动拿到；构建产物体积约 33 kB（gzip 10 kB）。

### 在本仓库内调试库

直接引用构建产物（适合在自己 fork 上迭代）：

```bash
npm run build:lib   # 产出 dist-lib/text-transmorph.js（ESM）与 .umd.cjs
```

```ts
import { createTextTransmorph } from './dist-lib/text-transmorph.js'
```

发布前 `npm run prepublishOnly` 会自动跑 `build:lib` + 测试 + lint，避免把没测过的代码推上去。

选项即控制台的参数集（`phrases`、`movement`、`transitionMs`、`holdMs`、`seed`、`dotSize`、`gridSpacing` 等），另加播放选项：

| 选项 | 默认 | 说明 |
|------|------|------|
| `autoplay` | `true` | 创建后立即播放 |
| `playOnView` | `false` | 画布离开视口时暂停，滚入视口时恢复 |
| `respectReducedMotion` | `true` | 系统开启「减少动态效果」时冻结在首帧 |
| `loop` | `true` | 循环播放时间轴；`false` 时播完停在最后一个短语 |

更底层的能力（注入任意 Canvas 2D context、自定义文字栅格化、纯离线渲染）由 `Engine`、`sampleWithRasterizer`、`ParticleSystem` 等导出提供。

## 控制台参数

在右侧控制面板中可实时调整：

| 参数 | 说明 |
|------|------|
| 文案（每行一段） | 轮播的短语列表，每行一条；段内用 `\|` 分隔可换行 |
| 播放模式 | **多段轮播**：依次循环所有短语；**单段呼吸**：单条短语反复出现 / 消散 |
| 字体 / 字重 | 内置多种中英文字体与字重 |
| 画布尺寸 | 宽幅 1280×520 / 横屏 16:9 / 方形 1:1 / 竖屏 9:16 |
| 背景色 / 点色 / 渐变末色 | 画布背景与粒子颜色；开启「渐变填充」后点阵按左右双色渐变 |
| 点形状 / 点大小 | 方形或圆形，及单个粒子的画布像素尺寸（支持 0.5px 步进） |
| 网格间距 | 采样网格的单元间距，支持 0.5px 步进；越小粒子越多 |
| 字号占比 | 文字相对画布高度的比例 |
| 移动方式 | 溶解阶段的 8 种运动方式（见上方列表） |
| 缓动曲线 | 动画缓动函数（linear、easeOutCubic、easeInOutCubic、easeInOutQuad） |
| 散开强度 / 随机度 | 粒子飞散的最大偏移量与轨迹扰动程度 |
| 错峰波浪 | 粒子起步的时间差，越大越有波浪推进感 |
| 随机形态 | 🎲 换一个随机种子，同参数下换一种飞散形态 |
| 过渡时长 / 停留时长 | 溶解动画与静止展示的时间（毫秒） |
| 静止浮动 | 停留阶段点阵的呼吸浮动幅度 |

点大小会随网格间距联动，最大不会超过当前采样格，避免相邻粒子重叠成连续色块。网格间距低于 2px 时，实时采样和点大小都会按 2px 处理，避免动画产生数十万粒子和不均匀覆盖。

## 导出

导出与预览共用同一套渲染引擎（`engine.renderAt` 逐帧步进），保证导出结果与预览完全一致。导出区的「文件名」输入框用于命名下载文件（自动清洗非法字符并补全扩展名）。

| 格式 | 实现方式 | 说明 |
|------|----------|------|
| GIF | `gifenc` 逐帧编码 | 纯客户端，全浏览器支持；离线逐帧渲染，异步导出并显示帧进度，不卡界面 |
| WebM | `MediaRecorder`（`video/webm`） | 现代浏览器均支持；实时录制，导出期间请保持页面在前台 |
| MP4 | `MediaRecorder` 原生 `video/mp4;codecs=avc1` | 现代 Chrome / Edge / Safari 支持；不支持时按钮自动禁用并提示改用 WebM |

## 部署

```bash
npm run build    # 产物输出到 dist/
```

`dist/` 是纯静态文件，可直接部署到任意静态托管平台：

| 平台 | 构建命令 | 输出目录 |
|------|----------|----------|
| Vercel | `npm run build` | `dist` |
| Netlify | `npm run build` | `dist` |
| Cloudflare Pages | `npm run build` | `dist` |
| GitHub Pages | `npm run build` | `dist` |

本仓库已内置 GitHub Pages 自动部署工作流（`.github/workflows/pages.yml`），推送到 `main` 分支后自动构建并发布。`vite.config.ts` 中设置了 `base: './'`，所有资源使用相对路径，可在任意子路径下运行。

## 架构

```
src/
├─ core/        采样、粒子系统、缓动、序列器、引擎（纯逻辑，无 DOM 依赖）
├─ lib/         库入口：Transmorph（播放循环 + 视口/动效偏好守卫）、PlaybackClock
├─ render/      画布绘制与等比缩放
├─ exporters/   GIF / WebM / MP4 导出与文件名清洗
├─ config/      配置类型与状态管理
└─ ui/          控制台、自定义下拉、滑块
```

`core / render / lib` 与界面层干净分离 —— 核心引擎不碰 DOM，可独立测试、可单独打包为库（`dist-lib/`）。

## 测试

```bash
npm test
```

使用 Vitest 对纯核心模块运行单元测试，覆盖采样网格生成、多行文字切分、粒子插值与各运动方式（含错峰、缩放、极坐标漩涡）、缓动函数、帧序列器、配置状态管理、配置序列化 / 分享链接、文件名清洗，以及库层的播放时钟、引擎解耦与 Transmorph（播放 / 暂停 / 视口驱动 / 减少动态效果）。共 **108 个测试用例**，全部在 Node.js 环境下运行，无需浏览器。
