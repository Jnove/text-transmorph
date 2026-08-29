// After `npm install text-transmorph` this resolves via the package's exports
// map. In this repo we exercise the same path through a local npm-link, so the
// import below behaves exactly like an external consumer would see it.
import { createTextTransmorph } from 'text-transmorph'

const canvas = document.querySelector('#stage')
const tm = createTextTransmorph(canvas, {
  phrases: ['Hello', 'Transmorph'],
  backgroundColor: '#1d2b3a',
  dotColor: '#a3d9ff',
  dotColor2: '#f48fb1',
  gradient: true,
  movement: 'swirl',
  dotSize: 9,
  gridSpacing: 13,
  transitionMs: 1400,
  holdMs: 1200,
})

// Play/pause toggle — same lifecycle methods as the in-tree demo.
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

// Hot-update options after construction. Structural fields (text, grid, font)
// trigger a re-sample; motion-only fields (movement, scatterAmount) only
// rebuild particle systems.
document.querySelector('#reroll').addEventListener('click', () => {
  tm.set({ seed: Math.floor(Math.random() * 1e9) })
})

// Cycle through a few movements so the gradient vs flat / uniform vs scattered
// modes are easy to compare in one screen.
const moves = ['swirl', 'explode', 'morph', 'gravity', 'random']
let moveIdx = 0
document.querySelector('#swap').addEventListener('click', () => {
  moveIdx = (moveIdx + 1) % moves.length
  tm.set({ movement: moves[moveIdx] })
})