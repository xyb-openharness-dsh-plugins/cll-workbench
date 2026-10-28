/* 「临床试验」一级页回归：三态（命中 / 无法自动匹配 / 不适用）、来源与快照、空态出口。
 *
 * 契约来自 docs 35 号 §三 / 25 号 L2-3：
 *   命中         记录里有疾病相关字段能和登记条件对上；
 *   无法自动匹配  本地缺结构化字段 → 写缺什么，不判"不适用"；
 *   不适用       登记条件与记录值明确不一致（只照抄两边原文）。
 * 同时钉死「不产出任何评分 / 匹配度数字」：页面只能给三态与证据链。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { bootWorkbench } from './helpers/dom-harness.mjs'

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8')
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')
const demo = readFileSync(new URL('../public/demo-data.js', import.meta.url), 'utf8')

function pageSource() {
  const start = app.indexOf('/* ---- 临床试验 trials')
  assert.ok(start > 0, 'public/app.js 里找不到临床试验页的实现段')
  const next = app.indexOf('/* ---- 共病与在用药 comorb ---- */', start)
  return app.slice(start, next > 0 ? next : undefined)
}

test('① 静态：一级入口「临床试验」存在，且与旧「临床研究」并存（没有删入口）', () => {
  assert.match(html, /href="#trials" data-route="trials"[^>]*>[\s\S]*?临床试验/)
  assert.match(html, /href="#trial" data-route="trial"[^>]*>[\s\S]*?临床研究/)
  assert.match(app, /var VIEWS = \[[^\]]*'trials'/)
  assert.match(app, /trials: pageTrials/)
  assert.match(app, /trials: '本地试验快照 '/)
  assert.match(app, /case 'go-trials': location\.hash = '#trials'/)
})

test('② 静态：三态枚举与判定口径（含"缺字段不算不适用"）', () => {
  assert.match(app, /hit: \{ label: '命中'/)
  assert.match(app, /unmatched: \{ label: '无法自动匹配'/)
  assert.match(app, /na: \{ label: '不适用'/)
  /* 硬性冲突 → 不适用；只有疾病相关字段命中 → 命中；其余 → 无法自动匹配 */
  assert.match(app, /function trialStateOf\(m\) \{\s*if \(m\.hardUnmet\.length\) return 'na';\s*if \(trialHitRows\(m\)\.length\) return 'hit';\s*return 'unmatched';\s*\}/)
  assert.match(app, /e\.cat !== 'age'/)
})

test('③ 静态：不给评分 / 匹配度；来源与快照常显', () => {
  const src = pageSource()
  assert.doesNotMatch(src, /Math\.round|toFixed|匹配指数|符合度\s*\d|%\s*'/)
  assert.match(src, /D\.trialSourceLabel/)
  assert.match(src, /D\.trialSnapshot/)
  assert.match(src, /登记状态，未核实/)
  assert.match(src, /去登记平台自查/)
  /* 仓内没有 /api/cll/trials：页面如实写明，不假装在线 */
  assert.match(src, /\/api\/cll\/trials/)
})

test('④ 静态：空态必须写清「去登记平台自查」', () => {
  const src = pageSource()
  assert.match(src, /本地还没有试验快照/)
  assert.match(src, /去登记平台自查：用病名 \+ 药名 \+ 城市检索/)
})

test('⑤ 渲染：三态分组齐全，10 条登记各出现一次，证据链带「记录里是 / 条件要求」', () => {
  const wb = bootWorkbench({ hash: '#trials', width: 1200 })
  const page = wb.html
  const counts = [...page.matchAll(/<h2>(命中|无法自动匹配|不适用)（(\d+)）<\/h2>/g)]
  assert.equal(counts.length, 3)
  assert.deepEqual(counts.map((m) => m[1]), ['命中', '无法自动匹配', '不适用'])
  const total = counts.reduce((n, m) => n + Number(m[2]), 0)
  assert.equal(total, 10, '三组条数之和必须等于快照条数')
  assert.ok(counts.every((m) => Number(m[2]) > 0), '演示快照应能同时出现三种状态')

  const ids = [...page.matchAll(/<h2 class="h2">(T-\d+)/g)].map((m) => m[1])
  assert.equal(ids.length, 10)
  assert.equal(new Set(ids).size, 10, '同一条登记不许同时落在两组')

  assert.match(page, /记录里是：/)
  assert.match(page, /条件要求：/)
  assert.match(page, /登记来源与快照/)
  assert.match(page, /快照会过期/)
  assert.match(page, /去登记平台自查/)
  assert.match(page, /不构成入组判断/)
})

test('⑥ 渲染：不产出评分或匹配度数字（没有任何百分数）', () => {
  const wb = bootWorkbench({ hash: '#trials', width: 1200 })
  assert.doesNotMatch(wb.html, /\d+(\.\d+)?\s*%/)
  assert.doesNotMatch(wb.html, /(匹配度|符合度|评分)[^，。；]{0,6}\d/)
  assert.doesNotMatch(wb.html, /匹配指数/)
})

test('⑦ 渲染：快照为空时只给空态与登记平台出口，不编条目', () => {
  const wb = bootWorkbench({
    hash: '#trials',
    width: 1200,
    mutateDemo: (d) => { d.trials = [] },
  })
  assert.match(wb.html, /本地还没有试验快照/)
  assert.match(wb.html, /去登记平台自查/)
  assert.doesNotMatch(wb.html, /<h2 class="h2">T-\d+/)
  assert.doesNotMatch(wb.html, /命中（/)
  /* 空态也不许出现"暂无匹配/没有合适的试验"这种替人下结论的说法 */
  assert.doesNotMatch(wb.html, /暂无匹配|没有合适的试验/)
})

test('⑧ 登记链接只用 https（不出现 http:// 与伪协议）', () => {
  const wb = bootWorkbench({ hash: '#trials', width: 1200 })
  const hrefs = [...wb.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
  assert.ok(hrefs.length >= 2)
  hrefs.forEach((href) => assert.match(href, /^https:\/\//))
})

test('⑨ 数据来源与演示口径一致（不把演示条目说成真实在招试验）', () => {
  const wb = bootWorkbench({ hash: '#trials', width: 1200 })
  assert.match(wb.html, /演示虚构，不是真实在招试验/)
  assert.match(demo, /trialSnapshot = '2026-10-25'/)
  assert.match(wb.html, /2026-10-25/)
})