/* CLL 导出：复诊准备 markdown。三条硬约束沿用家族：私密不进导出；看法不是结论；只抄不解释（判读词 check-wording 拦）。 */
const LINE = '\n'
const shortDate = (d) => (typeof d === 'string' && d.length >= 10 ? d.slice(5) : String(d ?? '—'))

function table(headers, rows) {
  if (!rows || !rows.length) return ''
  const out = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`]
  for (const r of rows) out.push(`| ${r.map((c) => (c === null || c === undefined || c === '' ? '—' : String(c))).join(' | ')} |`)
  return out.join(LINE)
}
function section(title, body) { return body ? `${LINE}## ${title}${LINE}${LINE}${body}${LINE}` : '' }
const STATE_CN = { detected: '检出', not_detected: '未检出', not_tested: '未测' }

export function exportFilename(profile) {
  return `复诊准备-${(profile?.name ?? '档案').replace(/[\\/:*?"<>|]/g, '')}-${new Date().toISOString().slice(0, 10)}.md`
}

export function renderPrepMarkdown(profile, { generatedAt = null, version = null, excludedPrivate = false } = {}) {
  if (!profile) throw new Error('renderPrepMarkdown 需要一份档案')
  const p = profile
  const out = []
  out.push(`# 复诊准备 · ${p.name ?? '档案'}`)
  out.push('')
  out.push(`- 诊断（照抄）：${p.dx?.name ?? '—'}${p.dx?.date ? ` · ${p.dx.date}` : ''}`)
  if (p.dx?.binet || p.dx?.rai) out.push(`- 分期（双轨照抄）：${[p.dx.binet, p.dx.rai].filter(Boolean).join(' / ')}`)
  out.push('- 本文件由本人从工作台导出，内容为本人记录的抄录，不是医院病历，也不是医生结论。')
  if (generatedAt) out.push(`- 导出时间：${generatedAt}`)
  if (version) out.push(`- 工作台版本：${version}`)

  const metrics = (p.metrics ?? []).filter((m) => (m.points ?? []).length)
  if (metrics.length) {
    out.push(section('最近一次记录（全部指标的最新一点）',
      table(['系列', '指标', '数值', '日期', '累计'], metrics.map((m) => {
        const last = m.points[m.points.length - 1]
        return [m.series, m.title, `${last.v}${m.unit ? ` ${m.unit}` : ''}`, last.d, m.points.length]
      }))))
  }
  if ((p.genes ?? []).length) {
    out.push(section('基因与预后档案（三态照抄）',
      table(['项目', '状态', '报告原文', '日期'], p.genes.map((g) => [g.code, STATE_CN[g.state] ?? g.state, g.text, g.date]))))
  }
  if ((p.mrd ?? []).length) {
    out.push(section('MRD（照抄；测不出 ≠ 体内无细胞）',
      table(['日期', '方法', '结果原文', '灵敏度'], p.mrd.map((m) => [m.d, m.method, m.text, m.sens]))))
  }
  if ((p.meds ?? []).length) {
    out.push(section('口服药与治疗（计划/实际照抄）',
      table(['药物', '类别', '剂量', '开始', '结束', '原因原文'], p.meds.map((m) => [m.name, m.cls, m.dose, m.start, m.end, m.reason]))))
  }
  const ask = (p.criteria ?? []).filter((c) => c.ask)
  if (ask.length) {
    out.push(section('我想问的（治疗指征条目，仅提问）', ask.map((c) => `- [${c.code}] ${c.text}`).join(LINE)))
  }
  const qs = (p.questions ?? []).filter((q) => !q.private)
  if (qs.length) {
    out.push(section('问题清单（零处置建议）', qs.map((q) => `- ${q.q}`).join(LINE)))
  }
  if (excludedPrivate) out.push(section('已剔除', '私密条目（visibility=private）未进入本导出。'))
  return out.join(LINE) + LINE
}
