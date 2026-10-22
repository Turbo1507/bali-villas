// Собирает локальные копии страниц стенда с новой шапкой и правками поверх CSS стенда
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from './en.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(root, '_src', f), 'utf8');
const part = fs.readFileSync(path.join(root, 'parts', 'header.html'), 'utf8');

// основной CSS стенда -> base.css, карта -> leaflet.css
const standCss = { '02ba4c0795b674fb.css': 'base.css', 'ab28570ae691aba6.css': 'leaflet.css' };
for (const [from, to] of Object.entries(standCss)) {
  fs.writeFileSync(path.join(root, to), src(from).replace(/url\(\/_next\/static\/media\/[^)]+\.ttf\)/, 'url(font.ttf)'));
}

// адреса стенда -> собранные файлы, чтобы по превью можно было ходить
function localHref(h) {
  const u = h.replace(/&amp;/g, '&');
  if (u === '/') return 'index.html';
  if (u.startsWith('/catalog')) return u.includes('view=map') ? 'map.html' : 'catalog.html';
  if (u.startsWith('/listings/')) return 'listing.html';
  const map = { '/services': 'services.html', '/commercial': 'commercial.html', '/login': 'login.html', '/register': 'login.html',
    '/cabinet/leads': 'leads.html', '/cabinet/listings': 'cab-listings.html', '/cabinet/moderation': 'cab-moderation.html',
    '/cabinet/new': 'cab-new.html', '/cabinet': 'cabinet.html' };
  const [base, hash] = u.split('#');
  return map[base] ? map[base] + (hash ? '#' + hash : '') : h;
}

const subNavHtml = `<div class="hdr-sub"><div class="hdr-sub-inner"><nav class="hdr-sub-nav" aria-label="Catalog sections">
  <a href="/catalog?construction_status=off_plan&amp;limit=60">New builds</a>
  <a href="/catalog?property_type=villa&amp;limit=60">Villas</a>
  <a href="/catalog?property_type=apartment&amp;limit=60">Apartments</a>
  <a href="/catalog?property_type=house&amp;limit=60">Houses</a>
  <a href="/catalog?property_type=land&amp;limit=60">Land</a>
  <a href="/commercial">Commercial</a>
  <a href="/services">Services</a>
</nav></div></div>`;

const signIn = '<a class="hdr-signin" href="/login">Sign in</a>';

const account = `<div class="hdr-pop">
        <button type="button" class="hdr-account" aria-haspopup="menu" aria-expanded="false" aria-label="Account: Bali Admin">
          <span class="hdr-avatar">BA</span>
          <svg class="hdr-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
        </button>
        <div class="hdr-menu" role="menu" hidden>
          <div class="hdr-menu-who"><strong>Bali Admin</strong><span>Admin</span></div>
          <a role="menuitem" href="/cabinet">Cabinet</a>
          <a role="menuitem" href="/cabinet/leads">Requests <span class="hdr-menu-count">4</span></a>
          <a role="menuitem" href="/cabinet/listings">My listings</a>
          <a role="menuitem" href="/favorites">Favorites</a>
          <button type="button" role="menuitem" class="hdr-menu-out">Sign out</button>
        </div>
      </div>`;

// в снятых заявках живые контакты, наружу они уходить не должны
const people = [
  ['Мария Богданович', 'Тестовый покупатель'], ['>МБ<', '>ТП<'],
  ['mariayogachi1988@gmai.com', 'buyer@example.com'],
  ['79324125652', '79000000001'],
  ['Андрей Смирнов', 'Второй покупатель'], ['>АС<', '>ВП<'],
  ['79005551212', '79000000002'],
];

function build(file, out, o) {
  const header = part
    .replace('<!--BUY_ON-->', o.buyOn ? ' is-on' : '')
    .replace('<!--LEADS_LABEL-->', o.leads ? `, ${o.leads} new` : '')
    .replace('<!--LEADS_BADGE-->', o.leads ? `<span class="hdr-badge" aria-hidden="true">${o.leads}</span>` : '')
    .replaceAll('<!--CTA_HREF-->', o.user ? '/cabinet/new' : '/register')
    .replace('<!--ACCOUNT-->', o.user ? account : signIn)
    .replace('<!--SUB-->', o.sub ? subNavHtml.replace(`>${o.section}</a>`, ` class="is-on" aria-current="page">${o.section}</a>`) : '');
  const [bar, sheet] = header.split(/(?=<div class="hdr-sheet")/);

  let html = src(file)
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<link[^>]+rel="preload"[^>]+as="script"[^>]*>/g, '')
    .replace(/<header class="site-header">[\s\S]*?<\/header>/, bar.trim())
    .replace(/<link rel="stylesheet" href="\/_next\/static\/css\/([^"]+)"[^>]*>/g, (m, f) => f === '02ba4c0795b674fb.css'
      ? '<link rel="stylesheet" href="base.css"><link rel="stylesheet" href="header.css"><link rel="stylesheet" href="fixes.css">'
      : `<link rel="stylesheet" href="${standCss[f]}">`)
    .replace(/<link rel="preload"[^>]*href="\/_next\/static\/(?:css|media)[^>]*>/g, '')
    .replace('</body>', `${sheet.trim()}\n<script src="header.js"></script></body>`);
  for (const [from, to] of people) html = html.replaceAll(from, to);
  for (const fix of o.fixes || []) html = fix(html);
  for (const fix of pageFixes) html = fix(html, o);
  html = html.replace(/href="(\/[^"]*)"/g, (m, h) => `href="${localHref(h)}"`);
  html = html.replace(/<title>[^<]*<\/title>/,`<title>${TITLES[out]} | UNIT. BALI VILLAS</title>`);
  html = html.replace('<head>', '<head><meta name="robots" content="noindex, nofollow">');
  fs.writeFileSync(path.join(root, out), html);
  console.log(out, html.length);
}

