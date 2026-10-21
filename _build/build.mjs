// Собирает локальные копии страниц стенда с новой шапкой: index.html (гость) и leads.html (админ)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(root, '_src', f), 'utf8');
const part = fs.readFileSync(path.join(root, 'parts', 'header.html'), 'utf8');

const cssName = fs.readdirSync(path.join(root, '_src')).find((f) => f.endsWith('.css'));
fs.writeFileSync(
  path.join(root, 'base.css'),
  src(cssName).replace(/url\(\/_next\/static\/media\/[^)]+\.ttf\)/, 'url(font.ttf)')
);

const subNav = `<div class="hdr-sub"><div class="hdr-sub-inner"><nav class="hdr-sub-nav" aria-label="Catalog sections">
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
    .replace('<!--SUB-->', o.sub ? subNav : '');
  // на Pages переходы между двумя собранными страницами, остальные ссылки как на стенде
  const local = header.replaceAll('href="/cabinet/leads"', 'href="leads.html"').replaceAll('href="/"', 'href="index.html"');
  const [bar, sheet] = local.split(/(?=<div class="hdr-sheet")/);

  let html = src(file)
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<link[^>]+rel="preload"[^>]+as="script"[^>]*>/g, '')
    .replace(/<header class="site-header">[\s\S]*?<\/header>/, bar.trim())
    .replace(/<link rel="stylesheet" href="\/_next\/static\/css\/[^"]+"[^>]*>/, '<link rel="stylesheet" href="base.css"><link rel="stylesheet" href="header.css">')
    .replace('</body>', `${sheet.trim()}\n<script src="header.js"></script></body>`);
  for (const [from, to] of people) html = html.replaceAll(from, to);
  html = html.replace('<head>', '<head><meta name="robots" content="noindex, nofollow">');
  fs.writeFileSync(path.join(root, out), html);
  console.log(out, html.length);
}

build('home.html', 'index.html', { buyOn: true, sub: true });
build('requests.html', 'leads.html', { user: true, leads: 4 });
