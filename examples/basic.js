import { createTextTransmorph } from '../dist-lib/text-transmorph.js'

const canvas = document.querySelector('#stage')
const tm = createTextTransmorph(canvas, {
  phrases: ['文字解离', 'Text Transmorph'],
  backgroundColor: '#e2483d',
  dotColor: '#ffffff',
  dotColor2: '#ffd34e',
  gradient: true,
  dotSize: 9,
  gridSpacing: 13,
  movement: 'explode',
  transitionMs: 1400,
  holdMs: 1200,
  idleFloat: 0,
  randomness: 0,
})

// Toggle play/pause.
const toggle = document.querySelector('#toggle')
toggle.addEventListener('click', () => {
  if (toggle.textContent === '暂停') {
    tm.pause()
    toggle.textContent = '播放'
  } else {
    tm.play()
    toggle.textContent = '暂停'
  }
})

// Hot-update motion + density.
document.querySelector('#mode').addEventListener('change', (e) =>
  tm.set({ movement: e.target.value }))
document.querySelector('#dot').addEventListener('input', (e) =>
  tm.set({ dotSize: Number(e.target.value) }))
document.querySelector('#grid').addEventListener('input', (e) =>
  tm.set({ gridSpacing: Number(e.target.value) }))

// Manual driver: scrub the timeline directly (bypasses the clock).
const progress = document.querySelector('#progress')
let manual = false
progress.addEventListener('input', () => {
  if (!manual) {
    manual = true
    tm.pause()
  }
  tm.renderAt((progress.value / 100) * tm.durationMs())
})
progress.addEventListener('change', () => {
  manual = false
  tm.play()
})
