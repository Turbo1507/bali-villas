(function () {
  // избранное
  document.querySelectorAll('.heart').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    });
  });

  // длинные списки: порция карточек, остальное по кнопке, а не простыня на 50
  function paginate(list, step) {
    var cards = [].slice.call(list.children).filter(function (c) { return c.tagName === 'ARTICLE'; });
    var shown = step;
    if (cards.length <= step) return;
    var more = document.createElement('div');
    more.className = 'catalog-more';
    more.innerHTML = '<p></p><button type="button" class="btn btn-line">Show more</button>';
    list.after(more);
    function render() {
      cards.forEach(function (c, i) { c.hidden = i >= shown; });
      var left = cards.length - shown;
      more.hidden = left <= 0;
      more.querySelector('p').textContent = 'Showing ' + Math.min(shown, cards.length) + ' of ' + cards.length;
      more.querySelector('button').textContent = 'Show ' + Math.min(step, left) + ' more';
    }
    more.querySelector('button').addEventListener('click', function () { shown += step; render(); });
    render();
  }
  var grid = document.querySelector('.catalog-grid');
  if (grid) paginate(grid, 12);
  var own = document.querySelector('.cabinet-list');
  if (own) paginate(own, 20);
  if (grid) {
    var total = document.querySelector('.catalog-title .meta');
    var show = document.querySelector('.filter-actions .btn:not(.btn-line)');
    if (total && show) show.textContent = 'Show ' + total.textContent;
  }

  // меню «ещё» у своего объявления
  function closeMore(except) {
    document.querySelectorAll('.card-more-btn[aria-expanded="true"]').forEach(function (b) {
      if (b === except) return;
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling.hidden = true;
    });
  }
  document.querySelectorAll('.card-more-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = btn.getAttribute('aria-expanded') !== 'true';
      closeMore(btn);
      btn.setAttribute('aria-expanded', String(open));
      btn.nextElementSibling.hidden = !open;
      if (open) btn.nextElementSibling.querySelector('button').focus();
    });
  });
  document.addEventListener('click', function () { closeMore(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMore(); });

  var LABEL = { published: 'Published', reserved: 'Reserved', sold: 'Sold', archived: 'Unpublished' };
  function setStatus(card, status) {
    var pill = card.querySelector('.status-pill');
    pill.className = 'status-pill status-' + status;
    pill.textContent = LABEL[status];
  }
  document.querySelectorAll('.card-more-menu [data-status]').forEach(function (item) {
    item.addEventListener('click', function () {
      var card = item.closest('.cabinet-card');
      var was = card.querySelector('.status-pill').className.replace(/.*status-/, '');
      if (item.dataset.confirm && !window.confirm(item.dataset.confirm)) return;
      closeMore();
      setStatus(card, item.dataset.status);
      var old = card.querySelector('.card-undo');
      if (old) old.remove();
      var undo = document.createElement('div');
      undo.className = 'card-undo';
      undo.setAttribute('role', 'status');
      undo.innerHTML = '<span>Status changed to ' + LABEL[item.dataset.status].toLowerCase() + '.</span><button type="button" class="btn btn-line">Undo</button>';
      undo.querySelector('button').addEventListener('click', function () { setStatus(card, was); undo.remove(); });
      card.querySelector('.cabinet-actions').after(undo);
    });
  });

  // заявки: кнопки статуса работают, после WhatsApp заявка сама становится «отвечена»
  function leadState(card, state) {
    card.classList.remove('lead-new', 'lead-read', 'lead-replied');
    card.classList.add('lead-' + state);
    var pill = card.querySelector('.status-pill');
    pill.className = 'status-pill status-' + state;
    pill.textContent = state[0].toUpperCase() + state.slice(1);
    card.querySelectorAll('.cabinet-actions button').forEach(function (b) {
      var to = /read$/.test(b.textContent) ? 'read' : 'replied';
      b.hidden = state === 'replied' || (state === 'read' && to === 'read');
    });
  }
  document.querySelectorAll('.lead-card').forEach(function (card) {
    card.querySelectorAll('.cabinet-actions button').forEach(function (b) {
      b.addEventListener('click', function () { leadState(card, /read$/.test(b.textContent) ? 'read' : 'replied'); });
    });
    var wa = card.querySelector('.action-main');
    if (wa) wa.addEventListener('click', function () { leadState(card, 'replied'); });
  });

  // «/» ставит курсор в поиск заявок
  var search = document.querySelector('.leads-search');
  if (search) {
    search.setAttribute('aria-label', 'Search requests');
    if (!search.placeholder) search.placeholder = 'Search by name, phone or property';
    search.setAttribute('aria-keyshortcuts', '/');
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      search.focus();
    });
  }

  // форма заявки по объекту: ошибки у поля и понятный итог
  var form = document.querySelector('.listing-contact form');
  if (form) {
    form.noValidate = true;
    var MSG = {
      name: 'Enter your name.',
      phone: 'Enter a phone number with the country code, for example +62.',
      email: 'This email looks incomplete.',
      message: 'Write a few words so the seller knows what to answer.',
    };
    function check(input) {
      var bad = !input.checkValidity();
      input.setAttribute('aria-invalid', String(bad));
      var hint = input.parentNode.querySelector('.field-error');
      if (bad && !hint) {
        hint = document.createElement('span');
        hint.className = 'field-error';
        hint.id = 'err-' + input.name;
        input.setAttribute('aria-describedby', hint.id);
        input.after(hint);
      }
      if (hint) hint.textContent = bad ? MSG[input.name] : '';
      return !bad;
    }
    var inputs = [].slice.call(form.querySelectorAll('input,textarea'));
    inputs.forEach(function (i) {
      i.addEventListener('blur', function () { if (i.value) check(i); });
      i.addEventListener('input', function () { if (i.getAttribute('aria-invalid') === 'true') check(i); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = inputs.filter(function (i) { return !check(i); });
      if (bad.length) { bad[0].focus(); return; }
      form.innerHTML = '<div class="form-done" role="status"><h2>Request sent</h2>'
        + '<p>The seller will contact you by phone or WhatsApp.</p></div>';
    });
  }
})();

// кабинет: карточки или плотный список, выбор запоминается
(function () {
  var list = document.querySelector('.cabinet-list');
  var head = document.querySelector('.cabinet-head');
  if (!list || !head || list.querySelector('.lead-card')) return;
  var box = document.createElement('div');
  box.className = 'density';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'List view');
  box.innerHTML = '<button type="button" data-v="cards">Cards</button><button type="button" data-v="compact">Compact</button>';
  head.appendChild(box);
  function set(v) {
    list.classList.toggle('is-compact', v === 'compact');
    box.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === v)); });
    try { localStorage.setItem('cabinet-view', v); } catch (e) {}
  }
  var saved = 'cards';
  try { saved = localStorage.getItem('cabinet-view') || 'cards'; } catch (e) {}
  box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) set(b.dataset.v); });
  set(saved);
})();
