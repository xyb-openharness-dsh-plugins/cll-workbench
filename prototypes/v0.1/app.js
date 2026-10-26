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
  function shortLab(lab) { return String(lab || '').replace(/^.*?(医院|中心)/, '$1').slice(0, 12); }
  function shortMd(iso) { return typeof iso === 'string' && iso.length >= 10 ? iso.slice(5, 10) : '—'; }
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
    trial: ['match', 'search', 'saved']
  };
  /* 全部 (view, sub) 19 条——自检穷举用 */
  var VIEW_SUBS = ['dash', 'records', 'records/docs', 'ww', 'labs', 'onechart', 'gene', 'med',
    'med/checkin', 'med/calendar', 'med/rx', 'med/ae', 'trial', 'trial/match', 'trial/search', 'trial/saved',
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
    chart: { sel: ['alc', 'hgb'], range: 'all', tx: true, pin: null, pinOn: true }, /* 一图秀 */
    asked: {},                   /* 触发词表勾选"我想问的" */
    onechartSideOpen: true,      /* 一图秀左栏（指标选择区）是否展开 */
    trialFilter2: { q: '', scope: 'all', status: 'all' }, /* 检索页筛选 */
    trialPrefs: { biopsy: false, placebo: false, city: 'all' }, /* 我的偏好：不参与医学判断 */
    trialFavs: [],                /* 收藏：[{id,state,savedOn,note}] state=watching|asking|archived */
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

  /* ================= SVG 折线图（根 class="chart"；每条线按自身全期范围缩放） ================= */
  var CHART_W = 760, CHART_H = 300, PAD = { l: 14, r: 74, t: 26, b: 34 };
  /* achromatic-ledger：全屏只有一个彩色，给"主数据元素"。血象是本病种的主线 → 取 #1d5fbf；
     其余序列用墨色与灰阶（不引入第二、第三个色相）。 */
  var SERIES_COLORS = { '血象': '#1d5fbf', '生化': '#141414', '分子': '#8a8a8a', '体格': '#6b6b6b' };
  var SERIES_SOFT = { '血象': '#f4f7fc', '生化': '#f5f5f5', '分子': '#f7f7f7', '体格': '#f7f7f7' };

  function timeRange(range, anchorD) {
    var months = { '3m': 3, '6m': 6, '12m': 12 }[range] || 0;
    if (!months || !anchorD) return null;
    var t = new Date(anchorD); t.setMonth(t.getMonth() - months);
    return t.toISOString().slice(0, 10);
  }

  /* 每条线按**自身全期** min/max 归一化（16 号 0.2）：切时间窗不改变线形。 */
  function lineScale(m) {
    var vals = m.pts.filter(function (p) { return typeof p.v === 'number'; }).map(function (p) { return p.v; });
    if (!vals.length) return null;
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var span = (hi - lo) || Math.max(Math.abs(hi) * 0.08, 1);
    return { lo: lo, hi: hi, span: span };
  }

  function chartSVG(codes, range, showTx, pin) {
    var all = metrics();
    var dateUniverse = [];
    all.forEach(function (m) { m.pts.forEach(function (p) { dateUniverse.push(p.d); }); });
    dateUniverse.sort();
    if (!dateUniverse.length) {
      return '<div class="chart-empty"><p>还没有任何指标记录，先记一条再来叠看。</p></div>';
    }
    var lastDate = dateUniverse[dateUniverse.length - 1];
    var from = timeRange(range, lastDate);
    var t0 = from || dateUniverse[0], t1 = lastDate;
    var x = function (d) {
      var span = days(t0, t1) || 1;
      return PAD.l + (days(t0, d) / span) * (CHART_W - PAD.l - PAD.r);
    };
    var picked = codes.map(metricByCode).filter(Boolean);
    var drawn = [], msgs = [], paths = [], dots = '', labels = '';
    var plotTop = PAD.t + (showTx ? 26 : 6), plotBottom = CHART_H - PAD.b, plotH = plotBottom - plotTop;

    picked.forEach(function (m, si) {
      if (m.qual) { msgs.push(esc(mShort(m)) + '：描述性内容不进折线（分类不进趋势）'); return; }
      var scale = lineScale(m);
      if (!scale) { msgs.push(esc(mShort(m)) + '：还没有数值记录'); return; }
      var pts = m.pts.filter(function (p) { return typeof p.v === 'number' && p.d >= t0 && p.d <= t1; });
      if (!pts.length) { msgs.push(esc(mShort(m)) + '：这个时间窗里没有记录'); return; }
      var y = function (v) { return plotTop + (1 - (v - scale.lo) / scale.span) * plotH; };
      var col = SERIES_COLORS[m.series] || '#2f5fa8';
      var xy = pts.map(function (p) { return [x(p.d), y(p.v)]; });
      if (xy.length > 1) paths.push({ code: m.code, d: smoothPath(xy), col: col });
      pts.forEach(function (p, i) {
        var isLast = i === pts.length - 1;
        var pinned = pin && pin.code === m.code && pin.d === p.d;
        dots += '<circle class="pt' + (pinned ? ' pinned' : '') + '" cx="' + r2(x(p.d)) + '" cy="' + r2(y(p.v)) + '" r="' + (pinned ? 5.5 : isLast ? 4 : 2.8) +
          '" fill="' + col + '" data-act="pin-pt" data-code="' + m.code + '" data-d="' + p.d + '" tabindex="0" role="button"' +
          ' aria-label="' + esc(mShort(m)) + ' ' + p.d + ' 值 ' + p.v + ' ' + esc(m.unit) + '"><title>' +
          esc(mShort(m)) + '：' + p.v + ' ' + esc(m.unit) + ' · ' + p.d + '</title></circle>';
        if (isLast && xy.length > 1) {
          var lx = x(p.d), anchor = (CHART_W - lx) < 60 ? 'end' : 'start';
          labels += '<text class="lbl" x="' + r2(lx + (anchor === 'end' ? -8 : 8)) + '" y="' + r2(y(p.v) + (si % 2 ? -12 : 8) + si * 3) +
            '" text-anchor="' + anchor + '" fill="' + col + '">' + p.v + ' ' + esc(m.unit) + '</text>';
        }
      });
      drawn.push({ m: m, lo: scale.lo, hi: scale.hi, n: pts.length, col: col });
    });

    /* 治疗条：绘图区上方独立泳道（关掉后数据坐标不变） */
    var tx = '';
    if (showTx && D.txEvents && D.txEvents.length) {
      var laneY = PAD.t - 2;
      D.txEvents.forEach(function (e) {
        var ex = x(e.d);
        if (ex < PAD.l || ex > CHART_W - PAD.r) return;
        tx += '<rect class="tx-bar" x="' + r2(ex - 3) + '" y="' + laneY + '" width="6" height="12" rx="3" fill="' + (e.color || '#983654') + '" opacity=".55"/>' +
          '<line class="tx-line" x1="' + r2(ex) + '" y1="' + (laneY + 12) + '" x2="' + r2(ex) + '" y2="' + plotBottom + '" stroke="' + (e.color || '#983654') + '" stroke-dasharray="2 5" opacity=".35"/>' +
          '<text class="tx-lbl" x="' + r2(ex + 6) + '" y="' + (laneY + 10) + '">' + esc(e.label) + '</text>';
      });
    }

    /* 月刻度 */
    /* 月刻度：按最小像素间距（92 viewBox px）抽稀，标签用 YY-MM 缩短；保证不叠 */
    var ticks = '', seen = {}, lastX = -1e9;
    dateUniverse.forEach(function (d) {
      var key = d.slice(0, 7);
      if (seen[key] || d < t0 || d > t1) return;
      var px = x(d);
      if (px - lastX < 92) return;
      seen[key] = 1; lastX = px;
      ticks += '<line class="tick-line" x1="' + r2(px) + '" y1="' + plotBottom + '" x2="' + r2(px) + '" y2="' + (plotBottom + 4) + '"/>' +
        '<text class="tick" x="' + r2(px) + '" y="' + (CHART_H - 12) + '" text-anchor="middle">' + key.slice(2) + '</text>';
    });

    /* 图例：色点 + 名称 + 全期区间 + 点数（16 号 0.2：必须给全期 min–max） */
    var legend = drawn.map(function (o) {
      return '<button type="button" class="lg-item" data-act="pin-last" data-code="' + o.m.code + '">' +
        '<i style="background:' + o.col + '"></i><b>' + esc(mShort(o.m)) + '</b>' +
        '<span class="lg-range">' + o.lo + '–' + o.hi + ' ' + esc(o.m.unit) + '</span>' +
        '<span class="lg-n">' + o.n + ' 点</span></button>';
    }).join('');

    /* pin 读数条：显示被点选点的值/日期/来源 */
    var pinBar = '';
    if (pin) {
      var pm = metricByCode(pin.code);
      if (pm) {
        var pp = null; pm.pts.forEach(function (p) { if (p.d === pin.d) pp = p; });
        if (pp) {
          pinBar = '<div class="pin-readout" role="status"><span class="pin-dot" style="background:' + (SERIES_COLORS[pm.series] || '#2f5fa8') + '"></span>' +
            '<b>' + esc(mShort(pm)) + '</b><span class="pin-val">' + pp.v + ' ' + esc(pm.unit) + '</span>' +
            '<span class="pin-meta">' + fmtD(pp.d) + ' · 来源：' + esc(pp.lab || '报告单原文') + '</span>' +
            '<button type="button" class="btn btn-quiet" data-act="pin-clear">清除</button></div>';
        }
      }
    }

    var empty = drawn.length ? '' :
      '<div class="chart-empty"><p>这个时间窗里没有所选指标的记录。可以扩大时间范围，或再勾几条指标。</p></div>';

    return '<div class="chart-wrap">' + pinBar +
      '<svg class="chart" viewBox="0 0 ' + CHART_W + ' ' + CHART_H + '" role="img" aria-label="趋势图：每条线按该指标全部记录范围缩放，不代表不同指标数值可比">' +
      '<g class="tx-lane">' + tx + '</g>' + ticks + paths.map(function (p) {
        return '<path class="line" data-code="' + p.code + '" pathLength="1" stroke="' + p.col + '" d="' + p.d + '"/>';
      }).join('') + dots + labels + '</svg>' +
      empty +
      '<p class="axis-note">每条线按该指标自己的全部记录范围缩放；不同指标之间数值不可比。</p>' +
      (legend ? '<div class="legend">' + legend + '</div>' : '') +
      (msgs.length ? '<p class="muted">' + msgs.join('；') + '</p>' : '') +
      '</div>';
  }
  function mShort(m) { return m.name.replace(/（.*?）/g, ''); }

  /* ================= 指标卡（固定尺寸原位翻转；正面=色点+当前值+较前次箭头+记录数；背面=sparkline 带端值日期） ================= */
  function deltaOf(m) {
    if (m.qual) return null;
    var pts = m.pts.filter(function (p) { return typeof p.v === 'number'; });
    if (pts.length < 2) return null;
    var last = pts[pts.length - 1], prev = pts[pts.length - 2];
    var d = last.v - prev.v;
    var pct = prev.v ? (d / prev.v) * 100 : null;
    return { d: d, pct: pct, prevD: prev.d, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat' };
  }

  function sparkSVG(m, w, h) {
    var pts = m.pts.filter(function (p) { return typeof p.v === 'number'; }).slice(-12);
    if (pts.length < 2) return '<div class="spark-empty">只有 1 次记录，暂不连线</div>';
    var vals = pts.map(function (p) { return p.v; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), span = (hi - lo) || 1;
    var xy = pts.map(function (p, i) {
      return [8 + i * ((w - 16) / (pts.length - 1)), 10 + (1 - (p.v - lo) / span) * (h - 30)];
    });
    var col = SERIES_COLORS[m.series] || '#2f5fa8';
    var first = pts[0], last = pts[pts.length - 1];
    return '<svg class="chart spark" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(mShort(m)) + ' 最近 ' + pts.length + ' 次趋势">' +
      '<path class="line" pathLength="1" stroke="' + col + '" d="' + smoothPath(xy) + '"/>' +
      xy.map(function (p, i) { return '<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="' + (i === xy.length - 1 ? 3 : 2) + '" fill="' + col + '"/>'; }).join('') +
      '<text class="spark-end" x="' + r2(xy[xy.length - 1][0]) + '" y="' + r2(xy[xy.length - 1][1] - 6) + '" text-anchor="end">' + last.v + '</text>' +
      '<text class="spark-date" x="8" y="' + (h - 3) + '" text-anchor="start">' + fmtD(first.d) + '</text>' +
      '<text class="spark-date" x="' + (w - 8) + '" y="' + (h - 3) + '" text-anchor="end">' + fmtD(last.d) + '</text>' +
      '</svg>';
  }

  function metricCardHTML(m) {
    var flipped = state.flipped.has(m.code);
    var nums = m.pts.filter(function (p) { return typeof p.v === 'number'; });
    var latest = nums[nums.length - 1] || null;
    var dl = deltaOf(m);
    var col = SERIES_COLORS[m.series] || '#2f5fa8';
    var soft = SERIES_SOFT[m.series] || '#f2f4f8';

    var arrow = '';
    if (m.qual) arrow = '<span class="mdelta flat">描述性，不进折线</span>';
    else if (!latest) arrow = '<span class="mdelta flat">还没有记录</span>';
    else if (!dl) arrow = '<span class="mdelta flat">暂无可比较的前次</span>';
    else arrow = '<span class="mdelta ' + dl.dir + '">' +
      '<span class="arr">' + (dl.dir === 'up' ? '↑' : dl.dir === 'down' ? '↓' : '→') + '</span>' +
      (dl.d > 0 ? '+' : '') + r2(dl.d) + ' ' + esc(m.unit) +
      (dl.pct === null ? '' : '（' + (dl.pct > 0 ? '+' : '') + r2(dl.pct) + '%）') +
      '<span class="mdelta-date">较 ' + fmtD(dl.prevD) + '</span></span>';

    var ldtTag = (m.code === 'alc') ? (function () {
      var L = ldtDays();
      return L ? '<span class="ldt-chip">LDT ' + L.days + ' 天（只算天数）</span>' : '<span class="ldt-chip grey">LDT 待两点</span>';
    })() : '';

    var frontVal = m.qual
      ? '<span class="mval-s">' + esc(latest ? latest.text : '还没有记录') + '</span>'
      : (latest ? '<span class="mval">' + latest.v + '</span><span class="munit">' + esc(m.unit) + '</span>' : '<span class="mval-s">还没有记录</span>');

    return '<button type="button" class="mcard' + (flipped ? ' is-flipped' : '') + '" role="group" data-act="flip" data-code="' + m.code + '"' +
      ' aria-pressed="' + flipped + '" aria-roledescription="指标卡（点击或回车翻面）"' +
      ' aria-label="' + esc(mShort(m)) + '，当前 ' + (latest ? latest.v + ' ' + m.unit : '无记录') + '，' + (flipped ? '点击返回摘要' : '点击翻面看趋势与口径') + '">' +
      '<span class="mcard-inner">' +
        '<span class="mface front"' + (flipped ? ' aria-hidden="true" inert' : '') + ' style="--soft:' + soft + '">' +
          '<span class="mhead"><i class="dot" style="background:' + col + '"></i><span class="mseries">' + esc(m.series) + '</span>' +
            '<span class="mcount">' + nums.length + ' 次</span></span>' +
          '<span class="mname">' + esc(mShort(m)) + '</span>' +
          '<span class="mrow">' + frontVal + '</span>' +
          '<span class="mrow2">' + arrow + '</span>' +
          '<span class="mfoot"><span class="mfoot-txt">' + (latest ? fmtD(latest.d) + ' · ' + esc(shortLab(latest.lab)) : '—') + '</span></span>' +
          (ldtTag ? '<span class="mfoot-ldt">' + ldtTag + '</span>' : '') +
          '<span class="mflip-hint">翻面 ›</span>' +
        '</span>' +
        '<span class="mface back"' + (flipped ? '' : ' aria-hidden="true" inert') + '>' +
          '<span class="mhead"><i class="dot" style="background:' + col + '"></i><span class="mseries">' + esc(mShort(m)) + ' · 最近 12 次</span></span>' +
          sparkSVG(m, 240, 96) +
          '<span class="mfoot">全期 ' + (nums.length ? Math.min.apply(null, nums.map(function (p) { return p.v; })) + '–' + Math.max.apply(null, nums.map(function (p) { return p.v; })) + ' ' + esc(m.unit) : '—') + '</span>' +
          '<span class="mnote">' + esc(D.seriesNote[m.series] || '') + '</span>' +
          '<span class="mmeta">单位 ' + esc(m.unit || '（描述）') + ' · 参考区间以报告单实验室为准 · 点回去</span>' +
        '</span>' +
      '</span></button>';
  }

  function metricGroupsHTML(filter) {
    var all = metrics().filter(filter || function () { return true; });
    return D.SERIES_ORDER.map(function (s) {
      var ms = all.filter(function (m) { return m.series === s; });
      if (!ms.length) return '';
      var has = ms.filter(function (m) { return m.pts.length; }).length;
      return '<section class="series-block"><h3 class="series-title"><i class="dot" style="background:' + (SERIES_COLORS[s] || '#2f5fa8') + '"></i>' +
        s + '系列<span class="series-count">' + ms.length + ' 项 · 有记录 ' + has + ' 项</span></h3>' +
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
  /* 把「本页关键信息 + 提示词」交给宿主的原生会话去发。
     投递协议：window.parent.postMessage({ type:'cll:agent-draft', prompt, context, autoSubmit:true })
     —— 原生会话的创建与提交由 lib/client.js 负责（页面无权直接操作宿主会话）。
     独立打开（无宿主）时如实提示，不伪造发送成功。 */
  function agentDraft(prompt, opts) {
    var ctx = aiContext();
    var payload = {
      type: 'cll:agent-draft',
      prompt: prompt,
      context: ctx,
      autoSubmit: (opts && opts.autoSubmit) !== false
    };
    var framed = false;
    try { framed = window.parent && window.parent !== window; } catch (e) { framed = false; }
    if (framed) {
      window.parent.postMessage(payload, window.location.origin);
      toast(payload.autoSubmit ? '已发送到右侧 AI 对话（含本页关键信息）' : '已填入右侧 AI 对话草稿');
      return payload;
    }
    /* 无宿主：不假装发出去了 */
    toast('独立打开时没有可用的 AI 会话；装进 DSH Desktop 后本按钮会直接发到右侧对话');
    return payload;
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
    /* 「和 AI 讨论」在顶栏常驻一个（全局，随当前页变化），页头不再重复第二个同功能按钮 */
    return '<header class="page-head"><div class="ph-row"><h1>' + esc(title) + '</h1>' +
      '<div class="actions">' + (actions || '') + '</div></div><p class="page-desc">' + desc + '</p></header>';
  }

  /* 本页关键信息（discussFacts）：事实陈述、无判定词、按页给不同事实摘要 */
  function discussFacts() {
    var v = state.route.view, sub = state.route.sub;
    var c = cbcAll();
    var last = c[c.length - 1] || {};
    var L = ldtDays();
    var geneDet = D.gene.filter(function (g) { return g.state === '检出'; }).length;
    var geneNotTested = D.gene.filter(function (g) { return g.state === '未测'; }).length;
    var base = '最近血常规 ' + (last.d || '—') + '：WBC ' + last.wbc + '、ALC ' + last.alc + '、Plt ' + last.plt + '、Hb ' + last.hgb + '（照抄报告原文）；共 ' + c.length + ' 次记录';
    var byView = {
      dash: base + '；基因 ' + D.gene.length + ' 项（检出 ' + geneDet + '、未测 ' + geneNotTested + '）；待问问题 ' + state.extra.questions.length + ' 条。',
      records: '资料 ' + D.docsCount + ' 份；候选待核对（未核对不入事实层）。',
      ww: base + (L ? '；LDT ' + L.days + ' 天（只算天数，未判读）' : '') + '；观察期无用药记录。',
      labs: base + '；分系列指标卡 ' + metrics().length + ' 项（血象/生化/分子/体格）。',
      onechart: '当前叠看 ' + state.chart.sel.length + ' 条（' + state.chart.sel.join('/') + '），时间范围 ' + ({ '3m': '近 3 月', '6m': '近 6 月', '12m': '近 12 月', all: '全部' }[state.chart.range] || '全部') + '。',
      gene: '基因档案 ' + D.gene.length + ' 项：检出 ' + geneDet + '、未测 ' + geneNotTested + '（未测 ≠ 未检出）；报告口径照抄。',
      med: sub === 'ae' ? '副作用记录 ' + D.ae.length + ' 条（词表按当前用药过滤）。'
        : '当前用药：泽布替尼 160mg 每日两次（' + D.rxChanges.length + ' 次处方变更）；打卡记录见依从日历。',
      trial: '本地试验快照 ' + D.trials.length + ' 条（登记状态，未核实）；分层线索见匹配页。',
      comorb: 'CIRS 条目 ' + ((D.cirs||[]).length) + ' 条；在用药 ' + ((D.conmeds||[]).length) + ' 种（照抄，无相互作用判读）。',
      nutr: '感染预防与营养语境条目（就诊要问清单）。',
      mind: '心理记录 ' + filterPrivate(D.mood, 'ai').length + ' 条（私密条目默认不进 AI 上下文）。',
      prep: '复诊准备：可导出资料包 + 问题清单 ' + state.extra.questions.length + ' 条。',
      settings: '资料目录、解析模式与临床参考数据包版本（本机）。'
    };
    return byView[v] || base;
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
      entryCard('临床试验', entryBtn('go-trial-match', '帮我匹配', true), '三档比对（已满足／可能冲突／无法判定）+ 证据链，无匹配度。') +
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

  /* ---- 病情一图秀 onechart（主图优先；左栏控制可折叠，AI 对话栏打开时自动收起） ---- */
  function pageOnechart() {
    var st = state.chart;
    var ranges = [['3m', '近 3 月'], ['6m', '近 6 月'], ['12m', '近 12 月'], ['all', '全部']];
    var rangeLabel = (ranges.filter(function (r) { return r[0] === st.range; })[0] || ['', '全部'])[1];
    var head = pageHead('病情一图秀', '一图看变化',
      '每条线按自身范围缩放，不同指标数值不可比；图不判读。指标越多，越建议用「收起指标」腾出图区。',
      backHome() +
      '<button type="button" class="btn" data-act="toggle-onechart-side" aria-expanded="' + (state.onechartSideOpen ? 'true' : 'false') + '" aria-controls="onechart-side">' +
      (state.onechartSideOpen ? '收起指标' : '展开指标') + '</button>');

    var groups = D.SERIES_ORDER.map(function (s) {
      var ms = metrics().filter(function (m) { return m.series === s; });
      return '<section class="pick-group"><h4 class="pick-group-head"><i class="dot" style="background:' + (SERIES_COLORS[s] || '#2f5fa8') + '"></i>' +
        s + '系列</h4>' + ms.map(function (m) {
          var on = st.sel.indexOf(m.code) >= 0;
          return '<label class="pick-row"><input type="checkbox" data-act="pick-metric" data-code="' + m.code + '"' + (on ? ' checked' : '') +
            (m.qual ? ' data-qual="1"' : '') + '><span class="pick-name">' + esc(mShort(m)) + '</span>' +
            '<span class="pick-unit">' + (m.qual ? '描述' : esc(m.unit)) + '</span></label>';
        }).join('') + '</section>';
    }).join('');

    var aside = '<aside class="onechart-side" id="onechart-side" aria-label="一图秀控制">' +
      '<section class="side-block"><h3 class="side-title">时间范围</h3>' +
        '<div class="chips chips-wrap">' + ranges.map(function (r) {
          return '<button type="button" class="chip" data-act="range" data-range="' + r[0] + '" aria-pressed="' + (st.range === r[0]) + '">' + r[1] + '</button>';
        }).join('') + '</div></section>' +
      '<section class="side-block"><h3 class="side-title">显示</h3>' +
        '<label class="switch-row"><input type="checkbox" data-act="tx-toggle"' + (st.tx ? ' checked' : '') + '><span>治疗节点</span></label>' +
        '<label class="switch-row"><input type="checkbox" data-act="pin-toggle"' + (st.pinOn ? ' checked' : '') + '><span>点选读数</span></label>' +
      '</section>' +
      '<section class="side-block side-pick"><h3 class="side-title">指标<span class="side-count" id="picker-count">' + st.sel.length + '/4</span></h3>' +
        '<div class="pick-scroll">' + groups + '</div>' +
        '<p class="muted small">最多 4 条；描述性指标不进折线。</p></section>' +
      '</aside>';

    /* 收起态：只留一条"已选指标"摘要条，点开即展开（主图优先） */
    var collapsedBar = '<div class="onechart-collapsed" id="onechart-collapsed">' +
      '<span class="oc-sum">已选 ' + st.sel.length + ' 条：' + (st.sel.map(function (c) { var m = metricByCode(c); return m ? mShort(m) : c; }).join('、') || '（无）') + '</span>' +
      '<button type="button" class="btn btn-quiet" data-act="toggle-onechart-side">展开指标选择</button></div>';

    var body = '<div class="onechart-layout' + (state.onechartSideOpen ? '' : ' side-collapsed') + '">' +
      aside + collapsedBar +
      '<section class="card onechart-main"><div class="card-head"><h2 class="h2">叠看</h2>' +
      '<span class="muted small" id="chart-sub">已选 ' + st.sel.length + ' 条 · ' + rangeLabel + '</span></div>' +
      '<div class="chart-legend-note">图例区间是该指标<b>全部记录</b>的最小–最大，不是正常范围。</div>' +
      '<div id="chart-panel" aria-live="polite">' + chartSVG(st.sel, st.range, st.tx, st.pinOn ? st.pin : null) + '</div>' +
      '</section></div>';
    return head + body;
  }

  /* 主图优先：容器变窄（AI 对话栏打开/窗口变窄）时自动收起左栏；恢复宽屏时按用户选择还原。 */
  function applyOnechartLayout() {
    var layout = $('.onechart-layout');
    if (!layout) return;
    var wrap = layout.closest('#view') || layout;
    var w = wrap.getBoundingClientRect().width;
    /* 业务区宽度 < 860px 时自动收起指标选择区：图区优先（AI 对话栏打开后业务区约 710px） */
    var auto = w < 860;
    layout.classList.toggle('side-collapsed', auto || !state.onechartSideOpen);
    layout.classList.toggle('auto-collapsed', auto);
    var btn = $('[data-act="toggle-onechart-side"]');
    if (btn) {
      btn.textContent = layout.classList.contains('side-collapsed') ? '展开指标' : '收起指标';
      btn.setAttribute('aria-expanded', String(!layout.classList.contains('side-collapsed')));
    }
    var bar = $('#onechart-collapsed .oc-sum');
    if (bar) bar.textContent = '已选 ' + state.chart.sel.length + ' 条：' + (state.chart.sel.map(function (c) { var m = metricByCode(c); return m ? mShort(m) : c; }).join('、') || '（无）');
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
  /* 临床研究（对齐 biliary-tract-workbench v0.2 的展示口径）
   * 规矩：
   *   ① 入组条件逐条给出「符合 / 不符合 / 待确认」三态，并**并排写清**「记录里是」与「条件要求」；
   *   ② 硬性条件不满足的单列一组，不混进可对照列表；
   *   ③ 「我的偏好」（是否接受重新活检/安慰剂/可去城市）只影响提示与排序，**不参与医学条件判断**；
   *   ④ 收藏 = 跟踪"试验变了什么"，不是"我该不该进"；
   *   ⑤ 无核验日期的条目只显示「未核验」，不显示「招募中」。
   * 三档枚举沿用 35 号：satisfied / conflict / undetermined；pending（登记原文无法结构化）单列不计入统计。
   */
  var TRIAL_STATUS = { recruiting: '招募中', not_yet_recruiting: '即将招募', active_not_recruiting: '在研不招募', suspended: '暂停招募', terminated: '已终止', completed: '已完成' };
  var TRIAL_SCOPE = { first_line: '一线', rrmm: '复发/难治', frail: '老年/虚弱', registry: '登记研究', translational: '转化研究' };
  var CRIT_CAT = { diagnosis: '诊断', subtype: '病理类型', stage: '分期', prior_tx: '既往治疗', genomic: '检测结果', organ: '器官功能', lab: '化验', age: '年龄', performance: '体能状态', other: '其他' };
  var TIER = {
    conflict: { label: '不符合', mark: '×', cls: 'no' },
    undetermined: { label: '待确认', mark: '?', cls: 'q' },
    satisfied: { label: '符合', mark: '·', cls: 'ok' }
  };
  var TIER_ORDER = ['conflict', 'undetermined', 'satisfied'];

  /* 入组档案（只读，不重复录入；每项带来源，缺失不阻断但判「待确认」） */
  function matchProfileFields() {
    var c = cbcAll(), last = c[c.length - 1] || {};
    var btki = (D.rxChanges || []).filter(function (m) { return /泽布|BTKi|伊布/.test((m.drug || '') + (m.text || '')); });
    return [
      { k: '年龄', v: '63 岁', src: '病情整理 · 出生年 1963（自算，仅展示）' },
      { k: '诊断名（照抄）', v: 'CLL（2024-11-12 报告原文）', src: '病情整理 · 诊断档案' },
      { k: 'Binet / Rai 分期（照抄）', v: 'A（照抄）/ 0 期（照抄）', src: '病情整理 · 分期双轨' },
      { k: 'del(17p)（FISH）', v: '未检出（2024-11-15 报告原文）', src: '基因与预后档案' },
      { k: 'TP53 突变', v: null, src: '基因与预后档案（未测）' },
      { k: 'IGHV 突变状态', v: null, src: '基因与预后档案（未测）' },
      { k: '既往 BTKi 用药', v: btki.length ? '在用泽布替尼（2026-06-01 起，医嘱原文）' : '无记录', src: '口服药与治疗 · 处方变更' },
      { k: '治疗线数', v: '1 线（BTKi 持续治疗中）', src: '口服药与治疗' },
      { k: '最近血象（WBC/ALC/Plt/Hb）', v: last.d ? 'WBC ' + last.wbc + ' / ALC ' + last.alc + ' / Plt ' + last.plt + ' / Hb ' + last.hgb + '（' + last.d + '）' : null, src: '指标检测 · 血常规' },
      { k: 'ECOG 体能状态', v: null, src: '（无对应记录：门诊常写，但本工作台没有这个字段）' },
      { k: '既往 BTKi 后疾病状态（复发/难治？）', v: null, src: '（无对应记录）' }
    ];
  }

  function favIndex(id) {
    for (var i = 0; i < state.trialFavs.length; i++) { if (state.trialFavs[i].id === id) return i; }
    return -1;
  }
  var FAV_STATE = { watching: '在跟', asking: '准备问', archived: '已归档' };
  function trialOf(i) {
    var t = D.trials[i] || {};
    var x = (D.trialExtras || [])[i] || {};
    return Object.assign({}, t, x);
  }
  function allTrials() { return (D.trials || []).map(function (_, i) { return trialOf(i); }); }

  /* 单条条件求值：给出三态 + 「记录里是」+「条件要求」原文 */
  function evalCriterion(c, P) {
    var need = c.text;
    if (!c.field || c.op === 'manual') {
      return { state: 'undetermined', mine: '条目无法结构化，需人工核对', need: need, hard: !!c.hard, cat: c.category, kind: c.kind, text: c.text };
    }
    var f = P[c.field];
    var mine = f && f.v ? f.v : null;
    var src = f ? f.src : '（无对应字段）';
    if (!mine) return { state: 'undetermined', mine: '未记录（' + src + '）', need: need, hard: !!c.hard, cat: c.category, kind: c.kind, text: c.text, field: c.field };
    var state;
    if (c.op === 'ge') state = parseInt(mine, 10) >= Number(c.value) ? 'satisfied' : 'conflict';
    else if (c.op === 'lte') state = parseInt(mine, 10) <= Number(c.value) ? 'satisfied' : 'conflict';
    else if (c.op === 'eq') state = mine === c.value ? 'satisfied' : 'conflict';
    else if (c.op === 'absent') state = /在用|用过/.test(mine) ? 'conflict' : 'satisfied';
    else if (c.op === 'present') state = /在用|用过|1 线/.test(mine) ? 'satisfied' : 'conflict';
    else if (c.op === 'naive') state = /^1 线/.test(mine) ? 'conflict' : 'satisfied';
    else state = 'undetermined';
    return { state: state, mine: mine + '（' + src + '）', need: need, hard: !!c.hard, cat: c.category, kind: c.kind, text: c.text };
  }

  function matchTrial(t, P) {
    var evals = (t.criteria || []).map(function (c) { return evalCriterion(c, P); });
    var count = function (s) { return evals.filter(function (e) { return e.state === s; }).length; };
    var met = count('satisfied'), unmet = count('conflict'), unknown = count('undetermined');
    var hardUnmet = evals.filter(function (e) { return e.state === 'conflict' && e.hard; });
    /* 粗筛符合度：未知项按 0 计，只会偏低不会偏高（口径写在卡脚） */
    var pct = Math.round((met / Math.max(1, met + unmet + unknown)) * 100);
    var band = hardUnmet.length ? 'ineligible' : (pct >= 80 && unknown <= 1) ? 'high' : pct >= 55 ? 'partial' : 'needs_info';
    return { t: t, evals: evals, met: met, unmet: unmet, unknown: unknown, pct: pct, band: band, hardUnmet: hardUnmet };
  }
  var BAND = {
    high: ['高度符合', 'ok'], partial: ['部分符合', 'warn'],
    needs_info: ['需补充信息', 'grey'], ineligible: ['硬性条件不满足', 'no']
  };
  function trialMatches() {
    var P = {}; matchProfileFields().forEach(function (f) { P[f.k] = f; });
    return allTrials().map(function (t) { return matchTrial(t, P); });
  }

  function critLine(e) {
    return '<div class="crit ' + e.state + '"><div class="crit-line">' +
      '<span class="crit-mark ' + TIER[e.state].cls + '" aria-hidden="true">' + TIER[e.state].mark + '</span>' +
      '<b>' + (e.kind === 'exclude' ? '排除' : '入组') + ' · ' + esc(CRIT_CAT[e.cat] || e.cat) + '</b>' +
      (e.hard ? '<span class="muted hard-tag">硬性</span>' : '<span class="muted">非硬性</span>') + '</div>' +
      '<p>' + esc(e.text) + '</p>' +
      '<small><b>' + TIER[e.state].label + '</b> · 记录里是：' + esc(e.mine) + ' · 条件要求：' + esc(e.need) + '</small></div>';
  }
  function trialCard(m) {
    var t = m.t, band = BAND[m.band];
    var verified = t.verifiedOn ? '核验 ' + t.verifiedOn : '未核验';
    var statusLabel = t.verifiedOn ? (TRIAL_STATUS[t.status] || t.status) : '未核验（不显示招募状态）';
    var order = { conflict: 0, undetermined: 1, satisfied: 2 };
    var sorted = m.evals.slice().sort(function (a, b) { return order[a.state] - order[b.state]; });
    var top = sorted.slice(0, 4), rest = sorted.slice(4);
    return '<section class="trial-card' + (m.band === 'ineligible' ? ' ineligible' : '') + '">' +
      '<div class="trial-top"><div><div class="trial-tags">' +
      badge(statusLabel, t.status === 'recruiting' && t.verifiedOn ? 'ok' : t.status === 'suspended' ? 'warn' : 'grey') +
      badge((t.phase || '—'), 'grey') + badge(TRIAL_SCOPE[t.scope] || '—', 'grey') +
      (t.verifiedOn ? badge(verified, '') : '') + '</div>' +
      '<h2>' + esc(t.title) + '</h2>' +
      '<p class="trial-reg">' + esc(t.id) + ' · ' + esc(t.source) + ' · ' + esc(((t.sites || []).map(function (x) { return x.city; }).join(' / ')) || '中心待定') + '</p></div>' +
      '<div class="fit ' + band[1] + '"><b>' + m.pct + '<small>%</small></b><span>粗筛符合度</span><em>' + band[0] + '</em></div></div>' +
      '<div class="match-counts">' + badge('符合 ' + m.met, 'ok') +
        (m.unmet ? badge('不符合 ' + m.unmet, 'no') : '') +
        (m.unknown ? badge('待确认 ' + m.unknown, 'grey') : '') +
        (m.hardUnmet.length ? badge('硬性不满足 ' + m.hardUnmet.length, 'no') : '') + '</div>' +
      '<div class="crit-list">' + top.map(critLine).join('') + '</div>' +
      (rest.length ? '<details class="crit-more"><summary>其余 ' + rest.length + ' 条条件</summary><div class="crit-list">' + rest.map(critLine).join('') + '</div></details>' : '') +
      '<div class="trial-actions">' +
        '<button type="button" class="btn ' + (favIndex(t.id) >= 0 ? 'btn-quiet' : 'btn-primary') + '" data-act="trial-fav" data-id="' + esc(t.id) + '">' +
          (favIndex(t.id) >= 0 ? '已收藏（' + FAV_STATE[state.trialFavs[favIndex(t.id)].state] + '）' : '收藏并跟踪') + '</button>' +
        '<button type="button" class="btn" data-act="trial-ask" data-id="' + esc(t.id) + '">把待确认项加进问题清单</button>' +
        '<button type="button" class="btn btn-quiet" data-act="trial-detail" data-id="' + esc(t.id) + '">看条件原文与中心</button>' +
      '</div>' +
      '<p class="small-note">符合度 = 符合项 ÷ 已对照项；未知项按 0 计，因此只会偏低、不会偏高。这不是入组资格，也不代表效果。登记状态，未核实。</p>' +
      '</section>';
  }

  /* ---- 二级页 1：匹配（含入组档案、我的偏好、可对照/硬性不满足分组） ---- */
  function trialMatchBody() {
    var fields = matchProfileFields();
    var missing = fields.filter(function (f) { return !f.v; });
    var all = trialMatches();
    /* 排序：待确认项少者优先 → 粗筛符合度高者优先（与页面文案一致，不是"匹配度排名"） */
    var byInfo = function (a, b) { return (a.unknown - b.unknown) || (b.pct - a.pct); };
    var fit = all.filter(function (m) { return m.band !== 'ineligible'; }).sort(byInfo);
    var bad = all.filter(function (m) { return m.band === 'ineligible'; }).sort(byInfo);
    var pref = state.trialPrefs || {};
    return '<div class="notice"><b>这里的试验条目是演示数据</b>（T-01…T-10），不是真实在招试验。' +
      '真实版本须接登记平台，逐条显示登记号、状态与核验日期；没有核验日期的只显示「未核验」，不显示「招募中」。</div>' +
      '<section class="card"><div class="card-head"><h2 class="h2">用来对照的入组档案</h2>' +
        '<span class="muted small">完整度 ' + (fields.length - missing.length) + '/' + fields.length + '</span></div>' +
      '<div class="fact-grid">' + fields.map(function (f) {
        return '<dl><dt>' + esc(f.k) + '</dt><dd><b' + (f.v ? '' : ' class="miss-b"') + '>' + esc(f.v || '未记录') + '</b><span>' + esc(f.src) + '</span></dd></dl>';
      }).join('') + '</div>' +
      '<p class="small-note">这份清单只描述你的记录里有什么；缺失项对应的条件一律判「待确认」，不会被当作符合。</p></section>' +
      '<section class="card"><div class="card-head"><h2 class="h2">我的偏好（不影响医学条件）</h2>' +
        '<span class="muted small">只改变提示与排序，不改变「符合/不符合」</span></div>' +
      '<div class="pref-row">' +
        '<label class="check"><input type="checkbox" data-act="trial-pref" data-key="biopsy"' + (pref.biopsy ? ' checked' : '') + '> 接受为入组重新活检</label>' +
        '<label class="check"><input type="checkbox" data-act="trial-pref" data-key="placebo"' + (pref.placebo ? ' checked' : '') + '> 接受安慰剂对照</label>' +
        '<label class="inline-field">可去的城市 <select data-act="trial-pref" data-key="city">' +
          ['all', '上海', '北京', '广州', '杭州', '成都'].map(function (c) {
            return '<option value="' + c + '"' + ((pref.city || 'all') === c ? ' selected' : '') + '>' + (c === 'all' ? '不限' : c) + '</option>';
          }).join('') + '</select></label></div></section>' +
      '<section class="card"><div class="card-head"><h2 class="h2">检索与 AI</h2>' + badge('AI 只起草') + '</div>' +
      '<div class="row">' + aiBtn(matchPrompt(), 'AI 协助整理命中证据') +
      '<button type="button" class="btn" data-act="export-trial">导出这次对照</button></div>' +
      '<p class="muted small">来源：' + esc(D.trialSourceLabel) + ' · 快照 ' + esc(D.trialSnapshot) + ' · 库内 ' + esc(D.trialLibraryCount) + ' 条，本页演示 ' + D.trials.length + ' 条。' +
      '外部通道脚本 fetch-cll-trials-2026 需在终端手动运行；在线终态如实透传（FAILED/无覆盖 ≠ 查过）。</p>' +
      '<pre class="agent-log" id="trialExport" hidden></pre></section>' +
      '<div class="section-title"><div><h2>按当前记录能对上的（' + fit.length + '）</h2>' +
      '<p>待确认项越少排得越前；硬性条件不满足的单列在下面，不会混进来</p></div></div>' +
      (fit.length ? fit.map(trialCard).join('') : '<div class="chart-empty"><p>当前条件下没有可对照的条目。</p></div>') +
      (bad.length ? '<details class="bad-trials"><summary>硬性条件不满足的 ' + bad.length + ' 条（点开看是哪一条挡住了）</summary>' + bad.map(trialCard).join('') + '</details>' : '');
  }

  /* ---- 二级页 2：检索（只看条目本身，不看"与我相关"） ---- */
  function trialSearchBody() {
    var f = state.trialFilter2 || { q: '', scope: 'all', status: 'all' };
    var all = trialMatches();
    var list = all.filter(function (m) {
      var t = m.t;
      if (f.q && (t.id + ' ' + t.title).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      if (f.scope !== 'all' && t.scope !== f.scope) return false;
      if (f.status !== 'all' && t.status !== f.status) return false;
      return true;
    }).sort(function (a, b) { return (a.unknown - b.unknown) || (b.pct - a.pct); });
    return '<div class="notice">检索是「按条件找」，不是「替你挑」：排序用同一套逐条对照，不改写条件，也不隐藏不符合的条目。</div>' +
      '<section class="card"><div class="card-head"><h2 class="h2">筛条件</h2><span class="muted small">只看条目本身；「与我相关」的判断在匹配页</span></div>' +
      '<div class="pref-row">' +
        '<label class="inline-field" style="flex:1 1 220px">关键词 <input id="trial-q" data-act="trial-q" value="' + esc(f.q) + '" placeholder="登记号 / 药名 / 靶点"></label>' +
        '<label class="inline-field">治疗场景 <select data-act="trial-filter2" data-key="scope">' +
          [['all', '不限'], ['first_line', '一线'], ['rrmm', '复发/难治'], ['frail', '老年/虚弱'], ['registry', '登记研究'], ['translational', '转化研究']].map(function (o) {
            return '<option value="' + o[0] + '"' + (f.scope === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
          }).join('') + '</select></label>' +
        '<label class="inline-field">状态 <select data-act="trial-filter2" data-key="status">' +
          [['all', '不限'], ['recruiting', '招募中'], ['not_yet_recruiting', '即将招募'], ['suspended', '暂停招募'], ['active_not_recruiting', '在研不招募']].map(function (o) {
            return '<option value="' + o[0] + '"' + (f.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
          }).join('') + '</select></label>' +
        '<button type="button" class="btn btn-quiet" data-act="trial-reset">清空</button></div>' +
      '<p class="small-note">两者分开，是为了让你能看见"与我无关但存在"的选项。</p></section>' +
      '<div class="section-title"><div><h2>' + list.length + ' 条结果</h2><p>按粗筛符合度排序；状态与核验日期逐条显示</p></div></div>' +
      (list.length ? list.map(trialCard).join('') : '<div class="chart-empty"><p>没有符合条件的条目。放宽一个筛选项再试。</p></div>');
  }

  /* ---- 二级页 3：收藏与跟踪（跟踪"试验变了什么"，不是"我该不该进"） ---- */
  var TRIAL_TRACK_NOTE = '跟踪的是「试验变了什么」，不是「我该不该进」。每次状态、中心、截止日期、入组条件变化都单独记一条，带来源与日期；不合并成"最新情况"，也不预测结果。';

  function trialSavedBody() {
    var favs = state.trialFavs || [];
    if (!favs.length) {
      return '<div class="notice"><b>收藏 = 跟踪变化。</b>' + TRIAL_TRACK_NOTE + '</div>' +
        '<div class="chart-empty"><p>还没有收藏的试验。在「匹配」或「检索」里点「收藏并跟踪」，这里才会出现跟踪线。</p>' +
        '<p class="muted small">收藏只记「哪条 + 什么时候 + 我的状态」，不改动任何入组条件。</p></div>';
    }
    var matches = trialMatches();
    var act = favs.filter(function (f) { return f.state !== 'archived'; });
    var arc = favs.filter(function (f) { return f.state === 'archived'; });

    function card(f) {
      var m = matches.filter(function (x) { return x.t.id === f.id; })[0];
      if (!m) return '';
      var t = m.t;
      var unknown = m.evals.filter(function (e) { return e.state === 'undetermined'; }).slice(0, 3);
      var track = [
        { on: f.savedOn, text: '我把它加进跟踪', source: '本机收藏' },
        t.verifiedOn ? { on: t.verifiedOn, text: '录入这一版登记摘要并核验（状态：' + (TRIAL_STATUS[t.status] || t.status) + '）', source: '登记平台摘录' } : null,
        t.status === 'suspended' ? { on: (t.verifiedOn || f.savedOn), text: '状态改为「暂停招募」', source: '登记平台摘录' } : null
      ].filter(Boolean).sort(function (a, b) { return a.on < b.on ? 1 : -1 });

      return '<section class="card saved-card"><div class="card-head"><div>' +
        '<div class="trial-tags">' +
          badge(TRIAL_STATUS[t.status] || t.status, t.status === 'recruiting' && t.verifiedOn ? 'ok' : t.status === 'suspended' ? 'warn' : 'grey') +
          badge('收藏于 ' + f.savedOn, '') +
          badge(FAV_STATE[f.state], f.state === 'asking' ? 'warn' : 'grey') +
          (t.verifiedOn ? badge('核验 ' + t.verifiedOn, '') : badge('未核验', 'warn')) +
        '</div>' +
        '<h2 class="h2">' + esc(t.id) + ' · ' + esc(t.title) + '</h2>' +
        '<p class="muted small">' + esc(TRIAL_SCOPE[t.scope] || '') + ' · ' + esc((t.sites || []).map(function (x) { return x.city; }).join(' / ') || '中心待定') + '</p></div>' +
        '<div class="fit ' + BAND[m.band][1] + '"><b>' + m.pct + '<small>%</small></b><span>粗筛符合度</span><em>' + BAND[m.band][0] + '</em></div></div>' +
        (t.status === 'suspended' ? '<div class="notice"><b>这条已暂停招募。</b>你收藏之后状态变了，记录仍在；要不要继续等，去门诊问研究护士。</div>' : '') +
        '<h3 class="h3" style="margin:12px 0 6px">状态与中心变化</h3>' +
        '<div class="track">' + track.map(function (u) {
          return '<div class="track-row"><span class="date">' + esc(u.on) + '</span><div><b>' + esc(u.text) + '</b><small>' + esc(u.source) + '</small></div></div>';
        }).join('') + '</div>' +
        '<div class="crit-mini">' + (unknown.length ? unknown.map(function (e) { return '<span>? ' + esc(e.text) + '</span>'; }).join('') : '<span>没有待确认项</span>') + '</div>' +
        '<div class="trial-actions">' +
          (f.state !== 'asking' ? '<button type="button" class="btn" data-act="trial-state" data-id="' + esc(t.id) + '" data-state="asking">标为准备问</button>' : '') +
          '<button type="button" class="btn" data-act="trial-ask" data-id="' + esc(t.id) + '">把待确认项加进问题清单</button>' +
          '<button type="button" class="btn btn-quiet" data-act="trial-detail" data-id="' + esc(t.id) + '">看条件原文与中心</button>' +
          (f.state !== 'archived' ? '<button type="button" class="btn btn-quiet" data-act="trial-state" data-id="' + esc(t.id) + '" data-state="archived">归档</button>'
            : '<button type="button" class="btn btn-quiet" data-act="trial-state" data-id="' + esc(t.id) + '" data-state="watching">回到在跟</button>') +
          '<button type="button" class="btn btn-quiet" data-act="trial-fav" data-id="' + esc(t.id) + '">取消收藏</button>' +
        '</div>' +
        '<p class="small-note">这一节只记"变化本身"，不写"最新情况"，也不预测结果；登记状态，未核实。</p>' +
        '</section>';
    }

    return '<div class="notice"><b>收藏 = 跟踪变化。</b>' + TRIAL_TRACK_NOTE + '</div>' +
      (act.length ? act.map(card).join('') : '<div class="chart-empty"><p>在跟踪的条目为空；已归档的在下面。</p></div>') +
      (arc.length ? '<details class="bad-trials"><summary>已归档 ' + arc.length + ' 条（记录仍在，可回到在跟）</summary>' + arc.map(card).join('') + '</details>' : '');
  }

  function trialDetail(id) {
    var t = allTrials().filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var body = '<p class="muted small">条目为演示数据，不是真实在招试验；真实版本须给登记平台链接与核验日期。</p>' +
      '<h3 class="h3">入组 / 排除条件（登记原文要点）</h3>' +
      (t.criteria || []).map(function (c) {
        return '<div class="crit"><div class="crit-line"><b>' + (c.kind === 'exclude' ? '排除' : '入组') + ' · ' + esc(CRIT_CAT[c.category] || c.category) + '</b>' +
          (c.hard ? '<span class="muted">硬性</span>' : '<span class="muted">非硬性</span>') + '</div><p>' + esc(c.text) + '</p></div>';
      }).join('') +
      '<h3 class="h3">中心</h3>' +
      ((t.sites || []).map(function (s2) {
        return '<p>' + esc(s2.city) + ' · ' + esc(s2.hospital) + ' — ' + esc(s2.contact) + ' · ' +
          (s2.status === 'open' ? '开放' : s2.status === 'planned' ? '计划启动' : '暂停') + ' · ' + esc(s2.updatedOn || '') + '</p>';
      }).join('') || '<p>中心未登记</p>') +
      '<p class="small-note">要不要联系、能不能入组，由研究团队当面评估。工作台只把条件与记录摆在一起。</p>';
    var dlg = $('#trial-dialog');
    if (dlg) {
      $('#trial-dialog-title').textContent = t.id + ' · ' + t.title;
      $('#trial-dialog-body').innerHTML = body;
      if (!dlg.open) dlg.showModal();
    }
  }

  function matchPrompt() {
    var fields = matchProfileFields();
    var summary = fields.map(function (f) { return f.k + '：' + (f.v || '未记录'); }).join('；');
    var ids = allTrials().map(function (t) { return t.id + '（' + t.title + '）'; }).join(' / ');
    return '请协助我逐条比对入组档案与这些登记条目。档案摘要——' + summary + '。登记条目——' + ids +
      '。要求：只用「符合 / 不符合 / 待确认」三档逐条列出，每条写清「记录里是」与「条件要求」；' +
      '缺失字段一律判「待确认」；不输出匹配度百分比、不排序、不写哪条更适合我；入组判断属于医生与研究中心。';
  }

  function pageTrial() {
    var sub = state.route.sub || 'match';
    var head = pageHead('临床研究', '按记录逐条对照登记条件',
      '这里是登记摘录与逐条对照，不是招募推荐：每条条件都写清「记录里是」与「条件要求」；不给排名、不替你做决定。', backHome());
    var nav = subnav('trial', [['匹配', 'match'], ['检索', 'search'], ['收藏与跟踪', 'saved']]);
    var body = sub === 'search' ? trialSearchBody() : sub === 'saved' ? trialSavedBody() : trialMatchBody();
    var dlg = '<dialog id="trial-dialog" class="modal"><div class="modal-head"><h2 class="h2" id="trial-dialog-title"></h2>' +
      '<button type="button" class="btn" data-act="close-trial-dialog">关闭</button></div>' +
      '<div class="modal-body" id="trial-dialog-body"></div></dialog>';
    return head + nav + body + dlg;
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
    if (state.route.view === 'onechart') applyOnechartLayout();
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
        el.classList.toggle('is-flipped', on);
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
      case 'pin-pt': {
        if (!state.chart.pinOn) break;
        var pcode = el.getAttribute('data-code'), pd = el.getAttribute('data-d');
        var cur = state.chart.pin;
        state.chart.pin = (cur && cur.code === pcode && cur.d === pd) ? null : { code: pcode, d: pd };
        redrawChart(); break;
      }
      case 'pin-last': {
        if (!state.chart.pinOn) { toast('先打开「点选读数」再点图例'); break; }
        var lc = el.getAttribute('data-code'), lm = metricByCode(lc);
        var lp = lm ? lm.pts.filter(function (p) { return typeof p.v === 'number'; }).slice(-1)[0] : null;
        state.chart.pin = lp ? { code: lc, d: lp.d } : null;
        redrawChart(); break;
      }
      case 'pin-clear': state.chart.pin = null; redrawChart(); break;
      case 'trial-fav': {
        var fid = el.getAttribute('data-id');
        var ix = favIndex(fid);
        if (ix >= 0) { state.trialFavs.splice(ix, 1); toast('已取消收藏（原型为内存态）'); }
        else { state.trialFavs.push({ id: fid, state: 'watching', savedOn: '2026-10-25', note: '' }); toast('已收藏到跟踪（原型为内存态，刷新即还原）'); }
        render();
        break;
      }
      case 'trial-state': {
        var sid = el.getAttribute('data-id'), sstate = el.getAttribute('data-state');
        var sx = favIndex(sid);
        if (sx >= 0) {
          state.trialFavs[sx].state = sstate;
          toast(sstate === 'asking' ? '已标记「准备问」' : sstate === 'archived' ? '已归档（记录仍在）' : '已回到「在跟」');
        }
        render();
        break;
      }
      case 'trial-ask': {
        var tid = el.getAttribute('data-id');
        var m0 = trialMatches().filter(function (x) { return x.t.id === tid; })[0];
        var pend = m0 ? m0.evals.filter(function (e) { return e.state === 'undetermined'; }) : [];
        pend.forEach(function (e) {
          state.extra.questions.push({ q: '【' + tid + '】' + e.text + '：我这种情况是否满足？（记录里是：' + e.mine + '）', d: '2026-10-25', from: '试验待确认项' });
        });
        toast(pend.length ? '已把 ' + pend.length + ' 条待确认项加进问题清单' : '这条没有待确认项');
        break;
      }
      case 'trial-detail': trialDetail(el.getAttribute('data-id')); break;
      case 'close-trial-dialog': { var d = $('#trial-dialog'); if (d && d.open) d.close(); break; }
      case 'trial-reset': state.trialFilter2 = { q: '', scope: 'all', status: 'all' }; render(); break;
      case 'trial-filter': {
        state.trialFilter = el.getAttribute('data-src');
        render();
        break;
      }
      case 'toggle-onechart-side': {
        state.onechartSideOpen = !state.onechartSideOpen;
        applyOnechartLayout();
        break;
      }
      case 'discuss': {
        /* IP11：拉起 AI 对话栏 + 把本页关键信息与提问一起**发到原生会话**（不再只填草稿） */
        var pTitle = ($('#view h1') || {}).textContent || '本页';
        var draft = '【' + pTitle + ' · 本页关键信息】' + discussFacts() +
          '\n\n请基于上面这些我记录的事实，帮我整理成就诊可以问医生的问题；不要给判断或建议。';
        agentDraft(draft, { autoSubmit: true });
        break;
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
    }
  });

  /* 复选（指标勾选即时更新）+ 显示开关 */
  document.addEventListener('change', function (e) {
    var tx = e.target.closest('[data-act="tx-toggle"]');
    if (tx) { state.chart.tx = tx.checked; redrawChart(); return; }
    var pt = e.target.closest('[data-act="pin-toggle"]');
    if (pt) { state.chart.pinOn = pt.checked; if (!pt.checked) state.chart.pin = null; redrawChart(); return; }
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

  /* 临床试验：检索输入（防抖）、筛选下拉、我的偏好 —— 均只改界面状态，不动档案 */
  var trialQTimer = null;
  document.addEventListener('input', function (e) {
    var q = e.target.closest('[data-act="trial-q"]');
    if (!q) return;
    state.trialFilter2.q = q.value;
    clearTimeout(trialQTimer);
    trialQTimer = setTimeout(function () {
      render();
      var box = $('#trial-q');
      if (box) { box.focus(); try { box.setSelectionRange(box.value.length, box.value.length); } catch (err) { /* 忽略 */ } }
    }, 220);
  });
  document.addEventListener('change', function (e) {
    var pre = e.target.closest('[data-act="trial-pref"]');
    if (pre) {
      var k = pre.getAttribute('data-key');
      state.trialPrefs[k] = pre.type === 'checkbox' ? pre.checked : pre.value;
      toast('偏好只影响提示与排序，不改变「符合 / 不符合」的判断');
      render();
      return;
    }
    var f2 = e.target.closest('[data-act="trial-filter2"]');
    if (f2) { state.trialFilter2[f2.getAttribute('data-key')] = f2.value; render(); return; }
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
    if (panel) panel.innerHTML = chartSVG(state.chart.sel, state.chart.range, state.chart.tx, state.chart.pinOn ? state.chart.pin : null);
    var cnt = $('#picker-count');
    if (cnt) cnt.textContent = state.chart.sel.length + '/4';
    var sub = $('#chart-sub');
    if (sub) {
      var label = { '3m': '近 3 月', '6m': '近 6 月', '12m': '近 12 月', all: '全部' }[state.chart.range] || '全部';
      sub.textContent = '已选 ' + state.chart.sel.length + ' 条 · ' + label;
    }
  }

  /* ================= 启动 ================= */
  window.addEventListener('hashchange', render);
  window.addEventListener('resize', function () { if (state.route.view === 'onechart') applyOnechartLayout(); });
  window.addEventListener('DOMContentLoaded', function () {
    $('#view-sub-count').textContent = VIEW_SUBS.length; /* 自检计数（页脚常显） */
    /* 顶栏状态：装进 Desktop 时由宿主原生会话承担；独立打开如实说明 */
    (function () {
      var framed = false;
      try { framed = window.parent && window.parent !== window; } catch (e) { framed = false; }
      var note = $('#agent-note');
      if (note) note.textContent = framed ? 'AI 对话在右侧原生会话' : '独立打开：无 AI 会话（装进 Desktop 后可用）';
    })();
    render();
  });
  if (document.readyState !== 'loading') {
    (function boot() {
      var v = $('#view');
      if (v && !v.innerHTML) { $('#view-sub-count').textContent = VIEW_SUBS.length; render(); }
    })();
  }
})();
