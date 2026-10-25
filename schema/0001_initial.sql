-- cll-workbench schema 0001_initial · 小淋宝 LymPal
-- 冻结见 schema/freeze-contract.md（只增不改）。判读红线：无 diagnosis/risk_level/prognosis/recommendation/severity 列。

PRAGMA foreign_keys = ON;

CREATE TABLE subject (
  id INTEGER PRIMARY KEY,
  name_text TEXT NOT NULL,
  birth_year INTEGER,
  sex TEXT,
  role TEXT CHECK(role IN ('self','caregiver')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE document (
  id INTEGER PRIMARY KEY,
  relative_path TEXT NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  mime TEXT,
  byte_size INTEGER,
  imported_at TEXT NOT NULL,
  parse_status TEXT CHECK(parse_status IN ('pending','parsed','failed')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE candidate (
  id INTEGER PRIMARY KEY,
  doc_id INTEGER REFERENCES document(id),
  payload_json TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','accepted','rejected')),
  reviewed_at TEXT,
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE dx_profile (
  id INTEGER PRIMARY KEY,
  dx_date TEXT,
  dx_name_text TEXT CHECK(dx_name_text IN ('CLL','SLL','MBL','other_reported')),
  binet_stage_text TEXT,
  rai_stage_text TEXT,
  stage_source_text TEXT,
  stage_scheme TEXT,
  author_role TEXT CHECK(author_role IN ('self','caregiver')),
  visibility TEXT NOT NULL DEFAULT 'normal' CHECK(visibility IN ('private','normal')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 触发词表：八条治疗指征照抄 + "我想问的"勾选；不存"是否满足指征"结论
CREATE TABLE criteria_check (
  id INTEGER PRIMARY KEY,
  criteria_code TEXT NOT NULL CHECK(criteria_code IN ('T3-1','T3-2','T3-3','T3-4','T3-5','T3-6','T3-7','T3-8')),
  criteria_text TEXT NOT NULL,
  ask_flag INTEGER NOT NULL DEFAULT 0,
  source_version TEXT NOT NULL,
  author_role TEXT CHECK(author_role IN ('self','caregiver')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE lab_result (
  id INTEGER PRIMARY KEY,
  draw_date TEXT NOT NULL,
  series TEXT NOT NULL CHECK(series IN ('hematology','biochem','molecular','physical')),
  metric_code TEXT NOT NULL,
  metric_title TEXT,
  value_num REAL,
  value_text TEXT,
  unit TEXT,
  ref_range_text TEXT,
  lab_name TEXT,
  source_doc_id INTEGER REFERENCES document(id),
  source_text TEXT,
  author_role TEXT CHECK(author_role IN ('self','caregiver')),
  visibility TEXT NOT NULL DEFAULT 'normal' CHECK(visibility IN ('private','normal')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- LDT：只存计算窗口参数与备注；倍增结论不落库（视图层实时计算）
CREATE TABLE ldt_note (
  id INTEGER PRIMARY KEY,
  window_days INTEGER,
  computed_flag INTEGER NOT NULL DEFAULT 0,
  note_text TEXT,
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE gene_result (
  id INTEGER PRIMARY KEY,
  gene_code TEXT NOT NULL CHECK(gene_code IN ('del17p','del11q','trisomy12','del13q','TP53','IGHV','complex_karyotype')),
  state TEXT NOT NULL CHECK(state IN ('detected','not_detected','not_tested')),
  result_text TEXT,
  report_date TEXT,
  lab_name TEXT,
  source_doc_id INTEGER REFERENCES document(id),
  source_text TEXT,
  author_role TEXT CHECK(author_role IN ('self','caregiver')),
  visibility TEXT NOT NULL DEFAULT 'normal' CHECK(visibility IN ('private','normal')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE mrd_result (
  id INTEGER PRIMARY KEY,
  test_date TEXT NOT NULL,
  method TEXT CHECK(method IN ('flow','ngs')),
  value_text TEXT,
  sensitivity_text TEXT,
  source_doc_id INTEGER REFERENCES document(id),
  source_text TEXT,
  author_role TEXT CHECK(author_role IN ('self','caregiver')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE med_drug (
  id INTEGER PRIMARY KEY,
  drug_name TEXT NOT NULL,
  generic_name TEXT,
  class_code TEXT CHECK(class_code IN ('BTKi','BCL2i','anti_CD20','chemo_immuno','other_reported')),
  dose_text TEXT,
  frequency TEXT CHECK(frequency IN ('daily','qod','intermittent')),
  route TEXT,
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE med_period (
  id INTEGER PRIMARY KEY,
  drug_id INTEGER NOT NULL REFERENCES med_drug(id),
  start_date TEXT NOT NULL,
  end_date TEXT,
  change_kind TEXT NOT NULL CHECK(change_kind IN ('start','switch','dose','hold','resume')),
  reason_text TEXT,
  reason_doc_id INTEGER REFERENCES document(id),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE med_log (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  drug_id INTEGER NOT NULL REFERENCES med_drug(id),
  state TEXT NOT NULL CHECK(state IN ('taken','missed','partial')),
  note_text TEXT,
  author_role TEXT CHECK(author_role IN ('self','caregiver')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ae_event (
  id INTEGER PRIMARY KEY,
  onset_date TEXT NOT NULL,
  term_text TEXT NOT NULL,
  drug_id INTEGER REFERENCES med_drug(id),
  note_text TEXT,
  source_type TEXT CHECK(source_type IN ('self','clinician_note')),
  author_role TEXT CHECK(author_role IN ('self','caregiver')),
  visibility TEXT NOT NULL DEFAULT 'normal' CHECK(visibility IN ('private','normal')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE comorbidity (
  id INTEGER PRIMARY KEY,
  cirs_system_code TEXT NOT NULL,
  entry_text TEXT NOT NULL,
  source_type TEXT CHECK(source_type IN ('clinician_note','self')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE comorbidity_med (
  id INTEGER PRIMARY KEY,
  name_text TEXT NOT NULL,
  dose_text TEXT,
  purpose_text TEXT,
  start_date TEXT,
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE question_list (
  id INTEGER PRIMARY KEY,
  topic_code TEXT NOT NULL,
  question_text TEXT NOT NULL,
  source_version TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','normal')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE visit_prep (
  id INTEGER PRIMARY KEY,
  visit_date TEXT NOT NULL,
  facts_md TEXT,
  questions_md TEXT,
  exported_at TEXT,
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE guideline_ref (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL,
  url TEXT,
  version TEXT,
  fetched_at TEXT,
  level TEXT CHECK(level IN ('A','B','C','D')),
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_lab_series_metric ON lab_result(series, metric_code, draw_date);
CREATE INDEX idx_med_log_date ON med_log(date, drug_id);
CREATE INDEX idx_gene_code ON gene_result(gene_code, report_date);

-- 读模型：数值趋势白名单视图（分类值不进趋势）
CREATE VIEW v_metric_trend AS
SELECT series, metric_code, metric_title, draw_date, value_num, unit, lab_name, ref_range_text
FROM lab_result
WHERE in_use = 1 AND value_num IS NOT NULL AND visibility = 'normal'
ORDER BY rowid;
