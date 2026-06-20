# text-transmorph

一个纯前端点阵粒子文字变形工具。将中英文文字渲染为点阵粒子，在多组短语之间以溶解/重组动画平滑过渡；提供丰富的实时控制面板，支持导出 GIF、WebM、MP4；本地一条命令启动，构建产物为纯静态文件，可零配置部署到任意静态托管平台。

---

## 本地开发

```bash
npm install       # 安装依赖
npm run dev       # 启动开发服务器（Vite HMR，默认 http://localhost:5173）
npm test          # 运行单元测试（Vitest，纯核心逻辑，30 个用例）
npm run build     # TypeScript 类型检查 + Vite 生产构建，输出到 dist/
npm run preview   # 本地预览生产构建（dist/）
```

---

## 参数

在右侧控制面板中可实时调整以下参数：

| 参数 | 说明 |
|------|------|
| 文字列表 | 轮播的短语列表，每行一条 |
| 模式 | **多段轮播**：依次循环所有短语；**单段呼吸**：单条短语反复出现/消散 |
| 背景色 | 画布背景颜色 |
| 点色 | 粒子颜色 |
| 点形状 | 方形或圆形 |
| 点大小 | 单个粒子的像素尺寸 |
| 网格密度 | 采样网格的稀疏程度（影响粒子数量） |
| 字号占比 | 文字相对画布高度的比例 |
| 过渡时长 | 溶解/重组动画的持续时间（毫秒） |
| 停留时长 | 每条短语静止展示的时间（毫秒） |
| 散开强度 | 粒子飞散的最大偏移量 |
| 随机度 | 粒子轨迹的随机扰动程度 |
| 缓动曲线 | 动画缓动函数（线性、ease-in、ease-out、ease-in-out 等） |

---

## 导出

导出与预览共用同一套渲染引擎（`engine.renderAt` 逐帧步进），保证导出结果与预览完全一致。

| 格式 | 实现方式 | 说明 |
|------|----------|------|
| GIF | `gifenc` 逐帧编码 | 纯客户端，无需服务器，全浏览器支持 |
| WebM | `MediaRecorder`（`video/webm`） | 现代浏览器均支持 |
| MP4 | `MediaRecorder` 原生 `video/mp4;codecs=avc1` | 现代 Chrome / Edge / Safari 支持；不支持的浏览器该按钮会自动禁用并提示改用 WebM |

所有导出均在浏览器内完成，无需上传文件或安装额外软件。

---

## 部署

```bash
npm run build   # 产物输出到 dist/
```

`dist/` 是纯静态文件，可直接部署到任意静态托管平台：

| 平台 | 构建命令 | 输出目录 |
|------|----------|----------|
| Vercel | `npm run build` | `dist` |
| Netlify | `npm run build` | `dist` |
| Cloudflare Pages | `npm run build` | `dist` |
| GitHub Pages | `npm run build` | `dist` |

本仓库已内置 GitHub Pages 自动部署工作流（`.github/workflows/pages.yml`），推送到 `main` 分支后自动构建并发布。`vite.config.ts` 中设置了 `base: './'`，使所有资源路径为相对路径，可在任意子路径下正常运行。

---

## 测试

```bash
npm test
```

使用 Vitest 对纯核心模块运行单元测试，覆盖：

- 采样网格生成（`sampleGrid`）
- 粒子插值与坐标计算
- 缓动函数（easing）
- 帧序列器（sequencer）
- 配置状态管理（config store）

共 30 个测试用例，全部在 Node.js 环境下运行，无需浏览器。
