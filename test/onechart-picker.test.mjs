/* 一图秀「展开指标选择」回归：窄业务区里手动展开不能被自动收起立刻吃掉。
 *
 * 踩坑现场（2026-10-28 用户反馈）：点「展开指标选择」没反应、也勾不了指标。
 * 根因是 applyOnechartLayout() 把「容器 < 860px」直接写成 side-collapsed，
 * 用户点击只改了 state.onechartSideOpen，紧接着同一次调用又按宽度收回去；
 * 左栏 display:none 后勾选框自然点不到。这里用真跑 app.js 的方式钉住行为。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { bootWorkbench } from './helpers/dom-harness.mjs'

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8')
const css = readFileSync(new URL('../public/style.css', import.meta.url), 'utf8')
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')

/* 桩 DOM 不解析 innerHTML：首屏渲染要从字符串里读，交互后的增量更新读节点。 */
function pickerCount(wb) {
  return wb.nodes.get('#picker-count').textContent || (wb.html.match(/id="picker-count">([^<]+)</) || [])[1] || ''
}
function chartMarkup(wb) {
  const node = wb.nodes.get('#chart-panel')
  if (node.innerHTML) return node.innerHTML
  return (wb.html.match(/id="chart-panel"[^>]*>([\s\S]*?)<\/div><\/section>/) || [])[1] || ''
}

test('① 静态：手动选择优先于「窄容器自动收起」', () => {
  /* 旧实现只有 auto = w < 860，没有「用户点过」这一档 */
  assert.match(app, /onechartSideOverride/)
  assert.match(app, /function onechartCollapsed\(w\)/)
  assert.match(app, /state\.onechartSideOverride === 'open'\) return false/)
  /* 点击处理器必须记住用户选择 */
  assert.match(app, /state\.onechartSideOverride = nowCollapsed \? 'open' : 'closed'/)
  /* 两颗按钮一起更新 text/aria-expanded（收起条那颗曾被漏掉） */
  assert.match(app, /data-role="onechart-toggle-head"/)
  assert.match(app, /data-role="onechart-toggle-bar"/)
  assert.match(app, /aria-expanded="' \+ \(collapsed \? 'false' : 'true'\)/)
  /* 两颗按钮由 $all 一起刷新，不再只改第一颗 */
  assert.match(app, /\$all\('\[data-act="toggle-onechart-side"\]'\)/)
})

test('② 静态：收起只是隐藏左栏，不是把勾选框做成不可达', () => {
  assert.match(css, /\.onechart-layout\.side-collapsed \.onechart-side\{display:none\}/)
  assert.match(css, /\.onechart-layout\.side-collapsed\{grid-template-columns:minmax\(0,1fr\)\}/)
  /* 容器查询在窄宽只改列，不再额外压掉左栏设置，避免与手动展开打架 */
  assert.match(css, /@container \(max-width: 860px\)/)
})

