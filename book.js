/* Справочник по Git и GitHub — мелкая механика страницы.
   1. Картинка открывается во весь экран по клику.
   2. Событие на ленте лет подсвечивается вместе с годом. */
(() => {
  /* ---- Увеличение картинки ------------------------------------- */
  const shots = [...document.querySelectorAll('.shot img:not(.shot--logo img)')];
  if (shots.length) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>'
      + '<p class="lightbox__hint">клик или Esc — закрыть</p>';
    document.body.appendChild(box);

    const image = box.querySelector('img');
    const caption = box.querySelector('figcaption');

    const open = source => {
      image.src = source.currentSrc || source.src;
      image.alt = source.alt || '';
      const own = source.closest('figure')?.querySelector('figcaption');
      caption.textContent = own ? own.textContent.trim() : image.alt;
      caption.hidden = !caption.textContent;
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
    };

    const close = () => {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      image.removeAttribute('src');
    };

    shots.forEach(source => {
      source.tabIndex = 0;
      source.addEventListener('click', () => open(source));
      source.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        open(source);
      });
    });

    box.addEventListener('click', close);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && box.classList.contains('is-open')) close();
    });
  }

  /* ---- Подсветка события на ленте лет --------------------------- */
  /* Карточка и год разнесены по разные стороны рельсы, поэтому связь
     между ними видна только при наведении. */
  document.querySelectorAll('.era__item').forEach(item => {
    const year = item.querySelector('.era__year');
    const card = item.querySelector('.era__card');
    if (!year || !card) return;
    const lit = state => {
      card.style.boxShadow = state ? '5px 5px 0 var(--fire)' : '';
      card.style.borderColor = state ? 'var(--fire-deep)' : '';
      year.style.color = state ? 'var(--fire-deep)' : '';
    };
    item.addEventListener('mouseenter', () => lit(true));
    item.addEventListener('mouseleave', () => lit(false));
  });
})();
