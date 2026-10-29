import { config, categories, sizes, products } from './data.js'
import { initSplit } from './split.js'

const $ = (s, root = document) => root.querySelector(s)
const $$ = (s, root = document) => [...root.querySelectorAll(s)]
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const isPlaceholder = (v) => !v || /^\[.*\]$/.test(v)
const categoryLabel = (slug) => categories.find((c) => c.slug === slug)?.label ?? slug

const escapeHtml = (str = '') =>
  str.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

// Troca de conteúdo com View Transitions quando o navegador suporta; senão, troca direto.
function transition(update) {
  if (reduced || !document.startViewTransition) return update()
  document.startViewTransition(update)
}

// ---------- Navegação ----------

function initNav() {
  const nav = $('[data-nav]')
  const split = $('[data-split]')
  const update = () => {
    const pastHero = split.getBoundingClientRect().bottom < window.innerHeight * 0.4
    nav.classList.toggle('nav--solid', window.scrollY > 24)
    nav.classList.toggle('nav--past', pastHero)
  }
  window.addEventListener('scroll', update, { passive: true })
  update()
}

// ---------- Manifesto: palavras acendem conforme o scroll ----------

function initWords() {
  const block = $('[data-words]')
  const words = block.textContent.trim().split(/\s+/)
  block.innerHTML = words.map((w) => `<span class="word">${escapeHtml(w)}</span>`).join(' ')
  const spans = $$('.word', block)
  if (reduced) {
    spans.forEach((s) => s.classList.add('is-lit'))
    return
  }
  let ticking = false
  const update = () => {
    ticking = false
    const rect = block.getBoundingClientRect()
    const vh = window.innerHeight
    const progress = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (rect.height + vh * 0.35)))
    const lit = Math.round(progress * spans.length)
    spans.forEach((s, i) => s.classList.toggle('is-lit', i < lit))
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true
      requestAnimationFrame(update)
    }
  }, { passive: true })
  update()
}

// ---------- Faixa corrida de categorias ----------

function initMarquee() {
  const track = $('[data-marquee]')
  const items = categories.map((c) => `<span>${escapeHtml(c.label)}</span><i aria-hidden="true">✦</i>`).join('')
  // Duas cópias idênticas para o loop não ter emenda
  track.innerHTML = `<div>${items}</div><div>${items}</div>`
}

// ---------- Revelar elementos ao entrar na tela ----------

const revealer = reduced
  ? null
  : new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-in')
          revealer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    )

function reveal(nodes) {
  nodes.forEach((node, i) => {
    node.style.setProperty('--i', i % 6)
    if (revealer) {
      node.classList.add('reveal')
      revealer.observe(node)
    }
  })
}

// ---------- Arte placeholder (enquanto não há foto) ----------

const TINTS = ['#e8dfd0', '#f1e6d2', '#e3d5bf', '#efe4d6', '#e6d9c6']

function mediaMarkup(product, index = 0) {
  const photo = product.images?.[0]
  if (photo) return `<img src="${escapeHtml(photo)}" alt="${escapeHtml(product.name)}" loading="lazy" />`
  const tint = TINTS[index % TINTS.length]
  return `
    <div class="placeholder" style="--tint:${tint}">
      <img src="assets/logo-mark-badge.png" alt="" aria-hidden="true" />
      <span>foto em breve</span>
    </div>`
}

// ---------- Catálogo ----------

const state = { category: 'todos', query: '' }

function priceText(product, multiplier = 1) {
  if (product.price == null) return 'Sob consulta'
  const value = brl.format(product.price * multiplier)
  return product.unit ? `${value} <small>/ ${escapeHtml(product.unit)}</small>` : value
}

function filtered() {
  const q = state.query.trim().toLowerCase()
  return products.filter((p) => {
    const inCategory = state.category === 'todos' || p.category === state.category
    const text = `${p.name} ${p.description ?? ''} ${categoryLabel(p.category)}`.toLowerCase()
    return inCategory && (!q || text.includes(q))
  })
}

function renderChips() {
  const all = [{ slug: 'todos', label: 'Todos' }, ...categories]
  $('[data-chips]').innerHTML = all
    .map((c) => {
      const count = c.slug === 'todos' ? products.length : products.filter((p) => p.category === c.slug).length
      const active = c.slug === state.category
      return `<button class="chip${active ? ' is-active' : ''}" role="tab" aria-selected="${active}" data-cat="${c.slug}">
        ${escapeHtml(c.label)}<span>${count}</span></button>`
    })
    .join('')
}

function renderGrid({ animate = false } = {}) {
  const list = filtered()
  const grid = $('[data-grid]')
  grid.innerHTML = list
    .map((p, i) => `
      <li class="card" style="view-transition-name: card-${p.id}">
        <button class="card__btn" type="button" data-open="${p.id}" aria-label="Ver detalhes de ${escapeHtml(p.name)}">
          <div class="card__media" data-media="${p.id}">
            ${p.tag ? `<span class="card__tag">${escapeHtml(p.tag)}</span>` : ''}
            ${mediaMarkup(p, i)}
          </div>
          <div class="card__info">
            <p class="card__cat">${escapeHtml(categoryLabel(p.category))}</p>
            <h3 class="card__name">${escapeHtml(p.name)}</h3>
            <p class="card__price">${p.sized && p.price != null ? '<small>a partir de</small> ' : ''}${priceText(p, p.sized ? sizes[0].multiplier : 1)}</p>
          </div>
          <span class="card__plus" aria-hidden="true">+</span>
        </button>
      </li>`)
    .join('')
  $('[data-empty]').hidden = list.length > 0
  $('[data-count]').textContent = `${list.length} ${list.length === 1 ? 'doce' : 'doces'}`
  const cards = $$('.card', grid)
  if (animate) cards.forEach((c) => c.classList.add('is-in'))
  else reveal(cards)
}