// правки разметки страниц (то, что одним CSS не поправить)
const today = new Date(2026, 9, 21);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(m, d, y) {
  const days = Math.round((today - new Date(y, m - 1, d)) / 864e5);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `${MON[m - 1]} ${+d}`;
}
// «Added 10/13/2026, 01:16 PM · Published …» -> «Added 8 days ago, published Oct 13»
function listingDates(s) {
  return s.split(' · ').map((part, i) => {
    const [, verb, m, d, y] = part.match(/(\w+) (\d+)\/(\d+)\/(\d+)/) || [];
    if (!verb) return part;
    return `${i ? verb.toLowerCase() : verb} ${shortDate(m, d, y)}`;
  }).join(', ');
}
// время заявки: «10/20/2026, 12:41:28 PM» -> «Yesterday, 12:41 PM»
function leadTime(m, d, y, hh, mm, ap) {
  const day = shortDate(m, d, y);
  return `${day[0].toUpperCase() + day.slice(1)}, ${+hh}:${mm} ${ap}`;
}

const svg = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>',
};
const wordmark = '<a class="hdr-logo" href="/"><b>UNIT.</b>&nbsp;BALI VILLAS</a>';

const pageFixes = [
  // русские тексты объявлений -> EN
  (h) => { for (const [ru, tr] of en) h = h.replaceAll(ru, tr); return h; },
  // без средней точки и тире в мета-строках
  (h) => h.replace(/<p class="listing-dates">([^<]+)<\/p>/g, (m, s) => `<p class="listing-dates">${listingDates(s)}</p>`)
    .replace(/(class="badge listing-date-badge">)([^<]+)</g, (m, a, s) => `${a}${listingDates(s)}<`)
    .replace(/ · Requests: (\d+)/g, (m, n) => `, ${n} request${n === '1' ? '' : 's'}`)
    .replace(/ · /g, ', ')
    .replace(/<strong>Leasehold — long-term lease<\/strong>/g, '<strong>Leasehold<span class="fact-hint">Right to use the property for the term set in the lease contract.</span></strong>')
    .replace(/Leasehold — long-term lease/g, 'Leasehold (long-term lease)')
    .replace(/<p class="meta">(\d+)\/(\d+)\/(\d+), (\d+):(\d+):\d+ (AM|PM)<\/p>/g, (m, ...a) => `<p class="meta">${leadTime(...a)}</p>`),
  // «4.2 are (420 m²)»: местную меру убираем, оставляем м²
  (h) => h.replace(/[\d.]+ are \(([\d,]+ m²)\)/g, '$1'),
  // иконки вместо символов ♥ ‹ ›
  (h) => h.replace(/(<button type="button" class="heart[^"]*" aria-label=")Save(">)♥/g, `$1Save to favorites" aria-pressed="false$2${svg.heart}`)
    .replace(/(<button type="button" aria-label="Previous">)‹/g, `$1${svg.prev}`)
    .replace(/(<button type="button" aria-label="Next">)›/g, `$1${svg.next}`),
  // подписи полям «от/до» в фильтрах
  (h) => h.replace(/<legend>([^<]+)<\/legend><div class="pair"><input placeholder="from"([^>]*)><input placeholder="to"/g,
    (m, l, a) => `<legend>${l}</legend><div class="pair"><input placeholder="Min" aria-label="${l} min" inputmode="numeric"${a}><input placeholder="Max" aria-label="${l} max" inputmode="numeric"`),
  // главная: без плашки «Bali» и без второго ряда разделов (он уже есть под шапкой)
  (h) => h.replace(/<p class="home-hero-geo">Bali<\/p>/, '').replace(/<div class="hero-links">[\s\S]*?<\/div>/, ''),
  // логотип в подвале как в шапке
  (h) => h.replace(/<a class="logo" aria-label="Unit\. Bali Villas" href="\/">[\s\S]*?<\/a>/g, wordmark),
  // надзаголовки убираем: заголовок говорит сам
  (h) => h.replace(/<p class="auth-kicker">[^<]*<\/p>/, '')
    .replace(/<p class="wizard-kicker">([^<]*)<\/p>(<h1>[^<]*<\/h1>)/, '$2<p class="wizard-lead">$1</p>'),
  // уровни заголовков: после h1 карточки идут h2
  (h, o) => o.cardH2 ? h.replace(/<h3>([^<]*)<\/h3>/g, '<h2 class="card-title">$1</h2>')
    .replace(/<h3 class="offer-title">([^<]*)<\/h3>/g, '<h2 class="offer-title">$1</h2>') : h,
  // карточка каталога: явное действие под описанием, ведёт сразу к форме связи
  (h) => h.replace(/(<a class="offer-body" href="([^"]+)">[\s\S]*?<\/a>)<\/article>/g,
    '$1<a class="btn offer-cta" href="$2#listing-ask">Contact the seller</a></article>'),
  // своё объявление: статусы и снятие с публикации прячем в меню «ещё»
  (h) => h.replace(/<button type="button">Reserved<\/button><button class="action-warn" type="button">Sold<\/button><button type="button">Unpublish<\/button>/g,
    `<div class="card-more"><button type="button" class="card-more-btn" aria-haspopup="menu" aria-expanded="false" aria-label="More actions">${svg.more}</button>`
    + '<div class="card-more-menu" role="menu" hidden><button type="button" role="menuitem" data-status="reserved">Mark as reserved</button>'
    + '<button type="button" role="menuitem" data-status="sold" data-confirm="Mark this property as sold? It will leave the catalog.">Mark as sold</button>'
    + '<button type="button" role="menuitem" data-status="archived" class="is-danger" data-confirm="Unpublish this property? Buyers will no longer see it.">Unpublish</button></div></div>'),
  // форма заявки: телефон и WhatsApp одним полем, почта по желанию
  (h) => h.replace('<label class="field">Your name<input required="" minlength="2" value=""></label>', '<label class="field">Your name<input name="name" autocomplete="name" required="" minlength="2" value=""></label>')
    .replace('<label class="field">Phone<input required="" minlength="8" value=""></label><label class="field">WhatsApp<input value=""></label><label class="field">Email<input type="email" value=""></label>',
      '<label class="field">Phone or WhatsApp<input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+62 812 0000 0000" required="" minlength="8" value=""></label><label class="field">Email (optional)<input name="email" type="email" autocomplete="email" value=""></label>')
    .replace('<textarea rows="3"', '<textarea name="message" rows="3"'),
  // разделы без содержимого помечаем в навигации
  (h) => h.replace(/(<a href="\/commercial"[^>]*>)Commercial<\/a>/g, '$1Commercial <small class="nav-soon">soon</small></a>'),
  (h) => h.replace(/(<iframe title="Location"[^>]*) loading="lazy"/, '$1'),
  // текст для WhatsApp тоже по-английски, как весь интерфейс
  (h) => h.replace(/(wa\.me\/\d+\?text=)([^"]+)/g, (m, p, t) => {
    let s = decodeURIComponent(t);
    for (const [ru, tr] of en) s = s.replaceAll(ru, tr);
    return p + encodeURIComponent(s);
  }),
  // вход: короче подводка, пароль можно показать, регистрация отдельной кнопкой
  (h) => h.replace('One sign-in for private users and agencies. Enter your email and password.', 'One account for private sellers and agencies.')
    .replace('<input type="password" autocomplete="current-password" placeholder="••••••••" required="" name="password">',
      '<span class="pass-wrap"><input type="password" autocomplete="current-password" required="" minlength="6" name="password" id="password"><button type="button" class="pass-toggle" aria-controls="password" aria-pressed="false">Show</button></span>')
    .replace(/<p class="auth-switch">No account\?(?:<!-- -->)? <a href="([^"]+)">Create one<\/a><\/p>/,
      '<div class="auth-alt"><p>No account yet?</p><a class="btn btn-line auth-create" href="$1">Create an account</a></div>'),
  (h) => h.replace('<script src="header.js"></script>', '<script src="header.js"></script><script src="fixes.js"></script>'),
];

