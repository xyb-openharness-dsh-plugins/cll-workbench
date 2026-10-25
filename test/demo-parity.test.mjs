/* demo 同源：demo/build-demo-data.mjs（唯一源）→ seed 入库 → readmodels 读回，
 * 与原型 prototypes/v0.1/demo-data.js 的关键数值一致（ALC 序列、基因三态、指征八条、药物）。 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDemoProfiles } from '../demo/build-demo-data.mjs'
import { seedDemo } from '../dsh/demo.js'
import { getProfile } from '../dsh/readmodels.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
function freshDb() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(join(ROOT, 'schema')).filter((f) => /^0\d+.*\.sql$/.test(f)).sort()) db.exec(readFileSync(join(ROOT, 'schema', f), 'utf8'))
  seedDemo(db)
  return db
}

test('① ALC 序列：生成器 == 库（逐点）', () => {
  const db = freshDb()
  const gen = buildDemoProfiles().labs.filter((l) => l.code === 'ALC').map((l) => [l.d, l.v])
  const p = getProfile(db, 'demo')
  const alc = p.metrics.find((m) => m.code === 'ALC')
  assert.deepEqual(alc.points.map((x) => [x.d, x.v]), gen)
})

test('② 四系列齐全且有序（hematology→biochem→molecular→physical）', () => {
  const p = getProfile(freshDb(), 'demo')
  assert.deepEqual(p.seriesOrder, ['hematology', 'biochem', 'molecular', 'physical'])
  const series = p.metrics.map((m) => m.series)
  const firstIdx = (s) => series.indexOf(s)
  assert.ok(firstIdx('hematology') < firstIdx('biochem'))
})

test('③ 基因三态各至少一条；未测 ≠ 未检出', () => {
  const p = getProfile(freshDb(), 'demo')
  const states = p.genes.map((g) => g.state)
  assert.ok(states.includes('detected') && states.includes('not_detected') && states.includes('not_tested'))
  const igvh = p.genes.find((g) => g.code === 'IGHV')
  assert.equal(igvh.state, 'not_tested')
})

test('④ 原型 demo-data.js 与生成器同源（ALC 首末值一致）', () => {
  const code = readFileSync(join(ROOT, 'prototypes/v0.1/demo-data.js'), 'utf8')
  const sandbox = { window: {} }
  new Function('window', code)(sandbox.window)
  const D = sandbox.window.LYMPAL_DEMO
  assert.ok(D, '原型没有 window.LYMPAL_DEMO')
  const gen = buildDemoProfiles().labs.filter((l) => l.code === 'ALC')
  const protoAlc = D.cbc.map((r) => [r.d, r.alc])
  assert.equal(protoAlc.length, gen.length, 'ALC 点数不一致（原型与生成器各说一套）')
  assert.deepEqual(protoAlc, gen.map((l) => [l.d, l.v]), 'ALC 序列（日期+值）不一致')
})

test('⑤ 药物三要素：药名/剂量/频次；处方变更带原因原文', () => {
  const p = getProfile(freshDb(), 'demo')
  const zeb = p.meds.find((m) => m.name === '泽布替尼')
  assert.equal(zeb.dose, '160 mg 每日两次')
  assert.equal(zeb.freq, 'daily')
  assert.match(zeb.reason, /医嘱原文/)
})

test('⑥ MRD 原文照抄且带灵敏度（不写判读）', () => {
  const p = getProfile(freshDb(), 'demo')
  assert.equal(p.mrd.length, 2)
  for (const m of p.mrd) {
    assert.ok(m.sens, '缺灵敏度')
    assert.doesNotMatch(m.text, /达标|治愈|深度缓解/)
  }
})
