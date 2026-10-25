/* CLL 读模型：把 schema/0001 的行还原成前端要的形状。
 * 契约：bootstrap 的 demo 档案与 demo/build-demo-data.mjs 同源（test/demo-parity 断言）。
 * 读序一律 ORDER BY rowid（硬纪律）；私密表（question_list.visibility='private'）默认不返回原文。 */
import { AGENT_PANE } from '../lib/layout.js'
import { CRITERIA_TEXT } from './demo.js'

const rows = (db, sql, ...args) => db.prepare(sql).all(...args).map((r) => ({ ...r }))
const SERIES_ORDER = ['hematology', 'biochem', 'molecular', 'physical']
const SERIES_TITLE = { hematology: '血象系列', biochem: '生化系列', molecular: '分子系列', physical: '体格系列' }

function readMetrics(db) {
  /* 数值白名单走 v_metric_trend 的同口径：value_num 非空；分类/文字（MRD、体格）不进折线 */
  const all = rows(db, 'SELECT series, metric_code, metric_title, draw_date, value_num, unit, ref_range_text, lab_name FROM lab_result WHERE in_use = 1 ORDER BY rowid')
  const byKey = new Map()
  for (const r of all) {
    const k = `${r.series}/${r.metric_code}`
    if (!byKey.has(k)) byKey.set(k, { series: r.series, code: r.metric_code, title: r.metric_title, unit: r.unit, ref: r.ref_range_text, points: [] })
    if (r.value_num !== null) byKey.get(k).points.push({ d: r.draw_date, v: r.value_num })
  }
  return [...byKey.values()]
}

function readProfile(db, { includePrivate = false } = {}) {
  const subj = db.prepare('SELECT * FROM subject ORDER BY rowid LIMIT 1').get()
  if (!subj) return null
  const s = { ...subj }
  const dx = { ...(db.prepare('SELECT * FROM dx_profile WHERE in_use = 1 ORDER BY rowid LIMIT 1').get() || {}) }

  const genes = rows(db, 'SELECT gene_code, state, result_text, report_date FROM gene_result WHERE in_use = 1 ORDER BY rowid')
  const mrd = rows(db, 'SELECT test_date, method, value_text, sensitivity_text FROM mrd_result WHERE in_use = 1 ORDER BY rowid')
  const drugs = rows(db, 'SELECT * FROM med_drug WHERE in_use = 1 ORDER BY rowid')
  const periods = rows(db, 'SELECT * FROM med_period WHERE in_use = 1 ORDER BY rowid')
  const criteria = rows(db, 'SELECT criteria_code, ask_flag, source_version FROM criteria_check WHERE in_use = 1 ORDER BY rowid')
  const questions = includePrivate
    ? rows(db, 'SELECT topic_code, question_text, visibility FROM question_list WHERE in_use = 1 ORDER BY rowid')
    : rows(db, "SELECT topic_code, question_text, visibility FROM question_list WHERE in_use = 1 AND visibility = 'normal' ORDER BY rowid")
  const comorb = rows(db, 'SELECT cirs_system_code, entry_text FROM comorbidity WHERE in_use = 1 ORDER BY rowid')
  const comorbMeds = rows(db, 'SELECT name_text, dose_text, purpose_text FROM comorbidity_med WHERE in_use = 1 ORDER BY rowid')
  const ae = rows(db, 'SELECT onset_date, term_text, note_text FROM ae_event WHERE in_use = 1 ORDER BY rowid')

  return {
    profileKey: 'demo',
    name: s.name_text, birthYear: s.birth_year, sex: s.sex, role: s.role,
    dx: { date: dx.dx_date ?? null, name: dx.dx_name_text ?? null, binet: dx.binet_stage_text ?? null, rai: dx.rai_stage_text ?? null, scheme: dx.stage_scheme ?? null },
    seriesOrder: SERIES_ORDER,
    seriesTitles: SERIES_TITLE,
    metrics: readMetrics(db),
    genes: genes.map((g) => ({ code: g.gene_code, state: g.state, text: g.result_text, date: g.report_date ?? null })),
    mrd: mrd.map((m) => ({ d: m.test_date, method: m.method, text: m.value_text, sens: m.sensitivity_text })),
    meds: drugs.map((d) => {
      const p = periods.find((x) => x.drug_id === d.id)
      return { name: d.drug_name, cls: d.class_code, dose: d.dose_text, freq: d.frequency, route: d.route, start: p?.start_date ?? null, end: p?.end_date ?? null, reason: p?.reason_text ?? null }
    }),
    criteria: criteria.map((c) => ({ code: c.criteria_code, text: CRITERIA_TEXT[c.criteria_code], ask: !!c.ask_flag, source: c.source_version })),
    questions: questions.map((q) => ({ topic: q.topic_code, q: q.question_text, private: q.visibility === 'private' })),
    comorbidity: comorb.map((c) => ({ sys: c.cirs_system_code, text: c.entry_text })),
    comorbidityMeds: comorbMeds.map((m) => ({ name: m.name_text, dose: m.dose_text, purpose: m.purpose_text })),
    ae: ae.map((a) => ({ d: a.onset_date, term: a.term_text, note: a.note_text })),
  }
}

export function listSubjects(db) {
  return rows(db, 'SELECT id, name_text, sex, birth_year FROM subject ORDER BY rowid')
}

export function getProfile(db, _key, opts = {}) {
  return readProfile(db, opts)
}

export function bootstrap(db, { version, build } = {}) {
  return { version: version ?? null, build: build ?? null, agentPane: AGENT_PANE, profiles: [getProfile(db, 'demo')].filter(Boolean) }
}
