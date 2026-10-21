(function () {
  var header = document.querySelector('.site-header');
  var sheet = document.getElementById('hdr-sheet');
  var burger = header.querySelector('.hdr-burger');

  function closeMenus(except) {
    header.querySelectorAll('.hdr-pop > button[aria-expanded="true"]').forEach(function (b) {
      if (b === except) return;
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling.hidden = true;
    });
  }

  header.querySelectorAll('.hdr-pop > button').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = btn.getAttribute('aria-expanded') !== 'true';
      closeMenus(btn);
      btn.setAttribute('aria-expanded', String(open));
      btn.nextElementSibling.hidden = !open;
    });
  });
  document.addEventListener('click', function () { closeMenus(); });

  // выбор языка: куки + одинаковое состояние в шапке и в мобильном меню
  function setLang(code) {
    document.cookie = 'lang=' + code + ';path=/;max-age=31536000;samesite=lax';
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      var on = b.dataset.lang === code;
      b.setAttribute(b.hasAttribute('aria-pressed') ? 'aria-pressed' : 'aria-checked', String(on));
    });
    var label = header.querySelector('.hdr-lang');
    label.firstChild.nodeValue = code.toUpperCase() + ' ';
  }
  document.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.lang); closeMenus(); });
  });

  // мобильное меню: остальная страница уходит в inert, пока оно открыто
  var page = [].slice.call(document.body.children).filter(function (el) {
    return el !== sheet && el.tagName !== 'SCRIPT';
  });
  function toggleSheet(open) {
    sheet.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    page.forEach(function (el) { el.inert = open; });
    (open ? sheet.querySelector('.hdr-sheet-close') : burger).focus();
  }
  burger.addEventListener('click', function () { toggleSheet(true); });
  sheet.querySelector('.hdr-sheet-close').addEventListener('click', function () { toggleSheet(false); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!sheet.hidden) toggleSheet(false);
    closeMenus();
  });
})();
