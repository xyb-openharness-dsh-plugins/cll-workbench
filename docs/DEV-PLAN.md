# CLL 工作台开发计划（DEV-PLAN）

更新：2026-10-25 · 品牌：小淋宝 LymPal · 仓库 xyb-openharness-dsh-plugins/cll-workbench

| 阶段 | 状态 | 实测证据 |
| --- | --- | --- |
| M0 骨架 | ✅ | `dsh-wb-cli check` staticPass:true；原创文档 9 件；cordis root 接线 |
| M1 调研/SPEC（G1） | ✅ 签认待补 | 三路调研（medical-cll-10-topics / user-cll-narratives / family-comparison）；重名率 61.5% 实测；DESIGN-REVIEW P1×5 已清零 |
| M2 原型（G2） | ✅ 签认待补 | prototypes/v0.1 四件套；实渲截图 8 张；HVT-REVIEW X1–X4 P0=0；指征八条逐字照抄 |
| M3 数据模型（G3） | ✅ 签认待补 | schema/0001（19 表）+ freeze-contract sha256 + check-schema 判读列 0 命中 |
| M4 临床库 | ✅ | fetch-cll-trials 四件套 461 条（chinadrugtrials 118 / ictrp 343）；manifest=jsonl=sqlite 一致 |
| M5 开发版（V1） | ✅ | 七步移植完成：dsh 12 件 + src/client + lib 4 件 + public 四件套；MinerU 六部件（mineru/import/settings/export/routes/server）；apiBase 单前缀契约 + 双形态回归（test/ui-base 4/4）；**npm test 41/41**；check 全绿；开发版实启 health/bootstrap/export/ui 200 |
| M6 装机（V2/V3） | ⏳ | 待 pack → 安装 → bundles 登记 → 真机走查 |
| M7 发布 | ⏳ | 待 tag/Release |
| M8 BACKLOG 回填 | ⏳ | 待 PR |
| M9 经验回流 | ⏳ | 待 starter 追补 |

## 未通过项（不得写成"通过"）

- 独立评审（G1 外部代理、G2 外部评审）因账号并发限制未跑成，已如实留痕；M6 前补跑。
- DSH Desktop 真机加载与业务闭环未验（M6）。
- NMPA 批准文号逐条、中国发病率、医保目录为 D 级未核实（docs/SPEC.md 未核实项）。
