/* ================================================================
   BARBER CENTER ADEJE — main.js v3
   Guion inmersivo: exterior → walk-in → 6 estaciones → espejo zoom → tienda
   Stack: GSAP ScrollTrigger · Vanilla JS · Bilingüe ES/EN
================================================================ */
'use strict'

gsap.registerPlugin(ScrollTrigger)

/* ── Helpers ─────────────────────────────────────────── */
var $ = function (sel) { return document.querySelector(sel) }
var $$ = function (sel) { return document.querySelectorAll(sel) }

/* ── Enlaces oficiales del negocio ───────────────────── */
var BOOKSY = 'https://booksy.com/es-es/21867_barber-center_barberia_71070_adeje-casco'
var IG_URL = 'https://www.instagram.com/barbercentertnf/'

/* ── Estado global ───────────────────────────────────── */
var lang = 'es'
var barberos = []
var isZoomed = false
var isZooming = false

/* ── Fotos reales de los barberos (Booksy / CloudFront) ──
   Solo 3 disponibles por ahora; el resto cae al monograma.
   Recomendado: descargar estas imágenes y alojarlas en
   assets/img/ para no depender de CloudFront.            */
var BARBER_PHOTOS = {
  AG: 'https://d375139ucebi94.cloudfront.net/region2/es/21867/resource_photos/2fb8ab17a86f44818e6c26d662f7f613.jpeg',
  PM: 'https://d375139ucebi94.cloudfront.net/region2/es/21867/resource_photos/72c9d5ef1d3a4f7e9c2b8a6d4e5f1c20-pablo-martinez-booksy.jpeg',
  SG: 'https://d375139ucebi94.cloudfront.net/region2/es/21867/resource_photos/54dd1b1a9f8e4c2b7a6d5e4f3c2b1a09-samuel-garcia-booksy.jpeg'
}
function barberPhoto (id) {
  return BARBER_PHOTOS[id] || 'assets/img/barbero-' + id + '.jpg'
}

/* ── Fallback de barberos (si fetch falla) ───────────── */
var BARBEROS_FALLBACK = [
  { id:'AG', nombre:'Alejandro González', rol_es:'Fundador & Propietario', rol_en:'Founder & Owner',
    especialidades_es:['Modern Fade','Corte Clásico','Diseño de Barba'],
    especialidades_en:['Modern Fade','Classic Cut','Beard Design'],
    booksy:'https://booksy.com/es-es/dl/app' },
  { id:'AS', nombre:'Adrian Socas', rol_es:'Barba & Afeitado Navaja', rol_en:'Beard & Straight Razor',
    especialidades_es:['Afeitado a Navaja','Diseño de Barba','Fade'],
    especialidades_en:['Straight Razor Shave','Beard Design','Fade'],
    booksy:'https://booksy.com/es-es/dl/app' },
  { id:'OC', nombre:'Oliver Cano', rol_es:'Color & Tendencia', rol_en:'Color & Trend',
    especialidades_es:['Colorimetría','Mechas & Decoloración','Corte Moderno'],
    especialidades_en:['Colour','Highlights & Bleach','Modern Cut'],
    booksy:'https://booksy.com/es-es/dl/app' },
  { id:'PM', nombre:'Pablo Martínez', rol_es:'Fade & Textura', rol_en:'Fade & Texture',
    especialidades_es:['High Fade','Texturizado','Corte Uniforme'],
    especialidades_en:['High Fade','Texture','Uniform Cut'],
    booksy:'https://booksy.com/es-es/dl/app' },
  { id:'SG', nombre:'Samuel García', rol_es:'Corte & Estilo', rol_en:'Cut & Style',
    especialidades_es:['Degradado','Corte Signature','Corte Niños'],
    especialidades_en:['Fade','Signature Cut','Kids Cut'],
    booksy:'https://booksy.com/es-es/dl/app' },
  { id:'TA', nombre:'Tomy de Armas', rol_es:'Barbero Senior', rol_en:'Senior Barber',
    especialidades_es:['Corte Clásico','Afeitado Tradicional','Skin Fade'],
    especialidades_en:['Classic Cut','Traditional Shave','Skin Fade'],
    booksy:'https://booksy.com/es-es/dl/app' }
]

