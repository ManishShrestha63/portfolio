export interface SceneConfig {
  charX:     number   // character resting X world position
  camLookX:  number   // camera lookAt X target
  rainX:     number   // rain plane center X
  camZ:      number   // camera Z distance
  camY:      number   // camera Y height
  [key: string]: number
}

export function createDebugPanel(
  initial: SceneConfig,
  onChange: (cfg: SceneConfig) => void
): void {
  let cfg: SceneConfig = { ...initial }

  // ── Panel DOM ─────────────────────────────────────────────
  const panel = document.createElement('div')
  panel.id = 'dbg-panel'
  Object.assign(panel.style, {
    position:       'fixed',
    top:            '12px',
    right:          '12px',
    width:          '270px',
    background:     'rgba(7,9,13,0.92)',
    border:         '1px solid rgba(0,212,255,0.25)',
    borderRadius:   '8px',
    padding:        '14px 16px',
    fontFamily:     '"JetBrains Mono", monospace',
    fontSize:       '11px',
    color:          '#e8eaf0',
    zIndex:         '99999',
    userSelect:     'none',
    backdropFilter: 'blur(6px)',
  })

  const title = document.createElement('div')
  Object.assign(title.style, {
    fontSize:      '9px',
    letterSpacing: '0.25em',
    color:         '#00d4ff',
    textTransform: 'uppercase',
    marginBottom:  '12px',
    display:       'flex',
    justifyContent:'space-between',
    alignItems:    'center',
  })
  title.innerHTML = '<span>// scene config</span>'

  const hideBtn = document.createElement('button')
  hideBtn.textContent = '×'
  Object.assign(hideBtn.style, {
    background: 'none', border: 'none',
    color: '#7a8394', cursor: 'pointer', fontSize: '14px', padding: '0',
  })
  title.appendChild(hideBtn)
  panel.appendChild(title)

  // ── Slider rows ──────────────────────────────────────────
  const rows: { key: keyof SceneConfig; label: string; min: number; max: number; step: number }[] = [
    { key: 'charX',    label: 'char X',      min: -2,  max: 4,   step: 0.05 },
    { key: 'camLookX', label: 'lookAt X',    min: -2,  max: 4,   step: 0.05 },
    { key: 'rainX',    label: 'rain X',      min: -4,  max: 2,   step: 0.1  },
    { key: 'camZ',     label: 'cam Z',       min: 1,   max: 6,   step: 0.05 },
    { key: 'camY',     label: 'cam Y',       min: 0,   max: 3,   step: 0.05 },
  ]

  const numEls: Partial<Record<keyof SceneConfig, HTMLInputElement>> = {}

  for (const row of rows) {
    const wrap = document.createElement('div')
    Object.assign(wrap.style, { marginBottom: '8px' })

    const labelEl = document.createElement('div')
    Object.assign(labelEl.style, {
      display: 'flex', justifyContent: 'space-between',
      marginBottom: '3px', color: '#7a8394',
    })
    labelEl.innerHTML = `<span>${row.label}</span>`

    const numEl = document.createElement('input')
    Object.assign(numEl.style, {
      background: 'transparent', border: 'none',
      color: '#00d4ff', fontFamily: 'inherit',
      fontSize: '11px', width: '50px', textAlign: 'right',
      outline: 'none',
    })
    numEl.type  = 'number'
    numEl.step  = String(row.step)
    numEl.value = String(cfg[row.key])
    numEls[row.key] = numEl
    labelEl.appendChild(numEl)
    wrap.appendChild(labelEl)

    const slider = document.createElement('input')
    Object.assign(slider.style, {
      width: '100%', accentColor: '#00d4ff', cursor: 'pointer',
    })
    slider.type  = 'range'
    slider.min   = String(row.min)
    slider.max   = String(row.max)
    slider.step  = String(row.step)
    slider.value = String(cfg[row.key])

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value)
      ;(cfg as Record<string, number>)[row.key] = v
      numEl.value = String(v)
      onChange({ ...cfg })
    })
    numEl.addEventListener('change', () => {
      const v = parseFloat(numEl.value)
      ;(cfg as Record<string, number>)[row.key] = v
      slider.value = String(v)
      onChange({ ...cfg })
    })

    wrap.appendChild(slider)
    panel.appendChild(wrap)
  }

  // ── Copy button ──────────────────────────────────────────
  const sep = document.createElement('div')
  Object.assign(sep.style, {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    margin: '10px 0 10px',
  })
  panel.appendChild(sep)

  const copyBtn = document.createElement('button')
  copyBtn.textContent = 'Copy Config'
  Object.assign(copyBtn.style, {
    width: '100%', padding: '6px',
    background: 'rgba(0,212,255,0.1)',
    border: '1px solid rgba(0,212,255,0.3)',
    borderRadius: '4px', color: '#00d4ff',
    fontFamily: 'inherit', fontSize: '10px',
    letterSpacing: '0.12em', textTransform: 'uppercase',
    cursor: 'pointer',
  })
  copyBtn.addEventListener('click', () => {
    const out = Object.entries(cfg)
      .map(([k, v]) => `  ${k}: ${(v as number).toFixed(2)}`)
      .join('\n')
    navigator.clipboard.writeText(`{\n${out}\n}`).then(() => {
      copyBtn.textContent = 'Copied!'
      setTimeout(() => { copyBtn.textContent = 'Copy Config' }, 1500)
    })
  })
  panel.appendChild(copyBtn)

  // ── Hide / show ──────────────────────────────────────────
  hideBtn.addEventListener('click', () => {
    panel.style.display = 'none'
    fab.style.display   = 'flex'
  })

  // Floating re-open button
  const fab = document.createElement('button')
  fab.textContent = '⚙'
  Object.assign(fab.style, {
    display:      'none',
    position:     'fixed',
    top:          '12px',
    right:        '12px',
    width:        '34px',
    height:       '34px',
    alignItems:   'center',
    justifyContent:'center',
    background:   'rgba(0,212,255,0.12)',
    border:       '1px solid rgba(0,212,255,0.3)',
    borderRadius: '50%',
    color:        '#00d4ff',
    fontSize:     '16px',
    cursor:       'pointer',
    zIndex:       '99999',
  })
  fab.addEventListener('click', () => {
    panel.style.display = 'block'
    fab.style.display   = 'none'
  })

  document.body.appendChild(panel)
  document.body.appendChild(fab)
}
