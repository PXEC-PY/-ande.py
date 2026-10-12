/* =========================================================
   Ñande.py — Lógica del sitio (JavaScript vanilla)
   1. Configuración
   2. Navegación (menú móvil, header al hacer scroll, link activo)
   3. Configurador de pizarra (vista previa en tiempo real)
   4. Pedido por WhatsApp
   5. Galería (aparición al hacer scroll + visor de fotos)
   ========================================================= */

/* ---------- 1. Configuración ---------- */

// Número de WhatsApp en formato internacional, sin "+", espacios ni guiones.
// Ej. Paraguay: "595981123456". Si queda vacío, WhatsApp pedirá elegir el contacto.
const WHATSAPP_NUMBER = '';

// Texto y decoración de cada temática. "example" se muestra cuando los campos están vacíos.
const THEMES = {
  cumple: {
    label: 'Cumpleaños / Anniversary',
    title: '¡Feliz Cumple!',
    decoTop: '🎈 ✨ 🎈',
    decoBottom: '🎂',
    example: { name: 'Fati', sub: 'Mis 20s' },
  },
  grado: {
    label: 'Entrega de Título / Grado',
    title: '¡Felicidades, Graduados!',
    decoTop: '🎓 ⭐ 🎓',
    decoBottom: '📜',
    example: { name: 'Andrea & Gabriela', sub: '¡Lo lograron!' },
  },
  disco: {
    label: 'Disco / Fiesta / Bienvenida',
    title: 'Bienvenidos',
    decoTop: '🪩 🎶 🪩',
    decoBottom: '🥂',
    example: { name: "Mica's 25th", sub: 'Buen Viaje' },
  },
  club: {
    label: 'Club / Evento Deportivo',
    title: '¡Vamos, Campeones!',
    decoTop: '⚽ 🏆 ⚽',
    decoBottom: '🥇',
    example: { name: 'Club Los Pumas', sub: 'Torneo 2026' },
  },
  boda: {
    label: 'Boda / Evento Especial',
    title: 'Bienvenidos a nuestra boda',
    decoTop: '🌿 💍 🌿',
    decoBottom: '🤍',
    example: { name: 'Ana & Luis', sub: '15.10.2026' },
  },
};

const FONTS = {
  chalk: 'Artesanal / Tiza',
  script: 'Cursiva Elegante',
  neon: 'Moderna / Neón',
};

/* Utilidad: atajo para querySelector */
const $ = (sel, ctx = document) => ctx.querySelector(sel);

