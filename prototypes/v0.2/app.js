/* jshint browser:true */
/* 小淋宝 LymPal · M2 原型 v0.1.0 · app.js（零框架，事件委托 + hash 路由）
   红线：不判读、不建议、不代发；删除=改这一条；AI 示例只填输入框（cll:agent-draft 协议）。 */
(function () {
  'use strict';
  var APP_INFO = { version: '0.1.0' };
  var D = window.LYMPAL_DEMO;

  /* ================= 基础工具 ================= */
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function days(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
  function fmtD(iso) { return iso ? iso.slice(0, 10) : '—'; }
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.removeAttribute('hidden');
    clearTimeout(toast._h);
    toast._h = setTimeout(function () { t.setAttribute('hidden', ''); }, 3200);
  }

  /* ================= 路由（13 一级页；med/trial/records 带二级） ================= */
  var VIEWS = ['dash', 'records', 'ww', 'labs', 'onechart', 'gene', 'med', 'trial', 'comorb', 'nutr', 'mind', 'prep', 'settings'];
  var SUBS = {
    records: ['main', 'docs'],
    med: ['overview', 'checkin', 'calendar', 'rx', 'ae'],
    trial: ['list', 'match']
  };
  /* 全部 (view, sub) 19 条——自检穷举用 */
  var VIEW_SUBS = ['dash', 'records', 'records/docs', 'ww', 'labs', 'onechart', 'gene', 'med',
    'med/checkin', 'med/calendar', 'med/rx', 'med/ae', 'trial', 'trial/match',
    'comorb', 'nutr', 'mind', 'prep', 'settings'];

  function parseHash() {
    var h = (location.hash || '#dash').slice(1).split('?')[0].split('/');
    var view = VIEWS.indexOf(h[0]) >= 0 ? h[0] : 'dash';
    var sub = null;
    if (SUBS[view]) {
      sub = SUBS[view].indexOf(h[1]) >= 0 ? h[1] : SUBS[view][0];
    }
    return { view: view, sub: sub };
  }

  /* ================= 全局状态（内存态，刷新回演示数据） ================= */
  var state = {
    route: parseHash(),
    flipped: new Set(),          /* 指标卡翻面，存 key（27 号：状态存 key 不存 DOM） */
    chart: { sel: ['alc', 'hgb'], range: 'all', tx: true, pin: null }, /* 一图秀 */
    asked: {},                   /* 触发词表勾选"我想问的" */
    kbTarget: null,              /* 数字键盘组件目标输入 */
    extra: { cbc: [], questions: D.questions.slice(), checked: [] } /* 本机写入（演示内存态） */
  };

  /* ================= filterPrivate：三出口（export/ai/summary） ================= */
  var EXITS = ['export', 'ai', 'summary'];
  function filterPrivate(list, exit) {
    if (EXITS.indexOf(exit) < 0) throw new Error('filterPrivate: 未知出口 ' + exit);
    return (list || []).filter(function (r) { return r.visibility !== 'private'; });
  }
  function maskRow(r) { /* 导出对 private 字段打码（不删除行，字段值显示 ●●） */
    var c = {}; Object.keys(r).forEach(function (k) { c[k] = (k === 'visibility' || typeof r[k] !== 'string') ? r[k] : r[k]; });
    if (r.visibility === 'private') c.raw = c.note = c.self = '●●（私密，已打码）';
    return c;
  }

  /* ================= 指标读模型（demo + 本机写入同源合并） ================= */
  function cbcAll() { return D.cbc.concat(state.extra.cbc).sort(function (a, b) { return a.d < b.d ? -1 : 1; }); }
  function metrics() { /* 与一图秀共用同一目录（23 号 A：单一来源） */
    var c = cbcAll(), b = D.biochem;
    return [
      { code: 'wbc', series: '血象', name: '白细胞', unit: '10⁹/L', pts: c.map(function (r) { return { d: r.d, v: r.wbc, lab: r.lab }; }) },
      { code: 'alc', series: '血象', name: '淋巴细胞绝对值（ALC）', unit: '10⁹/L', pts: c.map(function (r) { return { d: r.d, v: r.alc, lab: r.lab }; }) },
      { code: 'plt', series: '血象', name: '血小板', unit: '10⁹/L', pts: c.map(function (r) { return { d: r.d, v: r.plt, lab: r.lab }; }) },
      { code: 'hgb', series: '血象', name: '血红蛋白', unit: 'g/L', pts: c.map(function (r) { return { d: r.d, v: r.hgb, lab: r.lab }; }) },
      { code: 'ldh', series: '生化', name: '乳酸脱氢酶（LDH）', unit: 'U/L', pts: b.map(function (r) { return { d: r.d, v: r.ldh, lab: r.lab }; }) },
      { code: 'b2m', series: '生化', name: 'β2 微球蛋白', unit: 'mg/L', pts: b.map(function (r) { return { d: r.d, v: r.b2m, lab: r.lab }; }) },
      { code: 'alt', series: '生化', name: '谷丙转氨酶（ALT）', unit: 'U/L', pts: b.map(function (r) { return { d: r.d, v: r.alt, lab: r.lab }; }) },
      { code: 'crea', series: '生化', name: '肌酐', unit: 'μmol/L', pts: b.map(function (r) { return { d: r.d, v: r.crea, lab: r.lab }; }) },
      { code: 'mrd', series: '分子', name: 'MRD（流式）', unit: '%', pts: D.mrdSeries.map(function (m) { return { d: m.d, v: m.v, lab: m.lab }; }) },
      { code: 'exam', series: '体格', name: '淋巴结与脾脏评估', unit: '', qual: true, pts: D.exam.map(function (r) { return { d: r.d, v: null, text: r.text, lab: r.lab }; }) }
    ];
  }
  function metricByCode(code) {
    var m = null; metrics().forEach(function (x) { if (x.code === code) m = x; });
    return m;
  }

  /* ================= Fritsch–Carlson 单调三次插值（自实现） ================= */
  function r2(n) { return Math.round(n * 100) / 100; }
  function smoothPath(pts) {
    var p = (pts || []).filter(function (o) { return o && isFinite(o[0]) && isFinite(o[1]); })
      .map(function (o) { return { x: Number(o[0]), y: Number(o[1]) }; });
    if (p.length === 0) return '';
    if (p.length === 1) return 'M' + r2(p[0].x) + ' ' + r2(p[0].y);
    var n = p.length, i, dx = [], slope = [], tan = [];
    for (i = 0; i < n - 1; i++) { dx[i] = p[i + 1].x - p[i].x; slope[i] = dx[i] === 0 ? 0 : (p[i + 1].y - p[i].y) / dx[i]; }
    tan[0] = slope[0];
    for (i = 1; i < n - 1; i++) {
      if (slope[i - 1] * slope[i] <= 0) tan[i] = 0;
      else {
        var w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
        tan[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
      }
    }
    tan[n - 1] = slope[n - 2];
    /* 单调性修正（Fritsch–Carlson 1980） */
    for (i = 0; i < n - 1; i++) {
      if (slope[i] === 0) { tan[i] = 0; tan[i + 1] = 0; continue; }
      var a = tan[i] / slope[i], b2 = tan[i + 1] / slope[i], s = a * a + b2 * b2;
      if (s > 9) { var tau = 3 / Math.sqrt(s); tan[i] = tau * a * slope[i]; tan[i + 1] = tau * b2 * slope[i]; }
    }
    var d = 'M' + r2(p[0].x) + ' ' + r2(p[0].y);
    for (i = 0; i < n - 1; i++) {
      var h = dx[i];
      d += ' C' + r2(p[i].x + h / 3) + ' ' + r2(p[i].y + tan[i] * h / 3) +
        ' ' + r2(p[i + 1].x - h / 3) + ' ' + r2(p[i + 1].y - tan[i + 1] * h / 3) +
        ' ' + r2(p[i + 1].x) + ' ' + r2(p[i + 1].y);
    }
    return d;
  }

  /* ================= LDT：只算天数，不判读 ================= */
  function ldtDays() {
    /* 用 W&W 段（治疗前）首末两点：ALC 4.2 → 19.6 */
    var w = cbcAll().filter(function (r) { return r.d < '2026-06-01'; });
    if (w.length < 2) return null;
    var a = w[0], b = w[w.length - 1];
    var ratio = b.alc / a.alc;
    if (!(ratio > 1)) return null;
    return {
      days: Math.round(days(a.d, b.d) * Math.log(2) / Math.log(ratio)),
      span: fmtD(a.d) + ' → ' + fmtD(b.d),
      from: a.alc, to: b.alc
    };
  }

  /* ================= SVG 折线图（根 class="chart"；每线独立归一化） ================= */
  var CHART_W = 720, CHART_H = 260, PAD = { l: 8, r: 64, t: 26, b: 26 };
  var SERIES_COLORS = { '血象': '#2f5fa8', '生化': '#7a5aa0', '分子': '#a8642f', '体格': '#4a7d5e' };
  function timeRange(range, all) {
    var last = all[all.length - 1].d;
    if (range === 'all') return null;
    var months = { '6m': 6, '12m': 12, '3m': 3 }[range] || 0;
    if (!months) return null;
    var t = new Date(last); t.setMonth(t.getMonth() - months);
    return t.toISOString().slice(0, 10);
  }
  function chartSVG(codes, range, showTx) {
    var all = metrics();
    var globalDates = [];
    all.forEach(function (m) { m.pts.forEach(function (p) { globalDates.push(p.d); }); });
    globalDates.sort();
    var from = timeRange(range, all.reduce(function (acc, m) { return m.pts.length ? acc.concat([m.pts[m.pts.length - 1]]) : acc; }, []).sort(function (a, b) { return a.d < b.d ? -1 : 1; }));
    var t0 = from ? from : globalDates[0], t1 = globalDates[globalDates.length - 1];
    var x = function (d) {
      var span = days(t0, t1) || 1;
      return PAD.l + (days(t0, d) / span) * (CHART_W - PAD.l - PAD.r);
    };
    var picked = codes.map(metricByCode).filter(Boolean);
    var msgs = [], drawn = [];
    var txTop = showTx ? 22 : 0;
    var g = '', labels = '', dots = '';
    picked.forEach(function (m, si) {
      var pts = m.pts.filter(function (p) { return p.d >= t0 && p.d <= t1; });
      if (m.qual) { msgs.push(esc(m.name) + '：描述性内容不进折线（分类不进趋势）'); return; }
      if (!pts.length) { msgs.push(esc(m.name) + '：这个时间窗里没有所选指标'); return; }
      var vals = m.pts.map(function (p) { return p.v; }); /* 归一化取全期 min/max（16 号 0.2） */
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      var span = (hi - lo) || Math.max(Math.abs(hi) * 0.08, 1);
      var y = function (v) { return PAD.t + txTop + (1 - (v - lo) / span) * (CHART_H - PAD.t - txTop - PAD.b); };
      var col = SERIES_COLORS[m.series];
      var xy = pts.map(function (p) { return [x(p.d), y(p.v)]; });
      if (xy.length > 1) {
        g += '<path class="line" pathLength="1" stroke="' + col + '" d="' + smoothPath(xy) + '"/>';
      } else { msgs.push(esc(m.name) + '：只有 1 次记录，暂不连线'); }
      pts.forEach(function (p, i) {
        var lastPt = i === pts.length - 1;
        dots += '<circle class="pt" cx="' + r2(x(p.d)) + '" cy="' + r2(y(p.v)) + '" r="' + (lastPt ? 4 : 2.6) +
          '" fill="' + col + '"><title>' + esc(m.name) + '：' + p.v + ' ' + esc(m.unit) + ' · ' + fmtD(p.d) + ' · ' + esc(p.lab || '') + '</title></circle>';
        if (lastPt && xy.length > 1) {
          var lx = x(p.d), anchor = (CHART_W - lx) < 46 ? 'end' : 'start', dy = (si % 2 ? -12 : 4);
          labels += '<text class="lbl" x="' + r2(lx + (anchor === 'end' ? -6 : 6)) + '" y="' + r2(y(p.v) + dy) +
            '" text-anchor="' + anchor + '" fill="' + col + '">' + p.v + ' ' + esc(m.unit) + '</text>';
        }
      });
      drawn.push({ m: m, lo: lo, hi: hi, n: pts.length });
    });
    /* 治疗条：独立泳道（不压曲线；关掉后曲线坐标不变——坐标不依赖此开关） */
    var tx = '';
    if (showTx) {
      var txs = [{ d: '2026-06-01', label: '泽布替尼起（演示）' }];
      txs.forEach(function (e) {
        var ex = x(e.d);
        tx += '<line x1="' + r2(ex) + '" y1="' + (PAD.t) + '" x2="' + r2(ex) + '" y2="' + (CHART_H - PAD.b) + '" stroke="' + 'currentColor' + '" stroke-dasharray="3 6" opacity=".4"/>' +
          '<text class="lbl" x="' + r2(ex) + '" y="' + (PAD.t - 4) + '" text-anchor="middle">' + esc(e.label) + '</text>';
      });
    }
    /* 月刻度（>7 隔一取一） */
    var ticks = '', seen = {};
    globalDates.forEach(function (d) {
      var key = d.slice(0, 7);
      if (seen[key] || d < t0 || d > t1) return;
      seen[key] = 1;
      ticks += '<line x1="' + r2(x(d)) + '" y1="' + (CHART_H - PAD.b) + '" x2="' + r2(x(d)) + '" y2="' + (CHART_H - PAD.b + 4) + '" stroke="currentColor" opacity=".35"/>' +
        '<text class="tick" x="' + r2(x(d)) + '" y="' + (CHART_H - 8) + '" text-anchor="middle">' + key + '</text>';
    });
    var legend = drawn.map(function (o) {
      return '<span class="lg-item"><i style="background:' + SERIES_COLORS[o.m.series] + '"></i>' + esc(mShort(o.m)) +
        ' · 全期 ' + o.lo + '–' + o.hi + ' ' + esc(o.m.unit) + ' · ' + o.n + ' 点</span>';
    }).join('');
    var note = msgs.length ? '<p class="muted">' + msgs.join('；') + '</p>' : '';
    return '<div class="chart-wrap"><svg class="chart" viewBox="0 0 ' + CHART_W + ' ' + CHART_H + '" role="img" ' +
      'aria-label="趋势图：每条线按该指标全部记录范围缩放，不代表不同指标数值可比">' + tx + g + dots + labels + ticks + '</svg>' +
      '<p class="axis-note">↑ 每条线按该指标全部记录范围缩放，不代表不同指标数值可比</p>' +
      '<div class="legend">' + legend + '</div>' + note + '</div>';
  }
  function mShort(m) { return m.name.replace(/（.*?）/g, ''); }

  /* ================= 指标卡（分系列 + 3D 翻转；同一组件两处复用） ================= */
  function metricCardHTML(m) {
    var flipped = state.flipped.has(m.code);
    var latest = m.pts[m.pts.length - 1];
    var prev = m.pts.length > 1 ? m.pts[m.pts.length - 2] : null;
    var delta = '';
    if (m.qual) delta = '描述性内容，不进折线';
    else if (!latest) delta = '还没有记录';
    else if (!prev) delta = '暂无可比较的前次记录';
    else {
      var d = r2(latest.v - prev.v);
      delta = (d > 0 ? '↑ +' : d < 0 ? '↓ ' : '→ ') + d + ' ' + m.unit + '（较 ' + fmtD(prev.d) + '）';
    }
    var frontVal = m.qual ? '<span class="mval-s">' + esc(latest ? latest.text : '还没有记录') + '</span>'
      : (latest ? '<span class="mval">' + latest.v + '</span><span class="munit">' + esc(m.unit) + '</span>' : '<span class="mval-s">还没有记录</span>');
    var ldtTag = (m.code === 'alc') ? (function () {
      var L = ldtDays();
      return L ? '<div class="ldt-strip">LDT（倍增时间）：' + L.days + ' 天 · 只算天数不判读 · 并排见指南原文：「' + esc(D.ldtLimitQuote) + '」（' + esc(D.ldtLimitSrc) + '）</div>' : '';
    })() : '';
    var backPts = m.pts.slice(-8);
    var backChart = '';
    if (m.qual) {
      backChart = '<p class="muted">描述性评估：不画折线（分类不进趋势）。最近记录见正面。</p>';
    } else if (backPts.length > 1) {
      var vals = backPts.map(function (p) { return p.v; });
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), span = (hi - lo) || 1;
      var w = 250, h = 74, xy = backPts.map(function (p, i) {
        return [6 + i * ((w - 12) / (backPts.length - 1)), 8 + (1 - (p.v - lo) / span) * (h - 20)];
      });
      backChart = '<svg class="chart mini" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(m.name) + ' 最近 ' + backPts.length + ' 次趋势">' +
        '<path class="line" pathLength="1" stroke="' + SERIES_COLORS[m.series] + '" d="' + smoothPath(xy) + '"/>' +
        xy.map(function (p) { return '<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="2.4" fill="' + SERIES_COLORS[m.series] + '"/>'; }).join('') + '</svg>';
    } else {
      backChart = '<p class="muted">只有 1 次记录，暂不连线。</p>';
    }
    var hist = m.qual
      ? m.pts.map(function (p) { return fmtD(p.d) + '：' + esc(p.text); }).join('；')
      : '最近 ' + backPts.length + ' 次：' + backPts.map(function (p) { return fmtD(p.d) + ' ' + p.v; }).join(' / ');
    return '<button type="button" class="mcard" role="group" data-act="flip" data-code="' + m.code + '" aria-pressed="' + flipped + '"' +
      ' aria-roledescription="指标卡（点击或回车翻面）" aria-label="' + esc(m.name) + '，' + (flipped ? '点击返回摘要' : '点击翻转查看系列说明与历史摘要') + '">' +
      '<span class="mcard-inner"><span class="mface front"' + (flipped ? ' aria-hidden="true" inert' : '') + '>' +
      '<span class="brow"><i class="dot" style="background:' + SERIES_COLORS[m.series] + '"></i>' + esc(m.series) + ' 系</span>' +
      '<span class="mname">' + esc(m.name) + '</span>' +
      '<span class="mrow">' + frontVal + '</span>' +
      '<span class="mdelta">' + delta + '</span>' +
      '<span class="mnote">' + (m.code === 'alc' ? 'W&W 核心序列；数值照抄报告原文。' : '数值照抄报告原文，不换算。') + '</span>' +
      '<span class="mmeta">' + m.pts.length + ' 次记录 · ' + (latest ? fmtD(latest.d) : '—') + ' · ' + esc(latest ? (latest.lab || '') : '') + ' · 点开看趋势</span>' +
      ldtTag +
      '</span><span class="mface back"' + (flipped ? '' : ' aria-hidden="true" inert') + '>' +
      '<span class="brow">' + esc(m.name) + ' · 最近 ' + backPts.length + ' 次</span>' +
      backChart +
      '<span class="mnote">' + esc(D.seriesNote[m.series] || '') + '</span>' +
      '<span class="mmeta">单位 ' + esc(m.unit || '（描述）') + ' · 参考区间来源：报告单实验室区间为唯一显示口径 · 仅回顾已记录的值 · 点击返回</span>' +
      '<span class="mmeta">' + esc(hist).slice(0, 120) + '</span>' +
      '</span></span></button>';
  }
  function metricGroupsHTML(filter) {
    var all = metrics().filter(filter || function () { return true; });
    return D.SERIES_ORDER.map(function (s) {
      var ms = all.filter(function (m) { return m.series === s; });
      if (!ms.length) return '';
      var has = ms.filter(function (m) { return m.pts.length; }).length;
      return '<section class="series-block"><h3 class="h3 series-title">' + s + '系 · ' + ms.length + ' 项 · 有记录 ' + has + ' 项</h3>' +
        '<div class="metric-grid">' + ms.map(metricCardHTML).join('') + '</div></section>';
    }).join('');
  }

  /* ================= AI 协助（cll:agent-draft：只填输入框，不自动发送） ================= */
  function aiContext() {
    var kept = filterPrivate(D.ae.concat(D.mood), 'ai');
    var c = cbcAll();
    return {
      page: state.route.view + (state.route.sub ? '/' + state.route.sub : ''),
      profile: D.profile.name + ' · ' + D.profile.dxNameText,
      range: c[0].d + ' → ' + c[c.length - 1].d,
      records: '最近 ALC ' + c[c.length - 1].alc + ' ' + '10⁹/L；共 ' + c.length + ' 次血常规；副作用/心理条目经 private 过滤后 ' + kept.length + ' 条'
    };
  }
  function agentDraft(prompt) {
    var ctx = aiContext();
    var detail = { prompt: prompt, context: ctx };
    document.dispatchEvent(new CustomEvent('cll:agent-draft', { detail: detail }));
    var box = $('#aiPrompt');
    box.value = '【预写提示词】\n' + prompt + '\n\n【病情上下文（自动携带）】\n' +
      '页面：' + ctx.page + '\n档案：' + ctx.profile + '\n区间：' + ctx.range + '\n记录摘要：' + ctx.records;
    $('#agentLog').textContent = JSON.stringify(detail, null, 2);
    toast('提示词已填入会话区输入框（未发送，待你手动确认）');
  }
  function aiBtn(prompt, label) {
    return '<button type="button" class="btn btn-ai" data-act="agent-draft" data-prompt="' + esc(prompt) + '">' +
      svgIcon('spark') + (label || 'AI 协助（示例）') + '</button>' +
      '<span class="muted">cll:agent-draft：只填输入框，不自动发送</span>';
  }
  function svgIcon(name) {
    var paths = {
      spark: 'M3 11l4 1 1 4 2-4 4-1-4-1-1-4-2 4z',
      pill: 'M6 14a4 4 0 0 1 0-6l6-4a4 4 0 0 1 6 6l-6 4a4 4 0 0 1-6 0z',
      drop: 'M10 2l5 7a6 6 0 1 1-10 0z',
      chart: 'M2 15l4-6 3 3 4-8 4 5',
      dna: 'M5 2c0 6 10 6 10 12M15 2c0 6-10 6-10 12M6 5h8M6 13h8',
      doc: 'M4 2h8l4 4v12H4zM12 2v4h4',
      check: 'M3 9l4 4 8-9',
      heart: 'M10 15S3 10 3 6a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4-7 9-7 9z',
      leaf: 'M14 3C7 3 3 7 3 14h8c5 0 8-4 8-11z M5 16l6-6',
      people: 'M6 8a3 3 0 1 0 0-1M2 15c0-3 2-5 4-5s4 2 4 5M13 7a3 3 0 1 0 0-1M11 15c0-3 2-4 4-4s3 2 3 4',
      gear: 'M8 3h4l1 2 2 1-1 2 1 2-2 1-1 2H8L7 11 5 10l1-2-1-2 2-1zM10 9a1.5 1.5 0 1 0 0 1',
      flask: 'M6 2h8M9 2v5l-5 8a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-8V2',
      clock: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 6v4l3 2',
      home: 'M2 8l8-6 8 6v9H2zM7 17v-6h6v6'
    };
    return '<svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="' + paths[name] + '"/></svg>';
  }

  /* ================= 通用小组件 ================= */
  function pageHead(eyebrow, title, desc, actions) {
    return '<header class="page-head"><p class="eyebrow">' + esc(eyebrow) + '</p><div class="ph-row"><h1>' + esc(title) + '</h1>' +
      '<div class="actions">' + (actions || '') + '</div></div><p class="page-desc">' + desc + '</p></header>';
  }
  function subnav(view, items) {
    return '<nav class="subnav" aria-label="二级页签">' + items.map(function (it) {
      var cur = (state.route.sub || SUBS[view][0]) === it[1];
      return '<a href="#' + view + (it[1] === SUBS[view][0] && SUBS[view][0] === 'main' ? '' : '/' + it[1]) + '"' +
        (cur ? ' aria-current="page"' : '') + '>' + esc(it[0]) + '</a>';
    }).join('') + '</nav>';
  }
  function moreMenu(items) {
    return '<details class="more"><summary>⋯ 更多</summary><div class="more-menu">' +
      items.map(function (i) { return '<button type="button" class="btn" data-act="' + i[0] + '">' + esc(i[1]) + '</button>'; }).join('') +
      '</div></details>';
  }
  function backHome() { return '<button type="button" class="btn" data-act="go-dash">' + svgIcon('home') + '回到看板</button>'; }

  /* 数字键盘组件（IP7：数字用键盘组件） */
  function keypadHTML(id) {
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
    return '<div class="keypad" id="' + id + '" hidden>' +
      keys.map(function (k) { return '<button type="button" class="btn kb" data-act="kb" data-k="' + k + '">' + k + '</button>'; }).join('') +
      '<button type="button" class="btn" data-act="kb-close">收起键盘</button></div>';
  }

  /* ================= 各页面 ================= */

  /* ---- 看板（入口文案与 INTERACTION-DESIGN §二逐字一致，IP3） ---- */
  function pageDash() {
    var c = cbcAll(), last = c[c.length - 1], L = ldtDays();
    var today = '2026-10-25';
    var todayState = D.checkins.filter(function (r) { return r.d === today; })[0];
    function entryCard(title, buttons, note) {
      return '<section class="card entry-card"><div class="card-head"><h2 class="h2">' + esc(title) + '</h2></div>' +
        '<div class="entry-actions">' + buttons + '</div>' + (note ? '<p class="muted">' + note + '</p>' : '') + '</section>';
    }
    function entryBtn(act, label, primary) {
      return '<button type="button" class="btn' + (primary ? ' btn-primary' : '') + '" data-act="' + act + '">' + esc(label) + '</button>';
    }
    var html = pageHead('看板', '今天先看哪一块',
      '小淋宝只做整理与照抄，不给结论；所有判定都在诊室里完成。',
      aiBtn('帮我把最近的复查数值整理成一段给医生看的清单（只整理，不判读）'));
    html += '<div class="dash-grid">' +
      entryCard('观察与等待', entryBtn('go-ww', '记一次血常规', true) + entryBtn('go-ww-trend', '看淋巴细胞趋势'),
        'W&W 速览：最近 ALC ' + last.alc + ' ×10⁹/L（' + fmtD(last.d) + '）' + (L ? ' · LDT ' + L.days + ' 天（只算天数）' : '')) +
      entryCard('今日', entryBtn('go-checkin', '今天吃了吗', true),
        todayState ? ('当日状态：' + todayState.state + '（漏服不评判）') : '当日未记录') +
      entryCard('副作用', entryBtn('go-ae', '记一次不舒服', true),
        '最近一条：' + esc(D.ae[0].d + ' ' + D.ae[0].term) + '（词表按当前用药过滤）') +
      entryCard('一图秀', entryBtn('go-onechart', '病情一图秀（选几条线叠看）', true), '叠看 1–4 条指标线，只重绘图区。') +
      entryCard('临床试验', entryBtn('go-trial-match', '帮我匹配', true), '三档判定 + 匹配指数（只算字段重合度）。') +
      entryCard('复诊准备', entryBtn('go-prep', '准备复诊', true), '选区间、勾线、生成资料包与问题清单。') +
      entryCard('基因档案', entryBtn('go-gene', '补一条基因结果', true), 'FISH/TP53/IGHV 三态档案。') +
      entryCard('MRD', entryBtn('go-mrd', '记一次 MRD 结果', true), '流式/NGS 原文照抄 + 里程碑轨道。') +
      '</div>';
    return html;
  }

  /* ---- 病情整理 records / records/docs ---- */
  function pageRecords() {
    if (state.route.sub === 'docs') {
      var html = pageHead('病情整理 · 资料夹', '资料夹', '原件由本机目录管理；AI 解析候选必须逐项核对，拒收零副作用。', backHome()) +
        subnav('records', [['病情档案', 'main'], ['资料夹', 'docs']]);
      html += '<section class="card"><div class="card-head"><h2 class="h2">资料目录</h2>' + moreMenu([['import-doc', '手工补一条']]) + '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>文件</th><th>类型</th><th>日期</th><th>核对状态</th><th></th></tr></thead><tbody>' +
        D.docs.map(function (d) {
          return '<tr><td>' + esc(d.name) + '</td><td>' + d.kind + '</td><td>' + d.d + '</td><td><span class="pill">' + d.state + '</span></td>' +
            '<td><button type="button" class="btn" data-act="view-doc">看原文</button></td></tr>';
        }).join('') + '</tbody></table></div></section>';
      return html;
    }
    var p = D.profile;
    var html = pageHead('病情整理', '我的淋·档案', '诊断与分期照抄报告原文，双轨并存不换算；判定归医生。', backHome() + aiBtn('帮我把档案里的分期和基因字段抄成一张就诊随身清单（只照抄）'));
    html += '<section class="card"><div class="card-head"><h2 class="h2">确诊档案</h2>' + moreMenu([['edit-record', '改这一条']]) + '</div>' +
      kvTable([['诊断名（照抄）', p.dxNameText], ['分期（双轨照抄）', p.stageText], ['诊断日期', p.dxDate], ['医院', p.hospital], ['当前医嘱状态', p.status], ['记录者', p.recorder]]) +
      '</section>' +
      '<section class="card"><div class="card-head"><h2 class="h2">候选核对（S1 示例）</h2>' + badge('AI 候选必经核对') + '</div>' +
      '<p class="muted">来源：' + esc(D.pendingCandidate.src) + '</p>' +
      '<table><thead><tr><th>日期</th><th>项目</th><th>值</th><th>单位</th><th>实验室原文</th><th>核对</th></tr></thead><tbody>' +
      D.pendingCandidate.rows.map(function (r, i) {
        return '<tr><td>' + r.d + '</td><td>' + esc(r.item) + '</td><td class="num">' + r.val + '</td><td>' + r.unit + '</td><td>' + esc(r.lab) + '</td>' +
          '<td><button type="button" class="btn" data-act="cand-ok" data-i="' + i + '">确认</button> <button type="button" class="btn" data-act="cand-no" data-i="' + i + '">拒收</button></td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="muted">拒收候选零副作用；全部确认后 ALC 趋势新增一点。删除一律走「改这一条」。</p></section>';
    return html;
  }
  function kvTable(rows) {
    return '<table class="kv"><tbody>' + rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + (r[1] == null ? '' : esc(r[1])) + '</td></tr>'; }).join('') + '</tbody></table>';
  }
  function badge(text, cls) { return '<span class="pill ' + (cls || '') + '">' + esc(text) + '</span>'; }

  /* ---- 观察与等待 ww ---- */
  function pageWw() {
    var L = ldtDays();
    var html = pageHead('观察与等待', 'W&W 轨道',
      '按医嘱间隔记血常规；ALC 趋势与倍增时间只算天数，不判读、无方向性催促文案。', backHome() + aiBtn('帮我把拍照的血常规单识别成候选记录（识别后我逐项核对）'));
    /* 表单（每页显式编辑 ≤1：本页唯一表单＝手工补一条） */
    html += '<section class="card"><div class="card-head"><h2 class="h2">淋巴细胞趋势（ALC）</h2>' + badge('只读') + '</div>' +
      chartSVG(['alc'], 'all', true) + '</section>' +
      '<section class="card"><div class="card-head"><h2 class="h2">倍增时间（LDT）</h2>' + badge('只算天数') + '</div>';
    if (L) {
      html += '<div class="ldt-pair"><div class="ldt-num"><span class="big-num">' + L.days + '</span><span class="muted">天（' + L.span + ' · ' + L.from + '→' + L.to + ' ×10⁹/L）</span></div>' +
        '<blockquote class="quote-block"><p>「' + esc(D.ldtLimitQuote) + '」</p><cite>——' + esc(D.ldtLimitSrc) + '</cite></blockquote></div>';
    } else {
      html += '<p class="muted">区间内无法计算（需要两个以上递增点）；空态不画 0。</p>';
    }
    html += '</section>';
    html += '<section class="card"><div class="card-head"><h2 class="h2">记一次血常规</h2>' + moreMenu([['manual-cbc', '手工补一条'], ['edit-cbc', '改这一条'], ['view-doc', '看原文']]) + '</div>' +
      '<p class="muted">AI＝拍/PDF → 候选（日期+项目名+值+单位+实验室原文）→ 逐项核对（见「病情整理」页示例）。</p>' +
      '<form id="manual-cbc-form" class="form6" hidden>' +
      numField('日期（yyyy-mm-dd）', 'f-date') + numField('ALC 值', 'f-alc', 'decimal') +
      numField('WBC 值', 'f-wbc', 'decimal') + numField('Plt 值', 'f-plt', 'decimal') +
      numField('Hb 值', 'f-hgb', 'decimal') + '<label class="f"><span>实验室原文</span><input type="text" name="f-lab"></label>' +
      '<div class="row"><button type="button" class="btn btn-primary" data-act="save-cbc">保存这条</button>' +
      '<button type="button" class="btn" data-act="cancel-form">取消</button><span class="muted">6 字段；数字用键盘组件。</span></div>' +
      '</form>' + keypadHTML('keypad-ww') + '</section>';
    return html;
  }
  function numField(label, name, im) {
    return '<label class="f"><span>' + esc(label) + '</span><input type="text" class="numkb" inputmode="' + (im === 'decimal' ? 'decimal' : 'text') + '" name="' + name + '"></label>';
  }

  /* ---- 指标检测 labs ---- */
  function pageLabs() {
    return pageHead('指标检测', '分系列指标卡',
      '四系列（血象/生化/分子/体格）有序分组；点卡片翻面看系列说明、单位、参考区间来源与历史摘要。', backHome() + aiBtn('帮我把指标卡的最近值整理成一段就诊前口述稿（只照抄数值与日期）')) +
      metricGroupsHTML();
  }

  /* ---- 病情一图秀 onechart ---- */
  function pageOnechart() {
    var st = state.chart;
    var ranges = [['3m', '近 3 月'], ['6m', '近 6 月'], ['12m', '近 12 月'], ['all', '全部']];
    var head = pageHead('病情一图秀', '选几条线叠看',
      '勾 1–4 项（按系列分组、独立滚动）；重绘只刷图区，翻面与焦点保留。图不判读（AI 无通道）。',
      backHome() + '<button type="button" class="btn btn-primary" data-act="open-picker">指标选择窗口</button>');
    var picker = '<dialog id="picker" class="modal"><div class="modal-head"><h2 class="h2">指标选择窗口（最多 4 条）</h2>' +
      '<button type="button" class="btn" data-act="close-picker">关闭</button></div>' +
      '<div class="picker-body">' + D.SERIES_ORDER.map(function (s) {
        var ms = metrics().filter(function (m) { return m.series === s; });
        return '<div class="picker-group"><h3 class="h3">' + s + '系</h3>' + ms.map(function (m) {
          var on = st.sel.indexOf(m.code) >= 0;
          return '<label class="pick-item"><input type="checkbox" data-act="pick-metric" data-code="' + m.code + '"' + (on ? ' checked' : '') +
            (m.qual ? ' data-qual="1"' : '') + '> ' + esc(mShort(m)) + ' <span class="muted">' + (m.qual ? '（描述性，不进折线）' : m.unit) + '</span></label>';
        }).join('') + '</div>';
      }).join('') + '</div>' +
      '<p class="muted">已选 ' + st.sel.length + '/4；选满后需先去一条再选新的。</p></dialog>';
    var body = '<section class="card"><div class="card-head"><h2 class="h2">叠看</h2>' +
      '<div class="chips">' + ranges.map(function (r) {
        return '<button type="button" class="chip" data-act="range" data-range="' + r[0] + '" aria-pressed="' + (st.range === r[0]) + '">' + r[1] + '</button>';
      }).join('') +
      '<button type="button" class="chip" data-act="tx-toggle" aria-pressed="' + st.tx + '">治疗条</button></div></div>' +
      '<div id="chart-panel">' + chartSVG(st.sel, st.range, st.tx) + '</div>' +
      '<p class="muted">已选 <b id="picker-count">' + st.sel.length + '</b>/4；选满后需先去一条再选新的。</p></section>';
    return head + picker + body;
  }

  /* ---- 基因与预后档案 gene ---- */
  function pageGene() {
    var stateName = { '未检出': 'ok', '检出': 'warn', '未测': 'grey' };
    var html = pageHead('基因与预后档案', 'FISH / TP53 / IGHV',
      '未检出/检出/未测三态严格区分（未测≠未检出）；语境栏只解释词义；误选可「改这一条」。', backHome() + aiBtn('帮我核对我拍的 FISH/NGS 报告候选字段（核对后我才保存）'));
    html += '<section class="card"><div class="card-head"><h2 class="h2">档案（三态）</h2>' + moreMenu([['new-gene', '补一条基因结果'], ['edit-gene', '改这一条'], ['view-doc', '看原文']]) + '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>项目</th><th>状态</th><th>日期</th><th>报告原文</th><th>实验室</th></tr></thead><tbody>' +
      D.gene.map(function (g) {
        return '<tr><td>' + esc(g.item) + '</td><td>' + badge(g.state, stateName[g.state]) + '</td><td>' + fmtD(g.d) + '</td><td><q class="quote">' + esc(g.raw) + '</q></td><td>' + esc(g.lab || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
    html += '<section class="card"><div class="card-head"><h2 class="h2">词表卡（语境栏）</h2>' + badge('零判读') + '</div>' +
      D.geneVocab.map(function (v) { return '<p><b>' + esc(v[0]) + '</b>：' + esc(v[1]) + '</p>'; }).join('') +
      '<p class="muted">来源版本：' + esc(D.indicationSource) + '。词表只给词义，不做预后判断。</p></section>';
    return html;
  }

  /* ---- 口服药与治疗 med（5 个二级） ---- */
  function pageMed() {
    var sub = state.route.sub || 'overview';
    var head = pageHead('口服药与治疗', '治疗线与每日打卡',
      '计划/实际分列；处方变更为分段事件；打卡不做 AI（见打卡页说明）。',
      backHome() + (sub !== 'checkin' ? aiBtn('帮我把这一阶段的服药记录整理成一段就诊前的口述稿（只整理事实与日期）') : '<span class="muted">本页不设 AI 按钮，理由见正文。</span>'));
    var nav = subnav('med', [['治疗线', 'overview'], ['今日打卡', 'checkin'], ['依从日历', 'calendar'], ['处方变更', 'rx'], ['副作用', 'ae']]);
    var body = '';
    if (sub === 'overview') {
      body = '<section class="card"><div class="card-head"><h2 class="h2">治疗线（折叠卡）</h2>' + badge('32 号模版') + '</div>' +
        D.pathway.map(function (ph) {
          return '<details class="phase-fold"><summary><i class="dot"></i>' + esc(ph.phase) + ' · ' + esc(ph.d) + ' · ' + esc(ph.text) + '</summary>' +
            '<div class="phase-detail">' + ['regimen', 'metrics', 'imaging', 'ae', 'support'].map(function (k) {
              var b = ph.detail[k];
              return '<section class="pd-block"><h4 class="h3">' + esc(b.summary) + '</h4><ul>' +
                b.items.map(function (it) { return '<li><b>' + esc(it[0]) + '</b>：' + esc(it[1]) + '</li>'; }).join('') + '</ul></section>';
            }).join('') + '</div></details>';
        }).join('') + '</section>' +
        '<section class="card"><div class="card-head"><h2 class="h2">计划 vs 实际（口径说明）</h2></div>' +
        kvTable([['当前计划', '泽布替尼 160mg 每日两次·持续（照抄医嘱）'], ['实际', '2026-06-01 起；2026-08-20 服药时间调整（分段事件）'], ['口径', '界面状态不入库；只新增版本，更正走「改这一条」']]) + '</section>';
    } else if (sub === 'checkin') {
      /* S6：打卡不 AI——写明理由 */
      var today = '2026-10-25';
      var done = D.checkins.some(function (r) { return r.d === today && r.state === '已服'; });
      var heat = D.checkins.map(function (r) {
        return '<span class="hm hm-' + (r.state === '已服' ? 'ok' : 'miss') + '" title="' + r.d + ' ' + r.state + '"></span>';
      }).join('');
      body = '<section class="card"><div class="card-head"><h2 class="h2">今日口服药</h2>' + badge('不 AI 代打卡') + '</div>' +
        '<p>今日（' + today + '）：' + (done ? '<span class="pill ok">已服</span>' : '<span class="pill grey">未记录</span>') + '</p>' +
        '<div class="row"><button type="button" class="btn btn-primary" data-act="checkin-done"' + (done ? ' disabled' : '') + '>已服</button>' +
        '<button type="button" class="btn" data-act="checkin-miss">漏服</button>' +
        '<button type="button" class="btn" data-act="checkin-edit">改这一条</button></div>' +
        '<h3 class="h3">依从热力图（近 60 天）</h3><div class="heat">' + heat + '</div>' +
        '<p class="muted">为什么本页没有 AI 按钮：打卡是每日事实写入，没有需要归纳的文本；由 AI 代打卡或代判断漏服，会把「事实」变成「生成」，且漏服相关的措辞容易越界成处置方向。所以本页只保留一键手工记录；「记错点改这一条」。</p>' +
        '</section>';
    } else if (sub === 'calendar') {
      var byD = {}; D.checkins.forEach(function (r) { byD[r.d] = r.state; });
      var d = new Date(2026, 9, 1), cells = [];
      for (var i = 0; i < 31; i++) {
        var iso = new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10);
        cells.push('<span class="cal-cell ' + (byD[iso] === '已服' ? 'hm-ok' : byD[iso] === '漏服' ? 'hm-miss' : '') + '">' + (i + 1) + '</span>');
      }
      body = '<section class="card"><div class="card-head"><h2 class="h2">依从日历 · 2026-10</h2>' + badge('只呈现') + '</div>' +
        '<div class="cal">' + cells.join('') + '</div><p class="muted">绿＝已服、黄＝漏服、灰＝无记录；漏服不评判。</p></section>';
    } else if (sub === 'rx') {
      body = '<section class="card"><div class="card-head"><h2 class="h2">处方变更（分段事件）</h2>' +
        moreMenu([['new-rx', '换药/调剂量了']]) + '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>日期</th><th>药名</th><th>剂量</th><th>起</th><th>止</th><th>原因原文</th><th>凭据</th></tr></thead><tbody>' +
        D.rxChanges.map(function (r) {
          return '<tr><td>' + r.d + '</td><td>' + esc(r.drug) + '</td><td>' + esc(r.dose) + '</td><td>' + r.start + '</td><td>' + (r.end || '—') + '</td>' +
            '<td><q class="quote">' + esc(r.reason) + '</q></td><td>' + esc(r.doc) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="muted">红线：本表不提供 AI 推测药名/剂量——处方变更是医嘱事实，只能照抄原文与凭据照片。更正走「改这一条」，只新增版本。</p>' +
        '<form id="rx-form" class="form6" hidden>' +
        '<label class="f"><span>药名</span><input type="text" name="r-drug"></label>' +
        numField('剂量', 'r-dose', 'text') + numField('开始日期', 'r-start') + numField('结束日期', 'r-end') +
        '<label class="f"><span>原因（医嘱原文）</span><input type="text" name="r-reason"></label>' +
        '<label class="f"><span>凭据照片</span><input type="text" name="r-doc" placeholder="文件名或路径"></label>' +
        '<div class="row"><button type="button" class="btn btn-primary" data-act="save-rx">保存这条</button>' +
        '<button type="button" class="btn" data-act="cancel-form">取消</button><span class="muted">6 字段。</span></div>' +
        '</form>' + keypadHTML('keypad-rx') + '</section>';
    } else { /* ae */
      var cur = 'BTKi';
      var vocab = D.aeVocab[cur] || [];
      body = '<section class="card"><div class="card-head"><h2 class="h2">副作用时间线</h2>' + moreMenu([['new-ae', '记一次不舒服'], ['edit-ae', '改这一条']]) + '</div>' +
        '<p class="muted">词表按当前用药过滤：当前在用 BTKi → ' + vocab.map(esc).join(' / ') + '；只列词不处置，无严重度分级判读。</p>' +
        '<ul class="timeline">' + D.ae.map(function (a) {
          return '<li><b>' + a.d + '</b> · ' + esc(a.term) + ' · ' + esc(a.self) + ' · ' + esc(a.raw) +
            (a.visibility === 'private' ? ' ' + badge('私密', 'grey') : '') + '</li>';
        }).join('') + '</ul>' +
        '<p class="muted">BCL-2i 词表（TLS 就诊要问语境）：' + D.aeVocab['BCL-2i'].map(esc).join(' / ') + '</p>' +
        '<form id="ae-form" class="form5" hidden>' +
        '<label class="f"><span>词表选词</span><select name="a-term">' + vocab.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('') + '</select></label>' +
        numField('日期', 'a-date') +
        '<label class="f"><span>一句自评</span><input type="text" name="a-self"></label>' +
        '<label class="f"><span>就医记录（如有，原文）</span><input type="text" name="a-raw"></label>' +
        '<label class="f"><span>是否私密</span><select name="a-vis"><option>共享</option><option>私密</option></select></label>' +
        '<div class="row"><button type="button" class="btn btn-primary" data-act="save-ae">保存这条</button>' +
        '<button type="button" class="btn" data-act="cancel-form">取消</button><span class="muted">≤5 字段；语音一句话→候选词后仍需核对。</span></div>' +
        '</form></section>';
    }
    return head + nav + body;
  }

  /* ---- 临床研究 trial / trial/match ---- */
  function trialTierName(t) { return { local: '本地库命中', external: '外部工具线索', pending: '待确认规则' }[t.tier]; }
  function matchTrial(t) {
    /* 三档判定逐字段：重合 / 不重合 / 无法判定；匹配指数只算字段重合度（分数，不排序） */
    var P = D.matchProfile, hit = 0, total = 0, rows = [];
    Object.keys(t.fields).forEach(function (k) {
      var req = t.fields[k], have = P[k] || '';
      total++;
      var res, cls;
      if (/未测|未记录/.test(have) && /需要|≥|任意|未测也可以/.test(req) === false) { res = '无法判定'; cls = 'grey'; }
      else if (/任意|未测也可以/.test(req) || req === have) { res = '重合'; cls = 'ok'; }
      else if ((req === '用过' || req === '在用（泽布替尼）') && /在用|用过/.test(have)) { res = '重合'; cls = 'ok'; }
      else if (req === '≥65' && parseInt(have, 10) >= 65) { res = '重合'; cls = 'ok'; }
      else if (req === '≥65 或不合条件化疗' && parseInt(have, 10) >= 65) { res = '重合'; cls = 'ok'; }
      else if (req === '≥18' && parseInt(have, 10) >= 18) { res = '重合'; cls = 'ok'; }
      else if (req === 'ECOG 0–2' || req === 'ECOG 0–1' || req === 'ECOG 0–3') {
        if (have === '未记录') { res = '无法判定'; cls = 'grey'; } else { res = '重合'; cls = 'ok'; }
      }
      else { res = '不重合'; cls = 'warn'; }
      if (res === '重合') hit++;
      rows.push('<tr><td>' + esc(k) + '</td><td>' + esc(req) + '</td><td>' + esc(have) + '</td><td>' + badge(res, cls) + '</td></tr>');
    });
    return { hit: hit, total: total, rows: rows.join('') };
  }
  function pageTrial() {
    var sub = state.route.sub || 'list';
    var head = pageHead('临床研究', '三档判定与匹配指数',
      '匹配指数只算字段重合度（如 5/7），显示为分数、不做推荐排序；private 三出口过滤；缺字段一律「无法判定」。', backHome());
    var nav = subnav('trial', [['研究列表', 'list'], ['匹配', 'match']]);
    var body;
    if (sub === 'match') {
      var full = Object.keys(D.matchProfile).filter(function (k) { return !/未测|未记录/.test(D.matchProfile[k]); }).length;
      body = '<section class="card"><div class="card-head"><h2 class="h2">匹配（帮我匹配）</h2>' + badge('字段重合度') + '</div>' +
        '<p class="muted">档案完整度 ' + full + '/' + Object.keys(D.matchProfile).length + ' · 全部来自既有病情数据；排序按数据来源顺序，不按匹配度。</p>' +
        '<div class="row">' + aiBtn('请基于我的档案字段（见上下文）列出值得我去核实的试验条目，并标注每条缺哪些字段（不判定我是否够格）', 'AI 协助匹配') + '</div>' +
        D.trials.slice(0, 6).map(function (t) {
          var m = matchTrial(t);
          return '<details class="trial-fold"><summary><b>' + esc(t.id) + ' ' + esc(t.title) + '</b> · 匹配指数 ' + m.hit + '/' + m.total + ' · ' + badge(trialTierName(t)) + '</summary>' +
            '<table><thead><tr><th>字段</th><th>试验要求（原文）</th><th>我的档案</th><th>判定</th></tr></thead><tbody>' + m.rows + '</tbody></table>' +
            '<p class="muted">缺字段一律「无法判定」；是否入组由研究医生评估，本表不给结论。</p></details>';
        }).join('') +
        '<div class="row"><button type="button" class="btn" data-act="export-trial">导出匹配结果（private 打码）</button>' +
        '<pre class="agent-log" id="trialExport" hidden></pre></div></section>';
    } else {
      body = '<section class="card"><div class="card-head"><h2 class="h2">研究列表（演示虚构）</h2>' + badge('M4 落库前为演示数据') + '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>编号</th><th>标题</th><th>三档</th><th>匹配指数</th></tr></thead><tbody>' +
        D.trials.map(function (t) {
          var m = matchTrial(t);
          return '<tr><td>' + t.id + '</td><td>' + esc(t.title) + '</td><td>' + badge(trialTierName(t)) + '</td><td class="num">' + m.hit + '/' + m.total + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="muted">全部条目标【演示虚构】；本地库（fetch-cll-trials 四件套）M4 接入后替换；NMPA 获批状态一律标「待官网复核」。</p></section>';
    }
    return head + nav + body;
  }

  /* ---- 共病与在用药 comorb ---- */
  function pageComorb() {
    return pageHead('共病与在用药', 'CIRS 条目照抄',
      '老年语境：条目照抄不换算；在用药清单联查；无相互作用判读。', backHome() + aiBtn('帮我核对我拍的病历里 CIRS 条目候选（核对后我才保存）')) +
      '<section class="card"><div class="card-head"><h2 class="h2">共病（CIRS）</h2>' + moreMenu([['new-comorb', '记共病/在用药'], ['edit-comorb', '改这一条']]) + '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>系统</th><th>分级（原文）</th><th>日期</th></tr></thead><tbody>' +
      D.cirs.map(function (c) { return '<tr><td>' + esc(c.system) + '</td><td>' + esc(c.raw) + '</td><td>' + c.d + '</td></tr>'; }).join('') +
      '</tbody></table></div></section>' +
      '<section class="card"><div class="card-head"><h2 class="h2">在用药清单</h2></div>' +
      '<ul>' + D.conmeds.map(function (m) { return '<li>' + esc(m.drug) + ' · 用于：' + esc(m.for) + ' · 记录于 ' + m.d + '</li>'; }).join('') + '</ul>' +
      '<p class="muted">就诊时可直接联查；本页不做药物相互作用提示。</p></section>';
  }

  /* ---- 营养与感染预防 nutr ---- */
  function pageNutr() {
    return pageHead('营养与感染预防', '词表与就诊要问',
      '感染预防语境按当前用药过滤；只列事实与问题模板，不给处置。', backHome() + aiBtn('帮我把最近记录的体温和体重整理成一段（只整理数值与日期）')) +
      '<section class="card"><div class="card-head"><h2 class="h2">词表卡（按当前用药）</h2>' + badge('零处置') + '</div>' +
      '<p><b>BTKi 语境</b>：出血/瘀青、感染/发热、房颤/心悸、高血压——这些词只用于记录与就诊提问，不用于判断轻重。</p>' +
      '<p><b>BCL-2i 语境（TLS 预防）</b>：TLS（肿瘤溶解）相关词表作「就诊要问」语境：开始前如何分层、饮水与检验安排由医生定。</p></section>' +
      '<section class="card"><div class="card-head"><h2 class="h2">就诊要问（问题模板）</h2></div>' +
      '<ul><li>我记录的这些症状词，复诊时需要带哪些时间线？</li><li>当前饮食记录里，有哪些是就诊时值得逐条问的？</li></ul>' +
      '<p class="muted">营养页不做饮食处方；记录原文供就诊使用。</p></section>';
  }

  /* ---- 心理支持 mind ---- */
  function pageMind() {
    var kept = filterPrivate(D.mood, 'summary');
    return pageHead('心理支持', 'W&W 的「在等什么」',
      'W&W 期焦虑是常见语境；本页只做记录与陪同语料，私密条目不进导出与 AI。', backHome() + aiBtn('帮我把这条情绪记录改写成一句对医生说的话（不改写事实）')) +
      '<section class="card private-card"><div class="card-head"><h2 class="h2">情绪记录（私密）</h2>' + badge('私密 · 三出口过滤') + '</div>' +
      '<ul class="timeline">' + D.mood.map(function (m) {
        return '<li><b>' + m.d + '</b> · ' + esc(m.note) + (m.visibility === 'private' ? ' ' + badge('私密', 'grey') : '') + '</li>';
      }).join('') + '</ul>' +
      kvTable([['fetchExport() 导出保留/过滤', filterPrivate(D.mood, 'export').length + ' / ' + (D.mood.length - filterPrivate(D.mood, 'export').length)],
        ['buildAiContext() AI 保留/过滤', filterPrivate(D.mood, 'ai').length + ' / ' + (D.mood.length - filterPrivate(D.mood, 'ai').length)],
        ['buildSummary() 摘要保留/过滤', kept.length + ' / ' + (D.mood.length - kept.length)]]) + '</section>';
  }

  /* ---- 复诊准备 prep ---- */
  function pagePrep() {
    var asked = state.extra.questions.map(function (q, i) { return '<li>' + esc(q.q) + ' <button type="button" class="btn" data-act="q-edit" data-i="' + i + '">改这一条</button></li>'; }).join('');
    var ind = D.indications.map(function (t, i) {
      return '<li><label class="pick-item"><input type="checkbox" data-act="ask" data-i="' + i + '"' + (state.asked[i] ? ' checked' : '') + '> 我想问的</label>' +
        '<span class="ind-text">' + esc(t) + '</span></li>';
    }).join('');
    return pageHead('复诊准备', '触发词表与资料包',
      '治疗指征八条照抄（含来源版本）；勾选「我想问的」生成问题清单；资料包导出经 private 三出口过滤。', backHome() + aiBtn('根据我勾选的「我想问的」条目，帮我起草一份就诊提问清单（只做提问句，不给判断）', 'AI 起草问题清单')) +
      '<section class="card"><div class="card-head"><h2 class="h2">触发词表卡（治疗指征八条照抄）</h2>' + badge('照抄 + 勾选提问') + '</div>' +
      '<ol class="ind-list">' + ind + '</ol>' +
      '<p class="muted">来源版本：' + esc(D.indicationSource) + '。本表只照抄与勾选提问，不做任何「是否够指征」的判定（无判定类勾选框）。</p></section>' +
      '<section class="card"><div class="card-head"><h2 class="h2">我想问的（问题清单）</h2></div>' +
      '<ul class="timeline">' + (asked || '<li class="muted">还没有勾选；上表勾选后加入。</li>') + '</ul>' +
      '<p class="muted">AI 起草（agent-draft）只把草稿填进输入框，草稿不入库；手工增删随时可改。</p></section>' +
      '<section class="card"><div class="card-head"><h2 class="h2">复诊资料包（S12）</h2></div>' +
      '<p class="muted">选区间（默认全部）→ 勾线（ALC/Hb/Plt）→ 生成 bundle。</p>' +
      '<div class="row"><button type="button" class="btn btn-primary" data-act="prep-bundle">生成资料包</button>' +
      '<button type="button" class="btn" data-act="prep-export">导出（private 打码）</button></div>' +
      '<pre class="agent-log" id="prepOut" hidden></pre></section>';
  }

  /* ---- 设置 settings ---- */
  function pageSettings() {
    return pageHead('设置', '全局设置', '资料目录、凭据与临床参考数据包状态；本页为原型演示态。', backHome()) +
      '<section class="card"><div class="card-head"><h2 class="h2">患者资料目录</h2></div>' +
      kvTable([['路径', '~/LymPal/病历资料'], ['状态', '已挂载（本机）· 只读演示数据'], ['迁移边界', '仅本机目录；不做云端同步']]) + '</section>' +
      '<section class="card"><div class="card-head"><h2 class="h2">凭据状态</h2>' + badge('不显明文') + '</div>' +
      kvTable([['模型 API', '已配置（状态：已配置/未配置，只显状态）'], ['MinerU 解析', '未配置'], ['存储', 'Token 文件优先；.secrets 已被 .gitignore 覆盖']]) + '</section>' +
      '<section class="card"><div class="card-head"><h2 class="h2">临床参考数据包</h2></div>' +
      kvTable([['中国 CLL/SLL 诊疗指南（2025 年版）', '已入库 · 中华血液学杂志 2025;46(2):105-112'], ['iwCLL 标准', '已入库（Blood 2008；最新版本年份待核 D 级）'], ['NMPA 条目', 'B 级转述 · 待官网复核'], ['试验库（fetch-cll-trials）', '未接入（M4）']]) + '</section>';
  }

  /* ================= 渲染与导航 ================= */
  var PAGES = {
    dash: pageDash, records: pageRecords, ww: pageWw, labs: pageLabs, onechart: pageOnechart,
    gene: pageGene, med: pageMed, trial: pageTrial, comorb: pageComorb, nutr: pageNutr,
    mind: pageMind, prep: pagePrep, settings: pageSettings
  };
  function render() {
    state.route = parseHash();
    var main = $('#view');
    main.innerHTML = PAGES[state.route.view]();
    $all('#navList a').forEach(function (a) {
      var v = a.getAttribute('data-route');
      if (v === state.route.view) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  /* ================= 事件委托 ================= */
  function openForm(sel) {
    var f = $(sel);
    if (f) { f.removeAttribute('hidden'); f.querySelector('input,select') && f.querySelector('input,select').focus(); }
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    switch (act) {
      case 'agent-draft': agentDraft(el.getAttribute('data-prompt') || ''); break;
      case 'go-dash': location.hash = '#dash'; break;
      case 'go-ww': location.hash = '#ww'; break;
      case 'go-ww-trend': location.hash = '#ww'; window.scrollTo(0, 300); break;
      case 'go-checkin': location.hash = '#med/checkin'; break;
      case 'go-ae': location.hash = '#med/ae'; break;
      case 'go-onechart': location.hash = '#onechart'; break;
      case 'go-trial-match': location.hash = '#trial/match'; break;
      case 'go-prep': location.hash = '#prep'; break;
      case 'go-gene': location.hash = '#gene'; break;
      case 'go-mrd': location.hash = '#labs'; window.scrollTo(0, document.body.scrollHeight); break;
      case 'flip': {
        var code = el.getAttribute('data-code');
        /* 点击只改属性不重绘（27 号 JS 三条） */
        if (state.flipped.has(code)) state.flipped.delete(code); else state.flipped.add(code);
        var on = state.flipped.has(code);
        el.setAttribute('aria-pressed', on);
        el.setAttribute('aria-label', on ? '点击返回摘要' : '点击翻转查看系列说明与历史摘要');
        var inner = el.querySelector('.mcard-inner');
        inner.style.transform = on ? 'rotateY(180deg)' : '';
        var f1 = el.querySelector('.mface.front'), f2 = el.querySelector('.mface.back');
        if (on) { f1.setAttribute('aria-hidden', 'true'); f1.setAttribute('inert', ''); f2.removeAttribute('aria-hidden'); f2.removeAttribute('inert'); }
        else { f2.setAttribute('aria-hidden', 'true'); f2.setAttribute('inert', ''); f1.removeAttribute('aria-hidden'); f1.removeAttribute('inert'); }
        break;
      }
      case 'open-picker': { var d2 = $('#picker'); if (d2 && d2.showModal) d2.showModal(); break; }
      case 'close-picker': { var d3 = $('#picker'); if (d3) d3.close(); break; }
      case 'range': {
        state.chart.range = el.getAttribute('data-range');
        $all('[data-act="range"]').forEach(function (c) { c.setAttribute('aria-pressed', c === el ? 'true' : 'false'); });
        redrawChart(); break;
      }
      case 'tx-toggle': {
        state.chart.tx = !state.chart.tx;
        el.setAttribute('aria-pressed', state.chart.tx);
        redrawChart(); break;
      }
      case 'checkin-done':
        D.checkins.push({ d: '2026-10-25', state: '已服' });
        toast('已记录：今日已服（回到看板可从「今日」卡查看）'); render(); break;
      case 'checkin-miss':
        D.checkins.push({ d: '2026-10-25', state: '漏服' });
        toast('已记录：今日漏服（漏服不评判）'); render(); break;
      case 'checkin-edit': toast('打卡更正走「改这一条」：只新增版本，不覆盖旧记录'); break;
      case 'manual-cbc': openForm('#manual-cbc-form'); break;
      case 'cancel-form': { var f3 = el.closest('form'); if (f3) f3.setAttribute('hidden', ''); break; }
      case 'save-cbc': {
        var fm = $('#manual-cbc-form');
        state.extra.cbc.push({
          d: fm['f-date'].value || '2026-10-24', wbc: +fm['f-wbc'].value || 0, alc: +fm['f-alc'].value || 0,
          plt: +fm['f-plt'].value || 0, hgb: +fm['f-hgb'].value || 0, lab: fm['f-lab'].value || '手工补录'
        });
        toast('已保存：血常规记录 +1，ALC 趋势新增一点（回到看板）');
        location.hash = '#dash'; break;
      }
      case 'save-rx': {
        var fr = $('#rx-form');
        D.rxChanges.push({ d: fr['r-start'].value || '2026-10-25', drug: fr['r-drug'].value || '（待补）', dose: fr['r-dose'].value || '（待补）', start: fr['r-start'].value || '', end: fr['r-end'].value || '', reason: '医嘱原文：' + (fr['r-reason'].value || '（待补）'), doc: fr['r-doc'].value || '' });
        toast('处方变更事件 +1（治疗线新增一段）；更正走「改这一条」'); render(); break;
      }
      case 'save-ae': {
        var fa = $('#ae-form');
        D.ae.unshift({ d: fa['a-date'].value || '2026-10-25', term: fa['a-term'].value, self: fa['a-self'].value || '', drugCtx: 'BTKi', raw: fa['a-raw'].value || '未记录等级', visibility: fa['a-vis'].value === '私密' ? 'private' : 'shared' });
        toast('副作用时间线 +1；拒收零副作用'); render(); break;
      }
      case 'new-rx': openForm('#rx-form'); break;
      case 'new-ae': openForm('#ae-form'); break;
      case 'new-gene': toast('补一条基因结果：AI 拍报告→候选三态→核对后保存（本页 AI 按钮即示例）'); break;
      case 'new-comorb': toast('记共病/在用药：表单 5 字段，条目照抄'); break;
      case 'edit-record': case 'edit-cbc': case 'edit-gene': case 'edit-comorb': case 'edit-ae': case 'q-edit': case 'view-doc':
        toast('「改这一条」：只新增版本，不覆盖；原文入口见资料夹'); break;
      case 'import-doc': toast('手工补一条：6 字段表单（演示）'); break;
      case 'cand-ok': toast('候选已确认一条（演示）：数值照抄原文入库'); break;
      case 'cand-no': toast('已拒收：候选不产生任何写入（零副作用）'); break;
      case 'ask': {
        /* 勾选"我想问的"：生成问题清单（纯问题形态） */
        var i = +el.getAttribute('data-i');
        if (el.checked) {
          state.asked[i] = true;
          state.extra.questions.push({ q: '指征第 ' + (i + 1) + ' 条（' + D.indications[i].slice(0, 12) + '…）：我这次的情况和这条的关系是什么？', d: '2026-10-25', from: '勾选生成' });
        } else {
          delete state.asked[i];
          state.extra.questions = state.extra.questions.filter(function (q) { return q.q.indexOf('指征第 ' + (i + 1) + ' 条') !== 0; });
        }
        render(); break;
      }
      case 'prep-bundle': {
        var out = $('#prepOut');
        out.removeAttribute('hidden');
        out.textContent = '【复诊资料包 · 演示】\n区间：全部\n勾线：ALC / Hb / Plt\n血常规 ' + cbcAll().length + ' 次 · 基因 ' + D.gene.length + ' 条（三态）· 副作用 ' + filterPrivate(D.ae, 'export').length + ' 条（private 已滤 ' + (D.ae.length - filterPrivate(D.ae, 'export').length) + '）\n问题清单 ' + state.extra.questions.length + ' 条';
        toast('资料包已生成（回首页可从「准备复诊」重看）'); break;
      }
      case 'prep-export': case 'export-trial': {
        var pre = $(act === 'prep-export' ? '#prepOut' : '#trialExport');
        pre.removeAttribute('hidden');
        var lines = D.ae.concat(D.mood).map(function (r) {
          return maskRow(r).d + ' · ' + (r.term || '情绪') + ' · ' + ((r.visibility === 'private') ? '●●（私密，已打码）' : (r.raw || r.note));
        });
        pre.textContent = '【导出（private 打码）】\n' + lines.join('\n') + '\n——导出经 filterPrivate(list,"export")；私密字段打码不删除行。';
        toast('导出已生成（private 字段打码）'); break;
      }
      case 'kb': {
        var k = el.getAttribute('data-k');
        var t = state.kbTarget;
        if (!t) { toast('先点一个数字输入框，再按键盘'); break; }
        if (k === '⌫') t.value = t.value.slice(0, -1);
        else t.value += k;
        break;
      }
      case 'kb-close': { var kp = el.closest('.keypad'); if (kp) kp.setAttribute('hidden', ''); break; }
      case 'ai-send': toast('原型不发起真实请求：提示词仍在输入框，待你手动发送'); break;
      case 'ai-clear': $('#aiPrompt').value = ''; break;
      case 'panel-toggle': {
        var s = $('#session');
        var hiddenNow = !s.hasAttribute('hidden');
        if (hiddenNow) s.setAttribute('hidden', ''); else s.removeAttribute('hidden');
        el.textContent = hiddenNow ? '展开会话区' : '收起会话区';
        el.setAttribute('aria-expanded', hiddenNow ? 'false' : 'true');
        break;
      }
    }
  });

  /* 复选（指标选择窗口）：上限不硬拒——回弹并提示 */
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-act="pick-metric"]');
    if (!el) return;
    var code = el.getAttribute('data-code');
    var sel = state.chart.sel;
    if (el.checked) {
      if (sel.length >= 4) {
        el.checked = false;
        toast('最多同时看 4 个指标；先去一条再选新的。');
        return;
      }
      if (el.getAttribute('data-qual')) {
        el.checked = false;
        toast('描述性指标不进折线（分类不进趋势）。');
        return;
      }
      sel.push(code);
    } else {
      var ix = sel.indexOf(code);
      if (ix >= 0) sel.splice(ix, 1);
    }
    redrawChart();
  });

  /* 数字键盘：聚焦数字输入时弹出 */
  document.addEventListener('focusin', function (e) {
    if (e.target.classList && e.target.classList.contains('numkb')) {
      state.kbTarget = e.target;
      var kp = e.target.closest('section') && e.target.closest('section').querySelector('.keypad');
      if (kp) kp.removeAttribute('hidden');
    }
  });

  function redrawChart() {
    /* 16 号：筛选变化只重绘 #chart-panel，不整页重渲染 */
    var panel = $('#chart-panel');
    if (panel) panel.innerHTML = chartSVG(state.chart.sel, state.chart.range, state.chart.tx);
    var cnt = $('#picker-count');
    if (cnt) cnt.textContent = state.chart.sel.length;
  }

  /* ================= 启动 ================= */
  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', function () {
    $('#view-sub-count').textContent = VIEW_SUBS.length; /* 自检计数（页脚常显） */
    render();
  });
  if (document.readyState !== 'loading') {
    (function boot() {
      var v = $('#view');
      if (v && !v.innerHTML) { $('#view-sub-count').textContent = VIEW_SUBS.length; render(); }
    })();
  }
})();
