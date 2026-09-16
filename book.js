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


  /* ---- Переключатель операционной системы ---------------------- */
  /* Инструкции по установке разные, а глава одна: блоки помечены
     data-os, видимостью управляет CSS, выбор запоминается на все главы. */
  const detectOs = () => {
    const platform = (navigator.userAgentData && navigator.userAgentData.platform)
      || navigator.platform || '';
    if (/win/i.test(platform)) return 'win';
    if (/mac|iphone|ipad/i.test(platform)) return 'mac';
    return 'linux';
  };

  if (document.querySelector('.book [data-os]')) {
    const items = [['win', 'Windows'], ['mac', 'macOS'], ['linux', 'Linux']];
    const key = 'git-book-os';

    const read = () => {
      try {
        const saved = localStorage.getItem(key);
        return items.some(([id]) => id === saved) ? saved : detectOs();
      } catch (_) {
        return detectOs();
      }
    };

    const bar = document.createElement('div');
    bar.className = 'osbar';
    bar.innerHTML = '<span class="osbar__label">система</span>';

    const buttons = items.map(([id, title]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = title;
      button.dataset.value = id;
      bar.appendChild(button);
      return button;
    });

    const apply = (value, save) => {
      document.documentElement.setAttribute('data-os', value);
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.value === value)));
      if (save) {
        try { localStorage.setItem(key, value); } catch (_) { /* приватный режим */ }
      }
    };

    buttons.forEach(button => button.addEventListener('click', () => apply(button.dataset.value, true)));

    const running = document.querySelector('.running');
    if (running) running.appendChild(bar);
    apply(read(), false);

    // Выбор, сделанный в другой вкладке, подхватывается без перезагрузки.
    window.addEventListener('storage', event => {
      if (event.key === key && event.newValue) apply(read(), false);
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
