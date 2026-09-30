/* Тест по справочнику «Git и GitHub», главы 1.2, 2.1 и 2.2. Движок — от теста ОП.05. Одна попытка, время из QUIZ.minutes, разбор после отправки.

   Состояние живёт в localStorage этого браузера:
     QUIZ.id + ':state'  — идёт попытка (ФИО, порядок, ответы, дедлайн, уходы)
     QUIZ.id + ':result' — попытка завершена, оценка и ответы зафиксированы

   Пока лежит result, тест больше не запускается: любое открытие ссылки
   показывает готовую оценку и разбор. Это защита в пределах браузера —
   преподаватель принимает только первый присланный код.

   Ответы хранятся в исходной нумерации вариантов и карточек, поэтому
   проверка не зависит от перемешивания.

   Виды заданий: single, multi, order, slots, sort, line, number, odd.
   У line с полем many можно отметить несколько строк; ответ — номера по возрастанию.
   У sort с полем tree группы — каталоги, нарисованные строками дерева;
   с полем start карточки сразу лежат по каталогам (раскладка «плохого сервера») и их переносят.
   odd — убрать лишнее: карточки переносят из каталога в корзину; ответ — номера убранных.
     С view: 'grid' файлы показаны плитками, как в файловом менеджере, с размером.
   path — собрать путь из сегментов в адресной строке; ответ — номера сегментов по порядку.
   node — нажать каталоги на нарисованном дереве; many — несколько; ответ — номера узлов.
   Карточки файлов получают значок по имени: каталог, журнал, база, настройки, PID, сокет… */

const KEY_STATE = QUIZ.id + ':state';
const KEY_RESULT = QUIZ.id + ':result';

const KIND = {
  single: 'выбор ответа', multi: 'несколько ответов', order: 'порядок',
  slots: 'подстановка', sort: 'по группам', line: 'строка', number: 'число', odd: 'убрать лишнее',
  path: 'собрать путь', node: 'дерево каталогов'
};
const HINT = {
  multi: 'Несколько верных вариантов · балл только за полностью верный набор',
  order: 'Перетащите карточки или двигайте их стрелками · можно нажать карточку, затем ту, на чьё место её поставить',
  slots: 'Перетащите карточку в пропуск или нажмите карточку, затем пропуск · нажатие на заполненный пропуск очищает его',
  sort: 'Перетащите каждую карточку в группу или нажмите карточку, затем группу',
  tree: 'Перетащите каждый файл в каталог или нажмите файл, затем каталог',
  move: 'Файлы уже разложены. Перенесите те, что лежат не на месте: перетащите или нажмите файл, затем каталог',
  line: 'Нажмите нужную строку',
  lines: 'Нажмите все нужные строки · повторное нажатие снимает отметку',
  odd: 'Перетащите лишнее в корзину или просто нажмите карточку · нажатие в корзине возвращает её обратно',
  path: 'Нажимайте сегменты по порядку или перетаскивайте их в адресную строку · нажатие на сегмент в строке убирает его',
  node: 'Нажмите строку на дереве',
  nodes: 'Нажмите все нужные строки на дереве · повторное нажатие снимает отметку'
};
const variant = q => q.type === 'line' && q.many ? 'lines' : q.type === 'node' && q.many ? 'nodes' : q.type === 'sort' && q.start ? 'move' : q.type === 'sort' && q.tree ? 'tree' : q.type;
const kindOf = q => ({ lines: 'несколько строк', move: 'перемещение', tree: 'по каталогам' })[variant(q)] || KIND[q.type];
const hintOf = q => HINT[variant(q)];

/* ---------- значки файлов ----------
   Вид файла определяется по имени: так же его определяет человек в файловом менеджере. */
const ICON_PATHS = {
  dir: '<path d="M2 5.5h6l1.6 2H18v9.5H2z" fill="#F9B8A6" stroke="#1B1A19" stroke-width="1.4"/>',
  log: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#1B1A19" stroke-width="1.4"/><path d="M6.5 8h7M6.5 11h7M6.5 14h5" stroke="#F05133" stroke-width="1.4"/>',
  db: '<ellipse cx="10" cy="5" rx="6" ry="2.5" fill="#FBE0D8" stroke="#1B1A19" stroke-width="1.4"/><path d="M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5" fill="#FBE0D8" stroke="#1B1A19" stroke-width="1.4"/><path d="M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" fill="none" stroke="#1B1A19" stroke-width="1.2"/>',
  conf: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#1B1A19" stroke-width="1.4"/><path d="M6.5 8.5h7M6.5 13h7" stroke="#1B1A19" stroke-width="1.3"/><circle cx="9" cy="8.5" r="1.6" fill="#268A5B"/><circle cx="12" cy="13" r="1.6" fill="#268A5B"/>',
  key: '<circle cx="6.5" cy="10" r="3.6" fill="#FCE3D6" stroke="#C9353B" stroke-width="1.5"/><path d="M10 10h8M15 10v3M17.5 10v2.5" stroke="#C9353B" stroke-width="1.5"/>',
  pid: '<rect x="2.5" y="3" width="15" height="14" rx="2" fill="#DDF1E6" stroke="#268A5B" stroke-width="1.4"/><path d="M8 6l-1 8M12 6l-1 8M5.5 8.5h9M5 11.5h9" stroke="#268A5B" stroke-width="1.3"/>',
  sock: '<path d="M7 3v4M13 3v4" stroke="#0B78C4" stroke-width="1.6"/><path d="M4.5 7h11v3a5.5 5.5 0 0 1-11 0z" fill="#DCEBF7" stroke="#0B78C4" stroke-width="1.4"/><path d="M10 15.5V18" stroke="#0B78C4" stroke-width="1.6"/>',
  img: '<rect x="2.5" y="3.5" width="15" height="13" fill="#fff" stroke="#1B1A19" stroke-width="1.4"/><circle cx="7" cy="7.5" r="1.5" fill="#F05133"/><path d="M3.5 15l4.5-5 3 3 2-2 3.5 4z" fill="#268A5B"/>',
  doc: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#1B1A19" stroke-width="1.4"/><path d="M6.5 8h7M6.5 10.5h7M6.5 13h7" stroke="#8C8497" stroke-width="1.2"/>',
  bin: '<rect x="2" y="3.5" width="16" height="13" rx="1.5" fill="#300A24" stroke="#241F2F" stroke-width="1.2"/><path d="M5 8l2.5 2L5 12" fill="none" stroke="#8AE234" stroke-width="1.5"/><path d="M9 12.5h5" stroke="#fff" stroke-width="1.4"/>',
  tmp: '<circle cx="10" cy="10" r="7" fill="#FFF3D6" stroke="#D69016" stroke-width="1.5"/><path d="M10 6v4.3l2.8 1.8" fill="none" stroke="#D69016" stroke-width="1.5"/>',
  code: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#1B1A19" stroke-width="1.4"/><path d="M8.2 8.5 6 11l2.2 2.5M11.8 8.5 14 11l-2.2 2.5" fill="none" stroke="#F05133" stroke-width="1.5"/>',
  arch: '<path d="M3 6.5 10 3l7 3.5v8L10 18l-7-3.5z" fill="#F6ECF2" stroke="#1B1A19" stroke-width="1.4"/><path d="M3 6.5 10 10l7-3.5M10 10v8" fill="none" stroke="#1B1A19" stroke-width="1.2"/>'
};

