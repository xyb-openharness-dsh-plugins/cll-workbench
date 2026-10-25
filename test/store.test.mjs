/* store：开库→迁移→seedDemo→读模型。断言 CLL schema（19 表）+ 演示数据同源 + 判读列零命中。 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedDemo } from '../dsh/demo.js'
import { buildDemoProfiles } from '../demo/build-demo-data.mjs'
import { bootstrap, getProfile } from '../dsh/readmodels.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SCHEMA = join(ROOT, 'schema')

function freshDb() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(SCHEMA).filter((f) => /^0\d+.*\.sql$/.test(f)).sort()) db.exec(readFileSync(join(SCHEMA, f), 'utf8'))
  return db
}

test('① 迁移顺序执行成功，19 张业务表齐', () => {
  const db = freshDb()
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((r) => r.name)
  for (const t of ['subject','document','candidate','dx_profile','criteria_check','lab_result','ldt_note','gene_result','mrd_result','med_drug','med_period','med_log','ae_event','comorbidity','comorbidity_med','question_list','visit_prep','guideline_ref','settings']) {
    assert.ok(tables.includes(t), `缺表 ${t}`)
  }
  assert.equal(tables.length, 19)
})

test('② 判读列禁词在任何表里都不存在', () => {
  const db = freshDb()
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
  for (const { name } of tables) {
    for (const col of db.prepare(`PRAGMA table_info(${name})`).all()) {
      assert.doesNotMatch(col.name, /diagnosis|risk_level|prognosis|recommendation|severity/i, `${name}.${col.name}`)
    }
  }
})

test('③ seedDemo 幂等：第二次跳过且行数不变', () => {
  const db = freshDb()
  const first = seedDemo(db)
  assert.equal(first.skipped, false)
  assert.ok(first.rows > 0)
  const n1 = db.prepare('SELECT COUNT(*) AS n FROM lab_result').get().n
  const second = seedDemo(db)
  assert.equal(second.skipped, true)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_result').get().n, n1)
})

test('④ 演示数据同源：库里 ALC 点数 = 生成器 ALC 点数', () => {
  const db = freshDb()
  seedDemo(db)
  const demo = buildDemoProfiles()
  const expected = demo.labs.filter((l) => l.code === 'ALC').length
  const got = db.prepare("SELECT COUNT(*) AS n FROM lab_result WHERE metric_code = 'ALC' AND value_num IS NOT NULL").get().n
  assert.equal(got, expected)
})

test('⑤ 读模型：三态基因与治疗指征八条照抄，判读列返回空', () => {
  const db = freshDb()
  seedDemo(db)
  const p = getProfile(db, 'demo')
  assert.equal(p.genes.length, 7)
  assert.deepEqual(new Set(p.genes.map((g) => g.state)), new Set(['detected','not_detected','not_tested']))
  assert.equal(p.criteria.length, 8)
  assert.match(p.criteria[3].text, /初值 <30×10⁹\/L 时不能单凭 LDT 作为治疗指征/)
  assert.equal('risk_level' in p, false)
})

test('⑥ bootstrap 带 agentPane 与版本', () => {
  const db = freshDb(); seedDemo(db)
  const b = bootstrap(db, { version: '0.1.0', build: '2026-10-25' })
  assert.equal(b.version, '0.1.0')
  assert.ok(b.agentPane)
  assert.equal(b.profiles.length, 1)
})
