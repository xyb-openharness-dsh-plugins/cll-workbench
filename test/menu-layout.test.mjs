/* 菜单层级回归：一级入口一个都不许少，分组与折叠规则对齐 A 家族（小粉宝）。
 *
 * 判据落在三件事上：
 *   1. 分组：一级导航按 5 组排列（只是层级变化，入口集合不变）；
 *   2. 当前项高亮：render() 只给当前 view 那一条打 aria-current="page"；
 *   3. 折叠规则：宽屏二级留在页内；窄屏一级折成一行 chips、二级提到停靠位。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { bootWorkbench } from './helpers/dom-harness.mjs'

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../public/style.css', import.meta.url), 'utf8')
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8')

const routes = [...html.matchAll(/data-route="([^"]+)"/g)].map((m) => m[1])
const original = ['dash', 'records', 'ww', 'labs', 'onechart', 'gene', 'med', 'trial', 'comorb', 'nutr', 'mind', 'prep', 'settings']

test('① 一级入口：13 条老入口一条不少，另加「临床试验」', () => {
  original.forEach((route) => assert.ok(routes.includes(route), `少了原有入口：${route}`))
  assert.ok(routes.includes('trials'), '缺「临床试验」一级入口')
  assert.equal(routes.length, 14)
  assert.equal(new Set(routes).size, routes.length, '入口重复')
  /* 分组会调整相邻顺序（ww 归到治疗与随访），但集合必须与旧入口 + trials 完全一致 */
  assert.deepEqual([...routes].sort(), [...original, 'trials'].sort())
  assert.ok(routes.indexOf('trials') < routes.indexOf('trial'))
})

test('② 分组：5 组标题，且每组都有入口', () => {
  const labels = [...html.matchAll(/class="nav-group-label">([^<]+)</g)].map((m) => m[1])
  assert.deepEqual(labels, ['今天', '我的资料', '治疗与随访', '生活与准备', '系统'])
  const groups = [...html.matchAll(/<li class="nav-group">[\s\S]*?<\/li>\s*<\/li>|<li class="nav-group">[\s\S]*?<\/ul>\s*<\/li>/g)]
  assert.ok(groups.length >= 5, `分组结构不完整：${groups.length}`)
  groups.forEach((g) => assert.match(g[0], /data-route="/, '空分组'))
})

test('③ CSS：分组/图标/间距/高亮与折叠规则都有对应规则', () => {
  assert.match(css, /#navList\{[^}]*display:flex[^}]*flex-direction:column/)
  assert.match(css, /\.nav-group-label\{[^}]*font-size:10\.5px/)
  assert.match(css, /\.sidebar a\{[^}]*display:flex[^}]*align-items:center[^}]*gap:9px[^}]*min-height:40px/)
  assert.match(css, /\.sidebar a \.nic\{/)
  /* 当前项：浅底 + 左侧色条（品牌色只用在条上，文字仍是墨色） */
  assert.match(css, /\.sidebar a\[aria-current="page"\]\{[^}]*background:var\(--active\)[^}]*box-shadow:inset 2px 0 0 var\(--chart-hue\)/)
  /* 宽屏停靠位隐藏；窄屏一级折行、二级提到停靠位、页内二级隐藏 */
  assert.match(css, /#subnav-dock\{display:none\}/)
  assert.match(css, /@media \(max-width:980px\)\{[\s\S]*?#navList\{flex-direction:row; flex-wrap:wrap/)
  assert.match(css, /@media \(max-width:980px\)\{[\s\S]*?\.nav-group,\.nav-sublist\{display:contents\}/)
  assert.match(css, /#subnav-dock\{display:block; overflow-x:auto/)
  assert.match(css, /#view \.subnav\{display:none\}/)
})

test('④ 渲染：只有当前页那条一级入口带 aria-current="page"', () => {
  const wb = bootWorkbench({ hash: '#trials', width: 1200, navRoutes: routes })
  const anchors = wb.arrays['#navList a']
  const current = anchors.filter((a) => a.getAttribute('aria-current') === 'page')
  assert.equal(current.length, 1)
  assert.equal(current[0].getAttribute('data-route'), 'trials')
})

test('⑤ 渲染：二级停靠位抄页内二级页签（同一份锚点与 aria-current）', () => {
  const sub = '<a href="#trial/match" aria-current="page">匹配</a><a href="#trial/search">检索</a>'
  const wb = bootWorkbench({ hash: '#trial', width: 700, navRoutes: routes, subnavHtml: sub })
  const dock = wb.nodes.get('#subnav-dock')
  assert.equal(dock.innerHTML, sub)
  assert.equal(dock.getAttribute('aria-hidden'), null)
})

test('⑥ 渲染：14 个一级页都能渲染出非空页面（菜单改层级不改路由）', () => {
  routes.forEach((route) => {
    const wb = bootWorkbench({ hash: '#' + route, width: 1000 })
    assert.ok(wb.html.length > 400, `#${route} 渲染为空`)
    assert.match(wb.html, /class="page-head"/, `#${route} 没有页头`)
  })
})

test('⑦ 接线：VIEWS / PAGES / 导航三者一致；render 里刷新停靠位', () => {
  const viewsBlock = app.match(/var VIEWS = \[([\s\S]*?)\];/)[1]
  const views = [...viewsBlock.matchAll(/'([a-z]+)'/g)].map((m) => m[1])
  assert.deepEqual([...views].sort(), [...routes].sort(), 'VIEWS 与 index.html 导航不一致')
  views.forEach((v) => assert.match(app, new RegExp(`${v}: page`), `PAGES 缺 ${v}`))
  assert.match(app, /main\.innerHTML = PAGES\[state\.route\.view\]\(\);/)
  assert.match(app, /paintSubnavDock\(\);/)
  assert.match(app, /function paintSubnavDock\(\)/)
})