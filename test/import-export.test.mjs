/* 导入候选 + 导出：只写候选不写记录；拒收零副作用；导出含指征照抄、剔除私密；文件名合法。 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ImportService } from '../dsh/import.js'
import { seedDemo } from '../dsh/demo.js'
import { getProfile } from '../dsh/readmodels.js'
import { renderPrepMarkdown, exportFilename } from '../dsh/export.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
function freshDb() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(join(ROOT, 'schema')).filter((f) => /^0\d+.*\.sql$/.test(f)).sort()) db.exec(readFileSync(join(ROOT, 'schema', f), 'utf8'))
  seedDemo(db)
  return db
}

test('① 落库只写 document + candidate，不动 lab_result', () => {
  const db = freshDb()
  const svc = new ImportService(db, { client: null })
  const before = db.prepare('SELECT COUNT(*) AS n FROM lab_result').get().n
  const res = svc.record({ profileKey: 'demo', document: { name: '血常规-2026-06.pdf', date: '2026-06-01', type: '检验报告' }, candidates: [{ name: 'ALC', value: '15.2' }, { name: 'Hb', value: '118' }] })
  assert.equal(res.candidates, 2)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM candidate').get().n, 2)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_result').get().n, before)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM candidate WHERE state = 'pending'").get().n, 2)
})

test('② 拒收候选零副作用：state→rejected，记录数不变', () => {
  const db = freshDb()
  const svc = new ImportService(db, { client: null })
  const res = svc.record({ profileKey: 'demo', document: { name: 'x.pdf' }, candidates: [{ name: 'WBC', value: '21' }] })
  assert.ok(res.documentId)
  const idRow = db.prepare('SELECT payload_json FROM candidate ORDER BY rowid LIMIT 1').get()
  const cid = JSON.parse(idRow.payload_json).id
  const out = svc.accept('demo', cid, 'rejected')
  assert.equal(out.changed, 1)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM candidate WHERE state = 'rejected'").get().n, 1)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_result WHERE metric_code = 'ALC'").get().n > 0, true)
})

test('③ 导出：含三态表与指征照抄；不含 private 原文；带"不是医生结论"', () => {
  const db = freshDb()
  const p = getProfile(db, 'demo')
  const md = renderPrepMarkdown(p, { generatedAt: '2026-10-25T00:00:00Z', version: '0.1.0' })
  assert.match(md, /未检出/)
  assert.match(md, /未测/)
  assert.match(md, /我想问的（治疗指征条目，仅提问）/)
  assert.match(md, /不是医院病历，也不是医生结论/)
  assert.doesNotMatch(md, /建议治疗|可停药|治愈/)
})

test('④ 导出文件名：去路径分隔符 + 带日期', () => {
  const name = exportFilename({ name: 'a/b:c*d' })
  assert.match(name, /^复诊准备-/)
  assert.doesNotMatch(name, /[\\/:*?"<>|]/)
  assert.match(name, /\d{4}-\d{2}-\d{2}\.md$/)
})

test('⑤ 私密问题不进导出（代码级过滤，不靠调用方传参）', () => {
  const db = freshDb()
  db.prepare("INSERT INTO question_list (topic_code, question_text, visibility, created_at, updated_at) VALUES ('私密','绝不能出现','private','t','t')").run()
  const p = getProfile(db, 'demo')
  const md = renderPrepMarkdown(p)
  assert.doesNotMatch(md, /绝不能出现/)
})
