import './style.css'
import { STAGE_WIDTH, STAGE_HEIGHT, defaultConfig } from './config/types'
import { createStore } from './config/store'
import { Engine } from './core/engine'
import { blitFit } from './render/renderer'
import { mountControls } from './ui/controls'
import { exportGif } from './exporters/gif'
import { downloadBlob } from './exporters/capture'
import { exportWebm, webmSupported } from './exporters/webm'
import { exportMp4, mp4Supported } from './exporters/mp4'
import { sanitizeFileName } from './exporters/filename'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <header class="masthead">
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
    <section class="stage-col">
      <div class="stage-cap">
        <span class="cap-live"><i class="live-dot"></i>实时预览 · LIVE</span>
        <span>1280 × 520</span>
      </div>
      <div class="stage-plate">
        <span class="reg reg-tl"></span><span class="reg reg-tr"></span>
        <span class="reg reg-bl"></span><span class="reg reg-br"></span>
        <canvas id="display"></canvas>
      </div>
      <div class="export-tray">
        <div class="tray-head"><span class="tray-label">导出 · Export</span></div>
        <div class="export-btns">
          <button id="exp-gif" class="btn-export">GIF</button>
          <button id="exp-webm" class="btn-export">WebM</button>
          <button id="exp-mp4" class="btn-export">MP4</button>
        </div>
        <div id="status" class="status"></div>
      </div>
    </section>
    <aside class="panel">
      <div class="panel-head"><span class="panel-eyebrow">控制台 · Controls</span></div>
      <div id="controls"></div>
    </aside>
  </div>`

// 深浅色主题切换：默认跟随保存值，否则浅色（暖纸），呼应 jnove 的双主题
const rootEl = document.documentElement
const savedTheme = localStorage.getItem('tm-theme')
if (savedTheme) rootEl.setAttribute('data-theme', savedTheme)
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
const store = createStore(defaultConfig)
const engine = new Engine(stage, store)

const display = document.querySelector<HTMLCanvasElement>('#display')!
display.width = STAGE_WIDTH
display.height = STAGE_HEIGHT
const dctx = display.getContext('2d')!

let start = performance.now()
let exporting = false
function frame(now: number) {
  if (!exporting) {
    engine.renderAt(now - start)
    blitFit(dctx, stage, display.width, display.height, store.get().backgroundColor)
  }
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

mountControls(
  document.querySelector<HTMLElement>('#controls')!,
  store,
  () => engine.rebuild(),
)

// Expose for later tasks (UI + exporters wire into these).
;(window as any).__transmorph = { store, engine, stage }

const status = document.querySelector<HTMLElement>('#status')!
const setBusy = (busy: boolean, msg = '') => {
  document.querySelectorAll<HTMLButtonElement>('.export-btns button')
    .forEach((b) => (b.disabled = busy))
  status.textContent = msg
}

document.querySelector('#exp-gif')!.addEventListener('click', async () => {
  setBusy(true, '正在生成 GIF…')
  await new Promise((r) => requestAnimationFrame(() => r(null)))
  try {
    const blob = exportGif(engine, stage, 25, engine.durationMs())
    downloadBlob(blob, sanitizeFileName(store.get().fileName) + '.gif')
    setBusy(false, 'GIF 已下载')
  } catch (e) {
    setBusy(false, 'GIF 失败：' + (e as Error).message)
  }
})

const webmBtn = document.querySelector<HTMLButtonElement>('#exp-webm')!
if (!webmSupported()) {
  webmBtn.disabled = true
  webmBtn.title = '当前浏览器不支持 WebM 录制'
}
webmBtn.addEventListener('click', async () => {
  setBusy(true, '正在录制 WebM…')
  exporting = true
  try {
    const blob = await exportWebm(engine, stage, 30, engine.durationMs())
    downloadBlob(blob, sanitizeFileName(store.get().fileName) + '.webm')
    setBusy(false, 'WebM 已下载')
  } catch (e) {
    setBusy(false, 'WebM 失败：' + (e as Error).message)
  } finally {
    exporting = false
  }
})

const mp4Btn = document.querySelector<HTMLButtonElement>('#exp-mp4')!
if (!mp4Supported()) {
  mp4Btn.disabled = true
  mp4Btn.title = '当前浏览器不支持 MP4 录制，请用 WebM'
}
mp4Btn.addEventListener('click', async () => {
  setBusy(true, '正在录制 MP4…')
  exporting = true
  try {
    const blob = await exportMp4(engine, stage, 30, engine.durationMs())
    downloadBlob(blob, sanitizeFileName(store.get().fileName) + '.mp4')
    setBusy(false, 'MP4 已下载')
  } catch (e) {
    setBusy(false, 'MP4 失败：' + (e as Error).message)
  } finally {
    exporting = false
  }
})
