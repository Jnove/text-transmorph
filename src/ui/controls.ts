import type { Store } from '../config/store'
import { type Config, STAGE_PRESETS } from '../config/types'
import { easings, type EasingName } from '../core/easing'
import type { MovementMode } from '../core/particles'

// Lucide refresh-cw icon, recolored via `currentColor`. Sits inline with the
// button label so the touch target stays a single button. Stroke width tuned
// to 1.75 so the arrow reads cleanly at the 14px size inside the existing
// `.btn-reroll` style.
const REROLL_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M21 12a9 9 0 1 1-3.5-7.1"/>' +
  '<polyline points="21 4 21 9 16 9"/>' +
  '</svg>'

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

/** Built-in font choices. Each value is a full CSS font-family stack so every
 *  option has fallbacks on both macOS and Windows. */
const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: '"PingFang SC", "Microsoft YaHei", sans-serif', label: '现代黑体' },
  { value: '"Songti SC", SimSun, "Noto Serif SC", serif', label: '宋体衬线' },
  { value: '"Kaiti SC", KaiTi, STKaiti, serif', label: '楷体' },
  { value: 'Georgia, "Times New Roman", serif', label: '西文衬线' },
  { value: '"Courier New", Consolas, monospace', label: '等宽打字机' },
  { value: 'Impact, "Arial Black", "Microsoft YaHei", sans-serif', label: '超粗展示' },
]

const WEIGHT_OPTIONS: { value: string; label: string }[] = [
  { value: '400', label: '常规' },
  { value: '700', label: '粗体' },
  { value: '900', label: '特粗' },
]

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

/** Escape a string for use inside a double-quoted HTML attribute. */
const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

const option = <T extends string>(value: T, current: T, text: string) =>
  `<option value="${attr(value)}"${current === value ? ' selected' : ''}>${text}</option>`

