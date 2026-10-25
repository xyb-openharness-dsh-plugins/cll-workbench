# M9 经验回流记录（2026-10-25 · CLL 小淋宝 → starter）

## 回流清单（按优先级：可断言 > 文档 > 口头）

| # | 类型 | 内容 | 落到哪 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | **可断言** | 移植残留检查器 `check-derivative-leftovers.mjs`：25 条底本病种/品牌词表，扫 dsh/lib/public/src/demo/scripts/test/prototypes+README，`leftover-allow` 豁免，自带 `--self-test`（4 正反例 + 1 元断言） | starter `scripts/` + `project-template/scripts/`，并入 `init` 的 check 链 | **本仓实测先抓出 4 处真缺陷**：`scripts/check-pack.mjs` 仍请求 `/api/cervical/`（装机自检 404）；修完 62 文件零命中 |
| 2 | 文档 | LESSONS **L28** 检查器读生成物要先剥注释、回查常量字面量 | starter `docs/LESSONS.md` | 本仓 `check-host-contract` 三轮修法现场 |
| 3 | 文档 | LESSONS **L29** 换病种必须整体重写五套测试，改常量是假绿 | 同上 | 底本测试直跑 31/42 红 → 重写后 41/41 绿 |
| 4 | 文档 | LESSONS **L30** 「数据只有一个来源」要在生成器与原型**逐点**钉住 | 同上 | 原型 10 点 / 生成器 9 点分叉现场 |
| 5 | 文档 | LESSONS **L31** 装机 profile 不能凭 `~/.dsh` 推断 | 同上 | 首轮误装 `~/.dsh/profiles/desktop`，Desktop 实际用 `~/Library/Application Support/dsh-desktop/harness/profiles/web` |
| 6 | **可复用结构** | 指标卡固定尺寸原位翻转版式（正面四要素 / 背面 sparkline 端值+日期 / 长文本截断 / 状态存 key） | starter `templates/FLIP-METRIC-CARD.md` 2026-10-25 增补节 | 本仓 `proto-labs*.png` |
| 7 | **可复用结构** | 一图秀左栏控制版式（时间 chips / 分组勾选即时更新 / 显示开关 / 全期归一化 / 图例区间 / pin 读数 / 刻度抽稀 ≥92px / 空态） | starter `templates/ONE-CHART-SPEC.md` 2026-10-25 增补节 | 本仓 `proto-onechart*.png` |
| 8 | 流程规则 | 移植底本后**先跑残留检查**；五套测试整体重写 | starter `prompts/ZERO-TO-DEV.md` ③b/③c | 同上 |
| 9 | 待实施 | `check-workbench-package` 增加「files 未含运行时会读目录（schema/public/demo）」断言 | starter LESSONS 待实施⑦（与 NF 待实施⑤之②合并） | 本仓 files 已手工补齐 |

## 回流验证（必须跑，不口头）

```
cd /Volumes/win/Downloads/dsh-workbench/xyb-workbench-starter
node scripts/check-starter.mjs   → {"pass": true, "files": 191, "errors": []}
npm run check                    → pass: true
npm test                         → # tests 62 / # pass 62 / # fail 0
node scripts/check-derivative-leftovers.mjs --self-test → PASS（4 正反例 + 1 元断言）
```

## 本轮"下一轮直接受益"的判定

下一轮任何病种从 cervical 底本移植时：`npm run check` 会在**第一次跑**就报出底本品牌名与旧接口前缀
（不必等人工 grep 或患者看到错标题）；指标卡与一图秀的版式判据已写死在模板里，不必再让用户口头描述一遍。
