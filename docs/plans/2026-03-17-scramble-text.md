# ScrambleText Effect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a hacker-style ScrambleText animation to all prominent text in the portfolio using anime.js.

**Architecture:** anime.js handles stagger/timeline orchestration; a custom `scramble()` function drives character randomization on each animation tick via the `update` callback. Hero elements fire on page load; all other elements fire once via IntersectionObserver when scrolled into view.

**Tech Stack:** anime.js v3.2.2 (CDN), vanilla JS, IntersectionObserver API

---

### Task 1: Add anime.js CDN script tag

**Files:**
- Modify: `portfolio.html` (before the `<script type="importmap">` block, around line 533)

**Step 1: Add the script tag**

Insert this line immediately before `<script type="importmap">`:

```html
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>
```

**Step 2: Verify in browser**

Open `portfolio.html` in browser, open DevTools console and run:
```js
typeof anime
```
Expected: `"function"`

**Step 3: Commit**

```bash
git add portfolio.html
git commit -m "feat: add anime.js CDN dependency for ScrambleText"
```

---

### Task 2: Add the ScrambleText core function and helpers

**Files:**
- Modify: `portfolio.html` — add a new `<script>` block just before `</body>`

**Step 1: Add the script block with core scramble logic**

Insert this block just before `</body>`:

```html
<script>
(function () {
  // ── ScrambleText ──────────────────────────────────────────
  const POOL = '!@#$%^&*<>{}[]0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function randomChar() {
    return POOL[Math.floor(Math.random() * POOL.length)];
  }

  function scrambleFrame(el, progress) {
    const original = el.dataset.scramble;
    if (!original) return;
    const resolved = Math.floor(progress * original.length);
    let out = '';
    for (let i = 0; i < original.length; i++) {
      if (i < resolved) {
        out += original[i];
      } else if (original[i] === ' ' || original[i] === '\n') {
        out += original[i];
      } else {
        out += randomChar();
      }
    }
    el.textContent = out;
  }

  function playScramble(el, delay) {
    if (el.dataset.scrambled) return; // play once only
    el.dataset.scrambled = '1';

    // Store original text and lock min-width to prevent layout shift
    const original = el.textContent.trim();
    el.dataset.scramble = original;
    el.style.minWidth = el.offsetWidth + 'px';
    el.style.display = el.style.display || 'inline-block';

    const duration = Math.max(500, Math.min(original.length * 35, 1000));

    anime({
      targets: el,
      duration: duration,
      delay: delay || 0,
      easing: 'linear',
      // Dummy property — we use update callback for the scramble
      opacity: [1, 1],
      update: function (anim) {
        scrambleFrame(el, anim.progress / 100);
      },
      complete: function () {
        el.textContent = original; // ensure exact original text on finish
      }
    });
  }

  // ── Page-load: Hero elements ──────────────────────────────
  window.addEventListener('DOMContentLoaded', function () {
    // Eyebrow
    const eyebrow = document.querySelector('.hero-eyebrow');
    if (eyebrow) playScramble(eyebrow, 200);

    // Hero name — each text node line separately
    const nameLine1 = document.querySelector('.hero-name');
    if (nameLine1) {
      // Animate the whole h1 as one block
      playScramble(nameLine1, 400);
    }

    // Hero desc emphasis tags
    document.querySelectorAll('.hero-desc em').forEach(function (em, i) {
      playScramble(em, 700 + i * 150);
    });
  });

  // ── Scroll: IntersectionObserver for all other elements ───
  const scrollTargets = [
    { selector: '.section-label',  stagger: 0   },
    { selector: '.project-name',   stagger: 0   },
    { selector: '.stat-num',       stagger: 100 },
    { selector: '.skill-item',     stagger: 30  },
    { selector: '.contact-link',   stagger: 50  },
  ];

  scrollTargets.forEach(function (group) {
    const els = Array.from(document.querySelectorAll(group.selector));
    // Group siblings inside the same section for staggered delay
    const sections = {};
    els.forEach(function (el) {
      const sec = el.closest('section') || document.body;
      const key = sec.id || 'root';
      if (!sections[key]) sections[key] = [];
      sections[key].push(el);
    });

    Object.values(sections).forEach(function (group_els) {
      const observer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const idx = group_els.indexOf(entry.target);
            playScramble(entry.target, idx * group.stagger);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });

      group_els.forEach(function (el) { observer.observe(el); });
    });
  });

})();
</script>
```

