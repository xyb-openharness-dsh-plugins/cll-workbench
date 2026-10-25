/* 文档导入（MinerU 真实解析 → 候选字段）。
 *
 * 链路：POST /api/cll/import（原始文件字节 + ?name=）→ MinerU v4 解析 → full.md
 *      → 本文件抽指标 → 写 documents + candidate_fields（status='待确认'）→ 前端逐条核对。
 *
 * 四条不可让步（家族契约，别为了"智能"放宽）：
 * 1. **只抄写不推测**：报告里没有的指标不生成候选；数值只做"字符串 → 数字"的搬运，
 *    单位换算、参考范围判定、缺失补齐全部不做。
 * 2. **候选不是记录**：解析只写 candidate_fields，不碰 metrics / metric_points。
 *    用户"接受"才落记录，且落库时 reviewed_by 留空（"已接受"≠ 医学审核）。
 * 3. **参考范围不是结果**：`3.5–9.5` 这种两数一格的行整行放弃，不当成结果值。
 * 4. **`<0.5` 这类留原文**：v 写成字符串，value_num 是 null，不四舍五入成 0。
 *
 * MinerU 的已知坑（乳腺癌那轮踩过）：整张表会被塞进一个单元格，必须**按位置对齐**
 * （第 i 个指标名配第 i 个数 / 第 i 个单位），数量不符整行放弃，不做模糊匹配。
 */

import { createHash } from 'node:crypto';
import { createMineruClient, MineruError } from './mineru.js';

export { MineruError };

/** 18 项指标字典：name/alias → 档案里 metrics.key。别名要词边界，否则 "CRP" 会命中 "hs-CRP" 之外的东西。 */
export const LAB_DICT = [
  { key: 'scc', name: 'SCC-Ag', aliases: ['SCC-Ag', 'SCC', '鳞状细胞癌抗原'], unit: 'ng/mL' },
  { key: 'cea', name: 'CEA', aliases: ['CEA', '癌胚抗原'], unit: 'ng/mL' },
  { key: 'ca125', name: 'CA125', aliases: ['CA125', 'CA-125', '糖类抗原125'], unit: 'U/mL' },
  { key: 'wbc', name: '白细胞', aliases: ['WBC', '白细胞', '白细胞计数'], unit: '10^9/L' },
  { key: 'anc', name: '中性粒细胞', aliases: ['ANC', 'NEUT#', '中性粒细胞', '中性粒细胞绝对值'], unit: '10^9/L' },
  { key: 'lym', name: '淋巴细胞', aliases: ['LYM#', '淋巴细胞', '淋巴细胞绝对值'], unit: '10^9/L' },
  { key: 'plt', name: '血小板', aliases: ['PLT', '血小板', '血小板计数'], unit: '10^9/L' },
  { key: 'hgb', name: '血红蛋白', aliases: ['HGB', 'Hb', '血红蛋白'], unit: 'g/L' },
  { key: 'alt', name: 'ALT', aliases: ['ALT', '谷丙转氨酶'], unit: 'U/L' },
  { key: 'ast', name: 'AST', aliases: ['AST', '谷草转氨酶'], unit: 'U/L' },
  { key: 'cr', name: '肌酐', aliases: ['CREA', 'Cr', '肌酐'], unit: 'μmol/L' },
  { key: 'crp', name: 'C 反应蛋白', aliases: ['CRP', 'C反应蛋白', 'C 反应蛋白'], unit: 'mg/L' },
  { key: 'k', name: '血钾', aliases: ['K', '血钾', '钾'], unit: 'mmol/L' },
  { key: 'na', name: '血钠', aliases: ['Na', '血钠', '钠'], unit: 'mmol/L' },
  { key: 'alb', name: '白蛋白', aliases: ['ALB', '白蛋白'], unit: 'g/L' },
  { key: 'fsh', name: 'FSH', aliases: ['FSH', '促卵泡激素'], unit: 'mIU/mL' },
  { key: 'amh', name: 'AMH', aliases: ['AMH', '抗苗勒管激素'], unit: 'ng/mL' },
  { key: 'wt', name: '体重', aliases: ['体重', 'WT'], unit: 'kg' },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 词边界匹配：中文别名用前后断言（\b 对中文无效）。 */
function aliasHit(text, alias) {
  const re = new RegExp(`(?<![A-Za-z0-9-])${escapeRe(alias)}(?![A-Za-z0-9-])`, 'i');
  return re.test(text);
}

/** 一行 markdown 表格 → 单元格数组。 */
function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}
const isTableLine = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');
const isSeparator = (line) => /^\|[\s:|-]+\|$/.test(line.trim());

