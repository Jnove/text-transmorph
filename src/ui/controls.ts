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
  implode: '径向收敛',
  gravity: '重力下落',
  verticalCross: '垂直交叉',
  horizontalCross: '水平交叉',
  swirl: '旋转漩涡',
  morph: '直接变形',
}

const EASING_LABELS: Record<EasingName, string> = {
  linear: '线性匀速',
  easeOutCubic: '减速停止',
  easeInOutCubic: '缓入缓出·强',
  easeInOutQuad: '缓入缓出·柔',
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
  // Sliders carry an id'd label so the displayed number can update live while dragging.
  const slider = (
    id: string,
    label: (v: string) => string,
    value: number,
    attrs: string,
  ) =>
    rows.push(
      `<div class="row"><label id="${id}-label">${label(String(value))}</label>` +
        `<input id="${id}" type="range" ${attrs} value="${value}"></div>`,
    )

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
  slider('f-size', (v) => `点大小 (${v})`, c.dotSize, 'min="2" max="24"')
  slider('f-grid', (v) => `网格密度 (${v})`, c.gridSpacing, 'min="4" max="60"')
  slider('f-fill', (v) => `字号占比 (${v})`, c.fillRatio, 'min="0.3" max="0.9" step="0.02"')
  slider('f-trans', (v) => `过渡时长 (${v}ms)`, c.transitionMs, 'min="300" max="3000" step="50"')
  slider('f-hold', (v) => `停留时长 (${v}ms)`, c.holdMs, 'min="200" max="4000" step="50"')
  slider('f-scatter', (v) => `散开强度 (${v})`, c.scatterAmount, 'min="0" max="800"')
  slider('f-rand', (v) => `随机度 (${v})`, c.randomness, 'min="0" max="1" step="0.05"')
  bind('movement', '点的移动方式',
    `<select id="f-move">${(Object.keys(MOVEMENT_LABELS) as MovementMode[])
       .map((m) => `<option value="${m}"${c.movement === m ? ' selected' : ''}>${MOVEMENT_LABELS[m]}</option>`).join('')}</select>`)
  bind('easing', '缓动',
    `<select id="f-ease">${(Object.keys(easings) as EasingName[])
       .map((e) => `<option value="${e}"${c.easing === e ? ' selected' : ''}>${EASING_LABELS[e]}</option>`).join('')}</select>`)
  bind('fileName', '文件名',
    `<input id="f-name" type="text" value="${escapeAttr(c.fileName)}">`) // escape: fileName is free user text

  container.innerHTML = rows.join('')

  const apply = (key: keyof Config, value: Config[keyof Config]) => {
    store.set({ [key]: value } as Partial<Config>)
    if (STRUCTURAL.has(key)) onStructuralChange()
  }
  const on = (id: string, ev: string, fn: (el: HTMLInputElement) => void) => {
    const el = container.querySelector<HTMLInputElement>(id)
    if (el) el.addEventListener(ev, () => fn(el))
  }
  // Slider handler: refresh the live label, then apply the numeric value.
  const onSlider = (id: string, key: keyof Config, label: (v: string) => string) =>
    on(`#${id}`, 'input', (el) => {
      const lbl = container.querySelector(`#${id}-label`)
      if (lbl) lbl.textContent = label(el.value)
      apply(key, Number(el.value))
    })

  on('#f-phrases', 'input', (el) =>
    apply('phrases', el.value.split('\n').map((s) => s.trim()).filter(Boolean)))
  on('#f-mode', 'change', (el) => apply('mode', el.value as Config['mode']))
  on('#f-bg', 'input', (el) => apply('backgroundColor', el.value))
  on('#f-dot', 'input', (el) => apply('dotColor', el.value))
  on('#f-shape', 'change', (el) => apply('dotShape', el.value as Config['dotShape']))
  onSlider('f-size', 'dotSize', (v) => `点大小 (${v})`)
  onSlider('f-grid', 'gridSpacing', (v) => `网格密度 (${v})`)
  onSlider('f-fill', 'fillRatio', (v) => `字号占比 (${v})`)
  onSlider('f-trans', 'transitionMs', (v) => `过渡时长 (${v}ms)`)
  onSlider('f-hold', 'holdMs', (v) => `停留时长 (${v}ms)`)
  onSlider('f-scatter', 'scatterAmount', (v) => `散开强度 (${v})`)
  onSlider('f-rand', 'randomness', (v) => `随机度 (${v})`)
  on('#f-move', 'change', (el) => apply('movement', el.value as MovementMode))
  on('#f-ease', 'change', (el) => apply('easing', el.value as EasingName))
  on('#f-name', 'input', (el) => apply('fileName', el.value))
}
