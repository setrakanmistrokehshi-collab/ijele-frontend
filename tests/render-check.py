"""
Static render check. Loads the REAL src/styles/storefront.css with hand-written markup that mirrors the React components
(Header, HeroSwiper, ProductCard, HomePage, ProductPage, CartDrawer, forms, Footer), then checks in headless Chromium:
horizontal overflow, tap-target size, text contrast, heading order, visible focus.
It verifies the CSS and layout. It does NOT run the React code, the 3D scene, or the API.
Run:  python3 tests/render-check.py        (needs: pip install playwright && playwright install chromium)
"""
import base64, json, pathlib, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = (ROOT / 'src' / 'styles' / 'storefront.css').read_text()
OUT = pathlib.Path('/tmp/qa'); OUT.mkdir(exist_ok=True)
VIEWPORTS = [320, 375, 768, 1440]

def photo(hue, label):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="hsl({hue} 18% 86%)"/><circle cx="300" cy="300" r="120" fill="none" stroke="hsl({hue} 30% 40%)" stroke-width="10"/><text x="300" y="520" font-size="28" text-anchor="middle" fill="hsl({hue} 20% 30%)">{label}</text></svg>'
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode()).decode()
ICON = '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
BAG = '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0"/></svg>'

def card(name, sku, cat, price, photos=1, sold=False, gift=None):
    imgs = ''.join(f'<img class="{"on" if i == 0 else ""}" src="{photo(40 + i * 25, name)}" alt="{name}" width="600" height="600" {"" if i == 0 else "aria-hidden=true"}>' for i in range(photos))
    nav = ''
    if photos > 1:
        dots = ''.join(f'<button type="button" tabindex="-1" aria-label="Show photo {i+1} of {photos}" aria-current="{str(i == 0).lower()}"></button>' for i in range(photos))
        nav = f'<button class="gal-arrow l" type="button" aria-label="Previous photo">{ICON}</button><button class="gal-arrow r" type="button" aria-label="Next photo">{ICON}</button><div class="gal-dots">{dots}</div>'
    art = f'<div class="art gal"><a class="gal-link" href="#" aria-label="View {name}">{imgs}{"<span class=badge>Sold out</span>" if sold else ""}</a>{nav}</div>'
    g = f'<p class="gift">{ICON}Free gift: {gift}</p>' if gift else ''
    btn = '<button class="cta quiet" type="button" disabled>Sold out</button>' if sold else f'<button class="cta quiet" type="button">Add to bag<span class="vh">, {name}</span></button>'
    return f'<article class="card">{art}<div class="meta"><span class="ref">{sku} · {cat}</span><h3 class="name"><a href="#">{name}</a></h3><p class="price">{price}</p>{g}<div class="actions">{btn}</div></div></article>'

def header(free=True):
    bar = '<div class="top">Free standard delivery on orders over $1,000.00</div>' if free else ''
    return f'''{bar}<header class="main"><div class="wrap"><a class="logo" href="#">Aurora<small>FINE JEWELRY</small></a>
<nav class="links" aria-label="Primary"><a href="#">Watches</a><a href="#">Chains</a><a href="#">Necklaces</a></nav>
<div class="icons"><select class="cur" aria-label="Currency"><option>USD</option></select>
<button type="button" aria-label="Open bag, 2 items">{BAG}<span class="count" aria-hidden="true">2</span></button>
<button type="button" class="burger" aria-label="Open menu">{BAG}</button></div></div></header>'''

def hero():
    return f'''<section class="hero" aria-label="Featured collections"><div class="wrap hero-grid"><div class="hero-copy">
<h1>Fine jewelry, tracked to your door.</h1><p>Watches, chains and necklaces. Pay in USD, NGN, EUR or GBP, then follow your order from packing to delivery.</p>
<p class="hero-feature" aria-live="polite"><strong>Watches</strong>: 4 pieces, from $1,800.00</p>
<div class="hero-actions"><a class="cta" href="#">Shop watches{ICON}</a><a class="textlink" href="#">Track an order</a></div></div>
<div class="hero-stage"><div class="hero-fallback" aria-hidden="true">{BAG}</div></div>
<div class="hero-index" role="group" aria-label="Choose a category to feature"><button type="button" aria-pressed="true"><b>01</b>Watches</button><button type="button" aria-pressed="false"><b>02</b>Chains</button><button type="button" aria-pressed="false"><b>03</b>Necklaces</button></div></div></section>'''

