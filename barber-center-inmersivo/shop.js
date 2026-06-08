/* ================================================================
   BARBER CENTER — shop.js
   Catálogo + carrito compartido entre la portada (carrusel con
   scroll-movement) y la página tienda.html (rejilla + filtros).
   Vanilla JS, sin build. Carrito demo en localStorage.
================================================================ */
(function () {
  'use strict'

  var $  = function (s, c) { return (c || document).querySelector(s) }
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)) }

  function esc (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
  function curLang () { return document.documentElement.lang === 'en' ? 'en' : 'es' }

  var CART_KEY = 'barber_cart', SHIP = 4.90, FREE_FROM = 30
  var CATALOG = {}, DATA = []

  function price (p) { return parseFloat(p && p.precio) || 0 }
  function fmt (n) { return n.toFixed(2).replace('.', ',') + ' €' }
  function pname (p, l) { return (l === 'en' ? p.nombre_en : p.nombre_es) || p.nombre_es || '' }

  /* Tarjeta de producto (portada + página) */
  function cardHTML (p) {
    var nEs = esc(p.nombre_es || ''), nEn = esc(p.nombre_en || p.nombre_es || '')
    var dEs = esc(p.desc_es || ''), dEn = esc(p.desc_en || p.desc_es || '')
    var cat = p.categoria ? '<span class="product-cat">' + esc(p.categoria) + '</span>' : ''
    return '<article class="product-card">' +
      '<div class="product-media">' + cat +
        '<img src="' + esc(p.foto) + '" alt="' + nEs + '" loading="lazy" ' +
        'onerror="this.src=\'assets/img/groom.webp\'"></div>' +
      '<div class="product-body">' +
        '<h3 class="product-name" data-es="' + nEs + '" data-en="' + nEn + '">' + nEs + '</h3>' +
        '<p class="product-desc" data-es="' + dEs + '" data-en="' + dEn + '">' + dEs + '</p>' +
        '<div class="product-foot">' +
          '<span class="product-price">' + esc(fmt(price(p))) + '</span>' +
          '<button type="button" class="product-add" data-id="' + esc(p.id) + '" ' +
            'data-es="Añadir" data-en="Add">Añadir</button>' +
        '</div>' +
      '</div></article>'
  }

  function localize (scope) {
    var l = curLang()
    $$('[data-es]', scope).forEach(function (el) {
      var v = el.getAttribute(l === 'en' ? 'data-en' : 'data-es')
      if (v != null) el.textContent = v
    })
    $$('[data-es-ph]', scope).forEach(function (el) {
      var v = el.getAttribute(l === 'en' ? 'data-en-ph' : 'data-es-ph')
      if (v != null) el.setAttribute('placeholder', v)
    })
  }

  /* ---------------- CARRITO ---------------- */
  function load () { try { return JSON.parse(localStorage.getItem(CART_KEY)) || [] } catch (e) { return [] } }
  function persist () { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch (e) {} }
  var cart = load()

  var countEl, drawer, overlay, closeBtn, itemsEl, emptyEl, footEl,
      subEl, shipEl, totEl, checkoutBtn

  function count () { return cart.reduce(function (n, it) { return n + it.qty }, 0) }
  function subtotal () { return cart.reduce(function (s, it) { return s + price(CATALOG[it.id]) * it.qty }, 0) }
  function delivery () { var r = $('input[name="entrega"]:checked'); return r ? r.value : 'pickup' }
  function shipCost () { if (delivery() !== 'delivery') return 0; return subtotal() >= FREE_FROM ? 0 : SHIP }

  function updateBadge () {
    var n = count()
    $$('.cart-count').forEach(function (el) {
      el.textContent = String(n)
      el.setAttribute('data-count', String(n))
    })
  }

  function renderCart () {
    var l = curLang()
    if (!itemsEl) { updateBadge(); return }
    if (!cart.length) {
      itemsEl.innerHTML = ''
      if (emptyEl) emptyEl.hidden = false
      if (footEl) footEl.hidden = true
    } else {
      if (emptyEl) emptyEl.hidden = true
      if (footEl) footEl.hidden = false
      itemsEl.innerHTML = cart.map(function (it) {
        var p = CATALOG[it.id]; if (!p) return ''
        return '<div class="cart-line" data-id="' + esc(it.id) + '">' +
          '<img src="' + esc(p.foto) + '" alt="">' +
          '<div class="cart-line-main">' +
            '<div class="cart-line-name">' + esc(pname(p, l)) + '</div>' +
            '<div class="cart-line-price">' + esc(fmt(price(p))) + '</div>' +
            '<div class="cart-qty"><button type="button" data-act="dec" aria-label="-">&minus;</button>' +
              '<span>' + it.qty + '</span><button type="button" data-act="inc" aria-label="+">+</button></div>' +
            '<button type="button" class="cart-line-remove" data-act="rm">' +
              (l === 'en' ? 'Remove' : 'Quitar') + '</button>' +
          '</div>' +
          '<div class="cart-line-sum">' + esc(fmt(price(p) * it.qty)) + '</div>' +
        '</div>'
      }).join('')
      var sub = subtotal(), sh = shipCost()
      if (subEl) subEl.textContent = fmt(sub)
      if (shipEl) shipEl.textContent = sh === 0 ? (l === 'en' ? 'Gratis' : 'Gratis') : fmt(sh)
      if (totEl) totEl.textContent = fmt(sub + sh)
    }
    updateBadge()
  }

  function add (id) {
    var found = cart.filter(function (it) { return it.id === id })[0]
    if (found) found.qty += 1; else cart.push({ id: id, qty: 1 })
    persist(); renderCart(); openCart()
  }
  function setQty (id, delta) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id) { cart[i].qty += delta; if (cart[i].qty <= 0) cart.splice(i, 1); break }
    }
    persist(); renderCart()
  }
  function remove (id) { cart = cart.filter(function (it) { return it.id !== id }); persist(); renderCart() }

  function openCart () {
    if (!drawer) return
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false')
    if (overlay) { overlay.hidden = false; requestAnimationFrame(function () { overlay.classList.add('is-open') }) }
  }
  function closeCart () {
    if (!drawer) return
    drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true')
    if (overlay) { overlay.classList.remove('is-open'); setTimeout(function () { overlay.hidden = true }, 320) }
  }

  function wireCart () {
    countEl = $('.cart-count'); drawer = $('#cartDrawer'); overlay = $('#cartOverlay')
    closeBtn = $('#cartClose'); itemsEl = $('#cartItems'); emptyEl = $('#cartEmpty')
    footEl = $('#cartFoot'); subEl = $('#cartSubtotal'); shipEl = $('#cartShipping')
    totEl = $('#cartTotal'); checkoutBtn = $('#cartCheckout')

    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.product-add'); if (!b) return
      add(b.getAttribute('data-id'))
      b.classList.add('is-added')
      setTimeout(function () { b.classList.remove('is-added') }, 600)
    })
    if (itemsEl) itemsEl.addEventListener('click', function (e) {
      var line = e.target.closest && e.target.closest('.cart-line'); if (!line) return
      var id = line.getAttribute('data-id')
      var act = e.target.getAttribute('data-act')
      if (act === 'inc') setQty(id, 1)
      else if (act === 'dec') setQty(id, -1)
      else if (act === 'rm') remove(id)
    })
    $$('.cart-btn').forEach(function (b) { b.addEventListener('click', openCart) })
    if (closeBtn) closeBtn.addEventListener('click', closeCart)
    if (overlay) overlay.addEventListener('click', closeCart)
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart() })
    $$('input[name="entrega"]').forEach(function (r) { r.addEventListener('change', renderCart) })
    if (checkoutBtn) checkoutBtn.addEventListener('click', function () {
      var l = curLang()
      window.alert(l === 'en'
        ? 'Demo: here the Snipcart / Stripe checkout would open.'
        : 'Demo: aquí se abriría el pago con Snipcart / Stripe.')
    })
  }

  /* ---------------- PORTADA: carrusel con scroll-movement ---------------- */
  function wireCarousel (track) {
    var prev = $('#shopPrev'), next = $('#shopNext')
    function stepBy () {
      var card = track.querySelector('.product-card')
      var w = card ? card.getBoundingClientRect().width : 240
      return (w + 18) * 1.15
    }
    function updateArrows () {
      var max = track.scrollWidth - track.clientWidth - 2
      if (prev) prev.disabled = track.scrollLeft <= 2
      if (next) next.disabled = track.scrollLeft >= max
    }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -stepBy(), behavior: 'smooth' }) })
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: stepBy(), behavior: 'smooth' }) })
    track.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)

    /* arrastrar con el ratón / dedo */
    var down = false, startX = 0, startScroll = 0, moved = false
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      down = true; moved = false; startX = e.clientX; startScroll = track.scrollLeft
      track.classList.add('is-grabbing')
    })
    track.addEventListener('pointermove', function (e) {
      if (!down) return
      var dx = e.clientX - startX
      if (Math.abs(dx) > 4) moved = true
      track.scrollLeft = startScroll - dx
    })
    function endDrag () { down = false; track.classList.remove('is-grabbing') }
    track.addEventListener('pointerup', endDrag)
    track.addEventListener('pointerleave', endDrag)
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation() } }, true)
    setTimeout(updateArrows, 60)
  }

  /* ---------------- TIENDA.HTML: buscador + categorías + orden ---------------- */
  function renderPage (pageGrid) {
    var searchEl = $('#shopSearch'), chipsEl = $('#shopChips'),
        sortEl = $('#shopSort'), countEl2 = $('#shopCount')
    var state = { q: '', cat: 'all', sort: 'default' }

    if (chipsEl) {
      var cats = []
      DATA.forEach(function (p) { if (p.categoria && cats.indexOf(p.categoria) < 0) cats.push(p.categoria) })
      chipsEl.innerHTML =
        '<button type="button" class="shop-chip is-active" data-cat="all" data-es="Todos" data-en="All">Todos</button>' +
        cats.map(function (c) { return '<button type="button" class="shop-chip" data-cat="' + esc(c) + '">' + esc(c) + '</button>' }).join('')
    }

    function matches (p) {
      if (state.cat !== 'all' && p.categoria !== state.cat) return false
      if (state.q) {
        var hay = ((p.nombre_es || '') + ' ' + (p.nombre_en || '') + ' ' + (p.categoria || '') + ' ' +
                   (p.desc_es || '') + ' ' + (p.desc_en || '')).toLowerCase()
        if (hay.indexOf(state.q) < 0) return false
      }
      return true
    }
    function sorter (a, b) {
      if (state.sort === 'price-asc') return price(a) - price(b)
      if (state.sort === 'price-desc') return price(b) - price(a)
      if (state.sort === 'name') return pname(a, curLang()).localeCompare(pname(b, curLang()))
      return 0
    }
    function draw () {
      var list = DATA.filter(matches).slice().sort(sorter)
      var l = curLang()
      if (list.length) pageGrid.innerHTML = list.map(cardHTML).join('')
      else pageGrid.innerHTML = '<p class="shop-noresults" data-es="No encontramos productos. Prueba con otra búsqueda o categoría." data-en="No products found. Try another search or category.">No encontramos productos.</p>'
      localize(pageGrid)
      if (countEl2) {
        var n = list.length
        countEl2.textContent = n + ' ' + (l === 'en' ? (n === 1 ? 'product' : 'products') : (n === 1 ? 'producto' : 'productos'))
      }
    }

    if (searchEl) searchEl.addEventListener('input', function () { state.q = searchEl.value.trim().toLowerCase(); draw() })
    if (chipsEl) chipsEl.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.shop-chip'); if (!b) return
      state.cat = b.getAttribute('data-cat')
      $$('.shop-chip', chipsEl).forEach(function (c) { c.classList.toggle('is-active', c === b) })
      draw()
    })
    if (sortEl) sortEl.addEventListener('change', function () { state.sort = sortEl.value; draw() })

    draw()
    SHOP_REDRAW = draw
  }
  var SHOP_REDRAW = null

  /* ---------------- IDIOMA (sólo si NO hay main.js de la escena) ---------------- */
  function standaloneLang () {
    var KEY = 'barber_lang'
    var btn = $('#langBtn')
    function apply (l) {
      document.documentElement.lang = l
      localize(document)
      if (btn) btn.textContent = l.toUpperCase()
      try { localStorage.setItem(KEY, l) } catch (e) {}
    }
    var saved
    try { saved = localStorage.getItem(KEY) } catch (e) {}
    apply(saved === 'en' ? 'en' : 'es')
    if (btn) btn.addEventListener('click', function () {
      apply(document.documentElement.lang === 'en' ? 'es' : 'en')
      renderCart(); if (SHOP_REDRAW) SHOP_REDRAW()
    })
  }

  /* En la portada inmersiva manda main.js: sólo re-localizamos lo dinámico */
  function hookLangToMain () {
    var btn = $('#langBtn')
    if (!btn) return
    btn.addEventListener('click', function () {
      setTimeout(function () { renderCart(); if (SHOP_REDRAW) SHOP_REDRAW(); localize(document) }, 0)
    })
  }

  /* ---------------- INIT ---------------- */
  function init () {
    DATA.forEach(function (p) { CATALOG[p.id] = p })
    wireCart()

    var track = $('#tiendaGrid')
    if (track) {
      track.innerHTML = DATA.map(cardHTML).join('')
      localize(track)
      wireCarousel(track)
    }

    var pageGrid = $('#shopAll')
    if (pageGrid) renderPage(pageGrid)

    if (document.getElementById('sceneWrap')) hookLangToMain()  /* portada inmersiva */
    else standaloneLang()                                        /* tienda.html */

    renderCart()
  }

  function boot () {
    fetch('content/productos.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (json) {
        DATA = (json && json.productos) || (Array.isArray(json) ? json : [])
        init()
      })
      .catch(function () { DATA = []; init() })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()
