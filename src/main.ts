import './style.css'
import { STAGE_WIDTH, STAGE_HEIGHT, defaultConfig } from './config/types'
import { createStore } from './config/store'
import { Engine } from './core/engine'
import { blitFit } from './render/renderer'
import { mountControls } from './ui/controls'

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
