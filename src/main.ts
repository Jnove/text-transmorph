import './style.css'
import { STAGE_WIDTH, STAGE_HEIGHT, defaultConfig } from './config/types'
import { createStore } from './config/store'
import { Engine } from './core/engine'
import { blitFit } from './render/renderer'
import { mountControls } from './ui/controls'
import { exportGif } from './exporters/gif'
import { downloadBlob } from './exporters/capture'
import { exportWebm, webmSupported } from './exporters/webm'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div id="stage-wrap"><canvas id="display"></canvas></div>
  <div id="panel"><h1>文字解离 · Text Transmorph</h1><div id="controls"></div>
    <div class="export-btns">
      <button id="exp-gif">GIF</button>
      <button id="exp-webm">WebM</button>
      <button id="exp-mp4">MP4</button>
    </div>
    <div id="status"></div>
  </div>`

const stage = document.createElement('canvas')
const store = createStore(defaultConfig)
const engine = new Engine(stage, store)

const display = document.querySelector<HTMLCanvasElement>('#display')!
display.width = STAGE_WIDTH
display.height = STAGE_HEIGHT
const dctx = display.getContext('2d')!

let start = performance.now()
function frame(now: number) {
  engine.renderAt(now - start)
  blitFit(dctx, stage, display.width, display.height, store.get().backgroundColor)
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

document.querySelector('#exp-gif')!.addEventListener('click', () => {
  setBusy(true, '正在生成 GIF…')
  try {
    const blob = exportGif(engine, stage, 25, engine.durationMs())
    downloadBlob(blob, 'transmorph.gif')
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
  try {
    const blob = await exportWebm(engine, stage, 30, engine.durationMs())
    downloadBlob(blob, 'transmorph.webm')
    setBusy(false, 'WebM 已下载')
  } catch (e) {
    setBusy(false, 'WebM 失败：' + (e as Error).message)
  }
})
