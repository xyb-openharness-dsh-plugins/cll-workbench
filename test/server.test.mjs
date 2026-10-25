/* 服务契约：/health 鉴权、bootstrap 形状、profile 私密闸、export 私密剔除、命名空间前缀。 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApiHandler, API_PREFIX } from '../dsh/routes.js'
import { seedDemo } from '../dsh/demo.js'
import { bootstrap, getProfile } from '../dsh/readmodels.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
function freshDb() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(join(ROOT, 'schema')).filter((f) => /^0\d+.*\.sql$/.test(f)).sort()) db.exec(readFileSync(join(ROOT, 'schema', f), 'utf8'))
  seedDemo(db)
  return db
}
async function withServer(source, fn) {
  const api = createApiHandler({ source, version: '0.1.0', build: '2026-10-25', serveUi: (req, res) => { res.writeHead(200); res.end('ui') }, failure: null })
  const srv = createServer((req, res) => api(req, res))
  await new Promise((r) => srv.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${srv.address().port}`
  try { return await fn(base) } finally { await new Promise((r) => srv.close(r)) }
}

test('① 前缀命名空间：/api/cll（不是 cervical）', () => {
  assert.equal(API_PREFIX, '/api/cll')
})

test('② bootstrap 200 且含 demo 档案', async () => {
  const db = freshDb()
  await withServer({ db, bootstrap: () => bootstrap(db, { version: '0.1.0' }), profile: (k, o) => getProfile(db, k, o) }, async (base) => {
    const r = await fetch(`${base}${API_PREFIX}/bootstrap`)
    assert.equal(r.status, 200)
    const j = await r.json()
    assert.equal(j.profiles[0].name, '示例·林')
  })
})

test('③ profile 私密：默认不含 private 问题，private=1 才含', async () => {
  const db = freshDb()
  db.prepare("INSERT INTO question_list (topic_code, question_text, visibility, created_at, updated_at) VALUES ('私密','这是一条私密问题','private','t','t')").run()
  await withServer({ db, bootstrap: () => bootstrap(db), profile: (k, o) => getProfile(db, k, o) }, async (base) => {
    const pub = await (await fetch(`${base}${API_PREFIX}/profile/demo`)).json()
    assert.equal(pub.profile.questions.some((q) => q.private), false)
    const priv = await (await fetch(`${base}${API_PREFIX}/profile/demo?private=1`)).json()
    assert.equal(priv.profile.questions.some((q) => q.private), true)
  })
})

test('④ export markdown：含三态/指征照抄，不含私密问题原文', async () => {
  const db = freshDb()
  db.prepare("INSERT INTO question_list (topic_code, question_text, visibility, created_at, updated_at) VALUES ('私密','这句不该出现在导出里','private','t','t')").run()
  await withServer({ db, bootstrap: () => bootstrap(db), profile: (k, o) => getProfile(db, k, o) }, async (base) => {
    const r = await fetch(`${base}${API_PREFIX}/export/demo.md`)
    assert.equal(r.status, 200)
    const md = await r.text()
    assert.match(md, /基因与预后档案/)
    assert.match(md, /测不出 ≠ 体内无细胞/)
    assert.doesNotMatch(md, /这句不该出现在导出里/)
  })
})

test('⑤ 未知路径 404、方法不符 405', async () => {
  const db = freshDb()
  await withServer({ db, bootstrap: () => bootstrap(db), profile: () => null }, async (base) => {
    assert.equal((await fetch(`${base}${API_PREFIX}/nope`)).status, 404)
    assert.equal((await fetch(`${base}${API_PREFIX}/bootstrap`, { method: 'POST' })).status, 405)
  })
})