/** HTML 实体解码：MinerU 的表格单元格里 `<0.5` 会以 `&lt;0.5` 出现，不解码就当成"文字"丢掉。 */
function decodeEntities(text) {
  return String(text)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

/** markdown 里的 HTML 表格先转成 `| a | b |`（MinerU 两种都会给）。 */
function normalizeHtmlTables(md) {
  if (!/<table/i.test(md)) return md;
  return md.replace(/<table[\s\S]*?<\/table>/gi, (block) => {
    const out = [];
    for (const row of block.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
      const tds = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim());
      if (tds.length) out.push(`| ${tds.join(' | ')} |`);
    }
    return out.join('\n');
  });
}

const NUM_RE = /^(?:[<>≤≥]\s*)?-?\d+(?:\.\d+)?$/;
/** 取一个单元格里的"可抄写值"：纯数字 / <0.5 这类带比较符的原文。参考范围、两数一格一律不要。 */
function valueOf(cell) {
  const t = String(cell).replace(/\s/g, '');
  if (!t) return null;
  if (/^[<>≤≥]/.test(t)) {
    const m = t.match(/^([<>≤≥])(-?\d+(?:\.\d+)?)$/);
    return m ? { raw: `${m[1]}${m[2]}`, num: null } : null;
  }
  if (!NUM_RE.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? { raw: t, num: n } : null;
}

const UNIT_RE = /^(10\^?9\/L|×10\^?9\/L|g\/L|mg\/L|mmol\/L|μmol\/L|umol\/L|U\/mL|U\/L|mIU\/mL|ng\/mL|ng\/L|kg|%|fL|pg)$/i;

/**
 * 从 markdown 抽候选。
 * @returns {{candidates: Array, skipped: Array}} candidates 每项 {name, key, value, num, unit, line}
 */
export function extractLabCandidates(markdown) {
  const md = normalizeHtmlTables(String(markdown ?? ''));
  const candidates = [];
  const skipped = [];
  const seen = new Set();

  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    if (!isTableLine(lines[i])) { i += 1; continue; }

    /* 一整块连续表格：第一行是表头，分隔行（|---|---|）丢掉，其余是数据行。
       不要"看到分隔行就 continue"——那会把表头一起跳过，整张表被静默丢弃。 */
    const start = i;
    while (i < lines.length && isTableLine(lines[i])) i += 1;
    const blockLines = lines.slice(start, i).filter((l) => !isSeparator(l));
    if (blockLines.length < 2) continue;

    const header = cells(blockLines[0]);
    /* 只认「指标名 + 数值（+单位）」列；"参考范围/提示"那几列不碰。 */
    const idxName = header.findIndex((h) => /项目|指标|名称|检验|item|test/i.test(h));
    const idxVal = header.findIndex((h) => /结果|数值|value|result/i.test(h));
    const idxUnit = header.findIndex((h) => /单位|unit/i.test(h));
    if (idxName === -1 || idxVal === -1) continue;

    for (const line of blockLines.slice(1)) {
      const row = cells(line);
      const name = row[idxName] ?? '';
      const hit = LAB_DICT.find((d) => d.aliases.some((a) => aliasHit(name, a)));
      if (!hit) continue;
      const val = valueOf(row[idxVal] ?? '');
      if (!val) { skipped.push({ name, cell: row[idxVal] ?? '', reason: '不是单一数值（参考范围/文字）' }); continue; }
      const unitCell = idxUnit >= 0 ? String(row[idxUnit] ?? '').replace(/\s/g, '') : '';
      if (unitCell && !UNIT_RE.test(unitCell)) { skipped.push({ name, cell: unitCell, reason: '单位不认识' }); continue; }
      const dedupe = `${hit.key}:${val.raw}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      candidates.push({
        key: hit.key,
        name: hit.name,
        value: val.num === null ? val.raw : val.num,
        unit: unitCell || hit.unit,
        line: start + 1,
      });
    }
  }
  return { candidates, skipped };
}

/** 报告日期：文件名或正文里的 YYYY-MM-DD / YYYY年M月D日。取不到就是 null（不猜今天）。 */
export function guessReportDate(text, fallback = null) {
  const m = String(text ?? '').match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!m) return fallback;
  const [_, y, mo, d] = m;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * 导入服务：把「文件 → MinerU → 候选」串起来，并负责落库（只写候选，不写记录）。
 * db 必须是已 migrate 的库；不传 client 时不联网（单测注入解析函数即可）。
 */
export class ImportService {
  constructor(db, { client = null, extract = extractLabCandidates } = {}) {
    this.db = db;
    this.client = client;
    this.extract = extract;
  }

  /** 纯解析：不落库，返回 {markdown, candidates, skipped, document}。 */
  async parse(buffer, { filename = 'document.pdf', profileKey = 'A', reportDate = null } = {}) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new MineruError('BAD_INPUT', '文件是空的');
    if (!this.client) throw new MineruError('NO_TOKEN', '没有可用的 MinerU 客户端（缺 token？）');

    const parsed = await this.client.parse({ bytes: buffer, filename });
    const markdown = parsed.markdown ?? '';
    const { candidates, skipped } = this.extract(markdown);
    const date = guessReportDate(filename) ?? guessReportDate(markdown) ?? reportDate ?? null;
    return {
      markdown,
      candidates,
      skipped,
      document: { profileKey, name: filename, date, type: '检验报告', status: '已解析', pages: parsed.pages ?? null },
    };
  }

  /** 落库：document 一行 + candidate 逐条（state='pending' 待确认）。同事务，失败整体回滚。 */
  record({ profileKey, document, candidates = [] }) {
    const id = this.#nextDocId(profileKey);
    const now = new Date().toISOString();
    const sha = createHash('sha256').update(String(document.name)).digest('hex');
    this.db.exec('BEGIN');
    try {
      this.db.prepare('INSERT INTO document (relative_path, sha256, mime, byte_size, imported_at, parse_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(id, sha, document.type === '检验报告' ? 'application/pdf' : String(document.type ?? 'application/pdf'), null, now, 'parsed', now, now);
      const docRowid = this.db.prepare('SELECT last_insert_rowid() AS id').get().id;
      const ins = this.db.prepare('INSERT INTO candidate (doc_id, payload_json, state, reviewed_at, in_use, created_at, updated_at) VALUES (?,?,?,?,1,?,?)');
      candidates.forEach((c) => {
        ins.run(docRowid, JSON.stringify({ id: `${id}-C`, name: c.name, value: String(c.value), source: `${document.name}${document.date ? ` ${document.date}` : ''}` }), 'pending', null, now, now);
      });
      this.db.exec('COMMIT');
      return { documentId: id, candidates: candidates.length };
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch { /* 原始错误优先 */ }
      throw error;
    }
  }

  /** 接受/拒收一条候选：只改 state（pending→accepted/rejected），拒收零副作用。 */
  accept(profileKey, candidateId, state = 'accepted') {
    if (!['accepted', 'rejected', 'pending'].includes(state)) throw new Error('非法候选状态');
    const r = this.db.prepare("UPDATE candidate SET state = ?, reviewed_at = ? WHERE in_use = 1 AND json_extract(payload_json, '$.id') = ?")
      .run(state, new Date().toISOString(), candidateId);
    return { changed: r.changes };
  }

  #nextDocId(profileKey) {
    const prefix = `${profileKey}-D`;
    const ids = this.db.prepare('SELECT relative_path AS id FROM document WHERE relative_path LIKE ?')
      .all(`${prefix}%`).map((r) => r.id);
    const max = ids.reduce((a, id) => {
      const n = Number(String(id).slice(prefix.length).replace(/-C$/, ''));
      return Number.isFinite(n) ? Math.max(a, n) : a;
    }, 0);
    return `${prefix}${max + 1}`;
  }
}

/** 默认客户端：从 MINERU_TOKEN / .secrets/mineru.json 取 token。 */
export function createImportService(db, options = {}) {
  const client = options.client ?? createMineruClient(options);
  return new ImportService(db, { client });
}