test('③ 静态：勾选状态持久化（仓内约定 = localStorage + 带版本键）', () => {
  assert.match(app, /var CHART_STORE_KEY = 'cll:onechart:v1'/)
  assert.match(app, /window\.localStorage\.getItem\(CHART_STORE_KEY\)/)
  assert.match(app, /window\.localStorage\.setItem\(CHART_STORE_KEY/)
  /* 勾选与时间范围变化都要落盘（redrawChart 里统一写，另有两处显式调用） */
  assert.ok((app.match(/saveChartState\(\)/g) || []).length >= 3)
})

test('④ 渲染：窄容器（700px）里手动展开真的展开，再点收起真的收起', () => {
  const wb = bootWorkbench({ hash: '#onechart', width: 700 })
  const layout = wb.nodes.get('.onechart-layout')
  assert.equal(layout.classList.contains('side-collapsed'), true, '窄容器默认应收起')
  assert.equal(wb.headToggle.getAttribute('aria-expanded'), 'false')
  assert.equal(wb.headToggle.textContent, '展开指标')
  assert.equal(wb.barToggle.textContent, '展开指标选择')

  wb.fireClick('toggle-onechart-side')
  assert.equal(layout.classList.contains('side-collapsed'), false, '点展开后必须真的展开（根因）')
  assert.equal(wb.headToggle.getAttribute('aria-expanded'), 'true')
  assert.equal(wb.headToggle.textContent, '收起指标')
  assert.equal(wb.barToggle.textContent, '收起指标')

  wb.fireClick('toggle-onechart-side')
  assert.equal(layout.classList.contains('side-collapsed'), true, '再点必须收起')
  assert.equal(wb.headToggle.getAttribute('aria-expanded'), 'false')
})

test('⑤ 渲染：逐个勾选/取消即时反映到图表，并写进 localStorage', () => {
  const wb = bootWorkbench({ hash: '#onechart', width: 1200 })
  const layout = wb.nodes.get('.onechart-layout')
  assert.equal(layout.classList.contains('side-collapsed'), false, '宽容器默认展开')

  const panel = wb.nodes.get('#chart-panel')
  const before = panel.innerHTML
  assert.doesNotMatch(before, /data-code="plt"/)

  wb.fireChange('pick-metric', { 'data-code': 'plt' }, true)
  assert.equal(pickerCount(wb), '3/4')
  assert.match(panel.innerHTML, /data-code="plt"/, '勾选后图表要出现该指标的点')
  assert.notEqual(panel.innerHTML, before, '图表必须重绘')

  const saved = JSON.parse(wb.storage.get('cll:onechart:v1'))
  assert.deepEqual(saved.sel, ['alc', 'hgb', 'plt'])

  wb.fireChange('pick-metric', { 'data-code': 'plt' }, false)
  assert.equal(pickerCount(wb), '2/4')
  assert.doesNotMatch(panel.innerHTML, /data-code="plt"/)
  assert.deepEqual(JSON.parse(wb.storage.get('cll:onechart:v1')).sel, ['alc', 'hgb'])
})

test('⑥ 渲染：最多 4 条 / 描述性指标不进折线（拒绝时勾选回退且不落盘）', () => {
  const wb = bootWorkbench({ hash: '#onechart', width: 1200 })

  const qual = wb.fireChange('pick-metric', { 'data-code': 'exam', 'data-qual': '1' }, true)
  assert.equal(qual.checked, false, '描述性指标勾选应回退')
  assert.equal(pickerCount(wb), '2/4')

  ;['plt', 'wbc', 'ldh'].forEach((code) => wb.fireChange('pick-metric', { 'data-code': code }, true))
  assert.equal(pickerCount(wb), '4/4')
  const overflow = wb.fireChange('pick-metric', { 'data-code': 'crea' }, true)
  assert.equal(overflow.checked, false, '第 5 条应被拒绝')
  assert.equal(pickerCount(wb), '4/4')
  const saved = JSON.parse(wb.storage.get('cll:onechart:v1'))
  assert.equal(saved.sel.length, 4)
  assert.equal(saved.sel.includes('crea'), false)
  assert.equal(saved.sel.includes('exam'), false)
})

test('⑦ 渲染：刷新后保持勾选（同一份 storage 重新启动）', () => {
  const storage = { 'cll:onechart:v1': JSON.stringify({ sel: ['alc', 'plt', 'mrd'], range: '12m' }) }
  const wb = bootWorkbench({ hash: '#onechart', width: 1200, storage })
  assert.equal(pickerCount(wb), '3/4')
  assert.match(chartMarkup(wb), /data-code="plt"/)
  assert.match(chartMarkup(wb), /data-code="mrd"/)
})

test('⑧ 渲染：损坏的 storage 不许把页面弄崩（回落默认两条线）', () => {
  const wb = bootWorkbench({ hash: '#onechart', width: 1200, storage: { 'cll:onechart:v1': '{bad json' } })
  assert.equal(pickerCount(wb), '2/4')
  assert.match(chartMarkup(wb), /data-code="alc"/)
})

test('⑨ 导航与页面接线：一图秀入口仍在，且挂着一图秀视图', () => {
  assert.match(html, /href="#onechart" data-route="onechart"/)
  assert.match(app, /onechart: pageOnechart/)
})