CARDS = ''.join([card('Royal Chronograph', 'AUR-W-001', 'Watch', '$1,800.00', 3, gift='Aurora gift box'), card('Cuban Link', 'AUR-C-002', 'Chain', '$950.00', 2),
                 card('Diamond Pendant Necklace', 'AUR-N-003', 'Necklace', '$2,400.00', 1), card('Aurora Diver', 'AUR-W-004', 'Watch', '$2,100.00', 1, sold=True)])
CHIPS = '<button class="chip" type="button" aria-pressed="true">All pieces</button><button class="chip" type="button" aria-pressed="false">Watches</button><button class="chip" type="button" aria-pressed="false">Chains</button><button class="chip" type="button" aria-pressed="false">Necklaces</button>'
def shop(body):
    return f'''<section class="sec" id="shop" aria-labelledby="shop-title"><div class="bar"><div><h2 id="shop-title">The collection</h2><p class="lede">Prices shown in USD.</p></div>
<div class="tools" role="group" aria-label="Filter by category">{CHIPS}</div></div>
<div class="sortbar"><span class="note" role="status">4 pieces</span><label>Sort by <select><option>Featured</option></select></label></div>{body}</section>'''
PROCESS = '''<section class="process" aria-labelledby="process-title"><h2 id="process-title">From your screen to your door</h2><ol class="steps">
<li><div><h3>Choose in your currency</h3><p>Prices show in USD, NGN, EUR or GBP. Change the currency from the header at any time.</p></div></li>
<li><div><h3>See the delivery fee before you pay</h3><p>The fee depends on your city, state and country, with standard and express options.</p></div></li>
<li><div><h3>Pay on Bachs’s hosted page</h3><p>Checkout sends you to Bachs to pay. Payment details are entered there, not on this site.</p></div></li>
<li><div><h3>Follow it until it arrives</h3><p>You receive the carrier and tracking number by email, and by push notification if you allow them. <a class="textlink" href="#">Track an order</a>.</p></div></li></ol></section>
<section class="ask" aria-labelledby="ask-title"><h2 id="ask-title">Choosing a piece, or checking on an order?</h2><div><a class="cta" href="#">Message us</a><a class="cta quiet" href="#">Track an order</a></div></section>'''
FOOTER = '''<footer><div class="wrap"><div class="foot"><div><span class="logo">Aurora<small>FINE JEWELRY</small></span><p>Watches, chains and necklaces. Prices in USD, NGN, EUR and GBP; payment on Bachs’s hosted checkout page.</p></div>
<nav aria-label="Shop"><h2>Shop</h2><ul><li><a href="#">Watches</a></li><li><a href="#">Chains</a></li><li><a href="#">Necklaces</a></li></ul></nav>
<nav aria-label="Your order"><h2>Your order</h2><ul><li><a href="#">Track an order</a></li><li><a href="#">My orders</a></li></ul></nav>
<div><h2>Help</h2><ul><li><a href="#">Contact us</a></li></ul></div></div><p class="legal">© 2026 Aurora Fine Jewelry.</p></div></footer>'''

SKEL = '<div class="grid" aria-busy="true">' + ''.join('<div aria-hidden="true"><div class="skel img"></div><div class="skel line"></div><div class="skel line short"></div></div>' for _ in range(6)) + '</div>'
ERR = '<div class="state" role="alert"><h3>The collection didn’t load</h3><p>We couldn’t reach the server. Check your connection and try again.</p><button type="button" class="cta">Try again</button></div>'
EMPTY = '<div class="state"><h3>No chains right now</h3><p>Nothing in this category is listed at the moment.</p><button type="button" class="cta">Show all pieces</button></div>'

