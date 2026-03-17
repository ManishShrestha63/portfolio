export function initNav(): void {
  const progressLine = document.getElementById('progressLine') as HTMLElement
  const navDots = document.querySelectorAll<HTMLElement>('.nav-dot')

  window.addEventListener('scroll', () => {
    const maxScroll = document.body.scrollHeight - innerHeight
    const scrollPct = maxScroll > 0 ? scrollY / maxScroll : 0
    progressLine.style.height = (scrollPct * 100) + '%'

    let active = 'hero'
    document.querySelectorAll('section').forEach(s => {
      if (s.getBoundingClientRect().top <= innerHeight * 0.55) active = s.id
    })
    navDots.forEach(d => {
      d.classList.toggle('active', d.dataset['section'] === active)
    })
  })

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault()
      const target = document.querySelector(a.getAttribute('href') ?? '')
      target?.scrollIntoView({ behavior: 'smooth' })
    })
  })
}