const TITLES = { 'index.html': 'Property for sale in Bali', 'catalog.html': 'Catalog', 'map.html': 'Map', 'listing.html': 'Villa with a pool in Canggu', 'commercial.html': 'Commercial', 'services.html': 'Services', 'login.html': 'Sign in', 'leads.html': 'Requests', 'cab-listings.html': 'All listings', 'cab-moderation.html': 'Moderation', 'cab-new.html': 'New listing', 'cabinet.html': 'Our listings' };
const pub = { buyOn: true, sub: true };
const cab = { user: true, leads: 4, cardH2: true };
build('home.html', 'index.html', pub);
build('catalog.html', 'catalog.html', { ...pub, cardH2: true });
build('map.html', 'map.html', { ...pub, cardH2: true });
build('listing.html', 'listing.html', pub);
build('commercial.html', 'commercial.html', { sub: true, section: 'Commercial' });
build('services.html', 'services.html', { sub: true, section: 'Services' });
build('login.html', 'login.html', { sub: true });
build('requests.html', 'leads.html', cab);
build('cab-listings.html', 'cab-listings.html', cab);
build('cab-moderation.html', 'cab-moderation.html', cab);
build('cab-new.html', 'cab-new.html', { ...cab, cardH2: false });
build('cab-home.html', 'cabinet.html', cab);