/* ================================================================
   BOOT
================================================================ */
async function boot () {
  /* Carga barberos */
  try {
    var res = await fetch('content/barberos.json')
    if (res.ok) barberos = await res.json()
    else barberos = BARBEROS_FALLBACK
  } catch (e) {
    barberos = BARBEROS_FALLBACK
  }

  buildStations()
  initScrollScene()
  initLang()
  initNav()
  initZoomClose()

  /* La tienda (carrusel + carrito) la gestiona shop.js */

  /* Carga servicios */
  try {
    var r3 = await fetch('content/servicios.json')
    if (r3.ok) buildServicios(await r3.json())
  } catch (e) {}
}

/* ================================================================
   CONSTRUIR LAS 6 ESTACIONES
================================================================ */
function buildStations () {
  var row = $('#stationsRow')
  if (!row) return
  row.innerHTML = ''

  barberos.forEach(function (b) {
    var el = document.createElement('div')
    el.className = 'team-card'
    el.dataset.id = b.id
    el.setAttribute('role', 'listitem')
    el.setAttribute('aria-label', b.nombre)

    el.innerHTML = stationHTML(b)
    row.appendChild(el)
  })
}

function stationHTML (b) {
  var photo = barberPhoto(b.id)
  var role  = lang === 'es' ? b.rol_es : b.rol_en

  return [
    /* Foto a sangre; si falta, queda el monograma de fondo */
    '<span class="team-photo">',
      '<img src="' + photo + '" alt="' + b.nombre + '" loading="lazy"',
        ' onerror="this.remove()">',
      '<span class="team-mono">' + b.id + '</span>',
    '</span>',

    /* Nombre + especialidad sobre degradado inferior */
    '<span class="team-meta">',
      '<span class="team-name">' + b.nombre + '</span>',
      '<span class="team-role" data-es="' + b.rol_es + '" data-en="' + b.rol_en + '">' +
        role + '</span>',
    '</span>'
  ].join('')
}

