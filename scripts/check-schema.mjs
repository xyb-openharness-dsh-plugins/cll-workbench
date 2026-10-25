// check-schema.mjs — G3 冻结合同断言：sha256 一致、表清单一致、判读列禁词、可在 :memory: 建库
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = new URL('..', import.meta.url).pathname;
const schemaDir = join(root, 'schema');
const EXPECTED_TABLES = ['subject','document','candidate','dx_profile','criteria_check','lab_result','ldt_note','gene_result','mrd_result','med_drug','med_period','med_log','ae_event','comorbidity','comorbidity_med','question_list','visit_prep','guideline_ref','settings'];
const FORBIDDEN = /diagnosis|risk_level|prognosis|recommendation|severity/i;
let fail = 0;
const bad = (msg) => { console.error('FAIL ' + msg); fail++; };

// 1. sha256 of 0001 vs freeze-contract
const sql1 = readFileSync(join(schemaDir, '0001_initial.sql'), 'utf8');
const sha = createHash('sha256').update(sql1).digest('hex');
const contract = readFileSync(join(schemaDir, 'freeze-contract.md'), 'utf8');
if (!contract.includes(sha)) bad(`freeze-contract.md 不含 0001 的 sha256=${sha}`);

// 2. 顺序建库
const db = new DatabaseSync(':memory:');
for (const f of readdirSync(schemaDir).filter(f => /^0\d+.*\.sql$/.test(f)).sort()) {
  db.exec(readFileSync(join(schemaDir, f), 'utf8'));
}
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name);
for (const t of EXPECTED_TABLES) if (!tables.includes(t)) bad(`缺表 ${t}`);
for (const t of tables) if (!EXPECTED_TABLES.includes(t)) bad(`多表 ${t}`);

// 3. 判读列禁词断言（含视图与索引定义扫描）
for (const t of tables) {
  for (const col of db.prepare(`PRAGMA table_info(${t})`).all()) {
    if (FORBIDDEN.test(col.name)) bad(`表 ${t} 含判读列 ${col.name}`);
  }
}
if (FORBIDDEN.test(sql1.replace(/--.*$/gm, ''))) bad('0001 SQL 正文（除注释）含判读禁词');

if (fail) { console.error(`check-schema: ${fail} 项失败`); process.exit(1); }
console.log(`check-schema: PASS（${tables.length} 表, sha256 一致, 判读列 0 命中）`);
