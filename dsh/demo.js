/* CLL 演示数据播种：唯一数据源 demo/build-demo-data.mjs。
 * 幂等（subject 有行即跳过）、单事务、显式列名。写入 cll schema/0001 的表。 */
import { buildDemoProfiles } from '../demo/build-demo-data.mjs'

export const CRITERIA_TEXT = {
  'T3-1': '进行性骨髓衰竭：Hb 和/或 Plt 进行性下降（如 Hb <100 g/L 和/或 Plt <100×10⁹/L）',
  'T3-2': '巨脾（左肋缘下 >6 cm）或有症状的/进行性脾肿大',
  'T3-3': '巨块型淋巴结肿大（如最长直径 >10 cm）或有症状的/进行性淋巴结肿大',
  'T3-4': '淋巴细胞进行性增多：2 个月内增多 >50%，或淋巴细胞倍增时间（LDT）<6 个月（初值 <30×10⁹/L 时不能单凭 LDT 作为治疗指征）',
  'T3-5': 'CLL 所致器官功能异常（进行性/有症状的结外受累）',
  'T3-6': '自身免疫性血细胞减少（AIHA/ITP）对糖皮质激素反应不佳',
  'T3-7': 'B 症状：6 个月内体重下降 ≥10%；ECOG ≥2；发热 >38.0 ℃ 持续 ≥2 周（无感染证据）；盗汗 >1 个月',
  'T3-8': '符合临床试验入组标准（研究者评估适用时）',
}

export function seedDemo(db, input) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('seedDemo 需要一个已打开的数据库')
  const data = input || buildDemoProfiles()
  const already = db.prepare('SELECT COUNT(*) AS n FROM subject').get().n
  if (already > 0) return { skipped: true, rows: 0 }

  const now = new Date().toISOString()
  let rows = 0
  db.exec('BEGIN')
  try {
    const t = (v) => (v === undefined ? null : v)
    db.prepare('INSERT INTO subject (name_text, birth_year, sex, role, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run(data.subject.name, data.subject.birthYear, data.subject.sex, data.subject.role, now, now)
    rows++

    db.prepare('INSERT INTO dx_profile (dx_date, dx_name_text, binet_stage_text, rai_stage_text, stage_source_text, stage_scheme, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(data.dx.date, data.dx.name, data.dx.binet, data.dx.rai, null, data.dx.scheme, now, now)
    rows++

    const insLab = db.prepare('INSERT INTO lab_result (draw_date, series, metric_code, metric_title, value_num, unit, ref_range_text, lab_name, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    for (const l of data.labs) { insLab.run(l.d, l.series, l.code, l.title, l.v, l.unit, '报告单实验室区间为准', '市一医院检验科', now, now); rows++ }

    const insMrd = db.prepare('INSERT INTO mrd_result (test_date, method, value_text, sensitivity_text, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    for (const m of data.mrd) { insMrd.run(m.d, m.method, m.text, m.sens, now, now); rows++ }

    const insGene = db.prepare('INSERT INTO gene_result (gene_code, state, result_text, report_date, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    for (let i = 0; i < data.genes.length; i++) { const g = data.genes[i]; insGene.run(g[0], g[2], g[3], i < 3 ? '2024-03-12' : null, now, now); rows++ }

    const insDrug = db.prepare('INSERT INTO med_drug (drug_name, generic_name, class_code, dose_text, frequency, route, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')
    const insPeriod = db.prepare('INSERT INTO med_period (drug_id, start_date, end_date, change_kind, reason_text, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
    for (const m of data.meds) {
      insDrug.run(m.name, null, m.cls === 'BTKi' ? 'BTKi' : 'anti_CD20', m.dose, m.freq, m.name.includes('单抗') ? '静脉' : '口服', now, now); rows++
      const drugId = db.prepare('SELECT last_insert_rowid() AS id').get().id
      insPeriod.run(drugId, m.start, t(m.end), 'start', m.name.includes('泽布') ? '医嘱原文：符合治疗指征，开始 BTKi（凭据：门诊病历照片）' : null, now, now); rows++
    }

    const insCrit = db.prepare('INSERT INTO criteria_check (criteria_code, criteria_text, ask_flag, source_version, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    for (const [code, text] of Object.entries(CRITERIA_TEXT)) {
      insCrit.run(code, text, data.criteriaAsk.includes(Number(code.slice(3))) ? 1 : 0, '中国 CLL/SLL 诊断与治疗指南（2025 年版）', now, now); rows++
    }

    const insQ = db.prepare('INSERT INTO question_list (topic_code, question_text, source_version, visibility, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    for (const q of data.questions) { insQ.run(q.topic, q.q, null, 'normal', now, now); rows++ }

    db.exec('COMMIT')
    return { skipped: false, rows }
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function hasDemoData(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM subject').get().n > 0
}