function fileKind(name) {
  const n = name.replace(/<[^>]+>/g, '').trim().toLowerCase();
  if (n.endsWith('/')) return 'dir';
  if (/\.(env|pem|key)$/.test(n)) return 'key';
  if (/(\.log(\.\d+)?|_log)$/.test(n)) return 'log';
  if (/\.(db|sqlite)$/.test(n)) return 'db';
  if (/\.(ya?ml|conf|cfg|ini|json|toml)$/.test(n)) return 'conf';
  if (/\.pid$/.test(n)) return 'pid';
  if (/\.sock$/.test(n)) return 'sock';
  if (/\.(png|jpe?g|svg|gif)$/.test(n)) return 'img';
  if (/\.(md|txt|list)$/.test(n)) return 'doc';
  if (/\.(html|css|js|py)$/.test(n)) return 'code';
  if (/\.(tmp|part)$/.test(n)) return 'tmp';
  if (/\.(zip|gz|deb|tar)$/.test(n)) return 'arch';
  if (/\.sh$/.test(n)) return 'bin';
  return 'doc';
}

function fileIcon(name) {
  return `<svg class="fi" viewBox="0 0 20 20" aria-hidden="true">${ICON_PATHS[fileKind(name)]}</svg>`;
}

/* Содержимое карточки файла: значок, имя, пояснение после « · » мелким шрифтом. */
function fileLabel(text, plain) {
  const [name, ...rest] = text.split(' · ');
  return `${plain ? '' : fileIcon(name)}<span class="fn">${name.replace(/\/(?=.)/g, '/<wbr>')}</span>${rest.length ? `<small class="fmeta">${rest.join(' · ')}</small>` : ''}`;
}

const $ = id => document.getElementById(id);
const screens = { start: $('screen-start'), quiz: $('screen-quiz'), result: $('screen-result') };

let state = null;   // { name, group, order, optOrder, answers, deadline, leaves, startedAt }
let tick = null;
let finishing = false;
let picked = null;  // выбранная нажатием карточка: { qid, index }

/* ---------- хранилище ---------- */

function load(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
}

