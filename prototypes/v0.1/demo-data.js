/* jshint browser:true */
/* 小淋宝 LymPal · M2 原型演示数据 v0.1.0（数据唯一源）
   —— app.js 不内嵌任何数据；本文件只读，刷新即回演示态。
   —— 所有人物/数值/机构均为演示虚构；医学文案照抄口径见 docs/SPEC.md 医学约束表。 */
(function () {
  'use strict';

  /* ---------- 档案（演示虚构） ---------- */
  var profile = {
    name: '李慧兰', sex: '女', age: 63,
    dxNameText: '慢性淋巴细胞白血病（CLL，报告照抄）',
    stageText: 'Binet A / Rai 0（分期照抄 2024-11-12 骨髓报告原文，不换算不判进展）',
    dxDate: '2024-11-12', hospital: '市血液病医院（演示虚构）',
    status: '医嘱观察（Watch & Wait）→ 2026-06 起泽布替尼（照抄医嘱原文，产品不推断）',
    recorder: '本人'
  };

  /* ---------- 血常规序列（W&W 18–24 个月 + 治疗后，演示虚构） ---------- */
  /* 数值只抄"报告原文"口径演示；每条带实验室名。 */
  var cbc = [
    { d: '2024-11-12', wbc: 12.4, alc: 4.2, plt: 186, hgb: 128, lab: '市血液病医院检验科' },
    { d: '2025-02-10', wbc: 14.1, alc: 5.6, plt: 178, hgb: 126, lab: '市血液病医院检验科' },
    { d: '2025-05-14', wbc: 16.8, alc: 7.9, plt: 170, hgb: 123, lab: '市血液病医院检验科' },
    { d: '2025-08-12', wbc: 19.6, alc: 10.4, plt: 162, hgb: 120, lab: '市血液病医院检验科' },
    { d: '2025-11-11', wbc: 23.9, alc: 13.8, plt: 154, hgb: 118, lab: '市血液病医院检验科' },
    { d: '2026-02-10', wbc: 28.7, alc: 17.2, plt: 148, hgb: 115, lab: '市血液病医院检验科' },
    { d: '2026-05-12', wbc: 32.1, alc: 19.6, plt: 141, hgb: 112, lab: '市血液病医院检验科' },
    { d: '2026-06-15', wbc: 31.0, alc: 18.9, plt: 143, hgb: 113, lab: '市血液病医院检验科' },
    { d: '2026-08-10', wbc: 24.5, alc: 13.4, plt: 152, hgb: 117, lab: '市血液病医院检验科' },
    { d: '2026-10-09', wbc: 18.2, alc: 8.1, plt: 163, hgb: 121, lab: '市血液病医院检验科' }
  ];

  /* ---------- 生化 ---------- */
  var biochem = [
    { d: '2024-11-12', ldh: 198, b2m: 2.4, alt: 22, crea: 66, lab: '市血液病医院检验科' },
    { d: '2025-05-14', ldh: 212, b2m: 2.7, alt: 25, crea: 68, lab: '市血液病医院检验科' },
    { d: '2025-11-11', ldh: 236, b2m: 3.1, alt: 24, crea: 70, lab: '市血液病医院检验科' },
    { d: '2026-05-12', ldh: 261, b2m: 3.4, alt: 27, crea: 72, lab: '市血液病医院检验科' },
    { d: '2026-10-09', ldh: 224, b2m: 3.0, alt: 31, crea: 74, lab: '市血液病医院检验科' }
  ];

  /* ---------- 分子（MRD 照抄原文；三态：未检出/检出/未测） ---------- */
  var mrd = [
    { d: '2026-07-20', method: '流式（4 色）', raw: '检测到克隆性 B 细胞，占骨髓有核细胞 0.42%', state: '检出', sens: '灵敏度 10⁻⁴', lab: '市血液病医院流式室' },
    { d: '2026-09-28', method: '流式（4 色）', raw: '检测到克隆性 B 细胞，占骨髓有核细胞 0.11%', state: '检出', sens: '灵敏度 10⁻⁴', lab: '市血液病医院流式室' },
    { d: '2024-11-12', method: '未测', raw: '确诊时未做 MRD 检测', state: '未测', sens: '', lab: '' }
  ];
  var mrdSeries = mrd.filter(function (m) { return m.state === '检出'; })
    .map(function (m) { return { d: m.d, v: parseFloat(m.raw.match(/([\d.]+)%/)[1]), lab: m.lab }; });

  /* ---------- 体格（描述性原文，不进折线） ---------- */
  var exam = [
    { d: '2024-11-12', text: '双侧颈部淋巴结多发肿大，最大 2.0×1.2cm；脾肋下未及。', lab: '市血液病医院体格检查' },
    { d: '2025-11-11', text: '颈部淋巴结最大 3.5×2.0cm；脾肋下 2cm。', lab: '市血液病医院体格检查' },
    { d: '2026-05-12', text: '颈部淋巴结最大 4.2×2.4cm；脾肋下 3cm。', lab: '市血液病医院体格检查' },
    { d: '2026-10-09', text: '颈部淋巴结最大 2.6×1.5cm；脾肋下 1cm。', lab: '市血液病医院体格检查' }
  ];

  /* ---------- 基因预后档案（三态） ---------- */
  var gene = [
    { item: 'FISH del(17p)', state: '未检出', d: '2024-11-15', raw: 'del(17p) 阴性（未见 p53 缺失信号）', lab: '市血液病医院细胞遗传室' },
    { item: 'FISH del(11q)', state: '未检出', d: '2024-11-15', raw: 'del(11q) 阴性', lab: '市血液病医院细胞遗传室' },
    { item: 'FISH +12', state: '检出', d: '2024-11-15', raw: '三体 12 阳性（23% 细胞）', lab: '市血液病医院细胞遗传室' },
    { item: 'FISH del(13q)', state: '检出', d: '2024-11-15', raw: 'del(13q) 阳性（58% 细胞）', lab: '市血液病医院细胞遗传室' },
    { item: 'TP53 突变', state: '未测', d: '', raw: '未做 Sanger/NGS 检测', lab: '' },
    { item: 'IGHV 突变状态', state: '未测', d: '', raw: '未检测', lab: '' },
    { item: '复杂核型', state: '未测', d: '', raw: '常规核型未见分裂象，未判定', lab: '市血液病医院细胞遗传室' }
  ];

  /* ---------- 治疗线（计划/实际分列；处方变更为分段事件） ---------- */
  var rxChanges = [
    { d: '2026-06-01', drug: '泽布替尼（演示药名）', dose: '160mg 每日两次', start: '2026-06-01', end: '', reason: '医嘱原文：「淋巴细胞持续升高，启动 BTKi 治疗」', doc: '门诊病历 2026-06-01' },
    { d: '2026-08-20', drug: '泽布替尼（演示药名）', dose: '160mg 每日两次（漏服不补服，照抄药师说明）', start: '2026-08-20', end: '', reason: '医嘱原文：「服药时间调整到早晚八点」', doc: '药师记录 2026-08-20' }
  ];

  var pathway = [
    {
      d: '2024-11 → 2026-05', phase: '观察与等待（Watch & Wait）', text: '确诊后按医嘱每 3 个月复查血常规，未用药。',
      detail: {
        regimen: { summary: '方案', items: [['医嘱', '观察等待，不治疗（照抄医嘱原文）'], ['复查节奏', '每 2–6 个月随访（2025 中国指南 W&W 监测口径，节奏参考非判读线）'], ['计划 vs 实际', '计划每 3 月 → 实际每 3 月，共 7 次']] },
        metrics: { summary: '指标和趋势', items: [['ALC', '4.2 → 19.6 ×10⁹/L（2024-11 → 2026-05）'], ['LDT', '按首末两点只算天数（详见观察与等待页），不判读']] },
        imaging: { summary: '影像/体格发现', items: [['体格', '颈部淋巴结 2.0 → 4.2cm；脾肋下未及 → 3cm（原文照抄）']] },
        ae: { summary: '副作用总结', items: [['记录', '无（该阶段未记录副作用条目）']] },
        support: { summary: '心理/营养措施和效果', items: [['心理', '原话：「等的那年总怕电话响。」（家属代记 2025-03）'], ['营养', '无记录']] }
      }
    },
    {
      d: '2026-06 → 现在', phase: '泽布替尼口服（进行中）', text: '2026-06-01 起每日两次口服，2026-08 服药时间调整一次。',
      detail: {
        regimen: { summary: '方案', items: [['药名/剂量', '泽布替尼 160mg 每日两次（演示药名）'], ['起止', '2026-06-01 起，持续中'], ['计划 vs 实际', '计划持续治疗 → 实际持续中；2026-08-20 服药时间调整（分段事件）']] },
        metrics: { summary: '指标和趋势', items: [['ALC', '18.9 → 8.1 ×10⁹/L（2026-06 → 2026-10）'], ['MRD', '0.42% → 0.11%（照抄流式原文）']] },
        imaging: { summary: '影像/体格发现', items: [['体格', '颈部淋巴结 4.2 → 2.6cm；脾肋下 3 → 1cm（原文照抄）']] },
        ae: { summary: '副作用总结', items: [['瘀青', '2026-06-30 上肢瘀青（BTKi 词表语境，等级原文：轻）'], ['心悸', '2026-08-02 心悸一次（BTKi 词表语境，未就医记录）']] },
        support: { summary: '心理/营养措施和效果', items: [['心理', '原话：「吃药以后反而睡得着了。」（本人 2026-07）'], ['营养', '常规饮食记录，无特殊']] }
      }
    }
  ];

  /* ---------- 服药打卡序列（近 10 周，演示构建） ---------- */
  var checkins = (function () {
    var out = [], d = new Date(2026, 7, 22); /* 2026-08-22 起 60 天 */
    var miss = { 6: 1, 19: 1, 33: 1 }; /* 三个漏服日（漏服不评判） */
    for (var i = 0; i < 60; i++) {
      var day = new Date(d.getTime() + i * 86400000);
      if (day > new Date(2026, 9, 25)) break;
      var iso = day.toISOString().slice(0, 10);
      out.push({ d: iso, state: miss[i] ? '漏服' : '已服' });
    }
    return out;
  })();

  /* ---------- 副作用（词表按当前用药过滤） ---------- */
  var ae = [
    { d: '2026-06-30', term: '皮下瘀青', self: '左上肢两处', drugCtx: 'BTKi', raw: '轻（自评原文）', visibility: 'shared' },
    { d: '2026-08-02', term: '心悸', self: '一次，几分钟', drugCtx: 'BTKi', raw: '未记录等级', visibility: 'shared' },
    { d: '2026-09-10', term: '牙龈出血', self: '刷牙时少量', drugCtx: 'BTKi', raw: '轻（自评原文）', visibility: 'private' }
  ];
  /* 副作用词表：BTKi 与 BCL-2i 两组（只列词不处置） */
  var aeVocab = {
    BTKi: ['出血/瘀青', '感染/发热', '房颤/心悸', '高血压', '腹泻', '肌肉关节痛'],
    'BCL-2i': ['TLS 相关（就诊要问语境）', '中性粒细胞减少', '腹泻', '恶心'],
    withdrawal: ['停药语境：BTKi 中断后的症状原文记录']
  };

  /* ---------- 共病 CIRS（条目照抄）与在用药 ---------- */
  var cirs = [
    { system: '心脏', grade: 1, raw: 'Grade 1（原分级照抄）', d: '2026-08-02' },
    { system: '高血压', grade: 2, raw: 'Grade 2（服氨氯地平）', d: '2025-01-10' },
    { system: '内分泌/代谢', grade: 1, raw: 'Grade 1（甲状腺功能减退，口服左甲状腺素）', d: '2025-01-10' }
  ];
  var conmeds = [
    { drug: '氨氯地平 5mg 每日一次', for: '高血压', d: '2025-01-10' },
    { drug: '左甲状腺素 50μg 每日一次', for: '甲状腺功能减退', d: '2025-01-10' }
  ];

  /* ---------- 治疗指征八条（照抄口径 + 来源版本；零指征满足类勾选） ---------- */
  var indications = [
    '进行性骨髓衰竭：Hb 和/或 Plt 进行性下降（如 Hb <100 g/L 和/或 Plt <100×10⁹/L）',
    '巨脾（左肋缘下 >6 cm）或有症状的/进行性脾肿大',
    '巨块型淋巴结肿大（如最长直径 >10 cm）或有症状的/进行性淋巴结肿大',
    '淋巴细胞进行性增多：2 个月内增多 >50%，或淋巴细胞倍增时间（LDT）<6 个月（初值 <30×10⁹/L 时不能单凭 LDT 作为治疗指征）',
    'CLL 所致器官功能异常（进行性/有症状的结外受累）',
    '自身免疫性血细胞减少（AIHA/ITP）对糖皮质激素反应不佳',
    'B 症状：6 个月内体重下降 ≥10%；ECOG ≥2；发热 >38.0 ℃ 持续 ≥2 周（无感染证据）；盗汗 >1 个月',
    '符合临床试验入组标准（研究者评估适用时）'
  ];
  var indicationSource = '《中国 CLL/SLL 诊断与治疗指南（2025 年版）》（中华血液学杂志 2025;46(2):105-112）治疗指征八条，照抄口径';
  var ldtLimitQuote = '初值<30×10⁹/L 时不能单凭 LDT 作为治疗指征';
  var ldtLimitSrc = '《中国 CLL/SLL 诊断与治疗指南（2025 年版）》';

  /* ---------- 就诊问题清单（勾选"我想问的"生成） ---------- */
  var questions = [
    { q: '我最近两次淋巴细胞是不是比上次多了？要不要紧？', d: '2026-10-01', from: '手工' }
  ];

  /* ---------- 临床试验（演示虚构，8–12 条；三档 + 匹配指数字段） ---------- */
  /* matchFields：用于匹配指数（只算字段重合度）的 7 个字段 */
  var trials = [
    { id: 'T-01', title: 'CLL 一线 BTKi 对比研究（演示虚构）', tier: 'local', fields: { 年龄: '≥18', 诊断: 'CLL/SLL', 'del(17p)/TP53': '任意', IGHV: '任意', '既往 BTKi': '未用过', '基线血象': '记录即可', '体能状态': 'ECOG 0–2' } },
    { id: 'T-02', title: 'del(17p) 队列研究（演示虚构）', tier: 'local', fields: { 年龄: '≥18', 诊断: 'CLL', 'del(17p)/TP53': '需要检出', IGHV: '任意', '既往 BTKi': '任意', '基线血象': '记录即可', '体能状态': 'ECOG 0–1' } },
    { id: 'T-03', title: '经治 CLL 患者 BCL-2i 联合研究（演示虚构）', tier: 'local', fields: { 年龄: '≥65 或不合条件化疗', 诊断: 'CLL/SLL', 'del(17p)/TP53': '任意', IGHV: '任意', '既往 BTKi': '用过', '基线血象': '记录即可', '体能状态': 'ECOG 0–2' } },
    { id: 'T-04', title: '维奈克拉有限疗程研究（演示虚构）', tier: 'local', fields: { 年龄: '≥18', 诊断: 'CLL', 'del(17p)/TP53': '任意', IGHV: '任意', '既往 BTKi': '任意', '基线血象': '记录即可', '体能状态': 'ECOG 0–2' } },
    { id: 'T-05', title: '老年 CLL 支持治疗研究（演示虚构）', tier: 'local', fields: { 年龄: '≥65', 诊断: 'CLL/SLL', 'del(17p)/TP53': '任意', IGHV: '任意', '既往 BTKi': '任意', '基线血象': '记录即可', '体能状态': 'ECOG 0–3' } },
    { id: 'T-06', title: '匹妥布替尼经共价 BTKi 治疗后研究（演示虚构）', tier: 'external', fields: { 年龄: '≥18', 诊断: 'CLL/SLL', 'del(17p)/TP53': '任意', IGHV: '任意', '既往 BTKi': '用过（共价）', '基线血象': '记录即可', '体能状态': 'ECOG 0–2' } },
    { id: 'T-07', title: 'MRD 指导停药研究（演示虚构）', tier: 'external', fields: { 年龄: '≥18', 诊断: 'CLL', 'del(17p)/TP53': '任意', IGHV: '任意', '既往 BTKi': '任意', '基线血象': '记录即可', '体能状态': 'ECOG 0–1' } },
    { id: 'T-08', title: 'CLL 认知与疲劳研究（演示虚构）', tier: 'local', fields: { 年龄: '≥18', 诊断: 'CLL/SLL', 'del(17p)/TP53': '未测也可以', IGHV: '未测也可以', '既往 BTKi': '任意', '基线血象': '未测也可以', '体能状态': '任意' } },
    { id: 'T-09', title: 'IGHV 未突变队列（演示虚构）', tier: 'external', fields: { 年龄: '≥18', 诊断: 'CLL', 'del(17p)/TP53': '任意', IGHV: '需要未突变', '既往 BTKi': '任意', '基线血象': '记录即可', '体能状态': 'ECOG 0–2' } },
    { id: 'T-10', title: 'TP53 突变 CLL 新药研究（演示虚构，规则待确认）', tier: 'pending', fields: { 年龄: '≥18', 诊断: 'CLL', 'del(17p)/TP53': '需要 TP53 检出', IGHV: '任意', '既往 BTKi': '任意', '基线血象': '记录即可', '体能状态': 'ECOG 0–2' } }
  ];
  /* 患者档案字段（匹配输入端；三态照抄） */
  var matchProfile = {
    '年龄': '63',
    '诊断': 'CLL',
    'del(17p)/TP53': 'del(17p) 未检出 / TP53 未测',
    'IGHV': '未测',
    '既往 BTKi': '在用（泽布替尼）',
    '基线血象': '已记录',
    '体能状态': '未记录'
  };

  /* ---------- 资料夹（records/docs） ---------- */
  var docs = [
    { id: 'D-1', name: '血常规报告 2026-10-09.pdf', d: '2026-10-09', kind: '血常规', state: '已核对' },
    { id: 'D-2', name: '流式 MRD 报告 2026-09-28.pdf', d: '2026-09-28', kind: 'MRD', state: '已核对' },
    { id: 'D-3', name: 'FISH 报告 2024-11-15.jpg', d: '2024-11-15', kind: '基因', state: '已核对' },
    { id: 'D-4', name: '门诊病历 2026-06-01.pdf', d: '2026-06-01', kind: '病历', state: '已核对' }
  ];
  /* S1 演示候选：拍/PDF 解析出的待核对项（拒收零副作用） */
  var pendingCandidate = {
    src: '血常规报告_20261022.jpg（拍照导入演示）',
    rows: [
      { d: '2026-10-22', item: 'WBC', val: '16.9', unit: '10⁹/L', lab: '区中心医院检验科（原文）' },
      { d: '2026-10-22', item: '淋巴细胞绝对值', val: '7.4', unit: '10⁹/L', lab: '区中心医院检验科（原文）' },
      { d: '2026-10-22', item: '血小板', val: '166', unit: '10⁹/L', lab: '区中心医院检验科（原文）' },
      { d: '2026-10-22', item: '血红蛋白', val: '122', unit: 'g/L', lab: '区中心医院检验科（原文）' }
    ]
  };

  /* ---------- 心理（私密条目） ---------- */
  var mood = [
    { d: '2026-09-18', note: '原话：「夜里翻病友群，越看越睡不着。」', visibility: 'private' },
    { d: '2026-10-12', note: '原话：「复诊前两天总是心神不宁。」', visibility: 'private' }
  ];

  /* ---------- MRD 词表 / 基因词表（只解释词义） ---------- */
  var mrdVocab = [
    ['MRD', '微小残留病：流式或 NGS 能检出的最低水平白血病细胞（词义，照抄口径）。'],
    ['测不出 ≠ 体内无细胞', '事实陈述：MRD 检测有灵敏度下限（10⁻⁴～10⁻⁶），测不出只代表低于该次方法的检出限。']
  ];
  var geneVocab = [
    ['del(17p)/TP53', '17 号染色体短臂缺失 / TP53 基因突变：与用药线和研究入组相关（只解释词义，不给结论）。'],
    ['IGHV 突变状态', '免疫球蛋白重链可变区突变状态：预后档案字段之一（只解释词义）。'],
    ['三态', '未检出 / 检出 / 未测——三种状态严格区分，未测不等于未检出。']
  ];

  /* ---------- 指标目录（四系列；分类不进折线） ---------- */
  var SERIES_ORDER = ['血象', '生化', '分子', '体格'];
  var seriesNote = {
    '血象': '白细胞、淋巴细胞（ALC）、血小板、血红蛋白。参考区间以报告单实验室区间为唯一显示口径（WBC/Hb/Plt 引 WS/T 405-2012；ALC 无全国统一文件）。',
    '生化': 'LDH、β2-MG、肝肾功能。ALC/LDH/β2-MG 无全国统一参考区间文件，逐条以报告单原文为准。',
    '分子': 'MRD（流式/NGS，敏感度 10⁻⁴～10⁻⁶）。分类状态不进折线。',
    '体格': '淋巴结与脾脏评估描述原文。描述性内容，不画折线。'
  };

  window.LYMPAL_DEMO = {
    version: 'v0.1.0', buildDate: '2026-10-25',
    profile: profile, cbc: cbc, biochem: biochem, mrd: mrd, mrdSeries: mrdSeries, exam: exam,
    gene: gene, rxChanges: rxChanges, pathway: pathway, checkins: checkins, ae: ae, aeVocab: aeVocab,
    cirs: cirs, conmeds: conmeds, indications: indications, indicationSource: indicationSource,
    ldtLimitQuote: ldtLimitQuote, ldtLimitSrc: ldtLimitSrc, questions: questions,
    trials: trials, matchProfile: matchProfile, docs: docs, pendingCandidate: pendingCandidate,
    mood: mood, mrdVocab: mrdVocab, geneVocab: geneVocab,
    SERIES_ORDER: SERIES_ORDER, seriesNote: seriesNote
  };
})();
