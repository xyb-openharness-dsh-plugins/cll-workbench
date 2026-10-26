/* UI parity：public/ 与 prototypes/v0.1/ 必须是同一份渲染代码，只换数据来源。
 * 1) 原型里的每个函数开发版都有；2) 新增函数只允许数据层/启动组；3) style.css 与导航常量逐字节一致。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const ROOT = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const proto = read('prototypes/v0.1/app.js')
const shipped = read('public/app.js')
const fnNames = (src) => [...src.matchAll(/function ([A-Za-z_$][\w$]*)/g)].map((m) => m[1]).sort()

test('① 视图函数：原型里的每个函数开发版都有', () => {
  const set = new Set(fnNames(shipped))
  const missing = fnNames(proto).filter((n) => !set.has(n))
  assert.deepEqual(missing, [], `缺少：${missing.join(', ')}`)
})

test('② 开发版不许多造视图层函数（只允许数据接入白名单）', () => {
  const ALLOWED = new Set(['boot', 'apiBase', 'loadProfile', 'hydrate'])
  const extra = fnNames(shipped).filter((n) => !fnNames(proto).includes(n) && !ALLOWED.has(n))
  assert.deepEqual(extra, [], `多出：${extra.join(', ')}`)
})

test('③ style.css 逐字节一致', () => {
  assert.equal(read('public/style.css'), read('prototypes/v0.1/style.css'))
})

test('④ 导航常量一致：13 一级页 + 19 视图', () => {
  const pick = (src) => (src.match(/var PAGES = \{[\s\S]*?\};/) || [''])[0]
  assert.equal(pick(shipped).replace(/\s+/g, ''), pick(proto).replace(/\s+/g, ''))
  for (const key of ['dash','records','ww','labs','onechart','gene','med','trial','comorb','nutr','mind','prep','settings']) {
    assert.match(shipped, new RegExp(`${key}:\\s*page`))
  }
})

test('⑤ 图表硬纪律：SVG 根 class="chart" + Fritsch–Carlson 在两侧同形', () => {
  for (const src of [proto, shipped]) {
    assert.match(src, /class="chart"/)
    assert.match(src, /Fritsch/)
  }
})

test('⑤b 安装版不得自绘任何 AI 会话 UI（会话归宿主外壳）', () => {
  const html = read('public/index.html')
  const app = read('public/app.js')
  /* 演示期的输入框/日志/假发送按钮 */
  assert.doesNotMatch(html, /id="aiPrompt"/, '仍有演示输入框')
  assert.doesNotMatch(html, /id="agentLog"/, '仍有演示日志区')
  assert.doesNotMatch(html, /data-act="ai-send"/, '仍有假发送按钮')
  /* 页面内不再有会话列/开关/分隔条：原生会话由 lib/client.js 外壳提供 */
  assert.doesNotMatch(html, /class="session"|id="agent-splitter"|id="agent-toggle"/, '页面仍自绘会话区')
  assert.doesNotMatch(app, /agentShellWire|setSessionOpen/, '仍含页面级会话开关逻辑')
  /* 顶栏只有一个「和 AI 讨论」，点击发到原生会话 */
  assert.match(html, /data-act="discuss"/)
  assert.match(app, /window\.parent\.postMessage\(/)
})

test('⑥ index.html 只差版本占位与数据源引用', () => {
  const strip = (h) => h.replace(/v0\.\d+\.\d+/g, 'vX').replace(/\s+/g, '')
  assert.equal(strip(read('public/index.html')), strip(read('prototypes/v0.1/index.html')))
})

test('⑦ 配色守住 taste app-screen 口径（chrome 中性 / 一处强调 / 扁平）', () => {
  const css = read('public/style.css')
  /* 底部/卡面为中性；强调色只落数据与主行动 */
  /* achromatic-ledger sheet：底 #f8f8f8、唯一图表色 #1d5fbf、chrome accent = 墨色 */
  assert.match(css, /--ground:#f8f8f8/)
  assert.match(css, /--chart-hue:#1d5fbf/)
  assert.match(css, /--accent:#141414/)
  /* 卡片不得带阴影（扁平分隔靠 1px 边） */
  assert.doesNotMatch(css, /\.card\{[^}]*box-shadow/, '卡片带了阴影')
  /* 主行动用近黑，不用品牌色填充 */
  assert.match(css, /\.btn-primary\{background:var\(--ink\)/)
  /* 导航激活项用中性灰，不用品牌色 */
  assert.match(css, /\.sidebar a\[aria-current="page"\]\{[^}]*background:var\(--active\)/)
  /* 标识：顶栏必须有 SVG mark（不是纯文字品牌） */
  assert.match(read('public/index.html'), /class="mark"/)
  /* 字族：一个 grotesk + 一个等宽（数字）；不得回退到无字体声明 */
  assert.match(css, /--font-sans:/)
  assert.match(css, /--font-mono:/)
})
