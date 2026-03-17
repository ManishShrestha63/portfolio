function buildWord(text: string, baseDelay: number): DocumentFragment {
  const frag = document.createDocumentFragment()
  ;[...text].forEach((char, i) => {
    const charDelay = baseDelay + i * 50

    const wrapper = document.createElement('span')
    wrapper.className = 'shutter-char'

    const main = document.createElement('span')
    main.className = 'shutter-main'
    main.textContent = char
    main.style.animationDelay = `${charDelay + 250}ms`

    const top = document.createElement('span')
    top.className = 'shutter-slice shutter-top'
    top.textContent = char
    top.style.animationDelay = `${charDelay}ms`

    const mid = document.createElement('span')
    mid.className = 'shutter-slice shutter-mid'
    mid.textContent = char
    mid.style.animationDelay = `${charDelay + 70}ms`

    const bot = document.createElement('span')
    bot.className = 'shutter-slice shutter-bot'
    bot.textContent = char
    bot.style.animationDelay = `${charDelay + 140}ms`

    wrapper.append(main, top, mid, bot)
    frag.appendChild(wrapper)
  })
  return frag
}

// Build shutter DOM into el from plain text, splitting by words
function applyShutter(el: HTMLElement, charStagger = 40): void {
  const words = (el.dataset.original ?? '').split(' ')
  el.innerHTML = ''
  words.forEach((word, wi) => {
    const baseDelay = wi * word.length * charStagger
    el.appendChild(buildWord(word, baseDelay))
    if (wi < words.length - 1) {
      const sp = document.createElement('span')
      sp.textContent = '\u00a0'
      el.appendChild(sp)
    }
  })
}

// Reset el back to plain text so the animation can replay next time
function resetShutter(el: HTMLElement): void {
  el.textContent = el.dataset.original ?? ''
}

export function initShutterText(): void {
  // ── Page loader name ─────────────────────────────────────
  const plName = document.querySelector('.pl-name') as HTMLElement | null
  if (plName) {
    plName.innerHTML = ''
    plName.appendChild(buildWord('MANISH', 100))
    plName.appendChild(document.createElement('br'))
    const line2 = document.createElement('span')
    line2.style.display = 'block'
    line2.appendChild(buildWord('SHRESTHA', 100 + 6 * 40))
    plName.appendChild(line2)
  }

  // ── Hero name ────────────────────────────────────────────
  const heroSection = document.getElementById('hero')
  const heroName    = document.querySelector('.hero-name') as HTMLElement | null

  // Clear immediately so plain HTML never flashes during loader fade
  if (heroName) heroName.innerHTML = ''

  function buildHeroName(): void {
    if (!heroName) return
    heroName.innerHTML = ''
    heroName.appendChild(buildWord('Manish', 200))
    heroName.appendChild(document.createElement('br'))
    const line2 = document.createElement('span')
    line2.className = 'line2'
    line2.appendChild(buildWord('Shrestha', 500))
    heroName.appendChild(line2)

  }

  // Observe hero section — replay every time it enters view
  if (heroSection && heroName) {
    let heroReady = false

    // Wait for loader before first play
    document.addEventListener('vrm:ready', () => {
      setTimeout(() => {
        heroReady = true
        buildHeroName()
      }, 800)
    }, { once: true })

    const heroObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && heroReady) {
          buildHeroName()
        } else if (!entry.isIntersecting && heroReady) {
          // Reset so it replays next visit
          if (heroName) heroName.innerHTML = ''
        }
      })
    }, { threshold: 0.3 })

    heroObs.observe(heroSection)
  }

  // ── Stat numbers — shutter on scroll-into-view ───────────
  const statNums = document.querySelectorAll<HTMLElement>('.stat-num')
  statNums.forEach(el => {
    el.dataset.original = el.textContent?.trim() ?? ''
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          applyShutter(el, 60)
        } else {
          resetShutter(el)
        }
      })
    }, { threshold: 0.5 })
    obs.observe(el)
  })

  // ── Section labels — replay on every scroll-into-view ────
  const labels = document.querySelectorAll<HTMLElement>('.section-label')

  labels.forEach(el => {
    // Store original text once
    el.dataset.original = el.textContent?.trim() ?? ''

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          applyShutter(el, 35)
        } else {
          resetShutter(el)
        }
      })
    }, { threshold: 0.5 })

    obs.observe(el)
  })
}