function initCatalog() {
  renderChips()
  renderGrid()

  $('[data-chips]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]')
    if (!chip || chip.dataset.cat === state.category) return
    state.category = chip.dataset.cat
    transition(() => {
      renderChips()
      renderGrid({ animate: true })
    })
  })

  let timer
  $('[data-search]').addEventListener('input', (e) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      state.query = e.target.value
      transition(() => renderGrid({ animate: true }))
    }, 160)
  })

  $('[data-grid]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]')
    if (btn) openModal(btn.dataset.open, btn)
  })
}

// ---------- Detalhe do produto ----------

const modal = $('[data-modal]')
let lastTrigger = null

function ctaHref(product, size) {
  const digits = (config.whatsapp ?? '').replace(/\D/g, '')
  if (!isPlaceholder(config.whatsapp) && digits.length >= 10) {
    const text = `Olá! Quero encomendar: ${product.name}${size ? ` (tamanho ${size})` : ''}.`
    return { href: `https://wa.me/${digits}?text=${encodeURIComponent(text)}`, label: 'Encomendar pelo WhatsApp' }
  }
  return { href: config.storeUrl, label: 'Encomendar na loja' }
}

function openModal(id, trigger) {
  const product = products.find((p) => p.id === id)
  if (!product) return
  lastTrigger = trigger
  const media = trigger.querySelector('[data-media]')

  const fill = () => {
    $('[data-modal-media]').innerHTML = mediaMarkup(product, products.indexOf(product))
    $('[data-modal-category]').textContent = categoryLabel(product.category)
    $('[data-modal-title]').textContent = product.name
    $('[data-modal-desc]').textContent = product.description ?? ''
    const sizesBox = $('[data-modal-sizes]')
    sizesBox.hidden = !product.sized
    let size = product.sized ? 'M' : null
    const update = () => {
      const mult = sizes.find((s) => s.label === size)?.multiplier ?? 1
      $('[data-modal-price]').innerHTML = priceText(product, mult)
      const cta = ctaHref(product, size)
      const link = $('[data-modal-cta]')
      link.href = cta.href
      link.textContent = cta.label
      $$('.size', sizesBox).forEach((b) => b.setAttribute('aria-checked', b.dataset.size === size))
    }
    sizesBox.innerHTML = sizes
      .map((s) => `<button type="button" class="size" role="radio" data-size="${s.label}">${s.label}</button>`)
      .join('')
    sizesBox.onclick = (e) => {
      const b = e.target.closest('[data-size]')
      if (!b) return
      size = b.dataset.size
      update()
    }
    update()
    modal.showModal()
    history.replaceState(null, '', `#produto-${product.id}`)
  }

  // A foto do card "voa" até o detalhe (elemento compartilhado entre os dois estados).
  if (reduced || !document.startViewTransition) return fill()
  media.style.viewTransitionName = 'product-media'
  const t = document.startViewTransition(() => {
    media.style.viewTransitionName = ''
    $('[data-modal-media]').style.viewTransitionName = 'product-media'
    fill()
  })
  t.finished.finally(() => ($('[data-modal-media]').style.viewTransitionName = ''))
}

function closeModal() {
  if (!modal.open) return
  const media = lastTrigger?.querySelector('[data-media]')
  const done = () => {
    modal.close()
    history.replaceState(null, '', location.pathname + location.search)
  }
  if (reduced || !document.startViewTransition || !media) return done()
  $('[data-modal-media]').style.viewTransitionName = 'product-media'
  const t = document.startViewTransition(() => {
    $('[data-modal-media]').style.viewTransitionName = ''
    media.style.viewTransitionName = 'product-media'
    done()
  })
  t.finished.finally(() => (media.style.viewTransitionName = ''))
}

function initModal() {
  $('[data-modal-close]').addEventListener('click', closeModal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal()
  })
  modal.addEventListener('cancel', (e) => {
    e.preventDefault()
    closeModal()
  })
  modal.addEventListener('close', () => lastTrigger?.focus({ preventScroll: true }))

  // Link direto para um produto: #produto-<id>
  const match = location.hash.match(/^#produto-(.+)$/)
  if (match) {
    const btn = $(`[data-open="${CSS.escape(match[1])}"]`)
    if (btn) {
      btn.scrollIntoView({ block: 'center' })
      openModal(match[1], btn)
    }
  }
}

// ---------- Rodapé ----------

function initFooter() {
  const links = [
    { label: 'Instagram', href: config.instagram },
    { label: 'WhatsApp', href: isPlaceholder(config.whatsapp) ? null : `https://wa.me/${config.whatsapp.replace(/\D/g, '')}` },
    { label: 'Loja online', href: config.storeUrl },
  ].filter((l) => !isPlaceholder(l.href))
  $('[data-contact]').innerHTML = links
    .map((l) => `<a href="${escapeHtml(l.href)}" target="_blank" rel="noopener">${l.label}</a>`)
    .join('')
  $('[data-year]').textContent = new Date().getFullYear()
}

initSplit($('[data-split]'))
initNav()
initWords()
initMarquee()
initCatalog()
initModal()
initFooter()
reveal($$('.step, .catalog__head, .steps__intro'))
