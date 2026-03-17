# ScrambleText Effect Design

**Date:** 2026-03-17
**Status:** Approved

## Summary

Add a ScrambleText animation to all prominent text content in the portfolio. Hero section animates on page load; all other sections animate when scrolled into view. Uses anime.js for timeline/stagger orchestration with a custom scramble update function.

## Requirements

- **Triggers:** Hero on page load, all other sections on scroll into view (once per element)
- **Character pool:** `!@#$%^&*<>{}[]0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`
- **Library:** anime.js v3.2.2 via CDN
- **No layout shift:** Lock `min-width` before animation starts

## Targets

| Element | Trigger | Delay |
|---|---|---|
| `.hero-eyebrow` | Page load | 0ms |
| `.hero-name` lines | Page load | 200ms stagger |
| `.hero-desc em` | Page load | 500ms |
| `.section-label` | Scroll into view | 0ms |
| `.project-name` | Scroll into view | 0ms |
| `.stat-num` | Scroll into view | 100ms stagger |
| `.skill-item` text | Scroll into view | 30ms stagger |
| `.contact-link` text | Scroll into view | 50ms stagger |

## Technical Design

### ScrambleText function

```js
const POOL = '!@#$%^&*<>{}[]0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function scramble(el, progress) {
  const original = el.dataset.scramble;
  const resolved = Math.floor(progress * original.length);
  let output = '';
  for (let i = 0; i < original.length; i++) {
    if (i < resolved) {
      output += original[i];
    } else if (original[i] === ' ') {
      output += ' ';
    } else {
      output += POOL[Math.floor(Math.random() * POOL.length)];
    }
  }
  el.textContent = output;
}
```

### anime.js integration

Each element runs an anime() instance with `duration` scaled to text length (min 500ms, max 1000ms). The `update` callback calls `scramble(el, anim.progress / 100)`. On `complete`, text is restored to the original value exactly.

### Scroll trigger

`IntersectionObserver` with `threshold: 0.3`. After firing, the observer disconnects for that element so it only plays once.

### anime.js CDN

```html
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>
```

Added before the existing `<script type="importmap">` block.

## Files Changed

- `portfolio.html` — add anime.js CDN script tag + ScrambleText inline script block