function show(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
  $('timer').classList.toggle('hidden', name !== 'quiz');
  window.scrollTo(0, 0);
}

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  const rnd = new Uint32Array(n);
  crypto.getRandomValues(rnd);
  for (let i = n - 1; i > 0; i--) {
    const j = rnd[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function countOf(q) {
  return (q.options || q.items || q.chips || []).length;
}

/* ---------- запуск ---------- */

function init() {
  const done = load(KEY_RESULT);
  if (done) { renderResult(done, true); return; }

  const saved = load(KEY_STATE);
  if (saved && saved.answers && saved.order) {
    state = saved;
    if (Date.now() >= state.deadline) { finish(true); return; }
    startQuiz();
    return;
  }
  show('start');
}

$('btn-start').addEventListener('click', () => {
  const name = $('in-name').value.trim().replace(/\s+/g, ' ');
  const group = $('in-group').value.trim();
  const err = $('start-err');
  if (name.length < 3 || !name.includes(' ')) { err.textContent = 'Укажите фамилию и имя полностью — например, «Иванов Иван».'; return; }
  if (!group) { err.textContent = 'Укажите группу.'; return; }
  if (!confirm(`Начать тест? Пройти его заново будет нельзя, отсчёт ${QUIZ.minutes} минут пойдёт сразу.`)) return;
  err.textContent = '';

  const optOrder = {};
  QUIZ.questions.forEach(q => {
    const n = countOf(q);
    let perm = shuffled(n);
    // карточки для порядка не должны сразу стоять верно
    while (q.type === 'order' && perm.every((x, i) => x === i)) perm = shuffled(n);
    optOrder[q.id] = perm;
  });
  state = {
    name, group,
    order: shuffled(QUIZ.questions.length), optOrder,
    answers: {}, leaves: 0, startedAt: Date.now(),
    deadline: Date.now() + QUIZ.minutes * 60000
  };
  if (!save(KEY_STATE, state)) {
    err.textContent = 'Браузер запретил сохранение данных сайта. Отключите приватный режим — иначе результат потеряется.';
    return;
  }
  startQuiz();
});

function startQuiz() {
  renderQuestions();
  show('quiz');
  updateLeaves();
  startTimer();
}

/* ---------- таймер ---------- */

function startTimer() {
  updateTimer();
  clearInterval(tick);
  tick = setInterval(updateTimer, 250);
}

function updateTimer() {
  const left = Math.max(0, state.deadline - Date.now());
  const el = $('timer');
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  el.textContent = `${m}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('warn', left <= 180000 && left > 60000);
  el.classList.toggle('danger', left <= 60000);
  if (left === 0) { clearInterval(tick); finish(true); }
}

/* ---------- уход со вкладки ---------- */

let unloading = false;
window.addEventListener('pagehide', () => { unloading = true; });
window.addEventListener('pageshow', () => { unloading = false; });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' || unloading || !state || finishing || load(KEY_RESULT)) return;
  state.leaves = (state.leaves || 0) + 1;
  save(KEY_STATE, state);
  updateLeaves();
});

function updateLeaves() {
  const note = $('leave-note');
  if (!state || !state.leaves) { note.classList.add('hidden'); return; }
  note.classList.remove('hidden');
  note.innerHTML = `<b>Вы уходили со вкладки теста: ${state.leaves}.</b> Это записано в код результата. Время при этом не останавливается.`;
}

/* ---------- защита текста от копирования ----------
   Текст практики нельзя выделить, скопировать, вырезать, распечатать или сохранить
   горячими клавишами. Исключения — поля ввода и поле с кодом результата: код нужно
   скопировать и отправить преподавателю. Это барьер, а не защита: снимок экрана
   и инструменты разработчика браузер не запрещает. */
const editable = el => !!(el && el.closest && el.closest('input, textarea'));

['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(type => {
  document.addEventListener(type, e => { if (!editable(e.target)) e.preventDefault(); }, true);
});

document.addEventListener('keydown', e => {
  const k = (e.key || '').toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  const devtools = k === 'f12' || (mod && e.shiftKey && ['i', 'j', 'c'].includes(k)) || (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k));
  const blocked = mod && ['s', 'p', 'u'].includes(k);
  const copying = mod && ['c', 'x', 'a'].includes(k) && !editable(e.target);
  if (devtools || blocked || copying) { e.preventDefault(); e.stopPropagation(); }
}, true);

window.addEventListener('beforeprint', () => document.body.classList.add('no-print'));
window.addEventListener('afterprint', () => document.body.classList.remove('no-print'));

/* ---------- общие части карточки ---------- */

function codeBlock(code, cls = '', file = 'терминал', lang = 'VS Code') {
  return `<figure class="q-code ${cls}"><figcaption><span>${esc(file)}</span><span>${esc(lang)}</span></figcaption><pre>${
    code.split('\n').map((line, i) => `<span class="ln" data-l="${i}">${esc(line) || ' '}</span>`).join('')}</pre></figure>`;
}

/* Несколько файлов проекта — вкладками. Открыт первый, остальные по нажатию. */
function filesBlock(files) {
  const lines = code => code.split('\n').map((line, i) => `<span class="ln" data-l="${i}">${esc(line) || ' '}</span>`).join('');
  return `<figure class="q-code q-files">
    <div class="tabs" role="tablist" aria-label="Файлы проекта">${files.map((f, i) =>
      `<button type="button" class="tab${i ? '' : ' on'}" role="tab" aria-selected="${i ? 'false' : 'true'}" data-tab="${i}">${esc(f.name)}</button>`).join('')}</div>
    ${files.map((f, i) => `<div class="pane" data-pane="${i}"${i ? ' hidden' : ''}>${f.note ? `<p class="pane-note">${esc(f.note)}</p>` : ''}<pre>${lines(f.code)}</pre></div>`).join('')}
    <figcaption><span>Нажмите имя файла, чтобы открыть его</span><span>VS Code</span></figcaption>
  </figure>`;
}

document.addEventListener('click', e => {
  const tab = e.target.closest('.q-files .tab');
  if (!tab) return;
  const fig = tab.closest('.q-files');
  fig.querySelectorAll('.tab').forEach(t => { const on = t === tab; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
  fig.querySelectorAll('.pane').forEach(p => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
});

function sourceBlock(q) {
  if (q.files) return filesBlock(q.files);
  return q.code && q.type !== 'line' ? codeBlock(q.code, '', q.file, q.lang) : '';
}

function imageBlock(img) {
  return img ? `<figure class="q-img ${img.kind === 'shot' ? 'shot' : ''}">${img.svg}<figcaption>${esc(img.caption)}</figcaption></figure>` : '';
}

function questionHead(q, pos, extra = '') {
  return `<div class="q-head">
      <span class="q-num">ЗАДАНИЕ ${pos + 1} ИЗ ${QUIZ.questions.length}</span>
      <span class="q-kind">${kindOf(q)}</span>${extra}
      <span class="q-topic">${esc(q.topic)}</span>
    </div>
    <p class="q-text">${q.text}</p>`;
}

/* ---------- перетаскивание ----------
   Pointer events работают и с мышью, и с пальцем. Короткое нажатие без
   движения считается нажатием: карточка выбирается, затем нажимают место. */

function draggable(el, card, { onDrop, onTap }) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button:not(.chip)') && e.target.closest('button') !== el) return;
    const sx = e.clientX, sy = e.clientY;
    let ghost = null, over = null;

    const targetAt = ev => {
      const hit = document.elementFromPoint(ev.clientX, ev.clientY);
      const t = hit && hit.closest('[data-drop]');
      return t && card.contains(t) ? t : null;
    };
    const move = ev => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
        ghost = el.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.classList.remove('sel');
        ghost.style.width = el.getBoundingClientRect().width + 'px';
        document.body.appendChild(ghost);
        el.classList.add('dragging');
      }
      if (!ghost) return;
      ev.preventDefault();
      ghost.style.left = ev.clientX + 'px';
      ghost.style.top = ev.clientY + 'px';
      const t = targetAt(ev);
      if (t !== over) { if (over) over.classList.remove('over'); over = t; if (over) over.classList.add('over'); }
    };
    const end = (ev, cancelled) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      if (over) over.classList.remove('over');
      if (ghost) {
        ghost.remove();
        el.classList.remove('dragging');
        if (!cancelled) { const t = targetAt(ev); if (t) onDrop(t, ev); }
      } else if (!cancelled) {
        onTap();
      }
    };
    const up = ev => end(ev, false);
    const cancel = ev => end(ev, true);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  });
}

/* ---------- отрисовка заданий ---------- */

function renderQuestions() {
  const host = $('questions');
  host.innerHTML = '';
  $('context').innerHTML = QUIZ.context;

  state.order.forEach((qi, pos) => {
    const q = QUIZ.questions[qi];
    const card = document.createElement('div');
    card.className = 'q';
    card.id = 'card-' + q.id;
    card.innerHTML = questionHead(q, pos)
      + imageBlock(q.image)
      + sourceBlock(q)
      + (hintOf(q) ? `<p class="q-hint">${hintOf(q)}</p>` : '')
      + '<div class="body"></div>';
    host.appendChild(card);
    renderBody(q);
  });
  updateProgress();
}

function renderBody(q) {
  const card = $('card-' + q.id);
  const body = card.querySelector('.body');
  ({ single: bodyChoice, multi: bodyChoice, order: bodyOrder, slots: bodySlots, sort: bodySort, line: bodyLine, number: bodyNumber, odd: bodyOdd, path: bodyPath, node: bodyNode })[q.type](q, body, card);
}

function commit(q, value) {
  if (Date.now() >= state.deadline) { finish(true); return false; }
  if (value === null) delete state.answers[q.id];
  else state.answers[q.id] = value;
  save(KEY_STATE, state);
  $('card-' + q.id).classList.remove('unanswered');
  updateProgress();
  return true;
}

/* выбор одного или нескольких */
function bodyChoice(q, body) {
  const multi = q.type === 'multi';
  body.innerHTML = '<div class="opts"></div>';
  const opts = body.firstChild;
  state.optOrder[q.id].forEach(oi => {
    const label = document.createElement('label');
    label.className = 'opt';
    const on = (state.answers[q.id] || []).includes(oi);
    label.innerHTML = `<input type="${multi ? 'checkbox' : 'radio'}" name="${q.id}" ${on ? 'checked' : ''}><span>${q.options[oi]}</span>`;
    label.classList.toggle('picked', on);
    label.querySelector('input').addEventListener('change', () => {
      const cur = state.answers[q.id] || [];
      let next = multi ? (cur.includes(oi) ? cur.filter(x => x !== oi) : cur.concat(oi).sort((a, b) => a - b)) : [oi];
      if (!commit(q, next.length ? next : null)) return;
      opts.querySelectorAll('.opt').forEach(l => l.classList.toggle('picked', l.querySelector('input').checked));
    });
    opts.appendChild(label);
  });
}

/* порядок */
function bodyOrder(q, body, card) {
  const cur = state.answers[q.id] || state.optOrder[q.id];
  const moved = !!state.answers[q.id];
  body.innerHTML = `<ol class="ord">${cur.map((it, pos) => `
      <li class="ord-item ${picked && picked.qid === q.id && picked.index === it ? 'sel' : ''}" data-drop="ord" data-i="${it}">
        <span class="txt">${q.items[it]}</span>
        <span class="ord-btns">
          <button type="button" data-dir="-1" aria-label="выше" ${pos === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-dir="1" aria-label="ниже" ${pos === cur.length - 1 ? 'disabled' : ''}>↓</button>
        </span>
      </li>`).join('')}</ol>
    <p class="ord-moved">${moved ? '✓ порядок сохранён' : 'Порядок ещё не менялся — пока задание не выполнено'}</p>`;

  const place = (it, targetIt, after) => {
    const next = cur.filter(x => x !== it);
    let at = next.indexOf(targetIt);
    if (after) at += 1;
    next.splice(at, 0, it);
    picked = null;
    if (commit(q, next)) renderBody(q);
  };

  body.querySelectorAll('.ord-item').forEach(li => {
    const it = Number(li.dataset.i);
    li.querySelectorAll('.ord-btns button').forEach(btn => btn.addEventListener('click', () => {
      const pos = cur.indexOf(it), to = pos + Number(btn.dataset.dir);
      const next = [...cur];
      [next[pos], next[to]] = [next[to], next[pos]];
      picked = null;
      if (commit(q, next)) renderBody(q);
    }));
    draggable(li, card, {
      onDrop: (t, ev) => {
        const target = Number(t.dataset.i);
        if (target === it) { if (!state.answers[q.id] && commit(q, [...cur])) renderBody(q); return; }
        const r = t.getBoundingClientRect();
        place(it, target, ev.clientY > r.top + r.height / 2);
      },
      onTap: () => {
        if (picked && picked.qid === q.id && picked.index !== it) {
          const from = cur.indexOf(picked.index), to = cur.indexOf(it);
          place(picked.index, it, from < to);
        } else {
          picked = picked && picked.qid === q.id && picked.index === it ? null : { qid: q.id, index: it };
          renderBody(q);
        }
      }
    });
  });
}

/* подстановка в пропуски: карточки палитры не расходуются */
function bodySlots(q, body, card) {
  const cur = state.answers[q.id] || q.slots.map(() => null);
  const mono = q.chips.every(c => c.length < 16);
  body.innerHTML = `
    <div class="palette"><p class="palette-note">Карточки</p>${state.optOrder[q.id].map(c =>
      `<button type="button" class="chip ${mono ? 'mono' : ''} ${picked && picked.qid === q.id && picked.index === c ? 'sel' : ''}" data-c="${c}">${q.chips[c]}</button>`).join('')}</div>
    <div class="slots">${q.slots.map((label, s) => `
      <div class="slot-row">
        <div class="slot-label">${esc(label)}</div>
        <div class="slot ${cur[s] !== null ? 'filled' : ''}" data-drop="slot" data-s="${s}" role="button" tabindex="0">${cur[s] !== null ? esc(q.chips[cur[s]]) : 'сюда'}</div>
      </div>`).join('')}</div>`;

  const put = (s, c) => {
    const next = [...cur];
    next[s] = c;
    picked = null;
    if (commit(q, next.every(x => x === null) ? null : next)) renderBody(q);
  };
  body.querySelectorAll('.chip').forEach(chip => {
    const c = Number(chip.dataset.c);
    draggable(chip, card, {
      onDrop: t => put(Number(t.dataset.s), c),
      onTap: () => { picked = picked && picked.qid === q.id && picked.index === c ? null : { qid: q.id, index: c }; renderBody(q); }
    });
  });
  body.querySelectorAll('.slot').forEach(slot => {
    const s = Number(slot.dataset.s);
    const act = () => {
      if (picked && picked.qid === q.id) put(s, picked.index);
      else if (cur[s] !== null) put(s, null);
    };
    slot.addEventListener('click', act);
    slot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  });
}

/* раскладка по группам: карточка лежит либо в общей стопке, либо в одной группе.
   tree — группы рисуются строками дерева каталогов; start — начальная раскладка без стопки. */
function bodySort(q, body, card) {
  const cur = state.answers[q.id] || (q.start ? [...q.start] : q.items.map(() => null));
  const moved = !!state.answers[q.id];
  const chip = it => `<button type="button" class="chip ${q.tree ? 'file' : ''} ${picked && picked.qid === q.id && picked.index === it ? 'sel' : ''}" data-it="${it}">${q.tree ? fileLabel(q.items[it]) : q.items[it]}</button>`;
  const inPlace = b => state.optOrder[q.id].filter(it => cur[it] === b).map(chip).join('');
  const pool = q.start ? '' : `<div class="pool" data-drop="pool">${inPlace(null)}</div>`;
  const buckets = q.tree
    ? `<div class="dirs">${q.buckets.map((title, b) => `
      <div class="dir" data-drop="bucket" data-b="${b}">
        <div class="dir-name">${fileIcon('/')}${esc(title)}</div>
        <div class="dir-body">${inPlace(b)}</div>
      </div>`).join('')}</div>`
    : `<div class="buckets">${q.buckets.map((title, b) => `
      <div class="bucket" data-drop="bucket" data-b="${b}">
        <div class="bucket-title">${esc(title)}</div>
        <div class="bucket-body">${inPlace(b)}</div>
      </div>`).join('')}</div>`;
  body.innerHTML = pool + buckets
    + (q.start ? `<p class="ord-moved ${moved ? '' : 'todo'}">${moved ? '✓ раскладка сохранена' : 'Файлы ещё не перемещались — пока задание не выполнено'}</p>` : '');

  const put = (it, b) => {
    const next = [...cur];
    next[it] = b;
    picked = null;
    if (commit(q, next.every(x => x === null) ? null : next)) renderBody(q);
  };
  const where = t => t.dataset.drop === 'pool' ? null : Number(t.dataset.b);
  body.querySelectorAll('.chip').forEach(el => {
    const it = Number(el.dataset.it);
    draggable(el, card, {
      onDrop: t => put(it, where(t)),
      onTap: () => { picked = picked && picked.qid === q.id && picked.index === it ? null : { qid: q.id, index: it }; renderBody(q); }
    });
  });
  body.querySelectorAll('[data-drop]').forEach(zone => zone.addEventListener('click', e => {
    if (e.target.closest('.chip') || !picked || picked.qid !== q.id) return;
    put(picked.index, where(zone));
  }));
}

/* убрать лишнее: каталог и корзина; ответ — номера карточек в корзине по возрастанию */
function bodyOdd(q, body, card) {
  const out = state.answers[q.id] || [];
  const chip = it => `<button type="button" class="chip file ${out.includes(it) ? 'gone' : ''}" data-it="${it}">${fileLabel(q.items[it], q.plain)}</button>`;
  const list = inside => state.optOrder[q.id].filter(it => out.includes(it) !== inside).map(chip).join('');
  body.innerHTML = `
    <div class="odd ${q.view === 'grid' ? 'grid' : ''}">
      <div class="dir odd-keep" data-drop="keep">
        <div class="dir-name">${fileIcon('/')}${esc(q.dir)}</div>
        <div class="dir-body">${list(true)}</div>
      </div>
      <div class="trash" data-drop="trash">
        <div class="trash-name"><span class="trash-icon" aria-hidden="true"></span>Убрать отсюда</div>
        <div class="dir-body">${list(false)}</div>
      </div>
    </div>`;
  const set = (it, gone) => {
    const next = gone ? [...new Set(out.concat(it))].sort((a, b) => a - b) : out.filter(x => x !== it);
    if (commit(q, next.length ? next : null)) renderBody(q);
  };
  body.querySelectorAll('.chip').forEach(el => {
    const it = Number(el.dataset.it);
    draggable(el, card, {
      onDrop: t => set(it, t.dataset.drop === 'trash'),
      onTap: () => set(it, !out.includes(it))
    });
  });
}

/* собрать путь: адресная строка из сегментов и палитра оставшихся сегментов */
function pathText(q, segs) {
  return '/' + segs.map(c => q.chips[c].replace(/\/$/, '')).join('/');
}

function bodyPath(q, body, card) {
  const cur = state.answers[q.id] || [];
  const free = state.optOrder[q.id].filter(c => !cur.includes(c));
  body.innerHTML = `
    <div class="pathbar" data-drop="bar">
      <span class="pb-label">Путь</span>
      <span class="pb-root">/</span>${cur.map((c, i) => `${i ? '<span class="pb-sep">/</span>' : ''}<button type="button" class="seg" data-pos="${i}" title="убрать">${fileIcon(q.chips[c])}${esc(q.chips[c].replace(/\/$/, ''))}</button>`).join('')}
      ${cur.length ? '<button type="button" class="pb-clear">очистить</button>' : '<span class="pb-empty">нажмите первый сегмент</span>'}
    </div>
    <div class="palette"><p class="palette-note">Сегменты</p>${free.map(c =>
      `<button type="button" class="chip file" data-c="${c}">${fileIcon(q.chips[c])}<span class="fn">${esc(q.chips[c].replace(/\/$/, ''))}</span></button>`).join('') || '<span class="muted">все сегменты в строке</span>'}</div>`;
  const set = next => { if (commit(q, next.length ? next : null)) renderBody(q); };
  body.querySelectorAll('.palette .chip').forEach(el => {
    const c = Number(el.dataset.c);
    draggable(el, card, { onDrop: () => set(cur.concat(c)), onTap: () => set(cur.concat(c)) });
  });
  body.querySelectorAll('.seg').forEach(el => el.addEventListener('click', () => {
    const pos = Number(el.dataset.pos);
    set(cur.filter((_, i) => i !== pos));
  }));
  const clr = body.querySelector('.pb-clear');
  if (clr) clr.addEventListener('click', () => set([]));
}

/* дерево каталогов: узлы с отступом по глубине, нажатие отмечает узел */
function treeRows(q, cls) {
  return q.nodes.map((raw, i) => {
    const depth = raw.length - raw.trimStart().length >> 1;
    const name = raw.trim();
    return `<button type="button" class="node ${cls(i)}" data-n="${i}" style="--d:${depth}">${'<span class="guide"></span>'.repeat(depth)}${fileIcon(name)}<span class="fn">${esc(name)}</span></button>`;
  }).join('');
}

function bodyNode(q, body) {
  const sel = state.answers[q.id] || [];
  body.innerHTML = `<div class="ftree">${treeRows(q, i => sel.includes(i) ? 'sel' : '')}</div>`;
  body.querySelectorAll('.node').forEach(el => el.addEventListener('click', () => {
    const n = Number(el.dataset.n);
    let next = [n];
    if (q.many) next = sel.includes(n) ? sel.filter(x => x !== n) : sel.concat(n).sort((a, b) => a - b);
    else if (sel.includes(n)) next = [];
    if (commit(q, next.length ? next : null)) renderBody(q);
  }));
}

/* строка кода */
function bodyLine(q, body) {
  body.innerHTML = codeBlock(q.code, 'lines', q.file, q.lang);
  const sel = state.answers[q.id] || [];
  body.querySelectorAll('.ln').forEach(ln => {
    const l = Number(ln.dataset.l);
    ln.classList.toggle('sel', sel.includes(l));
    ln.addEventListener('click', () => {
      let next = [l];
      if (q.many) {
        next = sel.includes(l) ? sel.filter(x => x !== l) : sel.concat(l).sort((a, b) => a - b);
      }
      if (commit(q, next.length ? next : null)) renderBody(q);
    });
  });
}

/* число */
function bodyNumber(q, body) {
  const val = state.answers[q.id] || '';
  const unit = q.unit ? `<span>${esc(q.unit)}</span>` : '';
  body.innerHTML = `<label class="num">${q.unit_before ? unit : ''}<input type="text" inputmode="decimal" autocomplete="off" maxlength="12" value="${esc(val)}" aria-label="ответ">${q.unit_before ? '' : unit}</label>`;
  const input = body.querySelector('input');
  input.addEventListener('input', () => {
    const v = input.value.replace(/[^0-9.,\-\s]/g, '');
    if (v !== input.value) input.value = v;
    commit(q, v.trim() ? v.trim() : null);
  });
}

/* ---------- прогресс ---------- */

function isDone(q) {
  return normalized(q, state.answers[q.id]) !== null;
}

function updateProgress() {
  const total = QUIZ.questions.length;
  const done = QUIZ.questions.filter(isDone).length;
  $('progress-fill').style.width = (done / total * 100) + '%';
  $('progress-text').textContent = `ГОТОВО ${done} ИЗ ${total}`;
  $('finish-note').textContent = done < total ? `Не выполнено: ${total - done}` : 'Выполнены все задания';
}

/* ---------- завершение ---------- */

$('btn-finish').addEventListener('click', () => {
  const missing = state.order.map(i => QUIZ.questions[i]).filter(q => !isDone(q));
  if (missing.length) {
    missing.forEach(q => $('card-' + q.id).classList.add('unanswered'));
    $('card-' + missing[0].id).scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!confirm(`Не выполнено заданий: ${missing.length} (в заданиях с карточками нужно заполнить все места). Они будут засчитаны как неверные.\n\nЗавершить работу? Изменить ответы после этого нельзя.`)) return;
  } else if (!confirm('Завершить работу? Изменить ответы после этого нельзя.')) {
    return;
  }
  finish(false);
});

async function finish(byTimeout) {
  if (finishing) return;
  finishing = true;
  clearInterval(tick);
  const details = [];
  let score = 0;
  for (const q of QUIZ.questions) {
    const ok = await isCorrect(q, state.answers[q.id]);
    if (ok) score++;
    details.push({ id: q.id, ok });
  }
  const g = gradeFor(score);
  const result = {
    v: 1,
    name: state.name, group: state.group,
    answers: QUIZ.questions.map(q => encodeAnswer(q, state.answers[q.id])),
    raw: state.answers,
    score, total: QUIZ.questions.length, mark: g.mark,
    finishedAt: new Date().toISOString(),
    minutesUsed: Math.round((Math.min(Date.now(), state.deadline) - (state.startedAt || state.deadline - QUIZ.minutes * 60000)) / 60000),
    byTimeout: !!byTimeout,
    leaves: state.leaves || 0,
    order: state.order,
    details
  };
  result.code = await makeCode(result);

  save(KEY_RESULT, result);
  try { localStorage.removeItem(KEY_STATE); } catch (e) {}
  renderResult(result, false);
}

/* ---------- код результата ---------- */

function b64url(str) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeCode(r) {
  const payload = {
    v: 1, n: r.name, g: r.group, a: r.answers,
    s: r.score, t: r.total, m: r.mark,
    d: r.finishedAt.slice(0, 16), u: r.minutesUsed, o: r.byTimeout ? 1 : 0, x: r.leaves
  };
  const body = b64url(JSON.stringify(payload));
  const sum = await shortHash(QUIZ.salt + '|code|' + body);
  return `${QUIZ.prefix}.${body}.${sum.slice(0, 10)}`;
}

/* ---------- экран результата ---------- */

async function renderResult(r, returning) {
  show('result');
  $('result-title').textContent = returning ? 'Тест уже пройден' : (r.byTimeout ? 'Время вышло — работа отправлена' : 'Работа завершена');

  const g = QUIZ.grades.find(x => x.mark === r.mark) || QUIZ.grades[QUIZ.grades.length - 1];
  $('mark').textContent = r.mark;
  $('mark').className = 'mark m' + r.mark;
  $('score-line').textContent = `${r.score} из ${r.total} · ${g.label}`;
  $('who').textContent = `${r.name} · группа ${r.group}`;
  const dt = new Date(r.finishedAt);
  $('when').textContent = 'Завершено ' + dt.toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })
    + (r.leaves ? ` · уходов со вкладки: ${r.leaves}` : '');
  $('code').value = r.code;

  if (returning && !document.querySelector('.notice.again')) {
    const note = document.createElement('div');
    note.className = 'notice again';
    note.innerHTML = '<b>Повторное прохождение не предусмотрено.</b> Оценка зафиксирована при первой попытке и не меняется. Разбор ниже остаётся доступным.';
    screens.result.insertBefore(note, screens.result.children[2]);
  }

  const secret = await secretData();
  const order = r.order || QUIZ.questions.map((_, i) => i);
  const raw = r.raw || {};

  $('review-map').innerHTML = order.map((qi, pos) => {
    const q = QUIZ.questions[qi];
    const d = r.details.find(x => x.id === q.id) || { ok: false };
    return `<a href="#rv-${q.id}" class="${d.ok ? 'ok' : 'bad'}" title="${d.ok ? 'верно' : 'неверно'} · ${esc(q.topic)}">${pos + 1}</a>`;
  }).join('');

  $('review').innerHTML = order.map((qi, pos) => {
    const q = QUIZ.questions[qi];
    const d = r.details.find(x => x.id === q.id) || { ok: false };
    const key = secret[q.id].key;
    const verdict = `<span class="verdict ${d.ok ? 'ok' : 'bad'}">${d.ok ? '✓ верно' : '✗ неверно'}</span>`;
    return `<article class="q rv ${d.ok ? 'ok' : 'bad'}" id="rv-${q.id}">
      ${questionHead(q, pos, verdict)}
      ${imageBlock(q.image)}
      ${sourceBlock(q)}
      ${reviewBody(q, raw[q.id], key, secret[q.id].notes)}
      <div class="why"><b>Разбор</b>${secret[q.id].why}</div>
    </article>`;
  }).join('') + repeatBlock(r);
}

/* Итог разбора: разделы глав, по которым были ошибки, со ссылками. */
function repeatBlock(r) {
  const misses = {};
  QUIZ.questions.forEach(q => {
    const d = r.details.find(x => x.id === q.id);
    if (d && d.ok) return;
    (q.chapters || []).forEach(ch => { misses[ch] = (misses[ch] || 0) + 1; });
  });
  const list = Object.keys(QUIZ.chapters).filter(ch => misses[ch]);
  const body = list.length
    ? `<p>Ошибки распределились по разделам глав так: номер главы и параграфа — как в справочнике, ссылка ведёт прямо на раздел. Перечитайте разделы из списка, затем ещё раз просмотрите разбор заданий с красной рамкой.</p>
       <ul class="repeat">${list.map(ch => `<li><a href="${QUIZ.chapters[ch].url}" target="_blank" rel="noreferrer"><b>${ch}</b> ${esc(QUIZ.chapters[ch].title)}</a><span>${misses[ch]} ${plural(misses[ch])}</span></li>`).join('')}</ul>
       <p class="muted">Одно задание может опираться на несколько разделов, поэтому сумма по разделам бывает больше числа ошибок.</p>`
    : '<p>Ошибок нет. Все задания выполнены верно.</p>';
  return `<div class="panel repeat-panel"><h2>Что повторить</h2>${body}</div>`;
}

function plural(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'задание с ошибкой';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'задания с ошибкой';
  return 'заданий с ошибкой';
}

function reviewBody(q, a, key, notes) {
  const none = '<i class="muted">нет ответа</i>';
  switch (q.type) {
    case 'single': case 'multi': {
      const mine = a || [];
      return `<div class="cmp">${q.options.map((o, i) => {
        const right = key.includes(i), my = mine.includes(i);
        const cls = right ? 'right' : (my ? 'wrong' : '');
        const tag = right && my ? 'ваш выбор · верно' : right ? 'верный ответ' : my ? 'ваш выбор · неверно' : '';
        return `<div class="cmp-opt ${cls}"><span class="mk">${right ? '✓' : my ? '✗' : ''}</span><span>${o}${notes && notes[i] ? `<small class="note">${notes[i]}</small>` : ''}</span>${tag ? `<span class="tag">${tag}</span>` : ''}</div>`;
      }).join('')}</div>${mine.length ? '' : `<p>${none}</p>`}`;
    }
    case 'order': {
      const mine = a || null;
      const yours = mine
        ? `<ol>${mine.map((it, pos) => `<li class="${it === key[pos] ? 'right' : 'wrong'}">${q.items[it]}</li>`).join('')}</ol>`
        : `<p>${none} — порядок не менялся</p>`;
      return `<div class="cols">
        <div><h3>Ваш порядок</h3>${yours}</div>
        <div><h3>Верный порядок</h3><ol>${key.map(it => `<li class="right">${q.items[it]}</li>`).join('')}</ol></div>
      </div>`;
    }
    case 'slots': {
      const mine = a || [];
      return `<div class="res-wrap"><table class="res"><tr><th>Пропуск</th><th>Ваш ответ</th><th>Верно</th></tr>${q.slots.map((s, i) => {
        const my = mine[i] ?? null;
        return `<tr><td>${esc(s)}</td><td class="${my === key[i] ? 'right' : 'wrong'}">${my === null ? '—' : esc(q.chips[my])}</td><td><b>${esc(q.chips[key[i]])}</b></td></tr>`;
      }).join('')}</table></div>`;
    }
    case 'sort': {
      const mine = a || [];
      const from = q.start ? '<th>Лежал</th>' : '';
      const head = q.tree ? ['Файл', 'Ваш каталог', 'Верный каталог'] : ['Карточка', 'Ваша группа', 'Верная группа'];
      return `<div class="res-wrap"><table class="res"><tr><th>${head[0]}</th>${from}<th>${head[1]}</th><th>${head[2]}</th></tr>${q.items.map((it, i) => {
        const my = mine[i] ?? null;
        const cell = b => q.tree ? `<code>${esc(q.buckets[b])}</code>` : esc(q.buckets[b]);
        return `<tr><td>${it}</td>${q.start ? `<td>${cell(q.start[i])}</td>` : ''}<td class="${my === key[i] ? 'right' : 'wrong'}">${my === null ? (q.start ? 'не перемещали' : '—') : cell(my)}</td><td><b>${cell(key[i])}</b></td></tr>`;
      }).join('')}</table></div>${q.start && !a ? '<p class="muted">Файлы не перемещались — засчитана исходная раскладка.</p>' : ''}`;
    }
    case 'path': {
      const mine = a || [];
      const ok = JSON.stringify(mine) === JSON.stringify(key);
      return `<div class="numrv"><span class="${ok ? 'right' : 'wrong'}">Ваш путь: ${mine.length ? esc(pathText(q, mine)) : '—'}</span><span class="right">Верно: ${esc(pathText(q, key))}</span></div>`;
    }
    case 'node': {
      const mine = a || [];
      return `<div class="ftree rv-tree">${treeRows(q, i => key.includes(i) ? (mine.includes(i) ? 'right' : 'miss') : mine.includes(i) ? 'wrong' : '')}</div>
        <p class="muted">Зелёным — верно отмеченные, красным — отмеченные ошибочно, пунктиром — нужные, но не отмеченные.</p>`;
    }
    case 'odd': {
      const mine = a || [];
      return `<div class="cmp">${q.items.map((it, i) => {
        const extra = key.includes(i), gone = mine.includes(i);
        const cls = extra === gone ? (extra ? 'right' : '') : 'wrong';
        const tag = extra ? (gone ? 'лишний · убран' : 'лишний · остался') : (gone ? 'нужен · убран ошибочно' : 'нужен · остался');
        return `<div class="cmp-opt ${cls}"><span class="mk">${extra === gone ? '✓' : '✗'}</span><span class="fl">${fileLabel(it)}${notes && notes[i] ? `<small class="note">${notes[i]}</small>` : ''}</span><span class="tag">${tag}</span></div>`;
      }).join('')}</div>`;
    }
    case 'line': {
      const mine = a || [];
      const lines = q.code.split('\n').map((line, i) => {
        const cls = key.includes(i) ? 'right' : mine.includes(i) ? 'wrong' : '';
        return `<span class="ln ${cls}">${esc(line) || ' '}</span>`;
      }).join('');
      const nums = xs => xs.map(x => x + 1).join(', ');
      const same = mine.length === key.length && mine.every((x, i) => x === key[i]);
      const note = !mine.length ? (q.many ? 'Вы не отметили ни одной строки.' : 'Вы не выбрали строку.')
        : same ? `Вы выбрали ${q.many ? 'строки' : 'строку'} ${nums(mine)} — верно.`
        : `Вы выбрали ${mine.length > 1 ? 'строки' : 'строку'} ${nums(mine)}, ${key.length > 1 ? 'верные — строки' : 'верная — строка'} ${nums(key)}.`;
      return `<figure class="q-code lines-rv"><figcaption><span>зелёным — верные строки · красным — выбранные ошибочно</span></figcaption><pre>${lines}</pre></figure><p>${note}</p>`;
    }
    case 'number': {
      const ok = normalized(q, a) && normalized(q, a)[0] === key[0];
      return `<div class="numrv"><span class="${ok ? 'right' : 'wrong'}">Ваш ответ: ${a ? esc(a) : '—'}</span><span class="right">Верно: ${key[0]}</span></div>`;
    }
  }
  return '';
}

document.querySelectorAll('.filter .chipbtn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.filter .chipbtn').forEach(b => b.classList.toggle('on', b === btn));
  const onlyBad = btn.dataset.filter === 'bad';
  document.querySelectorAll('#review .rv').forEach(el => el.classList.toggle('hidden', onlyBad && el.classList.contains('ok')));
}));

$('btn-copy').addEventListener('click', async () => {
  const ta = $('code');
  try { await navigator.clipboard.writeText(ta.value); }
  catch (e) { ta.removeAttribute('readonly'); ta.select(); document.execCommand('copy'); ta.setAttribute('readonly', ''); }
  $('btn-copy').textContent = 'Скопировано';
  setTimeout(() => { $('btn-copy').textContent = 'Скопировать'; }, 1800);
});

window.addEventListener('beforeunload', e => {
  if (state && !finishing && !load(KEY_RESULT)) { e.preventDefault(); e.returnValue = ''; }
});

init();
