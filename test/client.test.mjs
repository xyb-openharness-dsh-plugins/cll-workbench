/* client 合同：必须 ModuleLoader 包装、含 register 描述符、标题/仓库/customFrame、Panel 四件与面板参数在界内。 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const client = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const layout = readFileSync(new URL('../lib/layout.js', import.meta.url), 'utf8')

test('① 是 ModuleLoader.load 包装的普通脚本（不是 ESM）', () => {
  assert.match(client, /__ModuleLoader__\.load\(/)
  assert.doesNotMatch(client, /^\s*export\s/m)
})

test('② 标识：包名/仓库/标题', () => {
  assert.match(client, /@xyb-community\/cll-workbench/)
  assert.match(client, /github\.com\/xyb-openharness-dsh-plugins\/cll-workbench/)
  assert.match(client, /小淋宝 LymPal/)
})

test('③ customFrame 与面板参数：left / 0.65 / 会话 25%–45% 默认 35%', () => {
  assert.match(client, /customFrame:\s*CUSTOM_FRAME/)
  const cf = client.match(/const CUSTOM_FRAME = '?(true|false)'?/)
  assert.ok(cf, 'CUSTOM_FRAME 不是字面量')
  assert.equal(cf[1], 'true')
  assert.match(client, /const BUSINESS_SIDE = 'left'/)
  assert.match(client, /const BUSINESS_WIDTH = Number\('0\.65'\)/)
  assert.match(layout, /min:\s*0\.25/)
  assert.match(layout, /max:\s*0\.45/)
  assert.match(layout, /def:\s*0\.35|default:\s*0\.35/)
})

test('④ Panel：自绘 header + 业务 iframe + 会话 aside + splitter', () => {
  assert.match(client, /<header/)
  assert.match(client, /iframe/)
  assert.match(client, /role="separator"|role:\s*'separator'/)
  assert.match(client, /aria-valuenow/)
})

test('⑤ 三出口代码级过滤与 agent-draft 命名空间', () => {
  const pub = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8')
  assert.match(pub, /filterPrivate/)
  assert.match(pub, /visibility/)
  assert.match(client, /cll:agent-draft/)
})