def wrap(inner): return f'<main id="main" tabindex="-1">{inner}</main>'
PAGES = {
 'home': header() + wrap(hero() + f'<div class="wrap">{shop("<div class=grid>" + CARDS + "</div>")}{PROCESS}</div>') + FOOTER,
 'home-loading': header(False) + wrap(hero() + f'<div class="wrap">{shop(SKEL)}</div>') + FOOTER,
 'home-error': header(False) + wrap(hero() + f'<div class="wrap">{shop(ERR)}</div>') + FOOTER,
 'home-empty': header(False) + wrap(hero() + f'<div class="wrap">{shop(EMPTY)}</div>') + FOOTER,
 'product': header() + wrap(f'''<div class="wrap sec"><nav class="crumbs" aria-label="Breadcrumb"><a href="#">The collection</a> / <a href="#">Watch</a></nav><article class="dlg"><div class="art"><div class="pgal"><img src="{photo(40,'Royal Chronograph')}" alt="Royal Chronograph" width="900" height="900"><ul class="pgal-thumbs" aria-label="Product photos">{"".join(f'<li><button type="button" aria-label="Show photo {i+1} of 3" aria-current="{str(i==0).lower()}"><img src="{photo(40+i*25,"t")}" alt="" width="60" height="60"></button></li>' for i in range(3))}</ul></div></div>
<div class="body"><span class="ref">AUR-W-001 · Watch</span><h1 class="pg">Royal Chronograph</h1><p class="price">$1,800.00</p><p class="gift">{ICON}Free gift: Aurora gift box</p>
<section><h2>About this piece</h2><p>A chronograph watch. Description text from the catalogue is shown here exactly as the admin entered it.</p></section>
<section><h2>Delivery</h2><h3>Cost</h3><p>Choose standard or express at checkout. The fee depends on your city, state and country, and is shown before you pay.</p><h3>Tracking</h3><p>When your order ships you get the carrier and tracking number by email, and by push notification if you have allowed them.</p></section>
<div class="buy"><div class="qty"><button type="button" aria-label="Decrease quantity">−</button><span aria-label="Quantity 1">1</span><button type="button" aria-label="Increase quantity">+</button></div><button class="cta" type="button">Add to bag</button></div></div></article></div>''') + FOOTER,
 'checkout': header() + wrap(f'''<div class="wrap sec"><h1 class="pg">Checkout</h1><form class="co" novalidate><div class="body"><fieldset><legend>Contact</legend><div class="stack">
<div class="fld"><label for="e">Email address</label><input id="e" type="email" value="ada@example.com"></div>
<div class="fld"><label for="p">Phone number</label><input id="p" type="tel" aria-invalid="true" aria-describedby="pe" value="12"><p id="pe" role="alert" class="field-error">Enter a valid phone number, e.g. +234 801 234 5678.</p></div></div></fieldset>
<fieldset><legend>Delivery address</legend><div class="stack"><div class="two"><div class="fld"><label for="f">First name</label><input id="f" type="text"></div><div class="fld"><label for="l">Last name</label><input id="l" type="text"></div></div>
<div class="fld"><label for="a">Street address</label><input id="a" type="text"></div><div class="two"><div class="fld"><label for="c">City</label><input id="c" type="text"></div><div class="fld"><label for="z">Postal code</label><input id="z" type="text"></div></div>
<div class="fld"><label for="co">Country</label><select id="co" class="f"><option>Nigeria</option></select></div></div></fieldset>
<fieldset><legend>Delivery method</legend><div class="stack"><label class="opt"><input type="radio" name="m" checked>Standard delivery<b>Free</b></label><label class="opt"><input type="radio" name="m">Express delivery<b>$55.00</b></label></div><p class="note">The fee depends on your city, state and country. Standard delivery is free on orders over $1,000.00.</p></fieldset>
<p class="note">You pay on Bachs’s hosted checkout page. Card details are entered there, not on this site.</p></div>
<div class="sum"><h2>Order summary</h2><ul><li><span>Royal Chronograph × 1</span><span>$1,800.00</span></li></ul><div class="row"><span>Subtotal</span><span>$1,800.00</span></div><div class="row"><span>Shipping</span><span>Free</span></div><div class="row total"><span>Total</span><span>$1,800.00</span></div><button class="cta" type="submit" style="width:100%;margin-top:1rem">Continue to payment</button></div></form></div>''') + FOOTER,
 'contact': header() + wrap('''<div class="wrap sec"><h1 class="pg">Contact us</h1><p class="lede">Ask about a piece, an order or a private appointment. If it is about an order, include the order number.</p><div class="cgrid single"><form class="stack" novalidate>
<div class="two"><div class="fld"><label for="n">Full name</label><input id="n" type="text"></div><div class="fld"><label for="em">Email address</label><input id="em" type="email"></div></div>
<div class="two"><div class="fld"><label for="ph">Phone (optional)</label><input id="ph" type="tel" placeholder="+234 801 234 5678"></div><div class="fld"><label for="t">Topic</label><select id="t" class="f"><option>Product enquiry</option></select></div></div>
<div class="fld"><label for="m">Message</label><textarea id="m" placeholder="How can we help?"></textarea></div><button class="cta" type="submit">Send message</button></form></div></div>''') + FOOTER,
 'track': header() + wrap('''<div class="wrap sec"><h1 class="pg">Track your order</h1><form class="stack" style="max-width:460px"><div class="fld"><label for="o">Order number</label><input id="o" type="text" placeholder="AUR-1234567"></div><div class="fld"><label for="te">Email address</label><input id="te" type="email"></div><button class="cta" type="submit">Track order</button></form>
<ol class="tl"><li class="d">Order confirmed</li><li class="d">Packed</li><li>Shipped</li><li>Delivered</li></ol></div>''') + FOOTER,
 'cart-open': header() + wrap('<div class="wrap sec"><h1 class="pg">Page behind the bag</h1></div>') + f'''<div class="scrim on"></div><aside class="drawer on" aria-label="Shopping bag"><div class="dh"><h2>Your bag</h2><button type="button" aria-label="Close bag">{ICON}</button></div>
<ul><li><div class="thumb"><img src="{photo(40,'x')}" alt="" width="160" height="160"></div><div><h3>Royal Chronograph</h3><p>$1,800.00</p><p class="gift">{ICON}+ Aurora gift box (free)</p><div class="qty"><button type="button" aria-label="Decrease Royal Chronograph">−</button><span>1</span><button type="button" aria-label="Increase Royal Chronograph">+</button><button type="button" class="link">Remove</button></div></div></li></ul>
<div class="row"><span>Subtotal</span><strong class="price">$1,800.00</strong></div><p class="note">Shipping and taxes are shown at checkout.</p><button class="cta" type="button">Go to checkout</button></aside>''',
}

