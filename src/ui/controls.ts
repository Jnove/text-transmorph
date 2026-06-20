import type { Store } from '../config/store'
import type { Config } from '../config/types'
import { easings, type EasingName } from '../core/easing'
import type { MovementMode } from '../core/particles'

const STRUCTURAL = new Set<keyof Config>([
  'phrases', 'gridSpacing', 'threshold', 'fontFamily', 'fontWeight', 'fillRatio',
  'scatterAmount', 'randomness', 'easing', 'movement',
])

const MOVEMENT_LABELS: Record<MovementMode, string> = {
  random: '随机散开',
  explode: '径向爆炸',
  implode: '径向内敛',
  sweepLeft: '扫动·左',
  sweepRight: '扫动·右',
  sweepUp: '扫动·上',
  sweepDown: '扫动·下',
  swirl: '旋转·漩涡',
  gravity: '重力下落',
  morph: '直接变形',
}

export function mountControls(
  container: HTMLElement,
  store: Store,
  onStructuralChange: () => void,
): void {
  const c = store.get()
  const rows: string[] = []
  const bind = (_key: keyof Config, label: string, input: string) =>
    rows.push(`<div class="row"><label>${label}</label>${input}</div>`)

  bind('phrases', '文字（每行一段）',
    `<textarea id="f-phrases" rows="3">${c.phrases.join('\n')}</textarea>`)
  bind('mode', '模式',
    `<select id="f-mode">
       <option value="sequence"${c.mode === 'sequence' ? ' selected' : ''}>多段轮播</option>
       <option value="breathe"${c.mode === 'breathe' ? ' selected' : ''}>单段呼吸</option>
     </select>`)
  bind('backgroundColor', '背景色', `<input id="f-bg" type="color" value="${c.backgroundColor}">`)
  bind('dotColor', '点色', `<input id="f-dot" type="color" value="${c.dotColor}">`)
  bind('dotShape', '点形状',
    `<select id="f-shape">
       <option value="square"${c.dotShape === 'square' ? ' selected' : ''}>方块</option>
       <option value="circle"${c.dotShape === 'circle' ? ' selected' : ''}>圆点</option>
     </select>`)
  bind('dotSize', `点大小 (${c.dotSize})`, `<input id="f-size" type="range" min="2" max="24" value="${c.dotSize}">`)
  bind('gridSpacing', `网格密度 (${c.gridSpacing})`, `<input id="f-grid" type="range" min="6" max="30" value="${c.gridSpacing}">`)
  bind('fillRatio', `字号占比 (${c.fillRatio})`, `<input id="f-fill" type="range" min="0.3" max="0.9" step="0.02" value="${c.fillRatio}">`)
  bind('transitionMs', `过渡时长 (${c.transitionMs}ms)`, `<input id="f-trans" type="range" min="300" max="3000" step="50" value="${c.transitionMs}">`)
  bind('holdMs', `停留时长 (${c.holdMs}ms)`, `<input id="f-hold" type="range" min="200" max="4000" step="50" value="${c.holdMs}">`)
  bind('scatterAmount', `散开强度 (${c.scatterAmount})`, `<input id="f-scatter" type="range" min="0" max="400" value="${c.scatterAmount}">`)
  bind('randomness', `随机度 (${c.randomness})`, `<input id="f-rand" type="range" min="0" max="1" step="0.05" value="${c.randomness}">`)
  bind('movement', '点的移动方式',
    `<select id="f-move">${(Object.keys(MOVEMENT_LABELS) as MovementMode[])
       .map((m) => `<option value="${m}"${c.movement === m ? ' selected' : ''}>${MOVEMENT_LABELS[m]}</option>`).join('')}</select>`)
  bind('easing', '缓动',
    `<select id="f-ease">${(Object.keys(easings) as EasingName[])
       .map((e) => `<option value="${e}"${c.easing === e ? ' selected' : ''}>${e}</option>`).join('')}</select>`)

  container.innerHTML = rows.join('')

  const apply = (key: keyof Config, value: Config[keyof Config]) => {
    store.set({ [key]: value } as Partial<Config>)
    if (STRUCTURAL.has(key)) onStructuralChange()
  }
  const on = (id: string, ev: string, fn: (el: HTMLInputElement) => void) => {
    const el = container.querySelector<HTMLInputElement>(id)
    if (el) el.addEventListener(ev, () => fn(el))
  }

  on('#f-phrases', 'input', (el) =>
    apply('phrases', el.value.split('\n').map((s) => s.trim()).filter(Boolean)))
  on('#f-mode', 'change', (el) => apply('mode', el.value as Config['mode']))
  on('#f-bg', 'input', (el) => apply('backgroundColor', el.value))
  on('#f-dot', 'input', (el) => apply('dotColor', el.value))
  on('#f-shape', 'change', (el) => apply('dotShape', el.value as Config['dotShape']))
  on('#f-size', 'input', (el) => apply('dotSize', Number(el.value)))
  on('#f-grid', 'input', (el) => apply('gridSpacing', Number(el.value)))
  on('#f-fill', 'input', (el) => apply('fillRatio', Number(el.value)))
  on('#f-trans', 'input', (el) => apply('transitionMs', Number(el.value)))
  on('#f-hold', 'input', (el) => apply('holdMs', Number(el.value)))
  on('#f-scatter', 'input', (el) => apply('scatterAmount', Number(el.value)))
  on('#f-rand', 'input', (el) => apply('randomness', Number(el.value)))
  on('#f-move', 'change', (el) => apply('movement', el.value as MovementMode))
  on('#f-ease', 'change', (el) => apply('easing', el.value as EasingName))
}
