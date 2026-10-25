/* CLL 演示数据唯一生成器：seedDemo（入库）与原型 demo-data.js 同源。
 * 虚构人物"示例·林"，非真实患者；数值仅作交互演示。三态：detected/not_detected/not_tested。 */
export const PROFILE_KEY = 'demo'

const CBC = [
  ['2024-11-12', 12.4, 4.2, 186, 128], ['2025-02-10', 14.1, 5.6, 178, 126], ['2025-05-14', 16.8, 7.9, 170, 123],
  ['2025-08-12', 19.6, 10.4, 162, 120], ['2025-11-11', 23.9, 13.8, 154, 118], ['2026-02-10', 28.7, 17.2, 148, 115],
  ['2026-05-12', 32.1, 19.6, 141, 112], ['2026-06-15', 31.0, 18.9, 143, 113], ['2026-08-10', 24.5, 13.4, 152, 117],
  ['2026-10-09', 18.2, 8.1, 163, 121],
]
const BIO = [
  ['2024-11-12', 198, 2.4], ['2025-05-14', 212, 2.7], ['2025-11-11', 236, 3.1], ['2026-05-12', 261, 3.4], ['2026-10-09', 224, 3.0],
]

export function buildDemoProfiles() {
  const labs = []
  for (const [d, wbc, alc, plt, hb] of CBC) {
    labs.push({ d, series: 'hematology', code: 'WBC', title: '白细胞计数', v: wbc, unit: '×10⁹/L' })
    labs.push({ d, series: 'hematology', code: 'ALC', title: '淋巴细胞绝对值', v: alc, unit: '×10⁹/L' })
    labs.push({ d, series: 'hematology', code: 'PLT', title: '血小板计数', v: plt, unit: '×10⁹/L' })
    labs.push({ d, series: 'hematology', code: 'HB', title: '血红蛋白', v: hb, unit: 'g/L' })
  }
  for (const [d, ldh, b2m] of BIO) {
    labs.push({ d, series: 'biochem', code: 'LDH', title: '乳酸脱氢酶', v: ldh, unit: 'U/L' })
    labs.push({ d, series: 'biochem', code: 'B2M', title: 'β2-微球蛋白', v: b2m, unit: 'mg/L' })
  }
  const mrd = [
    { d: '2026-06-20', method: 'flow', text: '10⁻⁴ 灵敏度下检出，0.012%', sens: '10⁻⁴' },
    { d: '2026-09-15', method: 'flow', text: '10⁻⁴ 灵敏度下未检出', sens: '10⁻⁴' },
  ]
  const genes = [
    ['del17p', 'del(17p)（FISH）', 'not_detected', '未检出（2024-11 报告原文）'],
    ['del11q', 'del(11q)（FISH）', 'not_detected', '未检出（2024-11 报告原文）'],
    ['trisomy12', '+12（FISH）', 'detected', '检出（三体 12 阳性，23% 细胞，2024-11 报告原文）'],
    ['del13q', 'del(13q)（FISH）', 'not_tested', '未测'],
    ['TP53', 'TP53 突变', 'not_tested', '未测'],
    ['IGHV', 'IGHV 突变状态', 'not_tested', '未测（下次就诊想问）'],
    ['complex_karyotype', '复杂核型', 'not_tested', '未测'],
  ]
  const meds = [
    { id: 1, name: '泽布替尼', cls: 'BTKi', dose: '160 mg 每日两次', freq: 'daily', start: '2026-06-01', end: null },
    { id: 2, name: '奥妥珠单抗', cls: '抗 CD20', dose: '静脉输注', freq: 'intermittent', start: '2026-06-01', end: '2026-09-30' },
  ]
  return {
    profileKey: PROFILE_KEY,
    subject: { name: '示例·林', birthYear: 1963, sex: '女', role: 'self' },
    dx: { date: '2024-11-12', name: 'CLL', binet: 'A（报告原文照抄）', rai: '0 期（报告原文照抄）', scheme: 'Binet 1977 / Rai 1975（照抄来源：2025 中国 CLL/SLL 指南）' },
    labs, mrd, genes, meds,
    criteriaAsk: [3, 6], // 勾选"我想问的"条目（1-based），不代表满足
    questions: [
      { topic: '指标', q: '我的淋巴细胞一直在慢慢涨，按目前的节奏多久复查一次合适？' },
      { topic: '基因', q: '我还没查 TP53 和 IGHV，需要什么时间点查？' },
      { topic: '用药', q: '皮下瘀点和心悸与现在的药有关吗？要做什么检查？' },
    ],
    events: [
      ['2024-03-12', '确诊 CLL（Binet A / Rai 0，报告照抄）'],
      ['2024-03-12', '进入观察与等待（医嘱：每 3 个月血常规）'],
      ['2025-05-02', '开始口服泽布替尼（医嘱原文照抄）'],
      ['2025-12-20', 'MRD：10⁻⁴ 灵敏度下未检出（报告原文）'],
    ],
  }
}