/* ================================================================
   SCROLL INMERSIVO — GSAP timeline de 5 fases
   Total: ~14.8 unidades, mapeadas a 720vh de scroll.

   Cada apartado tiene un "hold" amplio (~1.6 ud.) totalmente visible
   para que el scroll no se pase de largo. Además hacemos snap suave a
   cada fase, así siempre se aterriza en un apartado.

   Recorrido (el scroll = caminar hacia dentro del local):
     0    → 2.0   Clip-path se abre (exterior-pro.jpg)
     2.0  → 9.4   Pasillo / walk-in parallax (interior-pro.jpg)
       3.0 → 6.2  Panel PRECIOS  (hold 3.8 → 5.4)
       6.2 → 9.4  Panel CORTES   (hold 7.0 → 8.6)
     9.4  → 12.6  Estaciones (el equipo, hold 10.2 → 11.8)
     12.6 → 14.8  Tienda (productos, hold 13.4 → fin)
================================================================ */
function initScrollScene () {
  var entrance  = $('#entrance')
  var walkin    = $('#walkinLayer')
  var precios   = $('#preciosPanel')
  var cortes    = $('#cortesPanel')
  var stations  = $('#stationsLayer')
  var tienda    = $('#tiendaLayer')

  /* Estados iniciales controlados por JS */
  gsap.set(walkin,   { opacity: 0 })
  gsap.set(precios,  { opacity: 0, y: 20 })
  gsap.set(cortes,   { opacity: 0, y: 20 })
  gsap.set(stations, { opacity: 0, y: 22 })
  gsap.set(tienda,   { opacity: 0, y: 28 })

  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#sceneWrap',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      /* Snap suave: al soltar el scroll aterriza en el centro de cada
         apartado, así nunca se "pasa" una sección al ir despacio.   */
      snap: {
        snapTo: [0, 0.30, 0.52, 0.74, 0.90, 1],
        duration: { min: 0.2, max: 0.5 },
        delay: 0.08,
        ease: 'power1.inOut'
      },
      onUpdate: function (self) {
        updateProgressDots(self.progress)
      }
    }
  })

  /* ── Fase 0: Clip-path se abre (t: 0 → 2.0) ── */
  tl.fromTo('#clipWindow',
    {
      clipPath: 'polygon(38% 10%, 62% 10%, 62% 90%, 38% 90%)',
      backgroundSize: '155% auto'
    },
    {
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      backgroundSize: '108% auto',
      ease: 'none',
      duration: 2.0
    },
    0
  )

  /* Copy de entrada se desvanece mientras la ventana se abre */
  tl.fromTo('.entrance-copy',
    { opacity: 1, y: 0 },
    { opacity: 0, y: -14, ease: 'none', duration: 1.0 },
    1.0
  )

  /* ── Fase 1: Entras al pasillo (t: 2.0 → 9.4) ── */

  /* Cruce entrada → walk-in (fundidos solapados = sin frame negro).
     entrada: sólo se desvanece una vez → .to() simple (antes de su inicio
     mantiene opacity 1, que es justo lo que queremos al arrancar).        */
  tl.to(entrance, { opacity: 0, ease: 'none', duration: 0.8 }, 2.0)

  /* CLAVE anti-solape: cada capa que aparece-y-desaparece usa UN SOLO tween
     con keyframes (in → hold → out). Antes de su inicio se renderiza su
     valor inicial (opacity 0) y tras su fin el último keyframe (opacity 0),
     así NUNCA se ve a p=0 ni se mezcla con otra sección.                    */
  tl.to(walkin, {
    keyframes: [
      { opacity: 1, duration: 0.8, ease: 'none' },  /* in   2.0 → 2.8 */
      { opacity: 1, duration: 6.6, ease: 'none' },  /* hold 2.8 → 9.4 */
      { opacity: 0, duration: 0.8, ease: 'none' }   /* out  9.4 → 10.2 */
    ]
  }, 2.0)

  /* 3 capas a velocidades diferentes → sensación de avance por el pasillo */
  tl.fromTo('.wk-1',
    { yPercent: 14 },
    { yPercent: -9, ease: 'none', duration: 7.4, immediateRender: false },
    2.0
  )
  tl.fromTo('.wk-2',
    { yPercent: 28 },
    { yPercent: -24, ease: 'none', duration: 7.4, immediateRender: false },
    2.0
  )
  tl.fromTo('.wk-3',
    { yPercent: 48 },
    { yPercent: -42, ease: 'none', duration: 7.4, immediateRender: false },
    2.0
  )

  /* ── Panel PRECIOS sobre el pasillo (in 3.0 · hold · out 5.4) ── */
  tl.to(precios, {
    keyframes: [
      { opacity: 1, y: 0,   duration: 0.8, ease: 'none' },  /* in   3.0 → 3.8 */
      { opacity: 1, y: 0,   duration: 1.6, ease: 'none' },  /* hold 3.8 → 5.4 */
      { opacity: 0, y: -16, duration: 0.8, ease: 'none' }   /* out  5.4 → 6.2 */
    ]
  }, 3.0)

  /* ── Panel CORTES sobre el pasillo (in 6.2 · hold · out 8.6) ── */
  tl.to(cortes, {
    keyframes: [
      { opacity: 1, y: 0,   duration: 0.8, ease: 'none' },  /* in   6.2 → 7.0 */
      { opacity: 1, y: 0,   duration: 1.6, ease: 'none' },  /* hold 7.0 → 8.6 */
      { opacity: 0, y: -16, duration: 0.8, ease: 'none' }   /* out  8.6 → 9.4 */
    ]
  }, 6.2)

  /* ── Fase 2: Estaciones / el equipo (in 9.4 · hold · out 11.8) ── */
  tl.to(stations, {
    keyframes: [
      { opacity: 1, y: 0,   duration: 0.8, ease: 'none' },  /* in   9.4 → 10.2 */
      { opacity: 1, y: 0,   duration: 1.6, ease: 'none' },  /* hold 10.2 → 11.8 */
      { opacity: 0, y: -16, duration: 0.8, ease: 'none' }   /* out  11.8 → 12.6 */
    ]
  }, 9.4)

  /* ── Fase 3: Tienda / productos (in 11.8 · hold hasta el fin) ──
     Sólo aparece y se queda → .to() simple (antes de su inicio: opacity 0). */
  tl.to(tienda, { opacity: 1, y: 0, ease: 'none', duration: 0.8 }, 11.8)

  /* Colchón final para que el último apartado se mantenga visible */
  tl.to({}, { duration: 0.6 }, 14.2)

  /* Estado de punteros inicial (fase 0 = entrada) */
  setActivePhase(0)
}

/* ── Actualizar puntos de progreso lateral (5 fases) ── */
function updateProgressDots (p) {
  var dots = $$('.pdot')
  var phase = p < 0.20 ? 0
            : p < 0.40 ? 1
            : p < 0.61 ? 2
            : p < 0.83 ? 3
            : 4
  dots.forEach(function (d, i) {
    d.classList.toggle('active', i === phase)
  })
  setActivePhase(phase)
}

/* ── Habilitar punteros SOLO en la capa de la fase activa ──
   Las capas se solapan a pantalla completa con opacity:0; aunque
   no se vean, seguirían capturando el ratón y bloqueando el hover
   de las tarjetas. Activamos los punteros capa por capa.        */
