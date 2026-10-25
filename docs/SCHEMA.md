# 数据主体—关系—表（CLL 草案 · G1 包 → G3 冻结）

状态：**G3 冻结版**（判读列断言已入检查链）。判读红线：**无 diagnosis / risk_level / prognosis / recommendation / severity 类列**（M3 断言，check-schema 执行）。

## 通用约定（全表适用）
- 每表 `id INTEGER PRIMARY KEY`、`created_at`/`updated_at` TEXT(ISO8601)、默认读序 `ORDER BY rowid`。
- **显式 null**：可空列显式 NULL，不用空串。
- `in_use INTEGER NOT NULL DEFAULT 1` 软删除/更正链；`*_title TEXT` 分节标题列。
- `author_role TEXT CHECK(author_role IN ('self','caregiver'))` + `visibility TEXT CHECK(visibility IN ('private','normal'))`（三出口过滤依据）。
- `source_text` 报告/医嘱原文摘录与结构化值并存；`source_doc_id` 关联 `document`。
- 数值 `value_text`（原文）+ `value_num` + `unit`；不做跨单位换算；**分类值不进趋势**（`series/metric_code` 数值列才进曲线视图）。
- 三态枚举一律 `CHECK(x IN ('detected','not_detected','not_tested'))`。

## 表清单（15 张）

| 表 | 核心字段 | 说明 |
| --- | --- | --- |
| `subject` | name_text, birth_year, sex, role | 单主体+可挂 caregiver |
| `document` | relative_path, sha256 UNIQUE, mime, parse_status | 资料根内校验 |
| `candidate` | doc_id, payload_json, state('pending'/'accepted'/'rejected') | AI/解析候选；拒收零副作用 |
| `dx_profile` | dx_date, dx_name_text('CLL'/'SLL'/'MBL' 照抄), binet_stage_text, rai_stage_text, stage_source_text, stage_scheme('Binet1977'/'Rai1975' 照抄来源) | 双分期**分列照抄**，不换算不判进展 |
| `criteria_check` | criteria_code('T3-1'…'T3-8'), criteria_text, ask_flag INTEGER, source_version | 触发词表八条照抄；只存"我想问的"，**无"是否满足"列** |
| `lab_result` | draw_date, series CHECK('hematology','biochem','molecular','physical'), metric_code, metric_title, value_num, value_text, unit, ref_range_text, lab_name | ★四系列分系列指标卡数据源；ref_range 只显报告单区间 |
| `ldt_note` | computed_flag INTEGER, window_days INTEGER, note_text | LDT 只存计算窗口参数与备注，**结论不落库** |
| `gene_result` | gene_code('del17p','del11q','trisomy12','del13q','TP53','IGHV','complex_karyotype'), state 三态, result_text, report_date, lab_name | 基因预后档案；三档匹配输入端 |
| `mrd_result` | test_date, method('flow','ngs'), value_text, sensitivity_text(如 10⁻⁴–10⁻⁶), source_text | MRD 照抄 + 词表卡；无缓解判读列 |
| `med_drug` | drug_name, generic_name, class_code('BTKi','BCL2i','anti_CD20','chemo_immuno'), dose_text, frequency('daily','qod','intermittent'), route | 药名词表按 2025 指南分组；不排序 |
| `med_period` | drug_id, start_date, end_date, change_kind('start','switch','dose','hold','resume'), reason_text, reason_doc_id | 处方变更线；只新增版本 |
| `med_log` | date, drug_id, state('taken','missed','partial'), note_text | 每日打卡；漏服不评判 |
| `ae_event` | onset_date, term_text(人话词), drug_id, note_text, source_type | 副作用按药归属；无 severity 列 |
| `comorbidity` | cirs_system_code, entry_text, source_type('clinician_note','self') | CIRS 条目照抄；无相互作用列 |
| `comorbidity_med` | name_text, dose_text, purpose_text, start_date | 在用药清单 |
| `question_list` | topic_code, question_text, source_version, visibility DEFAULT 'private' | 问题清单（含就诊要问）；零处置 |
| `visit_prep` | visit_date, facts_md, questions_md, exported_at | 事实区/问题区分列导出 |
| `guideline_ref` | key, url, version, fetched_at, level('A','B','C','D') | 词表与事实卡来源可追溯 |
| `settings` | key, value_json | 资料根、凭据状态（不存明文）、面板宽度偏好 |

（19 张含 `ldt_note`/`comorbidity_med`；实际建表数以 freeze-contract 为准。）

实体图：`subject 1—n document`；`document 1—n candidate`；`lab_result/gene_result/mrd_result/med_period/ae_event 1—1 source_doc?`；`med_drug 1—n med_period/med_log/ae_event`。

## 迁移与冻结（G3 已执行）
- `schema/0001_initial.sql` 一次成文 → `schema/freeze-contract.md` 记 sha256；此后**只增不改**（0002+ 走 ALTER/新表）。
- 迁移前备份 `workbench.db.bak-<ts>`；失败回滚留日志。
- 断言（`node scripts/check-schema.mjs`，串入 check 链）：sha256 一致、表清单一致、判读列禁词（diagnosis|risk_level|prognosis|recommendation|severity）在全部 `PRAGMA table_info` 中 0 命中、全部 00*.sql 可在 :memory: 顺序建库。
- 读模型：各页只读 `v_metric_trend`（数值列白名单：value_num 且 metric_code 在数值目录内）、`v_*` 视图，不在页面层拼 SQL。
