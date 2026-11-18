/* News Card Maker — public editor (submit only) + admin (submissions, download, brand). Static app, Supabase backend. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var FONT = '"Noto Sans Tamil","Latha","Nirmala UI","Tamil Sangam MN","Noto Sans",system-ui,sans-serif';
  var CFG = window.CM_CONFIG || {};

  /* ───────────── backend (RPC only; tables are not readable by the public) ───────────── */
  function rpc(fn, args) {
    return fetch(CFG.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: 'Bearer ' + CFG.key }, body: JSON.stringify(args || {}) })
      .then(function (r) { return r.text().then(function (t) { var j; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; } if (!r.ok) throw new Error((j && j.message) || 'Request failed'); return j; }); });
  }

  /* ───────────── brand ───────────── */
  var B = { name: '', handle: '', site: '', logo: '', owner: '', fc: '#000000', fs: 0.9, fh: 0.42 }, logoImg = null;
  function applyBrand(o) {
    if (!o) return; Object.keys(B).forEach(function (k) { if (o[k] != null) B[k] = o[k]; });
    logoImg = null; { var i = new Image(); i.onload = function () { logoImg = i; draw(); }; i.src = B.logo || 'logo.png'; }
    var y = new Date().getFullYear(); $('#copy').textContent = '© ' + y + ' ' + (B.owner || B.name || 'All rights reserved') + '. All rights reserved.';
  }
  function loadBrand() {
    try { applyBrand(JSON.parse(localStorage.getItem('cm_brand_cache') || 'null')); } catch (e) {}
    if (!CFG.url) return Promise.resolve();
    return rpc('cm_get_brand').then(function (o) { applyBrand(o); try { localStorage.setItem('cm_brand_cache', JSON.stringify(o || {})); } catch (e) {} draw(); }).catch(function () {});
  }
  function shrink(file, max, type, cb) {
    var fr = new FileReader(); fr.onload = function () { var i = new Image(); i.onload = function () { var k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); cb(c.toDataURL(type, .92), i); }; i.src = fr.result; }; fr.readAsDataURL(file);
  }
  function rgba(hex, a) { var h = String(hex || '#000').replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1'); var n = parseInt(h, 16) || 0; return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }


  /* ───────────── state ───────────── */
  var TPL = [
    { id: 1, name: 'Red', W: 1080, H: 1080, f: [['date', 'Date', 1], ['headline', 'Title', 2], ['cap', 'Photo caption', 1], ['p1', 'Script 1', 5], ['p2', 'Script 2 (red)', 5]], ph: ['Main photo', 'Small photo'] },
    { id: 2, name: 'Maroon', W: 1080, H: 1350, f: [['date', 'Date', 1], ['headline', 'Title', 2], ['sub', 'Sub title (bar)', 2], ['body', 'Script', 12]], ph: ['Top photo', 'Middle photo', 'Bottom photo'] },
    { id: 3, name: 'Blue', W: 1080, H: 1080, f: [['date', 'Date', 1], ['headline', 'Title', 2], ['body', 'Script', 8]], ph: ['Photo'], fade: true },
    { id: 4, name: 'Green', W: 1080, H: 1080, f: [['date', 'Date', 1], ['headline', 'Title', 2], ['p1', 'Script 1', 5], ['p2', 'Script 2 (green)', 5]], ph: ['Photo'] }
  ];
  function today() { var d = new Date(), m = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']; return ('0' + d.getDate()).slice(-2) + '-' + m[d.getMonth()] + '-' + d.getFullYear(); }
  function blank() { return { date: today(), headline: '', cap: '', sub: '', body: '', p1: '', p2: '' }; }
  var cur = 0, T = {}, PH = {}, active = 0;   /* T[tplId] = texts, PH[tplId] = [{img,x,y,z}] */
  function txt() { return T[TPL[cur].id] || (T[TPL[cur].id] = blank()); }
  function phs() { var id = TPL[cur].id; return PH[id] || (PH[id] = TPL[cur].ph.map(function () { return { img: null, x: 0, y: 0, z: 1 }; })); }
  function saveTxt() { try { localStorage.setItem('cm_text', JSON.stringify(T)); } catch (e) {} }
  function loadTxt() { try { T = JSON.parse(localStorage.getItem('cm_text') || '{}') || {}; } catch (e) { T = {}; } }

  /* ───────────── drawing helpers ───────────── */
  var cv = $('#cv'), g = cv.getContext('2d'), HIT = [];
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function lines(text, maxW) {
    var out = [];
    String(text || '').split('\n').forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (line && g.measureText(t).width > maxW) { out.push(line); line = w; } else line = t; });
      out.push(line);
    });
    return out;
  }
  function setF(wt, sz) { g.font = wt + ' ' + sz + 'px ' + FONT; }
  /* draw lines; opts: align l|c, justify, color */
  function put(ls, x, y, w, size, lh, o) {
    g.fillStyle = o.color; g.textBaseline = 'alphabetic';
    ls.forEach(function (l, i) {
      var yy = y + i * size * lh + size * .86;
      if (o.justify && i < ls.length - 1 && l.indexOf(' ') > 0 && ls[i + 1] !== '') {
        var ws = l.split(' '), tw = 0; ws.forEach(function (s) { tw += g.measureText(s).width; });
        var gap = (w - tw) / (ws.length - 1), cx = x; g.textAlign = 'left';
        if (gap < size * 1.2) { ws.forEach(function (s) { g.fillText(s, cx, yy); cx += g.measureText(s).width + gap; }); return; }
      }
      if (o.align === 'c') { g.textAlign = 'center'; g.fillText(l, x + w / 2, yy); } else { g.textAlign = 'left'; g.fillText(l, x, yy); }
    });
  }
  /* one block fitted into a box. valign t|m */
  function block(text, box, o) {
    if (!String(text || '').trim()) return;
    var s, ls, h;
    for (s = o.max; s >= o.min; s -= 1) { setF(o.wt, s); ls = lines(text, box.w); h = ls.length * s * o.lh; if (h <= box.h) break; }
    setF(o.wt, s); ls = lines(text, box.w); h = ls.length * s * o.lh;
    var y = o.valign === 'm' ? box.y + (box.h - h) / 2 : box.y;
    put(ls, box.x, y, box.w, s, o.lh, o);
  }
  /* two paragraphs sharing one box and one size */
  function pair(a, b, box, o) {
    a = String(a || '').trim(); b = String(b || '').trim();
    if (!a && !b) return;
    var s, la, lb, h, gap;
    for (s = o.max; s >= o.min; s -= 1) {
      setF(o.wt1, s); la = a ? lines(a, box.w) : []; setF(o.wt2, s * o.r2); lb = b ? lines(b, box.w) : [];
      gap = a && b ? s * o.gap : 0; h = la.length * s * o.lh + lb.length * s * o.r2 * o.lh + gap; if (h <= box.h) break;
    }
    setF(o.wt1, s); la = a ? lines(a, box.w) : []; setF(o.wt2, s * o.r2); lb = b ? lines(b, box.w) : [];
    gap = a && b ? s * o.gap : 0; h = la.length * s * o.lh + lb.length * s * o.r2 * o.lh + gap;
    var y = box.y + (box.h - h) / 2;
    setF(o.wt1, s); put(la, box.x, y, box.w, s, o.lh, { align: o.align, color: o.c1, justify: o.justify });
    y += la.length * s * o.lh + gap; setF(o.wt2, s * o.r2); put(lb, box.x, y, box.w, s * o.r2, o.lh, { align: o.align, color: o.c2, justify: o.justify });
  }
  /* photo with pan / zoom inside a rounded rect */
  function photo(i, x, y, w, h, r) {
    var p = phs()[i]; HIT.push({ i: i, x: x, y: y, w: w, h: h });
    g.save(); rr(x, y, w, h, r); g.clip(); g.fillStyle = '#c9d1d9'; g.fillRect(x, y, w, h);
    if (p.img) {
      var k = Math.max(w / p.img.width, h / p.img.height) * p.z, dw = p.img.width * k, dh = p.img.height * k;
      var mx = Math.max(0, (dw - w) / 2), my = Math.max(0, (dh - h) / 2); p.x = Math.max(-mx, Math.min(mx, p.x)); p.y = Math.max(-my, Math.min(my, p.y));
      g.drawImage(p.img, x + (w - dw) / 2 + p.x, y + (h - dh) / 2 + p.y, dw, dh);
    } else { g.fillStyle = '#7b8794'; setF('800', Math.min(34, w / 6)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+ ' + TPL[cur].ph[i], x + w / 2, y + h / 2); }
    g.restore();
  }
  /* wide logo, centred in a box (falls back to the brand name as text) */
  function logo(x, y, w, h, c) {
    if (logoImg) { var k = Math.min(w / logoImg.width, h / logoImg.height), dw = logoImg.width * k, dh = logoImg.height * k; g.drawImage(logoImg, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); return; }
    var nm = String(B.name || '').trim(); if (!nm) return;
    var s = h * .7; setF('900', s); while (s > 10 && g.measureText(nm).width > w) { s -= 2; setF('900', s); }
    g.fillStyle = c; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(nm, x + w / 2, y + h / 2);
  }
  /* social icons + globe */
  function icons(x, y, s, fg, bg) {
    var d = s * 1.45, cx;
    function disc(c) { g.fillStyle = fg; g.beginPath(); g.arc(c, y, s / 2, 0, 7); g.fill(); }
    cx = x + s / 2; disc(cx); g.fillStyle = bg; setF('900', s * .8); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('f', cx + s * .03, y + s * .05);
    cx += d; disc(cx); g.strokeStyle = bg; g.lineWidth = s * .09; rr(cx - s * .27, y - s * .27, s * .54, s * .54, s * .15); g.stroke(); g.beginPath(); g.arc(cx, y, s * .13, 0, 7); g.stroke(); g.fillStyle = bg; g.beginPath(); g.arc(cx + s * .17, y - s * .17, s * .035, 0, 7); g.fill();
    cx += d; disc(cx); g.fillStyle = bg; setF('900', s * .6); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('X', cx, y + s * .04);
    cx += d; disc(cx); g.fillStyle = bg; rr(cx - s * .28, y - s * .19, s * .56, s * .38, s * .1); g.fill(); g.fillStyle = fg; g.beginPath(); g.moveTo(cx - s * .06, y - s * .09); g.lineTo(cx + s * .12, y); g.lineTo(cx - s * .06, y + s * .09); g.closePath(); g.fill();
    return cx + s / 2;
  }
  function globe(cx, cy, r, c) { g.strokeStyle = c; g.lineWidth = r * .14; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.beginPath(); g.ellipse(cx, cy, r * .42, r, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.stroke(); g.beginPath(); g.moveTo(cx - r * .85, cy - r * .5); g.lineTo(cx + r * .85, cy - r * .5); g.moveTo(cx - r * .85, cy + r * .5); g.lineTo(cx + r * .85, cy + r * .5); g.stroke(); }
  function footer(y, h, fg, bg, tc, iconBg, sz) {
    /* left: icons + handle · right: globe + site */
    var cy = y + h / 2, ex = icons(34, cy, h * .62, fg, iconBg);
    g.fillStyle = tc; setF('800', sz); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(String(B.handle || '').toUpperCase(), ex + 16, cy + 1);
    g.textAlign = 'right'; var sw = g.measureText(B.site || '').width; setF('800', sz + 2); sw = g.measureText(B.site || '').width; g.fillText(B.site || '', cv.width - 36, cy + 1);
    globe(cv.width - 36 - sw - h * .42, cy, h * .3, tc);
  }
  function datebox(x, y, w, h, fill, fg, sz, text) { if (fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); } g.fillStyle = fg; setF('800', sz); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text || '', x + w / 2, y + h / 2 + 1); }

  /* Blue template: customisable fade (replaces the old black box) */
  function fv(t) { return { c: t.fc || B.fc || '#000000', s: t.fs != null && t.fs !== '' ? +t.fs : +B.fs, h: t.fh != null && t.fh !== '' ? +t.fh : +B.fh }; }
  function fadeLayer(t) {
    var f = fv(t), top = 62, ph = 956, fh = ph * Math.max(.3, Math.min(.8, f.h)), y0 = top + ph - fh, gr = g.createLinearGradient(0, y0, 0, top + ph);
    gr.addColorStop(0, rgba(f.c, 0)); gr.addColorStop(.5, rgba(f.c, f.s * .55)); gr.addColorStop(1, rgba(f.c, f.s));
    g.save(); rr(66, top, 937, ph, 32); g.clip(); g.fillStyle = gr; g.fillRect(66, y0, 937, fh); g.restore();
  }
  /* ───────────── templates ───────────── */
  function t1(t) {
    var W = 1080, H = 1080, RED = '#b01a27', DK = '#8e111c';
    g.fillStyle = '#f6eee9'; g.fillRect(0, 0, W, H);
    datebox(70, 18, 195, 42, DK, '#fff', 25, t.date);
    logo(300, 6, 480, 66, '#a3141f');
    var hg = g.createLinearGradient(0, 80, 0, 175); hg.addColorStop(0, '#a3141f'); hg.addColorStop(1, '#7d0e18');
    g.fillStyle = hg; rr(70, 80, 935, 96, 28); g.fill(); g.lineWidth = 3; g.strokeStyle = '#cf3b46'; rr(72, 82, 931, 92, 26); g.stroke();
    g.fillStyle = '#fff'; block(t.headline, { x: 100, y: 88, w: 875, h: 80 }, { wt: '800', max: 52, min: 26, lh: 1.15, valign: 'm', align: 'c', color: '#fff' });
    /* main photo + frame */
    g.fillStyle = RED; rr(60, 193, 957, 385, 38); g.fill();
    photo(0, 70, 203, 937, 365, 30);
    var gr = g.createLinearGradient(0, 470, 0, 568); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.72)');
    g.save(); rr(70, 203, 937, 365, 30); g.clip(); g.fillStyle = gr; g.fillRect(70, 470, 937, 98); g.restore();
    /* small photo */
    g.fillStyle = '#fff'; rr(838, 398, 182, 186, 34); g.fill(); g.fillStyle = RED; rr(843, 403, 172, 176, 30); g.fill();
    photo(1, 849, 409, 160, 164, 26);
    g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 8; block(t.cap, { x: 90, y: 505, w: 735, h: 56 }, { wt: '800', max: 42, min: 22, lh: 1.1, valign: 'm', align: 'c', color: '#fff' }); g.restore();
    pair(t.p1, t.p2, { x: 60, y: 600, w: 960, h: 420 }, { wt1: '600', wt2: '800', max: 36, min: 18, r2: 1.12, gap: .6, lh: 1.28, align: 'c', c1: '#222', c2: '#c1121f' });
    g.fillStyle = RED; g.fillRect(0, 1037, W, 43); footer(1037, 43, '#fff', RED, '#fff', RED, 22);
  }
  function t2(t) {
    var W = 1080, H = 1350, M = '#8a1a5e';
    g.fillStyle = '#f3eee4'; g.fillRect(0, 0, W, H);
    g.fillStyle = M; rr(12, 62, 448, 738, 10); g.fill(); photo(0, 18, 68, 436, 427, 5); photo(1, 18, 501, 436, 293, 5);
    g.fillStyle = M; rr(12, 806, 448, 472, 10); g.fill(); photo(2, 18, 812, 436, 460, 5);
    g.fillStyle = '#f7f2e8'; rr(474, 64, 560, 1206, 44); g.fill(); g.lineWidth = 3; g.strokeStyle = M; g.stroke();
    datebox(14, 14, 230, 40, '', M, 27, t.date);
    logo(480, 4, 550, 54, M);
    g.save(); rr(474, 64, 560, 1206, 44); g.clip();
    block(t.headline, { x: 490, y: 104, w: 528, h: 56 }, { wt: '800', max: 34, min: 18, lh: 1.15, valign: 'm', align: 'c', color: M });
    g.fillStyle = M; g.fillRect(474, 160, 560, 50); block(t.sub, { x: 490, y: 160, w: 528, h: 50 }, { wt: '800', max: 34, min: 18, lh: 1.1, valign: 'm', align: 'c', color: '#fff' });
    g.restore();
    block(t.body, { x: 494, y: 224, w: 520, h: 1030 }, { wt: '600', max: 34, min: 16, lh: 1.32, valign: 't', align: 'l', color: '#241a22', justify: false });
    g.fillStyle = M; g.fillRect(0, 1305, W, 45); footer(1305, 45, '#fff', M, '#fff', M, 22);
  }
  function t3(t) {
    var W = 1080, H = 1080, BL = '#1572d3';
    g.fillStyle = '#e3f0fa'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1b5f9f'; setF('800', 28); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t.date || '', 96, 34);
    g.fillStyle = BL; rr(58, 54, 953, 972, 38); g.fill(); photo(0, 66, 62, 937, 956, 32);
    fadeLayer(t);
    g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 8;
    block(t.headline, { x: 90, y: 782, w: 890, h: 66 }, { wt: '800', max: 46, min: 22, lh: 1.12, valign: 'm', align: 'c', color: '#fff' });
    block(t.body, { x: 92, y: 852, w: 886, h: 146 }, { wt: '700', max: 30, min: 15, lh: 1.26, valign: 'm', align: 'c', color: '#fff', justify: true });
    g.restore();
    logo(340, 4, 400, 50, '#1572d3');
    footer(1036, 44, '#17406e', '', '#17406e', '#e3f0fa', 23);
  }
  function t4(t) {
    var W = 1080, H = 1080, TL = '#1f7a8c', TD = '#16596a';
    g.fillStyle = '#e8f1ea'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2b8a9a'; setF('800', 28); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t.date || '', 76, 60);
    g.fillStyle = TL; rr(40, 78, 1000, 506, 32); g.fill(); photo(0, 48, 86, 984, 490, 26);
    logo(330, 10, 420, 96, TD);
    g.fillStyle = '#2b8a8a'; rr(52, 552, 976, 78, 10); g.fill();
    block(t.headline, { x: 70, y: 552, w: 940, h: 78 }, { wt: '800', max: 44, min: 20, lh: 1.12, valign: 'm', align: 'c', color: '#fff' });
    g.fillStyle = '#fff'; rr(30, 612, 1022, 412, 20); g.fill(); g.lineWidth = 3; g.strokeStyle = '#1c3d94'; g.stroke();
    g.fillStyle = '#2b8a8a'; rr(52, 552, 976, 78, 10); g.fill();
    block(t.headline, { x: 70, y: 552, w: 940, h: 78 }, { wt: '800', max: 44, min: 20, lh: 1.12, valign: 'm', align: 'c', color: '#fff' });
    pair(t.p1, t.p2, { x: 60, y: 646, w: 962, h: 370 }, { wt1: '700', wt2: '700', max: 38, min: 18, r2: 1, gap: .7, lh: 1.26, align: 'c', c1: '#262626', c2: '#2a6e5a' });
    footer(1036, 44, '#17454f', '', '#17454f', '#e8f1ea', 23);
  }
  var DRAW = [t1, t2, t3, t4];

  function draw() {
    var d = TPL[cur]; if (cv.width !== d.W || cv.height !== d.H) { cv.width = d.W; cv.height = d.H; }
    HIT = []; g.save(); g.clearRect(0, 0, d.W, d.H); DRAW[cur](txt()); g.restore();
  }
  /* ───────────── editor UI ───────────── */
  function say(m, bad) { var n = $('#msg'); n.textContent = m || ''; n.className = 'msg' + (bad ? ' bad' : ''); }
  function buildTabs() {
    var n = $('#tabs'); n.innerHTML = '';
    TPL.forEach(function (d, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = d.name; b.setAttribute('aria-pressed', i === cur ? 'true' : 'false'); b.onclick = function () { cur = i; active = 0; buildForm(); draw(); buildTabs(); }; n.appendChild(b); });
  }
  function buildForm() {
    var d = TPL[cur], t = txt(), f = $('#fields'), s = $('#slots'); f.innerHTML = ''; s.innerHTML = '';
    d.f.forEach(function (x) {
      var l = document.createElement('label'); l.textContent = x[1]; var i = document.createElement(x[2] > 1 ? 'textarea' : 'input'); if (x[2] > 1) i.rows = Math.min(x[2], 8); i.value = t[x[0]] || '';
      i.oninput = function () { t[x[0]] = i.value; saveTxt(); draw(); }; l.appendChild(i);
      if (x[0] === 'date') { var tb = document.createElement('button'); tb.type = 'button'; tb.className = 'alt'; tb.textContent = '📅 Today'; tb.onclick = function () { t.date = today(); i.value = t.date; saveTxt(); draw(); }; l.appendChild(tb); }
      f.appendChild(l);
    });
    if (d.fade) {
      var fb = document.createElement('div'); fb.className = 'fade'; var v = fv(t); $('#fadeBox').innerHTML = '';
      fb.innerHTML = '<label>Colour<input id="fc" type="color"></label><label>Strength<input id="fs" type="range" min="0" max="1" step="0.01"></label><label>Height<input id="fh" type="range" min="0.3" max="0.8" step="0.01"></label><button id="fr" class="alt" type="button">Reset fade</button>';
      $('#fadeBox').appendChild(fb); var c = fb.querySelector('#fc'), a = fb.querySelector('#fs'), h = fb.querySelector('#fh');
      c.value = v.c; a.value = v.s; h.value = v.h;
      c.oninput = function () { t.fc = c.value; saveTxt(); draw(); }; a.oninput = function () { t.fs = +a.value; saveTxt(); draw(); }; h.oninput = function () { t.fh = +h.value; saveTxt(); draw(); };
      fb.querySelector('#fr').onclick = function () { delete t.fc; delete t.fs; delete t.fh; saveTxt(); buildForm(); draw(); };
    }
    $('#secFade').hidden = !d.fade; $('#itFade').hidden = !d.fade; if (!d.fade) $('#fadeBox').innerHTML = ''; if (!d.fade && $('#pub').dataset.sec === 'fade') setSec('text');
    $('#vname').textContent = d.name + ' · ' + d.W + '×' + d.H;
    d.ph.forEach(function (nm, k) {
      var w = document.createElement('div'); w.className = 'slot' + (k === active ? ' on' : '');
      var l = document.createElement('label'); l.className = 'file'; l.textContent = '📷 ' + nm; var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.hidden = true;
      inp.onchange = function () { if (!inp.files[0]) return; shrink(inp.files[0], 1800, 'image/jpeg', function (u) { var c = new Image(); c.onload = function () { phs()[k] = { img: c, x: 0, y: 0, z: 1 }; active = k; sync(); draw(); }; c.src = u; }); };
      l.appendChild(inp); w.appendChild(l); w.onclick = function () { active = k; sync(); }; s.appendChild(w);
    });
    sync();
  }
  function setSec(n) { $('#pub').dataset.sec = n; [].forEach.call(document.querySelectorAll('#pub .itabs button'), function (b) { b.setAttribute('aria-pressed', b.dataset.sec === n ? 'true' : 'false'); }); }
  [].forEach.call(document.querySelectorAll('#pub .itabs button'), function (b) { b.onclick = function () { setSec(b.dataset.sec); }; });
  function sync() {
    var p = phs()[active]; $('#zoomRow').hidden = !(p && p.img); if (p) $('#zoom').value = p.z;
    [].forEach.call($('#slots').children, function (c, i) { c.classList.toggle('on', i === active); });
  }
  $('#zoom').oninput = function () { var p = phs()[active]; if (p) { p.z = +this.value; draw(); } };

  /* drag / pinch on the card */
  function pos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
  var drag = null, ptrs = {}, pinch = null;
  cv.addEventListener('pointerdown', function (e) {
    var p = pos(e), h = null; HIT.forEach(function (z) { if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) h = z; });
    ptrs[e.pointerId] = p; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    if (h) { active = h.i; sync(); var q = phs()[h.i]; drag = { i: h.i, sx: p.x, sy: p.y, ox: q.x, oy: q.y }; }
    if (Object.keys(ptrs).length === 2 && drag) { var a = Object.keys(ptrs).map(function (k) { return ptrs[k]; }); pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: phs()[drag.i].z }; }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId]) return; var p = pos(e); ptrs[e.pointerId] = p; if (!drag) return; var q = phs()[drag.i]; if (!q.img) return;
    var ks = Object.keys(ptrs);
    if (ks.length >= 2 && pinch) { var a = ks.map(function (k) { return ptrs[k]; }); q.z = Math.max(1, Math.min(4, pinch.z * Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) / pinch.d)); $('#zoom').value = q.z; }
    else { q.x = drag.ox + (p.x - drag.sx); q.y = drag.oy + (p.y - drag.sy); }
    draw();
  });
  function up(e) { delete ptrs[e.pointerId]; if (!Object.keys(ptrs).length) { drag = null; pinch = null; } }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', function (e) { var p = pos(e), h = null; HIT.forEach(function (z) { if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) h = z; }); if (!h) return; var q = phs()[h.i]; if (!q.img) return; e.preventDefault(); q.z = Math.max(1, Math.min(4, q.z * (e.deltaY < 0 ? 1.06 : .94))); active = h.i; sync(); draw(); }, { passive: false });
  /* the public can only submit: no save / copy handles on the preview (a screenshot can never be fully prevented in a browser) */
  ['contextmenu', 'dragstart'].forEach(function (ev) { cv.addEventListener(ev, function (e) { e.preventDefault(); }); });

  /* ───────────── submit (public) ───────────── */
  var busy = false;
  $('#bSub').onclick = function () {
    if (busy) return; var t = txt(), p = phs();
    if (!String(t.headline || '').trim()) { say('Please type the Title first', true); return; }
    if (!p[0] || !p[0].img) { say('Please add the main photo first', true); return; }
    if (!$('#own').checked) { say('Please tick the copyright confirmation', true); return; }
    busy = true; $('#bSub').disabled = true; say('Submitting…'); draw();
    cv.toBlob(function (b) {
      var fr = new FileReader(); fr.onload = function () {
        rpc('cm_submit', { p_name: $('#sname').value.trim(), p_tpl: TPL[cur].id, p_img: fr.result })
          .then(function () { say('✔ Submitted successfully. Thank you!'); $('#bNew').hidden = false; })
          .catch(function (e) { say('Could not submit: ' + e.message, true); })
          .then(function () { busy = false; $('#bSub').disabled = false; });
      }; fr.readAsDataURL(b);
    }, 'image/jpeg', .92);
  };
  $('#bNew').onclick = function () { var id = TPL[cur].id; T[id] = blank(); PH[id] = null; delete PH[id]; saveTxt(); $('#own').checked = false; $('#bNew').hidden = true; say(''); buildForm(); draw(); };

  /* ───────────── admin ───────────── */
  var AU = null;       /* {u,p} kept in this tab only */
  function view(n) { ['pub', 'alogin', 'adm'].forEach(function (k) { $('#' + k).hidden = k !== n; }); window.scrollTo(0, 0); }
  function route() {
    if (location.hash === '#admin') { if (AU) { view('adm'); loadSubs(true); fillBrandForm(); } else view('alogin'); }
    else view('pub');
    var a = location.hash === '#admin'; $('#pgEdit').setAttribute('aria-pressed', a ? 'false' : 'true'); $('#pgAdm').setAttribute('aria-pressed', a ? 'true' : 'false'); document.body.className = a ? 'is-adm' : 'is-pub';
  }
  $('#pgEdit').onclick = function () { location.hash = ''; }; $('#pgAdm').onclick = function () { location.hash = '#admin'; };
  window.addEventListener('hashchange', route);
  $('#lf').addEventListener('submit', function (e) {
    e.preventDefault(); var u = $('#lu').value.trim().toLowerCase(), p = $('#lp').value; $('#lm').textContent = 'Checking…';
    rpc('cm_admin_login', { p_u: u, p_p: p }).then(function (ok) {
      if (ok === true) { AU = { u: u, p: p }; try { sessionStorage.setItem('cm_au', JSON.stringify(AU)); } catch (x) {} $('#lp').value = ''; $('#lm').textContent = ''; route(); }
      else $('#lm').textContent = 'Wrong user name or password';
    }).catch(function (e) { $('#lm').textContent = 'Could not sign in: ' + e.message; });
  });
  try { AU = JSON.parse(sessionStorage.getItem('cm_au') || 'null'); } catch (e) { AU = null; }
  $('#bOut').onclick = function () { AU = null; try { sessionStorage.removeItem('cm_au'); } catch (e) {} location.hash = ''; route(); };
  $('#bBack').onclick = function () { location.hash = ''; };
  $('#aLink').onclick = function (e) { e.preventDefault(); location.hash = '#admin'; };
  [].forEach.call(document.querySelectorAll('[data-tab]'), function (b) { b.onclick = function () { [].forEach.call(document.querySelectorAll('[data-tab]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); $('#tSubs').hidden = b.dataset.tab !== 'subs'; $('#tBrand').hidden = b.dataset.tab !== 'brand'; }; });

  var sel = null;
  function delCard(r, c) { if (!confirm('Delete this card permanently?')) return; rpc('cm_admin_delete', { p_u: AU.u, p_p: AU.p, p_id: r.id }).then(function () { var nx = c.nextSibling || c.previousSibling; c.remove(); if (sel && sel.r.id === r.id) { if (nx) nx.click(); else pick(null); } }).catch(function (e) { alert(e.message); }); }
  function pick(r, c) {
    [].forEach.call($('#grid').children, function (x) { x.classList.toggle('on', x === c); });
    sel = r ? { r: r, c: c } : null;
    $('#aimg').src = r ? r.img : ''; $('#avname').textContent = r ? fmt(r.created_at) + (r.name ? ' · ' + r.name : '') : 'No card selected';
    $('#selMeta').textContent = r ? fmt(r.created_at) + (r.name ? ' · ' + r.name : '') + ' · template ' + r.tpl : 'Select a card from the list.';
    var d = $('#selDl'); d.hidden = !r; $('#selRm').hidden = !r; if (r) { d.href = r.img; d.download = 'news-card-' + String(r.created_at).slice(0, 19).replace(/[-:T]/g, '') + '.jpg'; }
  }
  $('#selRm').onclick = function () { if (sel) delCard(sel.r, sel.c); };
  var off = 0;
  function fmt(s) { var d = new Date(s); return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
  function loadSubs(reset) {
    if (reset) { off = 0; $('#grid').innerHTML = ''; }
    $('#smsg').textContent = 'Loading…'; $('#more').hidden = true;
    rpc('cm_admin_list', { p_u: AU.u, p_p: AU.p, p_off: off }).then(function (rows) {
      rows = rows || []; $('#smsg').textContent = (off === 0 && !rows.length) ? 'No submissions yet.' : '';
      rows.forEach(function (r) {
        var c = document.createElement('div'); c.className = 'sub';
        var im = new Image(); im.src = r.img; im.alt = 'Submitted card'; im.loading = 'lazy'; c.appendChild(im);
        var m = document.createElement('div'); m.className = 'meta'; m.textContent = fmt(r.created_at) + (r.name ? ' · ' + r.name : ''); c.appendChild(m);
        var bar = document.createElement('div'); bar.className = 'row2';
        var dl = document.createElement('a'); dl.className = 'btn pri'; dl.textContent = '⬇ Download'; dl.href = r.img; dl.download = 'news-card-' + String(r.created_at).slice(0, 19).replace(/[-:T]/g, '') + '.jpg';
        var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'alt'; rm.textContent = '🗑 Delete';
        rm.onclick = function (ev) { ev.stopPropagation(); delCard(r, c); };
        c.onclick = function () { pick(r, c); }; c.dataset.id = r.id;
        bar.appendChild(dl); bar.appendChild(rm); c.appendChild(bar); $('#grid').appendChild(c);
      });
      if (reset && rows.length) pick(rows[0], $('#grid').firstChild); if (reset && !rows.length) pick(null);
      off += rows.length; $('#more').hidden = rows.length < 12;
    }).catch(function (e) { $('#smsg').textContent = 'Could not load: ' + e.message; });
  }
  $('#more').onclick = function () { loadSubs(false); };
  $('#refresh').onclick = function () { loadSubs(true); };

  var newLogo = null;
  function fillBrandForm() {
    $('#bn').value = B.name; $('#bo').value = B.owner; $('#bh').value = B.handle; $('#bw').value = B.site; $('#bfc').value = B.fc; $('#bfs').value = B.fs; $('#bfh').value = B.fh;
    $('#lprev').style.backgroundImage = B.logo ? 'url("' + B.logo + '")' : ''; newLogo = null;
  }
  $('#lfile').onchange = function () { var f = this.files[0]; if (!f) return; shrink(f, 900, 'image/png', function (u) { newLogo = u; $('#lprev').style.backgroundImage = 'url("' + u + '")'; }); };
  $('#lclr').onclick = function () { newLogo = ''; $('#lprev').style.backgroundImage = ''; };
  $('#aSave').onclick = function () {
    var o = { name: $('#bn').value.trim(), owner: $('#bo').value.trim(), handle: $('#bh').value.trim(), site: $('#bw').value.trim(), fc: $('#bfc').value, fs: +$('#bfs').value, fh: +$('#bfh').value, logo: newLogo != null ? newLogo : B.logo };
    $('#bmsg').textContent = 'Saving…';
    rpc('cm_admin_set_brand', { p_u: AU.u, p_p: AU.p, p_data: o }).then(function () { applyBrand(o); try { localStorage.setItem('cm_brand_cache', JSON.stringify(o)); } catch (e) {} draw(); $('#bmsg').textContent = 'Saved ✔ — the public editor now uses this logo and details'; })
      .catch(function (e) { $('#bmsg').textContent = 'Could not save: ' + e.message; });
  };

  var started = false;
  function start() {
    if (started) return; started = true; loadTxt(); buildTabs(); buildForm(); draw(); loadBrand().then(route); route();
    if (document.fonts && document.fonts.load) { Promise.all(['500', '700', '800', '900'].map(function (w) { return document.fonts.load(w + ' 30px "Noto Sans Tamil"', 'தமிழ் Abc'); })).then(draw, function () {}); document.fonts.ready.then(draw); }
  }
  window.__cm = { T: function () { return T; }, set: function (id, k, v) { (T[id] = T[id] || blank())[k] = v; }, setCur: function (i) { cur = i; buildTabs(); buildForm(); draw(); }, setPhoto: function (i, img) { phs()[i] = { img: img, x: 0, y: 0, z: 1 }; draw(); }, draw: draw };
  start();
})();
