// After `npm install text-transmorph` (or `npm link text-transmorph` against
// this repo's dist-lib build) this resolves via the package's exports map.
// While developing in this repo, Vite's dev server resolves the bare specifier
// `text-transmorph` to `./dist-lib/text-transmorph.js` automatically — so this
// file loads under `npm run dev` without an explicit link. Outside the dev
// server you'll need either a real install or a link.
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