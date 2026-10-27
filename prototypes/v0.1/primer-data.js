/* 36 号 · 疾病概要数据 · 小淋宝 LymPal（CLL/SLL）
 * 四段固定顺序：definition → evidence → landscape → trend（36 号 §2.1）。
 * 内容来源：本仓 README 的「疾病概要」段、docs/SPEC.md 医学约束、research/medical-cll-10-topics.md。
 * 只做事实与原文整理，不写判定、不复制指南条文、不编 URL。
 * 链接逐条经 primer-backfill-2026-10-27/verify-links.mjs 验活，2026-10-27。
 */
window.DISEASE_PRIMER = {
  brand: '小淋宝 LymPal',
  name: '慢性淋巴细胞白血病 / 小淋巴细胞淋巴瘤',
  en: 'Chronic Lymphocytic Leukemia / Small Lymphocytic Lymphoma（CLL/SLL）',
  updated: '2026-10-27',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '慢性淋巴细胞白血病 / 小淋巴细胞淋巴瘤（CLL/SLL）是同一疾病的不同表现：外周血单克隆 B 淋巴细胞持续增多；'
        + '部分人以淋巴结和（或）脾、肝肿大为主要表现。本段只做事实整理，不含对你个人情况的判断。',
      points: [
        'CLL 诊断口径（本仓采用的 2025 中国指南 / iwCLL 口径）：外周血单克隆 B 淋巴细胞 ≥5×10⁹/L 持续 ≥3 个月；血涂片以成熟小淋巴细胞为主、涂抹细胞增多；流式免疫表型符合 CLL 特征。',
        'SLL：淋巴结和（或）脾、肝肿大，外周血单克隆 B 细胞 <5×10⁹/L；确诊依赖病理组织学及免疫组化。',
        'MBL（单克隆 B 淋巴细胞增多症）：外周血克隆性 B 细胞 <5×10⁹/L，无淋巴结肿大、无肝脾肿大、无疾病相关血细胞减少；属于前驱状态。',
        '分期常用 Binet / Rai 两套口径；免疫性血细胞减少不计入分期（2025 中国指南表 1 口径）。'
      ],
      sources: [
        {
          org: '中华医学会血液学分会等',
          doc: '中国慢性淋巴细胞白血病/小淋巴细胞淋巴瘤的诊断与治疗指南（2025 年版）',
          version: '2025（中华血液学杂志 2025;46(2):105-112）',
          nolink: true,
          note: 'PMC 全文（PMC11951213）与 DOI 在验链脚本中返回 203/THIN，本轮未取得可验证原件；本台仅依据公开摘要与本仓既有调研记录'
        },
        {
          org: 'iwCLL',
          doc: 'Guidelines for the diagnosis and treatment of chronic lymphocytic leukemia（International Workshop on CLL）',
          version: '2008（Blood 2008;111(12):5446-5456）',
          original: true,
          kind: 'fulltext',
          url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2972576/'
        },
        {
          org: 'NCI',
          doc: 'Chronic Lymphocytic Leukemia Treatment (PDQ®)',
          version: '持续更新（更新日期以页面为准）',
          original: true,
          kind: 'fulltext',
          url: 'https://www.cancer.gov/types/leukemia/hp/cll-treatment-pdq'
        }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '这个工作台里出现的「该查什么、怎么分期、治疗指征有哪些」，都尽量追到下面某一份文件。'
        + '没有取得可点开原件的行，在表里如实标出来，不假装看过。',
      table: {
        head: ['机构', '文件', '版本 / 年份', '原件', '本台的用途'],
        rows: [
          [
            'NCCN',
            'NCCN Guidelines · Chronic Lymphocytic Leukemia/Small Lymphocytic Lymphoma',
            'V2.2027（2026-10-27 官方指南详情页显示）',
            {
              text: '官方入口 · 临床版全文需自行注册',
              kind: 'hub',
              url: 'https://www.nccn.org/guidelines/nccn-guidelines/guidelines-detail?category=1&id=1478',
              note: '临床版全文需在 NCCN 官网注册后取得；本台未取得该版原件'
            },
            '治疗路径与随访节奏的并列参照（本台不复制条文）'
          ],
          [
            'iwCLL',
            'Guidelines for the diagnosis and treatment of chronic lymphocytic leukemia',
            '2008（Blood 2008;111(12):5446-5456）',
            {
              text: '已取得：PMC 全文',
              kind: 'fulltext',
              url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2972576/'
            },
            '诊断与疗效标准的经典口径'
          ],
          [
            '中华医学会血液学分会等',
            '中国慢性淋巴细胞白血病/小淋巴细胞淋巴瘤的诊断与治疗指南（2025 年版）',
            '2025（中华血液学杂志 2025;46(2):105-112）',
            {
              text: '未取得可验证原件',
              nolink: true,
              note: 'PMC 全文（PMC11951213）与 DOI 在验链脚本中返回 203/THIN，未取得可验证原件；本台仅依据公开摘要与本仓既有调研记录，不引用条文'
            },
            '诊断标准、分期、治疗指征与预后因素的口径'
          ],
          [
            'NCI',
            'Chronic Lymphocytic Leukemia Treatment (PDQ®)',
            '持续更新（更新日期以页面为准）',
            {
              text: '已取得：NCI PDQ 全文页',
              kind: 'fulltext',
              url: 'https://www.cancer.gov/types/leukemia/hp/cll-treatment-pdq'
            },
            '公开、可免费阅读的英文综述性资料'
          ]
        ]
      },
      points: [
        '指南给的是「通常怎么做」，不是「你该怎么做」。版本号必须写清：同一份指南隔一年，条目会变。',
        '本台对未取得可验证原件的文件只记「存在」与「大致讲什么」，不引用其具体条文。'
      ],
      sources: [
        {
          org: 'NCCN',
          doc: 'NCCN Guidelines · Chronic Lymphocytic Leukemia/Small Lymphocytic Lymphoma',
          version: 'V2.2027',
          entry: true,
          kind: 'hub',
          url: 'https://www.nccn.org/guidelines/nccn-guidelines/guidelines-detail?category=1&id=1478',
          note: '临床版全文需在 NCCN 官网注册后取得；本台未取得该版原件'
        },
        {
          org: 'iwCLL',
          doc: 'Guidelines for the diagnosis and treatment of chronic lymphocytic leukemia',
          version: '2008',
          original: true,
          kind: 'fulltext',
          url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2972576/',
          page: '页码待核'
        },
        {
          org: '中华医学会血液学分会等',
          doc: '中国慢性淋巴细胞白血病/小淋巴细胞淋巴瘤的诊断与治疗指南（2025 年版）',
          version: '2025',
          nolink: true,
          note: 'PMC 全文与 DOI 在验链脚本中返回 203/THIN，未取得可验证原件'
        },
        {
          org: 'NCI',
          doc: 'Chronic Lymphocytic Leukemia Treatment (PDQ®)',
          version: '持续更新',
          original: true,
          kind: 'fulltext',
          url: 'https://www.cancer.gov/types/leukemia/hp/cll-treatment-pdq'
        }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '下面按「观察 / 一线 / 特定基因情形」列出 2025 中国指南提到的治疗手段类别。'
        + '这是「指南里有哪些办法」的地图，不是给你排的先后顺序。',
      groups: [
        {
          label: '观察与等待（不符合治疗指征时）',
          points: [
            '每 2–6 个月随访 1 次（2025 中国指南随访口径）；是否开始治疗，按指南列出的治疗指征逐条评估。'
          ]
        },
        {
          label: '一线治疗（指南列举的药物类别）',
          points: [
            'BTK 抑制剂持续治疗：泽布替尼、伊布替尼、阿可替尼±奥妥珠单抗、奥布替尼。',
            'BCL-2 抑制剂±抗 CD20（有限疗程）：维奈克拉+奥妥珠单抗；伊布替尼+维奈克拉。',
            '化学免疫治疗（限适合人群）：FCR（IGHV 突变且 <60 岁）、BR（IGHV 突变且 ≥60 岁）、苯丁酸氮芥+利妥昔/奥妥珠单抗（状态欠佳者）。'
          ]
        },
        {
          label: '特定基因情形',
          points: [
            '伴 del(17p)/TP53 突变：2025 中国指南在该情形下列出泽布替尼、伊布替尼（原文口径，本台不作排序）。',
            '共价 BTK 抑制剂之后：指南收录非共价 BTK 抑制剂匹妥布替尼（pirtobrutinib）。'
          ]
        }
      ],
      points: [
        '以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。'
      ],
      sources: [
        {
          org: '中华医学会血液学分会等',
          doc: '中国慢性淋巴细胞白血病/小淋巴细胞淋巴瘤的诊断与治疗指南（2025 年版）',
          version: '2025',
          nolink: true,
          note: 'PMC 全文与 DOI 在验链脚本中返回 203/THIN，未取得可验证原件；本台不引用条文'
        },
        {
          org: 'NCCN',
          doc: 'NCCN Guidelines · Chronic Lymphocytic Leukemia/Small Lymphocytic Lymphoma',
          version: 'V2.2027',
          entry: true,
          kind: 'hub',
          url: 'https://www.nccn.org/guidelines/nccn-guidelines/guidelines-detail?category=1&id=1478',
          note: '临床版全文需在 NCCN 官网注册后取得；本台未取得该版原件'
        },
        {
          org: 'NCI',
          doc: 'Chronic Lymphocytic Leukemia Treatment (PDQ®)',
          version: '持续更新',
          original: true,
          kind: 'fulltext',
          url: 'https://www.cancer.gov/types/leukemia/hp/cll-treatment-pdq'
        }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '这一段只写已经发生的事：哪份文件换了版本、哪一天发表、收录了哪些条目。不写预测，不做评价，也不给任何倾向。',
      points: [
        '2008 年：iwCLL 更新版诊断与治疗标准发表于 Blood（2008;111(12):5446-5456）。',
        '2025-02：中华血液学杂志 2025 年第 46 卷第 2 期发表《中国慢性淋巴细胞白血病/小淋巴细胞淋巴瘤的诊断与治疗指南（2025 年版）》（105-112 页）。'
      ],
      sources: [
        {
          org: 'iwCLL',
          doc: 'Guidelines for the diagnosis and treatment of chronic lymphocytic leukemia',
          version: '2008（Blood 2008;111(12):5446-5456）',
          original: true,
          kind: 'fulltext',
          url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2972576/'
        },
        {
          org: '中华医学会血液学分会等',
          doc: '中国慢性淋巴细胞白血病/小淋巴细胞淋巴瘤的诊断与治疗指南（2025 年版）',
          version: '2025（中华血液学杂志 2025;46(2):105-112）',
          nolink: true,
          note: 'PMC 全文与 DOI 在验链脚本中返回 203/THIN，未取得可验证原件'
        }
      ]
    }
  ]
}