export function mountControls(
  container: HTMLElement,
  store: Store,
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
  const fontSel = selectWrap(
    `<select id="f-font">${FONT_OPTIONS
      .map((f) => option(f.value, c.fontFamily, f.label)).join('')}</select>`)
  const weightSel = selectWrap(
    `<select id="f-weight">${WEIGHT_OPTIONS
      .map((w) => option(w.value, c.fontWeight, w.label)).join('')}</select>`)
  const curPreset = STAGE_PRESETS.find(
    (p) => p.width === c.stageWidth && p.height === c.stageHeight)?.value ?? STAGE_PRESETS[0].value
  const sizeSel = selectWrap(
    `<select id="f-size-preset">${STAGE_PRESETS
      .map((p) => option(p.value, curPreset, p.label)).join('')}</select>`)

  // 两栏显式分配，按高度配平（左：内容+点阵；右：颜色+运动+节奏）
  const col = (...groups: string[]) => `<div class="ctl-col">${groups.join('')}</div>`
  container.innerHTML =
    col(
      group('文字内容',
        row('文案（每行一段，段内用 | 换行）', `<textarea id="f-phrases" rows="3">${c.phrases.join('\n')}</textarea>`),
        row('播放模式', modeSel),
        row('字体', fontSel),
        row('字重', weightSel)),
      group('点阵',
        row('画布尺寸', sizeSel),
        row('点形状', shapeSel),
        sliderRow('f-size', '点大小', '', c.dotSize, 'min="0.5" max="14" step="0.5"'),
        sliderRow('f-grid', '网格间距', '', c.gridSpacing, 'min="0.5" max="25" step="0.5"'),
        sliderRow('f-fill', '字号占比', '', c.fillRatio, 'min="0.3" max="0.9" step="0.02"'))) +
    col(
      group('颜色',
        colorPair(
          colorCell('f-bg', '背景色', c.backgroundColor),
          colorCell('f-dot', '点色', c.dotColor)),
        row('渐变填充', `<input id="f-grad" class="toggle" type="checkbox"${c.gradient ? ' checked' : ''}>`),
        colorPair(colorCell('f-dot2', '渐变末色', c.dotColor2), '')),
      group('运动',
        row('移动方式', moveSel),
        row('缓动曲线', easeSel),
        sliderRow('f-scatter', '散开强度', '', c.scatterAmount, 'min="0" max="800"'),
        sliderRow('f-rand', '随机度', '', c.randomness, 'min="0" max="1" step="0.05"'),
        sliderRow('f-stagger', '错峰波浪', '', c.stagger, 'min="0" max="0.6" step="0.02"'),
        row('随机形态', `<button id="f-reroll" class="btn-reroll" type="button">${REROLL_ICON}<span>换一换</span></button>`)),
      group('节奏',
        sliderRow('f-trans', '过渡时长', 'ms', c.transitionMs, 'min="300" max="3000" step="50"'),
        sliderRow('f-hold', '停留时长', 'ms', c.holdMs, 'min="200" max="4000" step="50"'),
        sliderRow('f-idle', '静止浮动', '', c.idleFloat, 'min="0" max="6" step="0.5"')))

  const apply = (key: keyof Config, value: Config[keyof Config]) => {
    store.set({ [key]: value } as Partial<Config>)
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
  const onSlider = (id: string, key: keyof Config, unit: string, after?: () => void) =>
    on(`#${id}`, 'input', (el) => {
      const out = container.querySelector(`#${id}-out`)
      if (out) out.textContent = el.value + unit
      setFill(el)
      apply(key, Number(el.value))
      after?.()
    })

  // Keep the two visual scales valid together: a particle cannot be larger
  // than the grid cell it represents without filling its neighbours.
  const syncDotSizeLimit = () => {
    const size = container.querySelector<HTMLInputElement>('#f-size')
    const grid = container.querySelector<HTMLInputElement>('#f-grid')
    if (!size || !grid) return
    const rawGrid = Number(grid.value)
    const fallbackGrid = rawGrid < 2
    const min = fallbackGrid ? 2 : 0.5
    const max = Math.min(14, Math.max(2, rawGrid))
    size.min = String(min)
    size.max = String(max)
    const next = Math.min(max, Math.max(min, Number(size.value)))
    if (Number(size.value) !== next || store.get().dotSize !== next) {
      size.value = String(next)
      const out = container.querySelector('#f-size-out')
      if (out) out.textContent = size.value
      setFill(size)
      apply('dotSize', next)
    }
  }

  on('#f-phrases', 'input', (el) =>
    apply('phrases', el.value.split('\n').map((s) => s.trim()).filter(Boolean)))
  on('#f-mode', 'change', (el) => apply('mode', el.value as Config['mode']))
  on('#f-bg', 'input', (el) => apply('backgroundColor', el.value))
  on('#f-dot', 'input', (el) => apply('dotColor', el.value))
  on('#f-dot2', 'input', (el) => apply('dotColor2', el.value))
  on('#f-grad', 'change', (el) => apply('gradient', el.checked))
  on('#f-shape', 'change', (el) => apply('dotShape', el.value as Config['dotShape']))
  onSlider('f-size', 'dotSize', '')
  onSlider('f-grid', 'gridSpacing', '', syncDotSizeLimit)
  onSlider('f-fill', 'fillRatio', '')
  onSlider('f-trans', 'transitionMs', 'ms')
  onSlider('f-hold', 'holdMs', 'ms')
  onSlider('f-scatter', 'scatterAmount', '')
  onSlider('f-rand', 'randomness', '')
  onSlider('f-stagger', 'stagger', '')
  onSlider('f-idle', 'idleFloat', '')
  on('#f-move', 'change', (el) => apply('movement', el.value as MovementMode))
  on('#f-ease', 'change', (el) => apply('easing', el.value as EasingName))
  on('#f-font', 'change', (el) => apply('fontFamily', el.value))
  on('#f-weight', 'change', (el) => apply('fontWeight', el.value))
  // Re-roll the seed → same params, a freshly scattered form.
  on('#f-reroll', 'click', () => apply('seed', Math.floor(Math.random() * 1e9)))
  // Size preset sets both dimensions at once; the engine re-samples on change.
  on('#f-size-preset', 'change', (el) => {
    const p = STAGE_PRESETS.find((pp) => pp.value === el.value)
    if (!p) return
    store.set({ stageWidth: p.width, stageHeight: p.height })
  })

  // Paint each slider's initial fill.
  container.querySelectorAll<HTMLInputElement>('.row-slider input[type=range]').forEach(setFill)
  syncDotSizeLimit()

  // Replace each native <select> popup with a soft glass dropdown.
  container.querySelectorAll<HTMLElement>('.select-wrap').forEach(enhanceSelect)
}

/** The one open dropdown's close function; a single shared document listener
 *  (below) closes it on outside click instead of one listener per select. */
let closeOpenDropdown: (() => void) | null = null
document.addEventListener('click', () => closeOpenDropdown?.())

/**
 * Progressive enhancement: keep the native <select> (hidden) as the source of
 * truth — so existing `change` bindings keep firing — and overlay a styled
 * trigger + frosted option list that matches the liquid-glass UI.
 */
function enhanceSelect(wrap: HTMLElement): void {
  const select = wrap.querySelector('select')
  if (!select) return
  wrap.classList.add('cs-ready')
  select.tabIndex = -1
  select.setAttribute('aria-hidden', 'true')

  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = 'cs-trigger'
  trigger.setAttribute('aria-haspopup', 'listbox')
  trigger.setAttribute('aria-expanded', 'false')
  const valueEl = document.createElement('span')
  valueEl.className = 'cs-value'
  const chevron = document.createElement('span')
  chevron.className = 'cs-chevron'
  trigger.append(valueEl, chevron)

  const list = document.createElement('div')
  list.className = 'cs-list'
  list.setAttribute('role', 'listbox')
  const items = Array.from(select.options).map((opt) => {
    const item = document.createElement('div')
    item.className = 'cs-option'
    item.setAttribute('role', 'option')
    item.textContent = opt.textContent
    item.dataset.value = opt.value
    item.addEventListener('click', () => { commit(opt.value); close(true) })
    list.appendChild(item)
    return item
  })

  const sync = () => {
    valueEl.textContent = select.options[select.selectedIndex]?.textContent ?? ''
    items.forEach((it) =>
      it.setAttribute('aria-selected', it.dataset.value === select.value ? 'true' : 'false'))
  }
  const commit = (v: string) => {
    if (select.value === v) return
    select.value = v
    select.dispatchEvent(new Event('change', { bubbles: true }))
    sync()
  }
  let open = false
  // Highlighted (not yet committed) option while the list is open — decouples
  // navigation from selection so arrow keys preview a choice and Enter confirms
  // it, matching native <select> keyboard behaviour.
  let active = -1
  const setActive = (idx: number) => {
    active = Math.max(0, Math.min(items.length - 1, idx))
    items.forEach((it, i) => it.classList.toggle('cs-active', i === active))
    items[active]?.scrollIntoView({ block: 'nearest' })
  }
  items.forEach((it, i) => it.addEventListener('mousemove', () => setActive(i)))

  const openList = () => {
    closeOpenDropdown?.() // at most one dropdown open at a time
    open = true
    closeOpenDropdown = () => close(false)
    wrap.classList.add('cs-open')
    trigger.setAttribute('aria-expanded', 'true')
    setActive(select.selectedIndex)
  }
  const close = (focus: boolean) => {
    open = false
    closeOpenDropdown = null
    active = -1
    items.forEach((it) => it.classList.remove('cs-active'))
    wrap.classList.remove('cs-open')
    trigger.setAttribute('aria-expanded', 'false')
    if (focus) trigger.focus()
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    if (open) close(false)
    else openList()
  })
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (open) setActive(active + 1)
      else openList()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (open) setActive(active - 1)
      else openList()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open) {
        commit(select.options[active].value)
        close(true)
      } else {
        openList()
      }
    } else if (e.key === 'Escape') {
      if (open) close(true)
    } else if (e.key === 'Home' && open) {
      e.preventDefault(); setActive(0)
    } else if (e.key === 'End' && open) {
      e.preventDefault(); setActive(items.length - 1)
    }
  })
  list.addEventListener('click', (e) => e.stopPropagation())

  wrap.append(trigger, list)
  sync()
}
