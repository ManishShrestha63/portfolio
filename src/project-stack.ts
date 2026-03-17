interface Project {
  title:     string
  tag:       string
  tagColor:  string
  desc:      string
  stack:     string[]
  image:     string
  url:       string
  platforms: Array<'web' | 'mobile' | 'desktop'>
}

const PROJECTS: Project[] = [
  {
    title:     'Invoice AI Check',
    tag:       'Active',
    tagColor:  '#00ff88',
    desc:      'AI-powered invoice fraud detection identifying 10 fraud categories using a two-pass OpenAI pipeline. Built for Japanese enterprise clients.',
    stack:     ['Node.js', 'Next.js', 'FastAPI', 'OpenAI API', 'Supabase', 'React Native'],
    image:     'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=480&h=200&fit=crop&auto=format',
    url:       '#',
    platforms: ['web', 'mobile'],
  },
  {
    title:     'POSCOS / Post Controller',
    tag:       'SaaS',
    tagColor:  '#ffd166',
    desc:      'Social media management SaaS integrating 12 SNS channels. Real-time scheduling, cross-platform publishing, analytics, and billing.',
    stack:     ['React 19', 'Node.js', 'MongoDB', 'Redis', 'Stripe'],
    image:     'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=480&h=200&fit=crop&auto=format',
    url:       '#',
    platforms: ['web', 'mobile', 'desktop'],
  },
  {
    title:     'Yayoi × freee Middleware',
    tag:       'Integration',
    tagColor:  '#00d4ff',
    desc:      'Accounting middleware bridging Yayoi Sales and freee APIs for automated invoice reconciliation and data sync for Japanese SMEs.',
    stack:     ['Node.js', 'TypeScript', 'REST API'],
    image:     'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=480&h=200&fit=crop&auto=format',
    url:       '#',
    platforms: ['web'],
  },
]

const POSITIONS = [
  { y: 12,  scale: 1.00, z: 3 },
  { y: -18, scale: 0.95, z: 2 },
  { y: -44, scale: 0.90, z: 1 },
]

// SVG icons
const ICON_EXTERNAL = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`

const PLATFORM_ICONS: Record<string, string> = {
  web:     `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  mobile:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  desktop: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
}

const PLATFORM_LABELS: Record<string, string> = {
  web: 'Web', mobile: 'Mobile', desktop: 'Desktop',
}

export function initProjectStack(): void {
  const container = document.getElementById('project-stack') as HTMLElement
  if (!container) return

  let activeCards: HTMLElement[] = []
  let projectIndex = 0
  let animating = false

  function makePlatforms(platforms: Project['platforms']): string {
    return platforms.map(p =>
      `<span class="ps-platform">
        ${PLATFORM_ICONS[p]}
        <span>${PLATFORM_LABELS[p]}</span>
      </span>`
    ).join('')
  }

  function makePills(stack: string[]): string {
    return stack.map(s => `<span class="pill">${s}</span>`).join('')
  }

  function makeCard(project: Project): HTMLElement {
    const card = document.createElement('div')
    card.className = 'ps-card'
    card.innerHTML = `
      <div class="ps-thumb">
        <img src="${project.image}" alt="${project.title}" loading="lazy" />
        <span class="ps-thumb-badge" style="border-color:${project.tagColor}44;color:${project.tagColor}">${project.tag}</span>
      </div>
      <div class="ps-card-body">
        <div class="ps-card-top">
          <span class="project-name">${project.title}</span>
          <a href="${project.url}" class="ps-ext-link" title="Open project">
            ${ICON_EXTERNAL}
          </a>
        </div>
        <div class="ps-platforms">${makePlatforms(project.platforms)}</div>
        <p class="project-desc">${project.desc}</p>
        <div class="project-stack">${makePills(project.stack)}</div>
      </div>`
    return card
  }

  function setPosition(el: HTMLElement, posIdx: number, instant = false): void {
    const p = POSITIONS[posIdx]
    if (instant) el.style.transition = 'none'
    el.style.transform = `translateX(-50%) translateY(${p.y}px) scale(${p.scale})`
    el.style.zIndex    = String(p.z)
    el.style.opacity   = '1'
    if (instant) {
      el.offsetHeight
      el.style.transition = ''
    }
  }

  function buildStack(): void {
    container.innerHTML = ''
    activeCards = []
    for (let i = 0; i < 3; i++) {
      const pIdx = (projectIndex + i) % PROJECTS.length
      const card = makeCard(PROJECTS[pIdx])
      container.prepend(card)
      setPosition(card, i, true)
      activeCards.unshift(card)
    }
  }

  function animateNext(): void {
    if (animating) return
    animating = true

    const [front, mid, back] = activeCards

    front.style.transform = 'translateX(-50%) translateY(340px) scale(1)'
    front.style.opacity   = '0'
    front.style.zIndex    = '10'

    setPosition(mid,  0)
    setPosition(back, 1)

    const nextProject = (projectIndex + 3) % PROJECTS.length
    const newCard = makeCard(PROJECTS[nextProject])
    newCard.style.transform  = 'translateX(-50%) translateY(-44px) scale(0.9)'
    newCard.style.opacity    = '0'
    newCard.style.zIndex     = '0'
    newCard.style.transition = 'none'
    container.prepend(newCard)
    newCard.offsetHeight

    newCard.style.transition = ''
    setPosition(newCard, 2)
    newCard.style.opacity = '0.85'

    front.addEventListener('transitionend', () => {
      front.remove()
      newCard.style.opacity = '1'
      activeCards = [mid, back, newCard]
      projectIndex = (projectIndex + 1) % PROJECTS.length
      animating = false
    }, { once: true })
  }

  buildStack()

  const btn = document.getElementById('ps-next-btn')
  if (btn) btn.addEventListener('click', animateNext)
}
