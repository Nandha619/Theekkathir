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
  var B = { name: 'தீக்கதிர்', handle: 'Theekkathir', site: '', logo: '', owner: 'தீக்கதிர்', fc: '#000000', fs: 0.94, fh: 0.45 }, logoImg = null, HDR = 0;
  function applyBrand(o) {
    if (!o) return; Object.keys(B).forEach(function (k) { if (o[k] != null) B[k] = o[k]; });
    logoImg = null; { var i = new Image(); i.onload = function () { logoImg = i; draw(); }; i.src = B.logo || 'logo.png'; }
    var y = new Date().getFullYear(); $('#copy').textContent = '© ' + y + ' ' + (B.owner || B.name) + '. எல்லா உரிமைகளும் பாதுகாக்கப்பட்டவை. அனுமதியின்றி நகலெடுத்தல், ஸ்க்ரீன்ஷாட் எடுத்தல், மறுபயன்பாடு தடை செய்யப்படுகிறது.';
  }
  function loadBrand() {
    try { applyBrand(JSON.parse(localStorage.getItem('cm_brand_cache') || 'null')); } catch (e) {}
    if (!CFG.url) return Promise.resolve();
    return rpc('cm_get_brand').then(function (o) { applyBrand(o); try { localStorage.setItem('cm_brand_cache', JSON.stringify(o || {})); } catch (e) {} draw(); }).catch(function () {});
  }
  function shrink(file, max, type, cb, q) {
    var fr = new FileReader(); fr.onload = function () { var i = new Image(); i.onload = function () { var k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); cb(c.toDataURL(type, q || .92), i); }; i.src = fr.result; }; fr.readAsDataURL(file);
  }
  function rgba(hex, a) { var h = String(hex || '#000').replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1'); var n = parseInt(h, 16) || 0; return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }


  var TPL = [
    { id: 5, name: 'Daily', W: 1080, H: 1350, f: [['date', 'Date', 1], ['badge', 'Tag (Breaking News…) – blank to hide', 1], ['district', 'District / மாவட்டம்', 1], ['headline', 'Title', 2], ['body', 'Script', 10], ['by', 'Reporter (optional)', 1]], ph: ['Photo'] },
    { id: 1, name: 'Red', W: 1080, H: 1080, f: [['date', 'Date', 1], ['district', 'Place / இடம்', 1], ['badge', 'Tag (Breaking News…) – blank to hide', 1], ['headline', 'Title', 2], ['cap', 'Photo caption', 1], ['p1', 'Script 1', 5], ['p2', 'Script 2 (red)', 5]], ph: ['Main photo', 'Small photo'] },
    { id: 2, name: 'Maroon', W: 1080, H: 1350, f: [['date', 'Date', 1], ['district', 'Place / இடம்', 1], ['badge', 'Tag (Breaking News…) – blank to hide', 1], ['headline', 'Title', 2], ['sub', 'Sub title (bar)', 2], ['body', 'Script', 12]], ph: ['Top photo', 'Middle photo', 'Bottom photo'] },
    { id: 3, name: 'Blue', W: 1080, H: 1080, f: [['date', 'Date', 1], ['district', 'Place / இடம்', 1], ['badge', 'Tag (Breaking News…) – blank to hide', 1], ['headline', 'Title', 2], ['body', 'Script', 8]], ph: ['Photo'], fade: true },
    { id: 4, name: 'Green', W: 1080, H: 1080, f: [['date', 'Date', 1], ['district', 'Place / இடம்', 1], ['badge', 'Tag (Breaking News…) – blank to hide', 1], ['headline', 'Title', 2], ['p1', 'Script 1', 5], ['p2', 'Script 2 (green)', 5]], ph: ['Photo'] }
  ];
  function today() { var d = new Date(), m = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']; return ('0' + d.getDate()).slice(-2) + '-' + m[d.getMonth()] + '-' + d.getFullYear(); }
  function blank() { return { date: today(), headline: '', cap: '', sub: '', body: '', p1: '', p2: '', badge: 'பிரேக்கிங் நியூஸ்', district: '', by: '' }; }
  var admin = false, editing = null, cur = 0, T = {}, PH = {}, active = 0;   /* T[tplId] = texts, PH[tplId] = [{img,x,y,z}] */
  function txt() { return T[TPL[cur].id] || (T[TPL[cur].id] = blank()); }
  function phs() { var id = TPL[cur].id; return PH[id] || (PH[id] = TPL[cur].ph.map(function () { return { img: null, x: 0, y: 0, z: 1 }; })); }
  function saveTxt() { try { localStorage.setItem('cm_text', JSON.stringify(T)); } catch (e) {} }
  function loadTxt() { try { T = JSON.parse(localStorage.getItem('cm_text') || '{}') || {}; } catch (e) { T = {}; } Object.keys(T).forEach(function (k) { if (T[k] && (T[k].badge === 'NEWS UPDATE' || T[k].badge == null)) T[k].badge = 'பிரேக்கிங் நியூஸ்'; }); }
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
    var p = phs()[i]; HIT.push({ i: i, x: x, y: y + HDR, w: w, h: h });
    g.save(); rr(x, y, w, h, r); g.clip(); g.fillStyle = '#c9d1d9'; g.fillRect(x, y, w, h);
    if (p.img) {
      var k = Math.max(w / p.img.width, h / p.img.height) * p.z, dw = p.img.width * k, dh = p.img.height * k;
      var mx = Math.max(0, (dw - w) / 2), my = Math.max(0, (dh - h) / 2); p.x = Math.max(-mx, Math.min(mx, p.x)); p.y = Math.max(-my, Math.min(my, p.y));
      g.drawImage(p.img, x + (w - dw) / 2 + p.x, y + (h - dh) / 2 + p.y, dw, dh);
    } else { g.fillStyle = '#7b8794'; setF('800', Math.min(34, w / 6)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+ ' + TPL[cur].ph[i], x + w / 2, y + h / 2); }
    g.restore();
  }
  /* logo only (no background plate), centred on cx */
  function brand(cx, y, h) {
    if (!logoImg) return; var w = h * logoImg.width / logoImg.height;
    g.drawImage(logoImg, cx - w / 2, y, w, h);
  }
  /* place pill (pin + text), right edge at xr */
  function place(xr, y, h, maxW, text, fill, fg) {
    text = String(text || '').trim(); if (!text) return;
    var sz = h * .56; setF('800', sz); var w = Math.min(maxW, g.measureText(text).width + h * 1.2 + 20), x = xr - w;
    g.fillStyle = fill; rr(x, y, w, h, h * .22); g.fill(); pin(x + h * .5, y + h * .5, h * .2, fg, fill);
    block(text, { x: x + h * .9, y: y, w: w - h * .9 - 12, h: h }, { wt: '800', max: sz, min: 14, lh: 1.1, valign: 'm', align: 'l', color: fg });
  }
  /* breaking-news tag (text editable; blank = hidden) */
  function tag(x, y, h, maxW, text) {
    text = String(text || '').trim(); if (!text) return;
    var sz = h * .56; setF('900', sz); var w = Math.min(maxW, g.measureText(text).width + 46);
    g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 8; g.fillStyle = '#d90429'; rr(x, y, w, h, 10); g.fill(); g.restore();
    g.lineWidth = 2.5; g.strokeStyle = '#fff'; rr(x + 2.5, y + 2.5, w - 5, h - 5, 8); g.stroke();
    block(text, { x: x + 14, y: y, w: w - 28, h: h }, { wt: '900', max: sz, min: 14, lh: 1.05, valign: 'm', align: 'c', color: '#fff' });
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
  function footer(y, h, fg, bg, tc, iconBg, sz, right) {
    /* social icons + handle; website (or `right` text) on the right. No website -> centred */
    var handle = String(B.handle || '').trim(), rt = right || String(B.site || '').trim();
    if (!handle && !rt) return;
    var cy = y + h / 2, s = h * .62, fs = rt ? sz : sz + 4; setF('800', fs);
    var hw = g.measureText(handle).width, x0 = rt ? 34 : (cv.width - (s * 5.35 + (handle ? 16 + hw : 0))) / 2;
    var ex = icons(x0, cy, s, fg, iconBg);
    g.fillStyle = tc; setF('800', fs); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(handle, ex + 16, cy + 1);
    if (rt) { g.textAlign = 'right'; setF('800', sz + 2); var sw = g.measureText(rt).width; g.fillText(rt, cv.width - 36, cy + 1); if (!right) globe(cv.width - 36 - sw - h * .42, cy, h * .3, tc); }
  }
  function datebox(x, y, w, h, fill, fg, sz, text) { if (fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); } g.fillStyle = fg; setF('800', sz); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text || '', x + w / 2, y + h / 2 + 1); }

  /* ───────────── templates ───────────── */
  function pin(cx, cy, r, c, hole) {
    g.fillStyle = c; g.beginPath(); g.arc(cx, cy - r * .3, r, Math.PI * .82, Math.PI * 2.18); g.lineTo(cx, cy + r * 1.3); g.closePath(); g.fill();
    g.fillStyle = hole; g.beginPath(); g.arc(cx, cy - r * .3, r * .38, 0, 7); g.fill();
  }
  /* Daily — logo centred inside the card, date + place directly above the photo */
  function t5(t) {
    var W = 1080, H = 1350, RED = '#c8102e', DK = '#8e0f1d';
    g.fillStyle = '#fbf3ee'; g.fillRect(0, 0, W, H);
    brand(W / 2, 26, 124);
    g.fillStyle = RED; g.fillRect(60, 170, 10, 106);
    block(t.headline, { x: 90, y: 164, w: 930, h: 120 }, { wt: '900', max: 54, min: 26, lh: 1.15, valign: 'm', align: 'l', color: '#7a0c18' });
    datebox(60, 300, 240, 48, DK, '#fff', 26, t.date);
    var d = String(t.district || '').trim();
    if (d) { g.fillStyle = RED; rr(316, 300, 704, 48, 10); g.fill(); pin(346, 325, 12, '#fff', RED); block(d, { x: 374, y: 300, w: 630, h: 48 }, { wt: '800', max: 30, min: 16, lh: 1.1, valign: 'm', align: 'l', color: '#fff' }); }
    g.fillStyle = RED; rr(54, 364, 972, 466, 26); g.fill(); photo(0, 62, 372, 956, 450, 20);
    tag(54, 840, 52, 700, t.badge);
    g.fillStyle = '#fff'; rr(54, 904, 972, 372, 26); g.fill(); g.lineWidth = 3; g.strokeStyle = RED; g.stroke();
    block(t.body, { x: 86, y: 926, w: 908, h: 330 }, { wt: '600', max: 36, min: 16, lh: 1.34, valign: 't', align: 'l', color: '#241a22', justify: false });
    g.fillStyle = DK; g.fillRect(0, 1296, W, 54);
    var by = String(t.by || '').trim();
    footer(1296, 54, '#fff', DK, '#fff', DK, 22, by ? 'செய்தியாளர்: ' + by : '');
  }
  function t1(t) {
    var W = 1080, H = 1080, RED = '#b01a27', DK = '#8e111c';
    g.fillStyle = '#f6eee9'; g.fillRect(0, 0, W, H);
    datebox(70, 18, 195, 42, DK, '#fff', 25, t.date);
    brand(540, 10, 60); place(1005, 18, 42, 330, t.district, DK, '#fff');
    var hg = g.createLinearGradient(0, 80, 0, 175); hg.addColorStop(0, '#a3141f'); hg.addColorStop(1, '#7d0e18');
    g.fillStyle = hg; rr(70, 80, 935, 96, 28); g.fill(); g.lineWidth = 3; g.strokeStyle = '#cf3b46'; rr(72, 82, 931, 92, 26); g.stroke();
    g.fillStyle = '#fff'; block(t.headline, { x: 100, y: 88, w: 875, h: 80 }, { wt: '800', max: 52, min: 26, lh: 1.15, valign: 'm', align: 'c', color: '#fff' });
    /* main photo + frame */
    g.fillStyle = RED; rr(60, 193, 957, 385, 38); g.fill();
    photo(0, 70, 203, 937, 365, 30);
    var gr = g.createLinearGradient(0, 470, 0, 568); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.72)');
    g.save(); rr(70, 203, 937, 365, 30); g.clip(); g.fillStyle = gr; g.fillRect(70, 470, 937, 98); g.restore();
    tag(70, 592, 44, 740, t.badge);
    /* small photo */
    g.fillStyle = '#fff'; rr(838, 398, 182, 186, 34); g.fill(); g.fillStyle = RED; rr(843, 403, 172, 176, 30); g.fill();
    photo(1, 849, 409, 160, 164, 26);
    g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 8; block(t.cap, { x: 90, y: 505, w: 735, h: 56 }, { wt: '800', max: 42, min: 22, lh: 1.1, valign: 'm', align: 'c', color: '#fff' }); g.restore();
    pair(t.p1, t.p2, { x: 60, y: 646, w: 960, h: 378 }, { wt1: '600', wt2: '800', max: 36, min: 18, r2: 1.12, gap: .6, lh: 1.28, align: 'c', c1: '#222', c2: '#c1121f' });
    g.fillStyle = RED; g.fillRect(0, 1037, W, 43); footer(1037, 43, '#fff', RED, '#fff', RED, 22);
  }
  function t2(t) {
    var W = 1080, H = 1350, M = '#8a1a5e';
    g.fillStyle = '#f3eee4'; g.fillRect(0, 0, W, H);
    g.fillStyle = M; rr(12, 62, 448, 738, 10); g.fill(); photo(0, 18, 68, 436, 427, 5); photo(1, 18, 501, 436, 293, 5);
    g.fillStyle = M; rr(12, 806, 448, 472, 10); g.fill(); photo(2, 18, 812, 436, 398, 5);
    tag(24, 1222, 46, 424, t.badge);
    g.fillStyle = '#f7f2e8'; rr(474, 64, 560, 1206, 44); g.fill(); g.lineWidth = 3; g.strokeStyle = M; g.stroke();
    datebox(12, 12, 210, 40, M, '#fff', 26, t.date); place(1034, 12, 40, 320, t.district, M, '#fff'); brand(540, 5, 52);
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
    g.fillStyle = BL; rr(58, 54, 953, 910, 38); g.fill(); photo(0, 66, 62, 937, 894, 32);
    tag(58, 974, 50, 700, t.badge);
    var PX = 66, PY = 62, PW = 937, PH = 894, fh = PH * Math.max(.2, Math.min(.9, fv(t).h)); fadeLayer(t, PX, PY, PW, PH, fh);
    var hasH = String(t.headline || '').trim(), hasB = String(t.body || '').trim(), hh = hasH ? 66 : 0, gp = hasH && hasB ? 14 : 0, bs = 15, bl = [], bH = 0, bot = PY + PH - 30, avail = fh * .8;
    if (hasB) for (bs = 32; bs >= 15; bs--) { setF('700', bs); bl = lines(hasB, 880); bH = bl.length * bs * 1.26; if (bH <= avail - hh - gp) break; }
    g.save(); g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 6;
    if (hasB) { setF('700', bs); put(bl, 100, bot - bH, 880, bs, 1.26, { align: 'c', color: '#fff', justify: true }); }
    if (hasH) block(hasH, { x: 100, y: bot - bH - gp - hh, w: 880, h: hh }, { wt: '800', max: 46, min: 22, lh: 1.12, valign: 'm', align: 'c', color: '#fff' });
    g.restore();
    brand(540, 3, 48); place(984, 14, 38, 320, t.district, BL, '#fff');
    footer(1036, 44, '#17406e', '', '#17406e', '#e3f0fa', 23);
  }
  function t4(t) {
    var W = 1080, H = 1080, TL = '#1f7a8c', TD = '#16596a';
    g.fillStyle = '#e8f1ea'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2b8a9a'; setF('800', 28); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t.date || '', 76, 60);
    g.fillStyle = TL; rr(40, 78, 1000, 442, 32); g.fill(); photo(0, 48, 86, 984, 426, 26);
    tag(52, 530, 46, 700, t.badge);
    brand(540, 6, 66); place(1004, 34, 40, 330, t.district, '#2b8a8a', '#fff');
    g.fillStyle = '#fff'; rr(30, 644, 1022, 380, 20); g.fill(); g.lineWidth = 3; g.strokeStyle = '#1c3d94'; g.stroke();
    g.fillStyle = '#2b8a8a'; rr(52, 584, 976, 78, 10); g.fill();
    block(t.headline, { x: 70, y: 584, w: 940, h: 78 }, { wt: '800', max: 44, min: 20, lh: 1.12, valign: 'm', align: 'c', color: '#fff' });
    pair(t.p1, t.p2, { x: 60, y: 678, w: 962, h: 338 }, { wt1: '700', wt2: '700', max: 38, min: 18, r2: 1, gap: .7, lh: 1.26, align: 'c', c1: '#262626', c2: '#2a6e5a' });
    footer(1036, 44, '#17454f', '', '#17454f', '#e8f1ea', 23);
  }
  var DRAW = [t5, t1, t2, t3, t4];
  /* Blue template: customisable fade (colour / strength / height) */
  function fv(t) { return { c: t.fc || B.fc || '#000000', s: t.fs != null && t.fs !== '' ? +t.fs : +B.fs, h: t.fh != null && t.fh !== '' ? +t.fh : +B.fh }; }
  function fadeLayer(t, PX, PY, PW, PH, fh) {
    var f = fv(t), gr = g.createLinearGradient(0, PY + PH, 0, PY + PH - fh);
    gr.addColorStop(0, rgba(f.c, f.s)); gr.addColorStop(.55, rgba(f.c, f.s * .77)); gr.addColorStop(1, rgba(f.c, 0));
    g.save(); rr(PX, PY, PW, PH, 32); g.clip(); g.fillStyle = gr; g.fillRect(PX, PY + PH - fh, PW, fh); g.restore();
  }
  function mark() {
    var W = cv.width, H = cv.height, R = Math.hypot(W, H) / 2, label = '© ' + (B.owner || B.name) + ' • பதிப்புரிமை';
    g.save(); g.globalAlpha = .27; g.font = '800 40px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.translate(W / 2, H / 2); g.rotate(-Math.PI / 7); g.lineWidth = 5; g.lineJoin = 'round';
    for (var y = -R, r = 0; y < R; y += 170, r++) for (var x = -R; x < R; x += 470) { var xx = x + (r % 2 ? 235 : 0); g.strokeStyle = '#fff'; g.strokeText(label, xx, y); g.fillStyle = '#111'; g.fillText(label, xx, y); }
    g.restore();
  }
  function draw(clean) {
    var d = TPL[cur]; if (cv.width !== d.W || cv.height !== d.H + HDR) { cv.width = d.W; cv.height = d.H + HDR; }
    HIT = []; g.save(); g.clearRect(0, 0, cv.width, cv.height);
    DRAW[cur](txt());
    if (!admin && clean !== true) mark(); g.restore();
  }
  function pack() { return { tpl: TPL[cur].id, text: txt(), photos: phs().map(function (p) { return p.src ? { d: p.src, x: p.x, y: p.y, z: p.z } : null; }) }; }
  function unpack(o, done) {
    var i = Math.max(0, TPL.map(function (d) { return d.id; }).indexOf(o.tpl)), id = TPL[i].id, left = 0;
    cur = i; active = 0; T[id] = Object.assign(blank(), o.text || {}); PH[id] = TPL[i].ph.map(function () { return { img: null, x: 0, y: 0, z: 1 }; });
    function fin() { buildTabs(); buildForm(); draw(); if (done) done(); }
    (o.photos || []).forEach(function (p, k) {
      if (!p) return; left++; var im = new Image();
      im.onload = function () { PH[id][k] = { img: im, src: p.d, x: p.x, y: p.y, z: p.z }; if (!--left) fin(); };
      im.onerror = function () { if (!--left) fin(); }; im.src = p.d;
    });
    if (!left) fin();
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
      if (x[0] === 'badge') i.setAttribute('list', 'badges'); if (x[0] === 'district') i.setAttribute('list', 'districts');
      if (x[0] === 'date') { var tb = document.createElement('button'); tb.type = 'button'; tb.className = 'alt'; tb.textContent = '📅 Today'; tb.onclick = function () { t.date = today(); i.value = t.date; saveTxt(); draw(); }; l.appendChild(tb); }
      f.appendChild(l);
    });
    if (d.fade) {
      var fb = document.createElement('div'); fb.className = 'fade'; var v = fv(t); $('#fadeBox').innerHTML = '';
      fb.innerHTML = '<label>Colour<input id="fc" type="color"></label><label>Strength<input id="fs" type="range" min="0" max="1" step="0.01"></label><label>Height<input id="fh" type="range" min="0.2" max="0.9" step="0.01"></label><button id="fr" class="alt" type="button">Reset fade</button>';
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
      inp.onchange = function () { if (!inp.files[0]) return; shrink(inp.files[0], 1400, 'image/jpeg', function (u) { var c = new Image(); c.onload = function () { phs()[k] = { img: c, src: u, x: 0, y: 0, z: 1 }; active = k; sync(); draw(); }; c.src = u; }, .82); };
      l.appendChild(inp); w.appendChild(l); w.onclick = function () { active = k; sync(); }; s.appendChild(w);
    });
    sync();
  }
  function setSec(n) { if (n === 'fade' && !TPL[cur].fade) n = 'text'; $('#pub').dataset.sec = n; [].forEach.call(document.querySelectorAll('#pub .itabs button'), function (b) { b.setAttribute('aria-pressed', b.dataset.sec === n ? 'true' : 'false'); }); }
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

  /* ───────────── submit (public) ───────────── */
  var busy = false;
  function cleanBlob(cb) { draw(true); cv.toBlob(function (b) { draw(); cb(b); }, 'image/jpeg', .92); }
  function toData(b, cb) { var fr = new FileReader(); fr.onload = function () { cb(fr.result); }; fr.readAsDataURL(b); }
  $('#bSub').onclick = function () {
    if (busy) return; var t = txt(), p = phs();
    if (!String(t.headline || '').trim()) { say('Please type the Title first', true); return; }
    if (!p[0] || !p[0].img) { say('Please add the main photo first', true); return; }
    if (!$('#own').checked) { say('Please tick the copyright confirmation', true); return; }
    busy = true; $('#bSub').disabled = true; say('Submitting…');
    var data = JSON.stringify(pack());
    cleanBlob(function (b) { toData(b, function (img) {
      rpc('cm_submit', { p_name: $('#sname').value.trim(), p_tpl: TPL[cur].id, p_img: img, p_data: data })
        .then(function () { say('✔ Submitted successfully. Thank you!'); $('#bNew').hidden = false; })
        .catch(function (e) { say('Could not submit: ' + e.message, true); })
        .then(function () { busy = false; $('#bSub').disabled = false; });
    }); });
  };
  function resetCur() { var id = TPL[cur].id; delete T[id]; delete PH[id]; saveTxt(); buildForm(); draw(); }
  $('#bNew').onclick = function () { $('#own').checked = false; $('#bNew').hidden = true; say(''); resetCur(); };

  /* copyright protection (public view): no right-click / copy / save / print on the card */
  function onCard(e) { return !admin && e.target && e.target.closest && e.target.closest('.stage'); }
  ['contextmenu', 'dragstart', 'copy'].forEach(function (ev) { document.addEventListener(ev, function (e) { if (onCard(e)) e.preventDefault(); }); });
  document.addEventListener('keydown', function (e) { if (admin) return; var k = (e.key || '').toLowerCase(); if ((e.ctrlKey || e.metaKey) && 's p u'.split(' ').indexOf(k) > -1) e.preventDefault(); });
  document.addEventListener('keyup', function (e) { if (e.key === 'PrintScreen' && !admin) { try { navigator.clipboard.writeText('© ' + (B.owner || B.name)); } catch (x) {} say('Screenshots are prohibited — © ' + (B.owner || B.name), true); } });

  /* ───────────── admin ───────────── */
  var AU = null;       /* {u,p} kept in this tab only */
  function view(n) { ['pub', 'alogin', 'adm'].forEach(function (k) { $('#' + k).hidden = k !== n; }); window.scrollTo(0, 0); }
  function route() {
    if (location.hash === '#admin') { if (!AU) view('alogin'); else if (editing) { view('pub'); modeAdm(true); } else { view('adm'); loadSubs(true); fillBrandForm(); } }
    else { if (editing) { editing = null; admin = false; } view('pub'); modeAdm(false); }
    var a = location.hash === '#admin'; $('#pgEdit').setAttribute('aria-pressed', a ? 'false' : 'true'); $('#pgAdm').setAttribute('aria-pressed', a ? 'true' : 'false'); document.body.className = (a && !editing) ? 'is-adm' : 'is-pub';
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

  function modeAdm(on) { admin = !!on; if (on) $('#bNew').hidden = true; $('#subBox').hidden = on; $('#barAdm').hidden = !on; if (on) setSec('deliver'); draw(); }
  function openEdit(r) {
    rpc('cm_admin_get', { p_u: AU.u, p_p: AU.p, p_id: r.id }).then(function (d) {
      if (!d) { alert('This card has no editable data (older submission). You can still download it.'); return; }
      editing = r.id; admin = true; unpack(JSON.parse(d), function () { route(); say('Editing submission — correct it, then Save correction or Download'); });
    }).catch(function (e) { alert(e.message); });
  }
  $('#bSave').onclick = function () { cleanBlob(function (b) { toData(b, function (img) { rpc('cm_admin_update', { p_u: AU.u, p_p: AU.p, p_id: editing, p_img: img, p_data: JSON.stringify(pack()) }).then(function () { say('Correction saved ✔'); }).catch(function (e) { say('Could not save: ' + e.message, true); }); }); }); };
  $('#bDl').onclick = function () { cleanBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'news-card-' + Date.now() + '.jpg'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); say('Downloaded ✔'); }); };
  $('#bDel').onclick = function () { if (!confirm('Delete this submission?')) return; rpc('cm_admin_delete', { p_u: AU.u, p_p: AU.p, p_id: editing }).then(function () { backList(); }).catch(function (e) { say(e.message, true); }); };
  $('#bList').onclick = backList;
  function backList() { editing = null; admin = false; resetCur(); say(''); route(); }
  var sel = null;
  function delCard(r, c) { if (!confirm('Delete this card permanently?')) return; rpc('cm_admin_delete', { p_u: AU.u, p_p: AU.p, p_id: r.id }).then(function () { var nx = c.nextSibling || c.previousSibling; c.remove(); if (sel && sel.r.id === r.id) { if (nx) nx.click(); else pick(null); } }).catch(function (e) { alert(e.message); }); }
  function pick(r, c) {
    [].forEach.call($('#grid').children, function (x) { x.classList.toggle('on', x === c); });
    sel = r ? { r: r, c: c } : null;
    $('#aimg').src = r ? r.img : ''; $('#avname').textContent = r ? fmt(r.created_at) + (r.name ? ' · ' + r.name : '') : 'No card selected';
    $('#selMeta').textContent = r ? fmt(r.created_at) + (r.name ? ' · ' + r.name : '') + ' · template ' + r.tpl : 'Select a card from the list.';
    var d = $('#selDl'); d.hidden = !r; $('#selRm').hidden = !r; $('#selEdit').hidden = !r; if (r) { d.href = r.img; d.download = 'news-card-' + String(r.created_at).slice(0, 19).replace(/[-:T]/g, '') + '.jpg'; }
  }
  $('#selEdit').onclick = function () { if (sel) openEdit(sel.r); };
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
