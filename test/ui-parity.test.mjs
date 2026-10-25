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

test('⑤b 安装版不得残留演示 AI 会话框（无自绘输入框/发送按钮）', () => {
  const html = read('public/index.html')
  assert.doesNotMatch(html, /id="aiPrompt"/, '仍有演示输入框')
  assert.doesNotMatch(html, /id="agentLog"/, '仍有演示日志区')
  assert.doesNotMatch(html, /data-act="ai-send"/, '仍有假发送按钮')
  /* 必须留出宿主原生会话的挂载点 */
  assert.match(html, /id="agent-mount"/)
  /* 独立打开时如实说明，而不是显示一个假聊天框 */
  assert.match(html, /id="agent-standalone"/)
})

test('⑥ index.html 只差版本占位与数据源引用', () => {
  const strip = (h) => h.replace(/v0\.\d+\.\d+/g, 'vX').replace(/\s+/g, '')
  assert.equal(strip(read('public/index.html')), strip(read('prototypes/v0.1/index.html')))
})
