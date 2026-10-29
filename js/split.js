// Cena de abertura: o bem-casado é desembrulhado, racha e se parte ao meio conforme o scroll.
// Tudo é função do progresso (0 a 1), então rolar para cima desfaz a animação.

const SVG_NS = 'http://www.w3.org/2000/svg'

// Geometria do doce (vista 3/4): cilindro de raio R, topo em TOP_Y, altura H.
// A profundidade (eixo z, positivo = para perto de quem vê) é achatada por K na tela.
const CX = 400
const R = 160
const K = 0.375
const TOP_Y = 300
const H = 80

// Rachadura: deslocamentos laterais (px) ao longo do corte.
// No topo, u vai do fundo (0) à frente (1); na lateral, h vai do topo (0) à base (1).
const TOP_JAG = [[0, 2], [0.17, -9], [0.34, 10], [0.52, -7], [0.7, 11], [0.86, -5], [1, 3]]
const SIDE_JAG = [[0, 3], [0.25, -3], [0.5, 8], [0.75, -5], [1, 2]]

// Camadas do miolo, de cima (0) para baixo (1): calda, pão de ló, doce de leite, pão de ló, calda.
const LAYERS = [
  { from: 0, to: 0.07, fill: '#fbf6ea' },
  { from: 0.07, to: 0.44, fill: 'url(#pores)' },
  { from: 0.44, to: 0.58, fill: 'url(#caramel)' },
  { from: 0.58, to: 0.93, fill: 'url(#pores)' },
  { from: 0.93, to: 1, fill: '#f4ecdc' },
]

const MAX_GAP = 112
const MAX_TURN = (32 * Math.PI) / 180

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (p, a, b) => clamp((p - a) / (b - a))
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')

function el(tag, attrs, parent) {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  parent?.appendChild(node)
  return node
}

