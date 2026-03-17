export function initCursor(): void {
  const cursorEl  = document.getElementById('cursor') as HTMLElement
  const cursorRing = document.getElementById('cursorRing') as HTMLElement

  const ringPos = { x: innerWidth / 2, y: innerHeight / 2 }
  const rawPos  = { x: innerWidth / 2, y: innerHeight / 2 }

  document.addEventListener('mousemove', (e: MouseEvent) => {
    rawPos.x = e.clientX
    rawPos.y = e.clientY
    cursorEl.style.left = e.clientX + 'px'
    cursorEl.style.top  = e.clientY + 'px'
  })

  function ringLoop(): void {
    ringPos.x += (rawPos.x - ringPos.x) * 0.1
    ringPos.y += (rawPos.y - ringPos.y) * 0.1
    cursorRing.style.left = ringPos.x + 'px'
    cursorRing.style.top  = ringPos.y + 'px'
    requestAnimationFrame(ringLoop)
  }

  ringLoop()
}