var _lastPhase = -1
function setActivePhase (phase) {
  if (phase === _lastPhase) return
  _lastPhase = phase
  var precios  = $('#preciosPanel')
  var cortes   = $('#cortesPanel')
  var stations = $('#stationsLayer')
  var tienda   = $('#tiendaLayer')
  if (precios)  precios.style.pointerEvents  = (phase === 1) ? 'auto' : 'none'
  if (cortes)   cortes.style.pointerEvents   = (phase === 2) ? 'auto' : 'none'
  if (stations) stations.style.pointerEvents = (phase === 3) ? 'auto' : 'none'
  if (tienda)   tienda.style.pointerEvents   = (phase === 4) ? 'auto' : 'none'
}

/* ================================================================
   ZOOM DEL ESPEJO — Componente 5 adaptado a vanilla GSAP
   Al hacer click: el círculo del espejo escala hasta cubrir la pantalla.
   El contenido del barbero aparece dentro del "espejo expandido".
================================================================ */
function openZoom (barber, btn) {
  if (isZooming || isZoomed) return
  isZooming = true

  /* Posición de la tarjeta en pantalla (origen del zoom) */
  var mirrorEl = btn.querySelector('.team-photo') || btn
  var rect = mirrorEl.getBoundingClientRect()
  var cx   = rect.left + rect.width / 2
  var cy   = rect.top  + rect.height / 2
  var size = Math.max(rect.width, rect.height)  /* lado mayor de la tarjeta */

  /* Escala necesaria para cubrir toda la pantalla */
  var diag  = Math.hypot(window.innerWidth, window.innerHeight)
  var scale = (diag * 2.2) / size

  var zc      = $('#zoomCircle')
  var zContent = $('#zoomContent')

  /* Posicionar el zoom-circle exactamente sobre la tarjeta,
     con la foto del barbero como fondo del "espejo" */
  gsap.set(zc, {
    display:         'flex',
    width:           size,
    height:          size,
    left:            cx - size / 2,
    top:             cy - size / 2,
    scale:           1,
    opacity:         1,
    borderRadius:    '50%',
    backgroundImage: 'url(' + barberPhoto(barber.id) + ')',
    backgroundSize:  'cover',
    backgroundPosition: 'center'
  })

  /* Rellenar datos del barbero (oculto durante el zoom) */
  fillZoomContent(barber)
  gsap.set(zContent, { opacity: 0, y: 16 })

  /* Guardar referencia para cerrar */
  zc.dataset.barberName = barber.nombre

  /* Zoom del círculo hasta cubrir viewport */
  gsap.to(zc, {
    scale:    scale,
    duration: 0.72,
    ease:     'expo.inOut',
    onComplete: function () {
      isZooming = false
      isZoomed  = true
      zc.setAttribute('aria-hidden', 'false')
      /* Mostrar contenido del barbero */
      gsap.to(zContent, {
        opacity: 1,
        y: 0,
        duration: 0.38,
        ease: 'power2.out'
      })
    }
  })
}

function closeZoom () {
  if (isZooming || !isZoomed) return
  isZooming = true
  isZoomed  = false

  var zc      = $('#zoomCircle')
  var zContent = $('#zoomContent')

  /* Ocultar contenido, luego reducir el círculo */
  gsap.to(zContent, {
    opacity:  0,
    y:        -10,
    duration: 0.2,
    onComplete: function () {
      gsap.to(zc, {
        scale:    1,
        duration: 0.55,
        ease:     'expo.inOut',
        onComplete: function () {
          gsap.set(zc, { display: 'none' })
          zc.setAttribute('aria-hidden', 'true')
          isZooming = false
        }
      })
    }
  })
}

function fillZoomContent (b) {
  var isES = lang === 'es'

  $('#zoomRol').textContent = isES ? b.rol_es : b.rol_en
  $('#zoomName').textContent = b.nombre

  var specs = isES ? b.especialidades_es : b.especialidades_en
  $('#zoomSpecs').innerHTML = specs.map(function (s) {
    return '<li>' + s + '</li>'
  }).join('')

  /* Nombre de pila para el CTA */
  var first = b.nombre.split(' ')[0]
  var firstEl = $('#zoomFirstName')
  if (firstEl) firstEl.textContent = first

  /* Link Booksy */
  var booksyEl = $('#zoomBooksy')
  if (booksyEl && b.booksy) booksyEl.href = b.booksy

  /* Actualizar aria-label del CTA */
  if (booksyEl) {
    var pre = isES ? 'Reservar con ' : 'Book with '
    booksyEl.setAttribute('aria-label', pre + first)
  }
}