**Step 2: Verify in browser**

- Reload the page — hero eyebrow and name should scramble in on load
- Scroll down to About — stat numbers should scramble in
- Scroll to Skills — each skill item should scramble with a small stagger
- Scroll to Projects — project names should scramble in
- Scroll to Contact — contact links should scramble in
- Scroll back up and back down — elements should NOT re-scramble (once only)

**Step 3: Commit**

```bash
git add portfolio.html
git commit -m "feat: add ScrambleText effect with anime.js"
```

---

### Task 3: Fix hero-name scramble (preserves HTML structure)

The `.hero-name` element contains a `<br>` and a `<span class="line2">`. Scrambling `textContent` directly will destroy the span. We need to scramble the text nodes and span separately.

**Files:**
- Modify: `portfolio.html` — update the hero-name scramble block inside the `DOMContentLoaded` listener

**Step 1: Replace the hero-name scramble code**

Find this block:
```js
// Hero name — each text node line separately
const nameLine1 = document.querySelector('.hero-name');
if (nameLine1) {
  // Animate the whole h1 as one block
  playScramble(nameLine1, 400);
}
```

Replace with:
```js
// Hero name — scramble first text node and .line2 span separately
const heroName = document.querySelector('.hero-name');
if (heroName) {
  // First text node ("Manish")
  const firstNode = Array.from(heroName.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
  if (firstNode) {
    const wrapper = document.createElement('span');
    wrapper.textContent = firstNode.textContent.trim();
    heroName.replaceChild(wrapper, firstNode);
    playScramble(wrapper, 400);
  }
  // .line2 span ("Shrestha")
  const line2 = heroName.querySelector('.line2');
  if (line2) playScramble(line2, 600);
}
```

**Step 2: Verify in browser**

- Reload — "Manish" scrambles first, then "Shrestha" scrambles 200ms later
- The cyan color on "Shrestha" should be preserved throughout and after the animation
- No layout shift on the hero name

**Step 3: Commit**

```bash
git add portfolio.html
git commit -m "fix: preserve hero-name span structure during ScrambleText"
```

---

### Task 4: Polish — uppercase source text for scramble consistency

The POOL is uppercase only. Mixed-case source text (like `hero-desc` or skill items) looks inconsistent when scrambling if the final text is lowercase but scramble chars are uppercase. Two options: expand pool to include lowercase, or uppercase only the scramble frames (not the final resolved text).

**Files:**
- Modify: `portfolio.html` — update `scrambleFrame` function

**Step 1: Update scrambleFrame to use uppercase chars only for unresolved positions**

The current `scrambleFrame` already does this correctly — unresolved chars show pool (uppercase), resolved chars show `original[i]` (actual case). This is intentional and correct. No change needed.

**Step 2: Verify visual consistency**

- Check that skill items like "TypeScript" scramble with uppercase pool chars then resolve to correct mixed-case
- Check that `.hero-desc em` ("7+ years") scrambles correctly

**Step 3: Commit (only if any change was made)**

```bash
git add portfolio.html
git commit -m "polish: verify scramble character consistency"
```

---

### Task 5: Final verification

**Step 1: Full page walkthrough**

1. Hard reload (`Ctrl+Shift+R`) — observe hero scramble sequence:
   - Eyebrow text scrambles at 200ms
   - "Manish" scrambles at 400ms
   - "Shrestha" scrambles at 600ms
   - `em` tags in description scramble at 700ms+

2. Scroll slowly through each section and verify:
   - `// About`, `// Tech Stack`, etc. section labels scramble in
   - Project names scramble as cards enter view
   - Stat numbers (7+, 12, 10) scramble
   - Skill items stagger in with scramble
   - Contact links scramble

3. Scroll back to top, scroll down again — no re-scramble

4. Check DevTools console — no errors

**Step 2: Commit final state**

```bash
git add portfolio.html
git commit -m "feat: complete ScrambleText effect across all portfolio sections"
```