/* ---------- 2. Navegación ---------- */
(function initNav() {
  const header = $('#header');
  const toggle = $('#navToggle');
  const nav = $('#nav');
  const links = [...nav.querySelectorAll('.nav__link')];

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  links.forEach((link) => link.addEventListener('click', () => setOpen(false)));

  // Cerrar el menú al tocar fuera o con Escape
  document.addEventListener('click', (e) => {
    if (!header.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  // Fondo del header al hacer scroll
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Resalta el link de la sección visible
  const sections = links.map((l) => $(l.getAttribute('href'))).filter(Boolean);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${entry.target.id}`));
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((s) => observer.observe(s));

  $('#year').textContent = new Date().getFullYear();
})();

/* ---------- 3. Configurador de pizarra ---------- */
const form = $('#boardForm');
const sizeSelect = $('#size');
const mainInput = $('#mainText');
const subInput = $('#subText');

const stage = $('#stage');
const board = $('#board');
const frame = $('#boardFrame');
const surface = $('#boardSurface');

const ui = {
  theme: $('#previewTheme'),
  name: $('#previewName'),
  sub: $('#previewSub'),
  decoTop: $('#decoTop'),
  decoBottom: $('#decoBottom'),
  meta: $('#previewMeta'),
  sizeHint: $('#sizeHint'),
  mainCount: $('#mainCount'),
  subCount: $('#subCount'),
  mainError: $('#mainError'),
};

/** Lee el estado actual del formulario. */
function getState() {
  const opt = sizeSelect.selectedOptions[0];
  return {
    sizeLabel: opt.textContent.trim(),
    structure: opt.parentElement.label,           // nombre del <optgroup>
    frame: opt.dataset.frame,                      // wood | black
    stand: opt.dataset.stand,                      // easel | hanging | giant
    h: Number(opt.dataset.h),                      // alto en cm
    w: Number(opt.dataset.w),                      // ancho en cm
    theme: form.elements.theme.value,
    font: form.elements.font.value,
    name: mainInput.value.trim(),
    sub: subInput.value.trim(),
  };
}

/** Calcula el tamaño de la pizarra en pantalla respetando la proporción real. */
function layoutBoard() {
  const { h, w } = getState();
  const cs = getComputedStyle(stage);
  const availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);

  // Espacio que ocupan la cuerda o las patas (no es parte del marco)
  const extras = board.offsetHeight - frame.offsetHeight;
  const maxW = availW * 0.92;
  const maxH = (availH - extras) * 0.97;

  // Las pizarras más chicas se ven un poco más chicas (sensación de escala real)
  const relative = w > h ? 1 : 0.82 + 0.18 * (h / 175);

  const scale = Math.min(maxW / w, maxH / h) * relative;
  frame.style.width = `${Math.round(w * scale)}px`;
  frame.style.height = `${Math.round(h * scale)}px`;
}

/** Achica el texto (variable --k) hasta que todo entre dentro de la pizarra. */
function fitText() {
  let k = 1;
  board.classList.remove('is-tight');
  board.style.setProperty('--k', k);

  const overflows = () =>
    surface.scrollHeight > surface.clientHeight + 1 ||
    [ui.theme, ui.name, ui.sub].some((el) => el.scrollWidth > el.clientWidth + 1);

  while (overflows() && k > 0.4) {
    k = Math.round((k - 0.05) * 100) / 100;
    board.style.setProperty('--k', k);
  }
  if (overflows()) board.classList.add('is-tight');
}

/** Pequeña animación "de tiza" al cambiar opciones (no al tipear). */
function flash() {
  board.classList.remove('is-changing');
  void board.offsetWidth; // reinicia la animación
  board.classList.add('is-changing');
}

/** Actualiza toda la vista previa a partir del formulario. */
function render() {
  const s = getState();
  const theme = THEMES[s.theme];

  // Marco, estructura, temática y tipografía
  board.dataset.frame = s.frame;
  board.dataset.stand = s.stand;
  board.dataset.theme = s.theme;
  board.dataset.font = s.font;

  // Textos: si el campo está vacío se muestra un ejemplo atenuado
  ui.theme.textContent = theme.title;
  ui.decoTop.textContent = theme.decoTop;
  ui.decoBottom.textContent = theme.decoBottom;
  ui.name.textContent = s.name || theme.example.name;
  ui.sub.textContent = s.sub || theme.example.sub;
  board.classList.toggle('is-placeholder', !s.name);
  board.classList.toggle('is-placeholder-sub', !s.sub);

  // Ejemplos del formulario acordes a la temática
  mainInput.placeholder = `Ej: ${theme.example.name}`;
  subInput.placeholder = `Ej: ${theme.example.sub}`;

  // Datos informativos
  ui.meta.textContent = `${s.structure} · ${s.sizeLabel}`;
  ui.sizeHint.textContent = s.structure;
  ui.mainCount.textContent = mainInput.value.length;
  ui.subCount.textContent = subInput.value.length;

  layoutBoard();
  fitText();
}

// Cambios de selección → render + animación; escritura → render en tiempo real
form.addEventListener('change', (e) => {
  if (e.target.matches('select, input[type="radio"]')) {
    render();
    flash();
  }
});
form.addEventListener('input', (e) => {
  if (e.target === mainInput && mainInput.value.trim()) {
    mainInput.removeAttribute('aria-invalid');
    ui.mainError.hidden = true;
  }
  render();
});

// Recalcular al cambiar el tamaño de pantalla / rotar el dispositivo
let resizeFrame;
new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    layoutBoard();
    fitText();
  });
}).observe(stage);

// El marco anima su tamaño: al terminar, se reajusta el texto a la medida final
frame.addEventListener('transitionend', (e) => {
  if (e.target === frame && (e.propertyName === 'width' || e.propertyName === 'height')) fitText();
});

// Recalcular cuando terminan de cargar las tipografías de Google Fonts
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(render);
}

render();

/* ---------- 4. Pedido por WhatsApp ---------- */
function buildMessage(s) {
  return [
    '¡Hola Ñande! 👋 Quiero encargar una pizarra personalizada:',
    '',
    `🪵 *Estructura:* ${s.structure}`,
    `📏 *Medida:* ${s.sizeLabel}`,
    `🎉 *Temática:* ${THEMES[s.theme].label}`,
    `✍️ *Tipografía:* ${FONTS[s.font]}`,
    `📝 *Nombre / texto principal:* ${s.name}`,
    `📅 *Fecha / frase:* ${s.sub || '—'}`,
    '',
    '¿Me pasan precio y disponibilidad? ¡Gracias!',
  ].join('\n');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const s = getState();

  // El texto principal es obligatorio para el pedido
  if (!s.name) {
    mainInput.setAttribute('aria-invalid', 'true');
    ui.mainError.hidden = false;
    mainInput.focus();
    return;
  }

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage(s))}`;
  window.open(url, '_blank', 'noopener');
});

/* ---------- 5. Galería ---------- */
(function initGallery() {
  const grid = $('#galleryGrid');
  if (!grid) return;
  const items = [...grid.querySelectorAll('.gallery__item')];

  /* Define de qué lado entra cada foto según su columna:
     columna izquierda → desde la izquierda, derecha → desde la derecha, centro → desde abajo.
     En una sola columna (teléfono) se alternan izquierda/derecha. */
  function assignDirections() {
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    items.forEach((item, i) => {
      const col = i % cols;
      let from;
      if (cols === 1) from = i % 2 === 0 ? 'left' : 'right';
      else if (col === 0) from = 'left';
      else if (col === cols - 1) from = 'right';
      else from = 'bottom';
      item.dataset.from = from;
      item.dataset.delay = cols === 1 ? 0 : col * 0.15; // escalonado dentro de cada fila
    });
  }
  assignDirections();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(assignDirections, 150);
  });

  /* Aparecen al entrar en pantalla. Si la foto vuelve a quedar por debajo
     (el usuario sube), se oculta para que la animación se repita al bajar otra vez. */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target, isIntersecting, boundingClientRect }) => {
        if (isIntersecting) {
          if (target.classList.contains('is-visible')) return;
          target.style.setProperty('--delay', `${target.dataset.delay}s`);
          target.classList.add('is-visible');
          // Sin retraso después de aparecer, para que el hover responda al instante
          setTimeout(() => target.style.setProperty('--delay', '0s'), 1300);
        } else if (boundingClientRect.top > 0) {
          target.classList.remove('is-visible');
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  );
  items.forEach((item) => observer.observe(item));

  /* --- Visor de fotos en grande --- */
  const lightbox = $('#lightbox');
  const lbImg = $('#lightboxImg');
  const lbCaption = $('#lightboxCaption');
  const lbCount = $('#lightboxCount');
  let current = 0;

  function show(index) {
    current = (index + items.length) % items.length;
    const item = items[current];
    const img = item.querySelector('img');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCaption.innerHTML = '';
    const tag = document.createElement('small');
    tag.textContent = item.querySelector('.gallery__tag').textContent;
    lbCaption.append(tag, item.querySelector('strong').textContent);
    lbCount.textContent = `${current + 1} / ${items.length}`;
    lbImg.classList.remove('is-entering');
    void lbImg.offsetWidth;
    lbImg.classList.add('is-entering');
  }

  function open(index) {
    show(index);
    lightbox.showModal();
    document.documentElement.style.overflow = 'hidden';
  }

  items.forEach((item, i) => item.querySelector('.gallery__btn').addEventListener('click', () => open(i)));

  lightbox.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    items[current].querySelector('.gallery__btn').focus({ preventScroll: true });
  });

  lightbox.addEventListener('click', (e) => {
    const action = e.target.closest('[data-lb]')?.dataset.lb;
    if (action === 'close' || e.target === lightbox) lightbox.close();
    else if (action === 'prev') show(current - 1);
    else if (action === 'next') show(current + 1);
  });

  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  // Deslizar con el dedo en celular/tablet
  let touchX = null;
  lightbox.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