JS_CHECKS = r"""
() => {
  const out = {overflow: [], small: [], tiny: [], contrast: [], headings: []};
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.overflow.push('PAGE scrollWidth ' + document.documentElement.scrollWidth + ' > ' + vw);
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const label = (el) => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : '') + ' "' + (el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30)) + '"');
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('.drawer:not(.on)')) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && !el.closest('.scroll') && getComputedStyle(el).position !== 'fixed') out.overflow.push(label(el) + ' right=' + Math.round(r.right));
  }
  for (const el of document.querySelectorAll('a, button, input:not([type=hidden]):not(.hp), select, textarea')) {
    if (!vis(el)) continue;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (el.tagName === 'A' && s.display === 'inline') continue;            // inline text links are exempt (WCAG 2.5.8)
    if (el.matches('input[type=radio]') && el.closest('label')) continue;  // the whole label is the target
    if (el.closest('.gal-dots') && el.tabIndex === -1) { if (Math.min(r.width, r.height) < 24) out.small.push(label(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); continue; }
    const m = Math.min(r.width, r.height);
    if (m < 24) out.small.push(label(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    else if (m < 40 && !el.closest('.gal-arrow')) out.tiny.push(label(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return {r: m[0], g: m[1], b: m[2], a: m[3] === undefined ? 1 : m[3]}; };
  const lum = ({r, g, b}) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (top, bottom) => ({r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1});
  const bgOf = (el) => { const stack = []; for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0) { stack.push(c); if (c.a === 1) break; } } let base = {r: 255, g: 255, b: 255, a: 1}; for (const c of stack.reverse()) base = blend(c, base); return base; };
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.disabled || el.closest('[aria-hidden=true]') || el.closest('.drawer:not(.on)')) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const s = getComputedStyle(el); const fg = parse(s.color); const bg = bgOf(el);
    const text = blend(fg, bg); const ratio = (Math.max(lum(text), lum(bg)) + 0.05) / (Math.min(lum(text), lum(bg)) + 0.05);
    const px = parseFloat(s.fontSize), bold = parseInt(s.fontWeight) >= 700;
    const need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
    const key = label(el) + ratio.toFixed(2);
    if (ratio < need && !seen.has(key)) { seen.add(key); out.contrast.push(label(el) + ' ' + ratio.toFixed(2) + ' < ' + need); }
  }
  let prev = 0;
  for (const h of document.querySelectorAll('h1,h2,h3,h4')) { if (!vis(h)) continue; const lv = +h.tagName[1]; out.headings.push(lv); }
  return out;
}
"""

