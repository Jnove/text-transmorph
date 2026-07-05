import './style.css'
import { defaultConfig } from './config/types'
import { createStore } from './config/store'
import { encodeConfig, pickInitial } from './config/persist'
import { Engine } from './core/engine'
import { blitFit } from './render/renderer'
import { mountControls } from './ui/controls'
import { exportGif } from './exporters/gif'
import { downloadBlob } from './exporters/capture'
import { exportWebm, webmSupported } from './exporters/webm'
import { exportMp4, mp4Supported } from './exporters/mp4'
import { sanitizeFileName } from './exporters/filename'

const STORAGE_KEY = 'tm-config'
// Startup priority: a share-link #hash > the last saved local config > defaults.
const initialConfig = pickInitial(
  defaultConfig,
  location.hash ? location.hash.slice(1) : null,
  localStorage.getItem(STORAGE_KEY),
)

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <header class="masthead glass">
    <div class="mast-id">
      <span class="mast-mark">文字<span class="mark-acc">解离</span></span>
      <span class="mast-latin">Text Transmorph</span>
    </div>
    <p class="mast-tagline">把文字拆成点阵，再让它们重新聚成下一句。</p>
    <button id="theme-toggle" class="theme-toggle" type="button" aria-label="切换深浅色主题">
      <span class="tt-icon">☾</span>
    </button>
  </header>
  <div class="workspace">
    <section class="stage-panel glass">
      <div class="stage-cap">
        <span class="cap-live"><i class="live-dot"></i>实时预览 · LIVE</span>
        <span class="cap-dim">${initialConfig.stageWidth} × ${initialConfig.stageHeight}</span>
      </div>
      <div class="stage-screen"><canvas id="display"></canvas></div>
      <div class="export-tray">
        <div class="tray-head"><span class="tray-label">导出 · Export</span></div>
        <div class="export-name">
          <label for="f-name">文件名</label>
          <input id="f-name" type="text" value="${initialConfig.fileName}">
        </div>
        <div class="export-btns">
          <button id="exp-gif" class="btn-export">GIF</button>
          <button id="exp-webm" class="btn-export">WebM</button>
          <button id="exp-mp4" class="btn-export">MP4</button>
        </div>
        <button id="exp-share" class="btn-share" type="button">复制分享链接</button>
        <div id="status" class="status"></div>
      </div>
    </section>
    <aside class="panel glass">
      <div class="panel-head"><span class="panel-eyebrow">控制台 · Controls</span></div>
      <div id="controls"></div>
    </aside>
  </div>`

// 深浅色主题切换：优先保存值，否则跟随系统 prefers-color-scheme
const rootEl = document.documentElement
const savedTheme = localStorage.getItem('tm-theme')
const initialTheme = savedTheme
  ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
rootEl.setAttribute('data-theme', initialTheme)
const themeBtn = document.querySelector<HTMLButtonElement>('#theme-toggle')!
const themeIcon = themeBtn.querySelector<HTMLElement>('.tt-icon')!
const syncThemeIcon = () => {
  themeIcon.textContent = rootEl.getAttribute('data-theme') === 'dark' ? '☀' : '☾'
}
syncThemeIcon()
themeBtn.addEventListener('click', () => {
  const next = rootEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
  rootEl.setAttribute('data-theme', next)
  localStorage.setItem('tm-theme', next)
  syncThemeIcon()
})

const stage = document.createElement('canvas')
const store = createStore(initialConfig)
const engine = new Engine(stage, store)

// Persist to localStorage on every change (coalesced to one write per frame) so
// a reload restores the exact scene.
let saveQueued = false
store.subscribe(() => {
  if (saveQueued) return
  saveQueued = true
  requestAnimationFrame(() => {
    saveQueued = false
    try {
      localStorage.setItem(STORAGE_KEY, encodeConfig(store.get()))
    } catch { /* storage full or blocked — non-fatal */ }
  })
})

const display = document.querySelector<HTMLCanvasElement>('#display')!
const capDim = document.querySelector<HTMLElement>('.cap-dim')!
// Keep the preview canvas buffer and its layout aspect-ratio in step with the
// chosen output size (the stage canvas itself is resized inside Engine.resample).
function syncDisplaySize() {
  const { stageWidth: w, stageHeight: h } = store.get()
  if (display.width !== w || display.height !== h) {
    display.width = w
    display.height = h
    display.style.aspectRatio = `${w} / ${h}`
    capDim.textContent = `${w} × ${h}`
  }
}
syncDisplaySize()
const dctx = display.getContext('2d')!

// Respect the OS "reduce motion" setting: freeze the preview on the first
// phrase at rest instead of auto-cycling. Export still runs on demand.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
let start = performance.now()
let exporting = false
function frame(now: number) {
  // While exporting, the exporter drives engine.renderAt on the stage; keep
  // blitting so the preview mirrors the frames being captured.
  if (!exporting) engine.renderAt(reduceMotion.matches ? 0 : now - start)
  blitFit(dctx, stage, display.width, display.height, store.get().backgroundColor)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

mountControls(
  document.querySelector<HTMLElement>('#controls')!,
  store,
  {
    resample: () => { engine.resample(); syncDisplaySize() },
    resetSystems: () => engine.resetSystems(),
  },
)

// 文件名移到左侧导出区，直接写回 store（非结构性，无需重建）
const nameInput = document.querySelector<HTMLInputElement>('#f-name')!
nameInput.addEventListener('input', () => store.set({ fileName: nameInput.value }))

const status = document.querySelector<HTMLElement>('#status')!
const setBusy = (busy: boolean, msg = '') => {
  document.querySelectorAll<HTMLButtonElement>('.export-btns button')
    .forEach((b) => (b.disabled = busy))
  status.textContent = msg
}

/** Wire an export button: busy state, download, error surface, and restarting
 *  the preview cycle from phase 0 when done (the export drove the stage, so
 *  the old time base would make the preview jump mid-transition). */
function bindExport(
  btnId: string,
  ext: string,
  label: string,
  run: (progress: (msg: string) => void) => Promise<Blob>,
  supported = true,
  unsupportedTip = '',
) {
  const btn = document.querySelector<HTMLButtonElement>(btnId)!
  if (!supported) {
    btn.disabled = true
    btn.title = unsupportedTip
    return
  }
  btn.addEventListener('click', async () => {
    setBusy(true, `正在生成 ${label}…`)
    exporting = true
    try {
      const blob = await run((msg) => (status.textContent = msg))
      downloadBlob(blob, sanitizeFileName(store.get().fileName) + ext)
      setBusy(false, `${label} 已下载`)
    } catch (e) {
      setBusy(false, `${label} 失败：` + (e as Error).message)
    } finally {
      exporting = false
      start = performance.now()
    }
  })
}

bindExport('#exp-gif', '.gif', 'GIF', (progress) =>
  exportGif(engine, stage, 25, engine.durationMs(), (done, total) =>
    progress(`正在生成 GIF… ${done}/${total} 帧`)))

// MediaRecorder 走实时 rAF：标签页切到后台会被浏览器节流、录出坏帧，所以提示。
bindExport('#exp-webm', '.webm', 'WebM', (progress) => {
  progress('正在录制 WebM…（请保持页面在前台）')
  return exportWebm(engine, stage, 30, engine.durationMs())
}, webmSupported(), '当前浏览器不支持 WebM 录制')

bindExport('#exp-mp4', '.mp4', 'MP4', (progress) => {
  progress('正在录制 MP4…（请保持页面在前台）')
  return exportMp4(engine, stage, 30, engine.durationMs())
}, mp4Supported(), '当前浏览器不支持 MP4 录制，请用 WebM')

// Build a shareable URL that reproduces the current scene from its #hash.
const shareBtn = document.querySelector<HTMLButtonElement>('#exp-share')!
shareBtn.addEventListener('click', async () => {
  const url = location.origin + location.pathname + '#' + encodeConfig(store.get())
  try {
    await navigator.clipboard.writeText(url)
    status.textContent = '分享链接已复制到剪贴板'
  } catch {
    // Clipboard blocked (e.g. insecure context): drop the hash into the address
    // bar so the user can copy it manually.
    location.hash = encodeConfig(store.get())
    status.textContent = '链接已写入地址栏，可手动复制'
  }
})
