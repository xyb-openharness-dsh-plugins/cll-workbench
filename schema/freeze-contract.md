# schema 冻结合同

本文件锁定 `schema/0001_initial.sql` 的内容边界。**冻结后只增不改**：结构变更新增 `0002_*.sql`，不改 0001；漏列走 ALTER 追加。

## 冻结记录

| 项 | 值 |
| --- | --- |
| 文件 | `schema/0001_initial.sql` |
| 行数 | 252 |
| sha256 | `db9a1d16debbcc831a092b9b889f0b487b2171492301551320fda82ae0da4e7f` |
| 冻结日期 | 2026-10-25 |
| 冻结人 | 本轮开发者（G3 按推荐项执行，用户补签认待补） |

## 内容边界

19 张表 + 3 索引 + 1 视图（v_metric_trend 数值白名单，分类不进趋势）。表清单见 `docs/SCHEMA.md` 与 `scripts/check-schema.mjs` EXPECTED_TABLES。

**明确不含**：任何判读列（diagnosis / risk_level / prognosis / recommendation / severity）；"是否满足治疗指征"结论列（criteria_check 只存照抄原文+ask_flag）；LDT 结论（ldt_note 只存窗口参数）；任何云端同步表。

## 断言（node scripts/check-schema.mjs，串入 npm run check）

1. sha256(0001) 与本文件一致；2. 表清单=EXPECTED_TABLES；3. 全部 PRAGMA table_info + SQL 正文（除注释）判读禁词 0 命中；4. 00*.sql 顺序在 :memory: 建库成功。

## 已追加迁移

（无）