function initZoomClose () {
  var btn = $('#zoomClose')
  if (btn) btn.addEventListener('click', closeZoom)

  /* Tecla ESC */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isZoomed) closeZoom()
  })
}

/* ================================================================
   IDIOMA ES / EN
================================================================ */
function initLang () {
  var btn = $('#langBtn')
  if (!btn) return

  btn.addEventListener('click', function () {
    lang = lang === 'es' ? 'en' : 'es'
    btn.textContent = lang.toUpperCase()
    applyLang()

    /* Si hay zoom abierto, refrescar el contenido */
    if (isZoomed) {
      var barberName = $('#zoomCircle').dataset.barberName
      var barber = barberos.find(function (x) { return x.nombre === barberName })
      if (barber) fillZoomContent(barber)
    }
  })
}

function applyLang () {
  document.documentElement.lang = lang
  $$('[data-es]').forEach(function (el) {
    var val = lang === 'es' ? el.dataset.es : el.dataset.en
    if (val !== undefined) el.textContent = val
  })
}

/* ================================================================
   NAVEGACIÓN
================================================================ */
function initNav () {
  var menuBtn   = $('#menuBtn')
  var mobileNav = $('#mobileNav')
  var closeBtn  = $('#mobileNavClose')
  var menuOpen  = false

  function openMenu () {
    menuOpen = true
    menuBtn.setAttribute('aria-expanded', 'true')
    menuBtn.classList.add('open')
    mobileNav.classList.add('open')
    mobileNav.setAttribute('aria-hidden', 'false')
  }
  function closeMenu () {
    menuOpen = false
    menuBtn.setAttribute('aria-expanded', 'false')
    menuBtn.classList.remove('open')
    mobileNav.classList.remove('open')
    mobileNav.setAttribute('aria-hidden', 'true')
  }

  if (menuBtn) menuBtn.addEventListener('click', function () {
    menuOpen ? closeMenu() : openMenu()
  })
  if (closeBtn) closeBtn.addEventListener('click', closeMenu)

  /* Salta a una fracción del carril de la escena (0–1) */
  function scrollToScene (frac) {
    var wrap = $('#sceneWrap')
    if (!wrap) return
    var scrollable = wrap.offsetHeight - window.innerHeight
    window.scrollTo({ top: wrap.offsetTop + scrollable * frac, behavior: 'smooth' })
  }

  /* Links de nav / footer → saltan a la fase correspondiente de la escena */
  $$('[data-scene]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault()
      scrollToScene(parseFloat(a.dataset.scene) || 0)
      if (menuOpen) closeMenu()
    })
  })

  /* Puntos de progreso → saltar a fase */
  var pdotPositions = [0, 0.30, 0.52, 0.74, 0.90]
  $$('.pdot').forEach(function (dot) {
    dot.addEventListener('click', function () {
      var phase = parseInt(dot.dataset.phase, 10)
      scrollToScene(pdotPositions[phase] || 0)
    })
  })
}

/* ================================================================
   SERVICIOS — Grid de categorías + precios
================================================================ */
function buildServicios (data) {
  var grid = $('#serviciosGrid')
  if (!grid) return

  /* Acepta array o { grupos: [...] } */
  var grupos = Array.isArray(data) ? data : (data && data.grupos) || []
  if (!grupos.length) return

  grid.innerHTML = grupos.map(function (cat) {
    var catEs = cat.titulo_es || cat.categoria || ''
    var catEn = cat.titulo_en || catEs
    var lista = cat.items || cat.servicios || []

    var items = lista.map(function (s) {
      var nEs = s.nombre_es || s.nombre || ''
      var nEn = s.nombre_en || nEs
      var price = s.precio || ''
      return [
        '<div class="servicio-item">',
          '<span class="servicio-name" data-es="' + nEs + '" data-en="' + nEn + '">' + (lang === 'es' ? nEs : nEn) + '</span>',
          price ? '<span class="servicio-price">' + price + '</span>' : '',
        '</div>'
      ].join('')
    }).join('')

    return [
      '<div class="servicio-cat">',
        '<p class="servicio-cat-name" data-es="' + catEs + '" data-en="' + catEn + '">' + (lang === 'es' ? catEs : catEn) + '</p>',
        items,
      '</div>'
    ].join('')
  }).join('')
}

/* ── Arrancar todo ── */
boot()