def run():
    summary = {}; failures = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for theme in ['light', 'dark']:
            for name, body in PAGES.items():
                if theme == 'dark' and name not in ('home', 'product', 'checkout', 'cart-open'): continue
                html = f'<!doctype html><html lang="en" data-theme="{theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{name}</title><style>{CSS}</style></head><body><a class="skip" href="#main">Skip to content</a>{body}</body></html>'
                for w in VIEWPORTS:
                    ctx = browser.new_context(viewport={'width': w, 'height': 900}, device_scale_factor=1, reduced_motion='reduce')
                    page = ctx.new_page(); page.set_content(html); page.wait_for_timeout(60)
                    res = page.evaluate(JS_CHECKS)
                    lv = res.pop('headings')
                    bad_order = [f'h{a}->h{b}' for a, b in zip(lv, lv[1:]) if b - a > 1]
                    if lv.count(1) != 1 and name not in ('cart-open',): bad_order.append(f'h1 count={lv.count(1)}')
                    res['heading_order'] = bad_order
                    key = f'{name}@{w}/{theme}'
                    summary[key] = res
                    failures += len(res['overflow']) + len(res['small']) + len(res['contrast']) + len(res['heading_order'])
                    if theme == 'light': page.screenshot(path=str(OUT / f'{name}-{w}.png'), full_page=True)
                    ctx.close()
        # keyboard: every focusable thing must show a visible focus indicator
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}); page = ctx.new_page()
        page.set_content(f'<!doctype html><html lang="en" data-theme="light"><head><style>{CSS}</style></head><body><a class="skip" href="#main">Skip to content</a>{PAGES["home"]}</body></html>')
        focus_fail = []; count = 0
        for _ in range(40):
            page.keyboard.press('Tab'); count += 1
            info = page.evaluate("() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); return {t: e.tagName + ' ' + (e.getAttribute('aria-label') || e.textContent.trim().slice(0, 24)), w: parseFloat(s.outlineWidth), st: s.outlineStyle}; }")
            if info and (info['st'] == 'none' or info['w'] < 2): focus_fail.append(info['t'])
        ctx.close(); browser.close()
    summary['focus'] = {'tabbed': count, 'without_visible_ring': focus_fail}
    failures += len(focus_fail)
    return summary, failures

if __name__ == '__main__':
    summary, failures = run()
    (OUT / 'summary.json').write_text(json.dumps(summary, indent=1))
    hard = {k: {c: v for c, v in r.items() if v and c in ('overflow', 'small', 'contrast', 'heading_order')} for k, r in summary.items() if k != 'focus'}
    hard = {k: v for k, v in hard.items() if v}
    print('FAILURES:', failures)
    for k, v in hard.items(): print(' ', k, json.dumps(v)[:400])
    print('focus:', summary['focus'])
    tiny = sorted({t for k, r in summary.items() if k != 'focus' for t in r['tiny']})
    print('targets 24-39px (pass AA, below the 44px comfort size):', len(tiny)); [print('   ', t) for t in tiny[:12]]
    sys.exit(1 if failures else 0)
