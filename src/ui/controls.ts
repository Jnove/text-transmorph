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

/** A control row: a label plus an arbitrary input fragment. */
const row = (label: string, input: string) =>
  `<div class="row"><label class="row-label">${label}</label>${input}</div>`

/** Wrap a <select> so a CSS chevron can sit on top and flip on focus. */
const selectWrap = (select: string) => `<div class="select-wrap">${select}</div>`

/** One labelled colour swatch; two of these share a single row. */
const colorCell = (id: string, label: string, value: string) =>
  `<div class="color-cell"><label class="row-label" for="${id}">${label}</label>` +
  `<span class="swatch"><input id="${id}" type="color" value="${value}"></span></div>`

/** Place a pair of colour cells side by side on one row. */
const colorPair = (a: string, b: string) =>
  `<div class="row row-colors">${a}${b}</div>`

/** An instrument slider: name + live mono readout chip above a gradient-fill
 *  track. `unit` is appended to the readout (e.g. "ms"). */
const sliderRow = (id: string, label: string, unit: string, value: number, attrs: string) =>
  `<div class="row row-slider">` +
  `<div class="row-top"><label class="row-label" for="${id}">${label}</label>` +
  `<output id="${id}-out" class="readout">${value}${unit}</output></div>` +
  `<input id="${id}" type="range" ${attrs} value="${value}"></div>`

/** Group several rows under an uppercase section label with a hairline rule. */
const group = (label: string, ...rows: string[]) =>
  `<section class="ctl-group"><div class="ctl-label">${label}</div>${rows.join('')}</section>`

const option = <T extends string>(value: T, current: T, text: string) =>
  `<option value="${value}"${current === value ? ' selected' : ''}>${text}</option>`

export function mountControls(
  container: HTMLElement,
  store: Store,
  onStructuralChange: () => void,
): void {
  const c = store.get()

  const modeSel = selectWrap(
    `<select id="f-mode">${option('sequence', c.mode, '多段轮播')}${option('breathe', c.mode, '单段呼吸')}</select>`)
  const shapeSel = selectWrap(
    `<select id="f-shape">${option('square', c.dotShape, '方块')}${option('circle', c.dotShape, '圆点')}</select>`)
  const moveSel = selectWrap(
    `<select id="f-move">${(Object.keys(MOVEMENT_LABELS) as MovementMode[])
      .map((m) => option(m, c.movement, MOVEMENT_LABELS[m])).join('')}</select>`)
  const easeSel = selectWrap(
    `<select id="f-ease">${(Object.keys(easings) as EasingName[])
      .map((e) => option(e, c.easing, EASING_LABELS[e])).join('')}</select>`)

  container.innerHTML =
    group('文字内容',
      row('文案（每行一段）', `<textarea id="f-phrases" rows="3">${c.phrases.join('\n')}</textarea>`),
      row('播放模式', modeSel)) +
    group('颜色',
      colorPair(
        colorCell('f-bg', '背景色', c.backgroundColor),
        colorCell('f-dot', '点色', c.dotColor))) +
    group('点阵',
      row('点形状', shapeSel),
      sliderRow('f-size', '点大小', '', c.dotSize, 'min="2" max="24"'),
      sliderRow('f-grid', '网格密度', '', c.gridSpacing, 'min="4" max="60"'),
      sliderRow('f-fill', '字号占比', '', c.fillRatio, 'min="0.3" max="0.9" step="0.02"')) +
    group('运动',
      row('移动方式', moveSel),
      row('缓动曲线', easeSel),
      sliderRow('f-scatter', '散开强度', '', c.scatterAmount, 'min="0" max="800"'),
      sliderRow('f-rand', '随机度', '', c.randomness, 'min="0" max="1" step="0.05"')) +
    group('节奏',
      sliderRow('f-trans', '过渡时长', 'ms', c.transitionMs, 'min="300" max="3000" step="50"'),
      sliderRow('f-hold', '停留时长', 'ms', c.holdMs, 'min="200" max="4000" step="50"'))

  const apply = (key: keyof Config, value: Config[keyof Config]) => {
    store.set({ [key]: value } as Partial<Config>)
    if (STRUCTURAL.has(key)) onStructuralChange()
  }
  const on = (id: string, ev: string, fn: (el: HTMLInputElement) => void) => {
    const el = container.querySelector<HTMLInputElement>(id)
    if (el) el.addEventListener(ev, () => fn(el))
  }

  // Fill the gradient track to the thumb position (0–100% along min→max).
  const setFill = (el: HTMLInputElement) => {
    const min = Number(el.min), max = Number(el.max), v = Number(el.value)
    el.style.setProperty('--fill', (max > min ? ((v - min) / (max - min)) * 100 : 0) + '%')
  }
  // Slider handler: refresh the live readout, repaint the fill, then apply.
  const onSlider = (id: string, key: keyof Config, unit: string) =>
    on(`#${id}`, 'input', (el) => {
      const out = container.querySelector(`#${id}-out`)
      if (out) out.textContent = el.value + unit
      setFill(el)
      apply(key, Number(el.value))
    })

  on('#f-phrases', 'input', (el) =>
    apply('phrases', el.value.split('\n').map((s) => s.trim()).filter(Boolean)))
  on('#f-mode', 'change', (el) => apply('mode', el.value as Config['mode']))
  on('#f-bg', 'input', (el) => apply('backgroundColor', el.value))
  on('#f-dot', 'input', (el) => apply('dotColor', el.value))
  on('#f-shape', 'change', (el) => apply('dotShape', el.value as Config['dotShape']))
  onSlider('f-size', 'dotSize', '')
  onSlider('f-grid', 'gridSpacing', '')
  onSlider('f-fill', 'fillRatio', '')
  onSlider('f-trans', 'transitionMs', 'ms')
  onSlider('f-hold', 'holdMs', 'ms')
  onSlider('f-scatter', 'scatterAmount', '')
  onSlider('f-rand', 'randomness', '')
  on('#f-move', 'change', (el) => apply('movement', el.value as MovementMode))
  on('#f-ease', 'change', (el) => apply('easing', el.value as EasingName))

  // Paint each slider's initial fill.
  container.querySelectorAll<HTMLInputElement>('.row-slider input[type=range]').forEach(setFill)
}