// Gerador pseudoaleatório com semente: as migalhas caem sempre do mesmo jeito.
function seeded(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

// Gira um ponto local (x, z) em torno do eixo vertical e projeta na tela.
// side = -1 (metade esquerda) ou 1 (direita); a face do corte gira em direção a quem vê.
function project(x, z, y, side, turn, shift, lift) {
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  const xr = side < 0 ? x * c - z * s : x * c + z * s
  const zr = side < 0 ? x * s + z * c : -x * s + z * c
  return [CX + xr + shift, y + K * zr - lift, zr]
}

// Linha do corte em coordenadas locais: topo do fundo à frente, depois descendo pela frente.
const cutTop = TOP_JAG.map(([u, off]) => [off, -R + 2 * R * u])
const cutSide = SIDE_JAG.map(([h, off]) => [off, h])

// Rachadura desenhada antes de partir (metades ainda juntas).
const CRACK = [
  ...cutTop.map(([x, z]) => [CX + x, TOP_Y + K * z]),
  ...cutSide.slice(1).map(([x, h]) => [CX + x, TOP_Y + K * R + H * h]),
]

export function initSplit(root) {
  const svg = root.querySelector('[data-split-art]')
  if (!svg) return

  const q = (s) => svg.querySelector(s)
  const whole = q('[data-whole]')
  const crack = q('[data-crack]')
  const strandsGroup = q('[data-strands]')
  const crumbsGroup = q('[data-crumbs]')
  const bow = q('[data-bow]')
  const paperBack = q('[data-paper-back]')
  const petals = {
    l: q('[data-petal="l"]'),
    r: q('[data-petal="r"]'),
    c: q('[data-petal="c"]'),
  }
  const shadow = q('[data-shadow]')
  const intro = root.querySelector('[data-split-intro]')
  const mid = root.querySelector('[data-split-mid]')
  const outro = root.querySelector('[data-split-outro]')
  const hint = root.querySelector('[data-split-hint]')
  const bar = root.querySelector('[data-split-bar]')

  crack.setAttribute('d', `M ${pts(CRACK)}`)
  const crackLen = crack.getTotalLength()
  crack.style.strokeDasharray = crackLen
  crack.style.strokeDashoffset = crackLen

  // Cada metade: lateral, topo, face do corte (camadas recortadas pelo contorno) e brilho.
  const halves = {}
  for (const name of ['left', 'right']) {
    const group = q(`[data-half="${name}"]`)
    const clipId = `face-clip-${name}`
    const clipShape = el('path', {}, el('clipPath', { id: clipId }, q('defs')))
    halves[name] = {
      group,
      side: el('path', { fill: 'url(#glazeSide)' }, group),
      seam: el('path', { fill: 'none', stroke: '#d9c9a8', 'stroke-width': 2, opacity: 0.7 }, group),
      top: el('path', { fill: 'url(#glazeTop)' }, group),
      gloss: el('path', { fill: 'none', stroke: '#fff', 'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.75 }, group),
      clipShape,
      layers: (() => {
        const face = el('g', { 'clip-path': `url(#${clipId})` }, group)
        return LAYERS.map((l) => el('path', { fill: l.fill }, face))
      })(),
      rim: el('path', { fill: 'none', stroke: '#fbf6ea', 'stroke-width': 1.6, 'stroke-linejoin': 'round', opacity: 0.9 }, group),
    }
  }

  function drawHalf(name, turn, shift, lift) {
    const sideSign = name === 'left' ? -1 : 1
    const h = halves[name]
    const P = (x, z, y) => project(x, z, y, sideSign, turn, shift, lift)

    // Arco externo: ângulos do círculo que pertencem a esta metade (frente -> fundo pelo lado de fora).
    const arc = []
    for (let i = 0; i <= 48; i++) {
      const a = Math.PI / 2 + (i / 48) * Math.PI
      const x = sideSign < 0 ? R * Math.cos(a) : -R * Math.cos(a)
      arc.push([x, R * Math.sin(a)])
    }

    // Topo: arco externo + corte em zigue-zague de volta à frente.
    const top = [...arc.map(([x, z]) => P(x, z, TOP_Y)), ...cutTop.map(([x, z]) => P(x, z, TOP_Y))]
    h.top.setAttribute('d', `M ${pts(top)} Z`)

    // Lateral visível: trecho do arco virado para quem vê (z > 0 depois do giro).
    const front = arc.map(([x, z]) => P(x, z, TOP_Y)).filter((p) => p[2] > -1)
    if (front.length > 1) {
      const bottom = front.map(([x, y]) => [x, y + H]).reverse()
      h.side.setAttribute('d', `M ${pts(front)} L ${pts(bottom)} Z`)
      h.seam.setAttribute('d', `M ${pts(front.map(([x, y]) => [x, y + H * 0.54]))}`)
    }

    // Brilho do topo, acompanhando o giro
    const g = [[-90, -40], [-40, -62], [30, -66]].map(([x, z]) => P(sideSign < 0 ? x : -x, z, TOP_Y))
    h.gloss.setAttribute('d', `M ${pts(g)}`)

    // Face do corte: plano vertical que contém a rachadura.
    const visible = Math.sin(turn) > 0.002
    h.layers.forEach((l) => l.setAttribute('visibility', visible ? 'visible' : 'hidden'))
    h.rim.setAttribute('visibility', visible ? 'visible' : 'hidden')
    if (!visible) return

    const topEdge = cutTop.map(([x, z]) => P(x, z, TOP_Y))
    const frontEdge = cutSide.map(([x, hh]) => P(x, R, TOP_Y + H * hh))
    const back = P(cutTop[0][0], -R, TOP_Y + H)
    const outline = [...topEdge, ...frontEdge.slice(1), back]
    h.clipShape.setAttribute('d', `M ${pts(outline)} Z`)
    h.rim.setAttribute('d', `M ${pts(topEdge)}`)

    // Camadas: faixas entre o fundo e a frente do corte, na mesma altura relativa.
    const b0 = P(0, -R, TOP_Y)
    const f0 = P(0, R, TOP_Y)
    const at = (p, t) => [p[0], p[1] + H * t]
    const pad = 14
    LAYERS.forEach((l, i) => {
      const quad = [at(b0, l.from - (i === 0 ? pad / H : 0)), at(f0, l.from - (i === 0 ? pad / H : 0)), at(f0, l.to), at(b0, l.to)]
      h.layers[i].setAttribute('d', `M ${pts(quad)} Z`)
    })
  }

  // Fios de doce de leite que esticam entre as metades até arrebentar.
  const strands = [
    { z: 52, snap: 0.42, width: 7 },
    { z: 0, snap: 0.64, width: 9 },
    { z: -48, snap: 0.86, width: 6 },
  ].map((s) => ({ ...s, path: el('path', {}, strandsGroup) }))

  function drawStrands(turn, gap, lift, k) {
    const y = TOP_Y + H * 0.51
    strands.forEach((s) => {
      const [xL, yL] = project(0, s.z, y, -1, turn, -gap, 0)
      const [xR, yR] = project(0, s.z, y, 1, turn, gap, lift)
      if (k <= 0 || gap < 1) {
        s.path.setAttribute('d', '')
        return
      }
      if (k < s.snap) {
        const stretch = k / s.snap
        const sag = 6 + 40 * stretch
        s.path.setAttribute('d', `M ${xL} ${yL} Q ${(xL + xR) / 2} ${(yL + yR) / 2 + sag} ${xR} ${yR}`)
        s.path.setAttribute('stroke-width', (s.width * (1 - stretch * 0.8)).toFixed(2))
      } else {
        // Arrebentou: duas pontas que pendem e encolhem de volta para o miolo.
        const len = 30 * (1 - clamp((k - s.snap) / 0.25))
        if (len < 0.5) {
          s.path.setAttribute('d', '')
          return
        }
        s.path.setAttribute(
          'd',
          `M ${xL} ${yL} Q ${xL + len * 0.6} ${yL + len * 0.4} ${xL + len * 0.35} ${yL + len}` +
            ` M ${xR} ${yR} Q ${xR - len * 0.6} ${yR + len * 0.4} ${xR - len * 0.35} ${yR + len}`
        )
        s.path.setAttribute('stroke-width', (s.width * 0.32).toFixed(2))
      }
    })
  }

  // Migalhas e açúcar: posição calculada a partir do tempo desde a quebra.
  const rand = seeded(7)
  const crumbs = Array.from({ length: 56 }, (_, i) => {
    const [ox, oy] = CRACK[Math.floor(rand() * CRACK.length)]
    const sugar = i % 4 === 0
    const dir = rand() < 0.5 ? -1 : 1
    const size = sugar ? 1 + rand() * 1.4 : 2.2 + rand() * 4.2
    const fill = sugar ? '#ffffff' : rand() < 0.3 ? '#fbf6ea' : rand() < 0.6 ? '#e8bf78' : '#d9a85c'
    const shape = sugar
      ? el('circle', { r: size, fill }, crumbsGroup)
      : el('path', {
          d: `M ${-size} ${-size * 0.4} L ${size * 0.2} ${-size} L ${size} ${size * 0.1} L ${-size * 0.1} ${size} Z`,
          fill,
        }, crumbsGroup)
    return {
      shape,
      ox,
      oy,
      vx: dir * (40 + rand() * 230),
      vy: -(50 + rand() * 210),
      g: sugar ? 60 + rand() * 60 : 520 + rand() * 260,
      floor: 452 + rand() * 46,
      spin: (rand() - 0.5) * 900,
      sugar,
    }
  })

  function drawCrumbs(t, gap) {
    crumbs.forEach((c) => {
      if (t <= 0) {
        c.shape.setAttribute('opacity', 0)
        return
      }
      const side = c.vx < 0 ? -1 : 1
      const x = c.ox + c.vx * t + side * gap * 0.6
      let y = c.oy + c.vy * t + c.g * t * t
      if (!c.sugar && y > c.floor) y = c.floor
      const fade = c.sugar ? clamp(1 - t * 0.9) : clamp(1.6 - t * 0.5)
      const spin = c.spin * Math.min(t, (c.floor - c.oy) / 400)
      c.shape.setAttribute('opacity', fade.toFixed(2))
      c.shape.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${spin.toFixed(0)})`)
    })
  }

  function setLayer(node, opacity, y) {
    node.style.opacity = opacity.toFixed(3)
    node.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
    node.style.visibility = opacity < 0.01 ? 'hidden' : 'visible'
  }

  function render(p) {
    // 1. Desembrulhar: laço sobe, pétalas de papel abrem e caem.
    const u = easeInOut(seg(p, 0.06, 0.32))
    const ub = easeOut(seg(p, 0.05, 0.2))
    bow.setAttribute('transform', `translate(0 ${-150 * ub}) rotate(${-18 * ub} 400 268)`)
    bow.setAttribute('opacity', (1 - seg(p, 0.12, 0.2)).toFixed(2))
    petals.l.setAttribute('transform', `rotate(${-78 * u} 226 404) translate(${-30 * u} ${40 * u})`)
    petals.r.setAttribute('transform', `rotate(${78 * u} 574 404) translate(${30 * u} ${40 * u})`)
    petals.c.setAttribute('transform', `translate(0 ${180 * u})`)
    const paperFade = (1 - seg(p, 0.18, 0.32)).toFixed(2)
    for (const k of ['l', 'r', 'c']) petals[k].setAttribute('opacity', paperFade)
    paperBack.setAttribute('transform', `translate(400 ${400 + 60 * u}) scale(1 ${1 - 0.3 * u}) translate(-400 -400)`)
    paperBack.setAttribute('opacity', paperFade)

    // 2. Rachar: a linha corre pelo doce, que treme de leve.
    const c = seg(p, 0.34, 0.46)
    crack.style.strokeDashoffset = crackLen * (1 - c)

    // 3. Partir: metades se afastam girando, o miolo aparece, doce de leite estica, migalhas voam.
    const s = easeInOut(seg(p, 0.46, 0.8))
    const split = s > 0
    const shake = c > 0 && !split ? Math.sin(p * 900) * 1.6 * c : 0
    // O afastamento anda à frente do giro para as metades nunca se cruzarem.
    const gap = MAX_GAP * easeOut(s)
    const turn = MAX_TURN * s
    const lift = 10 * s
    whole.setAttribute('visibility', split ? 'hidden' : 'visible')
    whole.setAttribute('transform', `translate(${shake} 0)`)
    crack.setAttribute('opacity', split ? 0 : 1)
    crack.setAttribute('transform', `translate(${shake} 0)`)
    for (const name of ['left', 'right']) halves[name].group.setAttribute('visibility', split ? 'visible' : 'hidden')
    if (split) {
      drawHalf('left', turn, -gap, 0)
      drawHalf('right', turn, gap, lift)
    }
    drawStrands(turn, gap, lift, seg(p, 0.46, 0.7))
    drawCrumbs(seg(p, 0.45, 1) * 1.8, gap)
    shadow.setAttribute('rx', (190 + gap * 1.1).toFixed(1))

    // Textos e indicadores
    setLayer(intro, 1 - seg(p, 0.03, 0.14), -40 * seg(p, 0.03, 0.14))
    setLayer(mid, seg(p, 0.22, 0.3) * (1 - seg(p, 0.42, 0.5)), 30 * (1 - seg(p, 0.22, 0.3)) - 30 * seg(p, 0.42, 0.5))
    setLayer(outro, seg(p, 0.8, 0.92), 30 * (1 - seg(p, 0.8, 0.92)))
    outro.inert = p < 0.85
    hint.style.opacity = 1 - seg(p, 0, 0.04)
    bar.style.transform = `scaleX(${p})`
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (reduced.matches) {
    root.classList.add('split--static')
    render(1)
    return
  }

  // Progresso suavizado: o alvo vem do scroll, o valor desenhado persegue o alvo.
  let target = 0
  let current = 0
  let raf = 0

  function measure() {
    const rect = root.getBoundingClientRect()
    const range = rect.height - window.innerHeight
    target = range > 0 ? clamp(-rect.top / range) : 0
  }

  function tick() {
    current += (target - current) * 0.14
    if (Math.abs(target - current) < 0.0005) current = target
    render(current)
    raf = current === target ? 0 : requestAnimationFrame(tick)
  }

  function onScroll() {
    measure()
    if (!raf) raf = requestAnimationFrame(tick)
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  measure()
  current = target
  render(current)
}
