/* News Card Maker — standalone static app. No server, no build step. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  $('#ver').textContent = 'v10';
  var FONT = '"Noto Sans Tamil","Latha","Nirmala UI","Tamil Sangam MN","Noto Sans",system-ui,sans-serif';

  /* ───────────── config / brand ───────────── */
  var CFG = window.CM_CONFIG || {}, HDR = 0, logoImg = null;
  var B = { handle: CFG.HANDLE || '', site: CFG.SITE || '', logo: '' };
  function setLogo(d) {
    B.logo = d || ''; var i = new Image();
    i.onload = function () { logoImg = i; draw(); };
    i.onerror = function () { if (B.logo) { B.logo = ''; setLogo(''); } };
    i.src = B.logo || window.CM_LOGO || 'logo.png';
  }
  function loadBrand() { try { var o = JSON.parse(localStorage.getItem('cm_brand') || '{}'); ['handle', 'site', 'logo'].forEach(function (k) { if (o[k]) B[k] = o[k]; }); } catch (e) {} setLogo(B.logo); }
  function saveBrand() { try { localStorage.setItem('cm_brand', JSON.stringify({ handle: B.handle, site: B.site, logo: B.logo })); return true; } catch (e) { return false; } }
  function shrink(file, max, cb, type) {
    var fr = new FileReader(); fr.onload = function () { var i = new Image(); i.onload = function () { var k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); cb(c.toDataURL(type || 'image/jpeg', .82), i); }; i.src = fr.result; }; fr.readAsDataURL(file);
  }

  /* ───────────── state ───────────── */
  var TPL = [
    { id: 5, name: 'Daily', W: 1080, H: 1350, f: [['date', 'Date', 1], ['badge', 'Tag (Breaking News…) – blank to hide', 1], ['district', 'District / மாவட்டம்', 1], ['headline', 'Title', 2], ['body', 'Script', 10], ['by', 'Reporter (optional)', 1]], ph: ['Photo'] },
    { id: 1, name: 'Red', W: 1080, H: 1080, f: [['date', 'Date', 1], ['district', 'Place / இடம்', 1], ['badge', 'Tag (Breaking News…) – blank to hide', 1], ['headline', 'Title', 2], ['cap', 'Photo caption', 1], ['p1', 'Script 1', 5], ['p2', 'Script 2 (red)', 5]], ph: ['Main photo', 'Small photo'] },
    { id: 2, name: 'Maroon', W: 1080, H: 1350, f: [['date', 'Date', 1], ['district', 'Place / இடம்', 1], ['badge', 'Tag (Breaking News…) – blank to hide', 1], ['headline', 'Title', 2], ['sub', 'Sub title (bar)', 2], ['body', 'Script', 12]], ph: ['Top photo', 'Middle photo', 'Bottom photo'] },
    { id: 3, name: 'Blue', W: 1080, H: 1080, f: [['date', 'Date', 1], ['district', 'Place / இடம்', 1], ['badge', 'Tag (Breaking News…) – blank to hide', 1], ['headline', 'Title', 2], ['body', 'Script', 8]], ph: ['Photo'] },
    { id: 4, name: 'Green', W: 1080, H: 1080, f: [['date', 'Date', 1], ['district', 'Place / இடம்', 1], ['badge', 'Tag (Breaking News…) – blank to hide', 1], ['headline', 'Title', 2], ['p1', 'Script 1', 5], ['p2', 'Script 2 (green)', 5]], ph: ['Photo'] }
  ];
  function today() { var d = new Date(), m = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']; return ('0' + d.getDate()).slice(-2) + '-' + m[d.getMonth()] + '-' + d.getFullYear(); }
  function blank() { return { date: today(), headline: '', cap: '', sub: '', body: '', p1: '', p2: '', badge: 'பிரேக்கிங் நியூஸ்', district: '', by: '', fade: 45 }; }
  var admin = false, editing = null, PW = '', cur = 0, T = {}, PH = {}, active = 0;   /* T[tplId] = texts, PH[tplId] = [{img,x,y,z}] */
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
    /* no white box: black fade rises from the bottom of the photo, script is written on it */
    var PX = 66, PY = 62, PW = 937, PH = 894, fh = PH * Math.max(20, Math.min(90, +t.fade || 45)) / 100;
    var gr = g.createLinearGradient(0, PY + PH, 0, PY + PH - fh);
    gr.addColorStop(0, 'rgba(0,0,0,.94)'); gr.addColorStop(.55, 'rgba(0,0,0,.72)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); rr(PX, PY, PW, PH, 32); g.clip(); g.fillStyle = gr; g.fillRect(PX, PY + PH - fh, PW, fh); g.restore();
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

  function mark() {
    var W = cv.width, H = cv.height, R = Math.hypot(W, H) / 2, label = '© தீக்கதிர் • பதிப்புரிமை';
    g.save(); g.globalAlpha = .27; g.font = '800 40px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.translate(W / 2, H / 2); g.rotate(-Math.PI / 7); g.lineWidth = 5; g.lineJoin = 'round';
    for (var y = -R, r = 0; y < R; y += 170, r++) for (var x = -R; x < R; x += 470) { var xx = x + (r % 2 ? 235 : 0); g.strokeStyle = '#fff'; g.strokeText(label, xx, y); g.fillStyle = '#111'; g.fillText(label, xx, y); }
    g.restore();
  }
  function draw() {
    var d = TPL[cur]; if (cv.width !== d.W || cv.height !== d.H + HDR) { cv.width = d.W; cv.height = d.H + HDR; }
    HIT = []; g.save(); g.clearRect(0, 0, cv.width, cv.height);
    DRAW[cur](txt());
    if (!admin) mark(); g.restore();
  }

  /* ───────────── UI ───────────── */
  function say(m) { $('#msg').textContent = m || ''; }
  function buildTabs() {
    var n = $('#tabs'); n.innerHTML = '';
    TPL.forEach(function (d, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = d.name; b.setAttribute('aria-pressed', i === cur ? 'true' : 'false'); b.onclick = function () { cur = i; active = 0; buildForm(); draw(); buildTabs(); }; n.appendChild(b); });
  }
  function buildForm() {
    var d = TPL[cur], t = txt(), f = $('#fields'), s = $('#slots'); f.innerHTML = ''; s.innerHTML = '';
    d.f.forEach(function (x) {
      var l = document.createElement('label'); l.textContent = x[1]; var i = document.createElement(x[2] > 1 ? 'textarea' : 'input'); if (x[2] > 1) i.rows = Math.min(x[2], 8); i.value = t[x[0]] || '';
      i.oninput = function () { t[x[0]] = i.value; saveTxt(); draw(); }; l.appendChild(i);
      if (x[0] === 'badge') i.setAttribute('list', 'badges');
      if (x[0] === 'district') i.setAttribute('list', 'districts');
      if (x[0] === 'date') { var tb = document.createElement('button'); tb.type = 'button'; tb.className = 'alt'; tb.textContent = '📅 Today'; tb.onclick = function () { t.date = today(); i.value = t.date; saveTxt(); draw(); }; l.appendChild(tb); }
      f.appendChild(l);
    });
    if (d.id === 3) {
      var fl = document.createElement('label'), fv = document.createElement('span'), rg = document.createElement('input'); fl.textContent = 'Black fade height (drag) · ';
      rg.type = 'range'; rg.min = 20; rg.max = 90; rg.step = 1; rg.value = t.fade || 45; fv.textContent = rg.value + '%'; fl.appendChild(fv); fl.appendChild(rg);
      rg.oninput = function () { t.fade = +rg.value; fv.textContent = rg.value + '%'; saveTxt(); draw(); }; f.appendChild(fl);
    }
    d.ph.forEach(function (nm, k) {
      var w = document.createElement('div'); w.className = 'slot' + (k === active ? ' on' : '');
      var l = document.createElement('label'); l.className = 'file'; l.textContent = '📷 ' + nm; var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.hidden = true;
      inp.onchange = function () { if (!inp.files[0]) return; shrink(inp.files[0], 1400, function (u, im) { var c = new Image(); c.onload = function () { phs()[k] = { img: c, src: u, x: 0, y: 0, z: 1 }; active = k; sync(); draw(); }; c.src = u; }); };
      l.appendChild(inp); w.appendChild(l); w.onclick = function () { active = k; sync(); }; s.appendChild(w);
    });
    sync();
  }
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

  /* export (admin only) */
  function blob(cb) { draw(); cv.toBlob(cb, 'image/jpeg', .95); }
  function fname() { var d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return 'news-card-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.jpg'; }
  $('#bDl').onclick = function () { if (!admin) return; blob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); say('Downloaded ✔'); }); };

  /* ───────────── server (Google Apps Script) ───────────── */
  function why() { return 'Cannot reach the server. In Apps Script: Deploy as Web app, access = Anyone.'; }
  /* ---- local mode (API_URL empty): works on this device, no server needed ---- */
  function sha256(ascii) {
    function rr(v, n) { return (v >>> n) | (v << (32 - n)); }
    var mp = Math.pow, mw = mp(2, 32), i, j, result = '', words = [], abl, hash = [], k = [], pc = 0, ic = {};
    ascii = unescape(encodeURIComponent(ascii)); abl = ascii.length * 8; ascii += '\x80';
    for (var cand = 2; pc < 64; cand++) {
      if (!ic[cand]) { for (i = 0; i < 313; i += cand) ic[i] = cand; hash[pc] = (mp(cand, .5) * mw) | 0; k[pc++] = (mp(cand, 1 / 3) * mw) | 0; }
    }
    hash = hash.slice(0, 8);
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) { j = ascii.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    words[words.length] = (abl / mw) | 0; words[words.length] = abl;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = hash; hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0; hash.length = 8;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += (b < 16 ? 0 : '') + b.toString(16); }
    return result;
  }

  var LOCAL_HASH = '578f83b6fe5a9dbebe2193cd0941fad3e0a6ab57ad8467ea78191293f70397d3';   /* sha256('cardmaker|theekkathir|<password>') */
  function readSubs() { try { return JSON.parse(localStorage.getItem('cm_subs') || '[]') || []; } catch (e) { return []; } }
  function writeSubs(a) { try { localStorage.setItem('cm_subs', JSON.stringify(a)); return true; } catch (e) { return false; } }
  function localApi(b) {
    var a = readSubs(), i, r;
    function find() { for (i = 0; i < a.length; i++) if (a[i].id === b.id) return a[i]; return null; }
    if (b.action === 'submit') {
      var id = Math.random().toString(36).slice(2, 12);
      a.push({ id: id, ts: new Date().toISOString(), tpl: b.data.tpl, headline: String((b.data.text || {}).headline || '').slice(0, 80), edited: false, data: b.data });
      return { ok: writeSubs(a), error: 'full' };
    }
    if (sha256('cardmaker|theekkathir|' + (b.password || '')) !== LOCAL_HASH) return { ok: false, error: 'auth' };
    if (b.action === 'list') return { ok: true, items: a.slice().sort(function (x, y) { return x.ts < y.ts ? 1 : -1; }).slice(0, 100).map(function (x) { return { id: x.id, ts: x.ts, tpl: x.tpl, headline: x.headline, edited: x.edited }; }) };
    r = find(); if (!r) return { ok: false, error: 'missing' };
    if (b.action === 'get') return { ok: true, data: r.data };
    if (b.action === 'update') { r.data = b.data; r.headline = String((b.data.text || {}).headline || '').slice(0, 80); r.edited = true; return { ok: writeSubs(a) }; }
    if (b.action === 'delete') { a.splice(a.indexOf(r), 1); return { ok: writeSubs(a) }; }
    return { ok: false, error: 'bad' };
  }
  function api(b) {
    if (!CFG.API_URL) return new Promise(function (res) { setTimeout(function () { res(localApi(b)); }, 150); });
    return fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify(b) }).then(function (r) { return r.json(); });
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
  function resetCur() { var id = TPL[cur].id; delete T[id]; delete PH[id]; saveTxt(); buildForm(); draw(); }

  /* public: Submit */
  $('#bSub').onclick = function () {
    if (!String(txt().headline || '').trim()) { say('Please type a title first'); return; }
    var b = this; b.disabled = true; say('Submitting…');
    api({ action: 'submit', data: pack() }).then(function (r) { if (r.ok) { say(CFG.API_URL ? 'Submitted ✔ Thank you. Our team will review it.' : 'Submitted ✔ (saved on this device)'); resetCur(); } else say(r.error === 'full' && !CFG.API_URL ? 'Storage full — ask admin to delete old submissions' : 'Could not submit. Please try again.'); })
      .catch(function () { say(why()); }).then(function () { b.disabled = false; });
  };

  /* admin: password → list → edit / download / delete */
  function ses(v) { try { if (v) sessionStorage.setItem('cm_pw', v); else sessionStorage.removeItem('cm_pw'); } catch (e) {} }
  try { PW = sessionStorage.getItem('cm_pw') || ''; } catch (e) {}
  function panel(list) { if (list) brandFill(); $('#adm').hidden = false; $('#alogin').hidden = list; $('#alist').hidden = !list; }
  function loadList() {
    $('#items').textContent = 'Loading…'; $('#am').textContent = '';
    return api({ action: 'list', password: PW }).then(function (r) {
      if (!r.ok) { PW = ''; ses(''); panel(false); $('#am').textContent = r.error === 'auth' ? 'Wrong password' : r.error === 'nopw' ? 'ADMIN_PASSWORD is not set in Apps Script' : 'Error'; return; }
      ses(PW); panel(true); $('#apw').value = '';
      var n = $('#items'); n.textContent = r.items.length ? '' : 'No submissions yet';
      r.items.forEach(function (it) { var b = document.createElement('button'); b.type = 'button'; b.className = 'alt item'; b.textContent = (it.headline || '(no title)') + ' · ' + new Date(it.ts).toLocaleString(); b.onclick = function () { openItem(it.id); }; n.appendChild(b); });
    }).catch(function () { panel(false); $('#am').textContent = why(); });
  }
  /* brand settings (logo / handle / website) — saved on this device */
  function brandFill() { $('#bh').value = B.handle; $('#bw').value = B.site; $('#lprev').style.backgroundImage = 'url("' + (B.logo || window.CM_LOGO || 'logo.png') + '")'; }
  $('#lfile').onchange = function () { var f = this.files[0]; if (!f) return; shrink(f, 360, function (u) { setLogo(u); $('#lprev').style.backgroundImage = 'url("' + u + '")'; }, 'image/png'); };
  $('#lclr').onclick = function () { setLogo(''); $('#lprev').style.backgroundImage = 'url("' + (window.CM_LOGO || 'logo.png') + '")'; };
  $('#aBrand').onclick = function () { B.handle = $('#bh').value.trim(); B.site = $('#bw').value.trim(); $('#am').textContent = saveBrand() ? 'Brand saved ✔' : 'Logo too large to save — try a smaller image'; draw(); };
  $('#bAdmin').onclick = function () { if (PW) { panel(true); loadList(); } else panel(false); };
  $('#aClose').onclick = $('#aClose2').onclick = function () { $('#adm').hidden = true; };
  $('#aRefresh').onclick = loadList;
  $('#aOut').onclick = function () { PW = ''; ses(''); $('#adm').hidden = true; };
  $('#alogin').addEventListener('submit', function (e) { e.preventDefault(); PW = $('#apw').value; loadList(); });
  function mode(on) { admin = on; $('#barPub').hidden = on; $('#barAdm').hidden = !on; draw(); }
  function openItem(id) {
    api({ action: 'get', password: PW, id: id }).then(function (r) {
      if (!r.ok) { say('Could not open'); return; }
      editing = id; admin = true; unpack(r.data, function () { $('#adm').hidden = true; mode(true); say('Editing submission — correct it, then Save correction or Download'); });
    }).catch(function () { say('Service not available'); });
  }
  $('#bSave').onclick = function () { api({ action: 'update', password: PW, id: editing, data: pack() }).then(function (r) { say(r.ok ? 'Correction saved ✔' : 'Could not save'); }).catch(function () { say('Service not available'); }); };
  $('#bDel').onclick = function () { if (!confirm('Delete this submission?')) return; api({ action: 'delete', password: PW, id: editing }).then(function (r) { if (r.ok) back(); else say('Could not delete'); }); };
  $('#bBack').onclick = back;
  function back() { editing = null; resetCur(); mode(false); say(''); panel(true); loadList(); }

  /* copyright protection (public view) */
  function onCard(e) { return !admin && e.target && e.target.closest && e.target.closest('.stage'); }
  ['contextmenu', 'dragstart', 'copy'].forEach(function (ev) { document.addEventListener(ev, function (e) { if (onCard(e)) e.preventDefault(); }); });
  document.addEventListener('keydown', function (e) { if (admin) return; var k = (e.key || '').toLowerCase(); if ((e.ctrlKey || e.metaKey) && 's p u'.split(' ').indexOf(k) > -1) e.preventDefault(); });
  document.addEventListener('keyup', function (e) { if (e.key === 'PrintScreen' && !admin) { try { navigator.clipboard.writeText('© தீக்கதிர் — பதிப்புரிமை'); } catch (x) {} say('Screenshots are prohibited — © தீக்கதிர்'); } });

  loadBrand(); loadTxt(); buildTabs(); buildForm(); draw();
  if (document.fonts && document.fonts.load) { Promise.all(['500', '700', '800', '900'].map(function (w) { return document.fonts.load(w + ' 30px "Noto Sans Tamil"', 'தமிழ் Abc'); })).then(draw, function () {}); document.fonts.ready.then(draw); }
  $('#ver').textContent = 'v10 ✔';
})();
