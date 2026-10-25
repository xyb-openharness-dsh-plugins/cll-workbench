# 原型评审记录（prototypes/v0.1）· 2026-10-25

对象：prototypes/v0.1 四件套（index.html 81 行 / app.js 928 行 / demo-data.js 235 行 / style.css 303 行）。
走查环境：本地 HTTP 8765 + 浏览器实渲（截图 8 张入 docs/screenshots/）。`node --check` app.js/demo-data.js 均 PASS。

## 一、(view,sub) 穷举对照 IP2（孤儿页 = 0）

一级 13：dash/records/ww/labs/onechart/gene/med/trial/comorb/nutr/mind/prep/settings（导航实测渲染，见截图 proto-dash）。
二级实测（app.js SUB 路由 + 页签渲染）：records/docs、med/overview、med/checkin、med/calendar、med/rx、med/ae、trial/match。
合计 (view,sub) 19 条与 INTERACTION-DESIGN §二一致；每条均被 S1–S12 至少一条路径经过；孤儿页 = 0 ✅。

## 二、IP1–IP10 自查

| # | 结果 | 证据 |
| --- | --- | --- |
| IP1 | ✅ | G1 已签（DESIGN-REVIEW 留痕），HTML 在签认后开工 |
| IP2 | ✅ | 上表穷举 |
| IP3 | ✅ | 入口文案 grep 实测：记一次血常规/看淋巴细胞趋势/我想问的/补一条基因结果/帮我匹配/今天吃了吗/记一次不舒服/准备复诊/选几条线叠看/记一次 MRD/换药调剂量 全部命中且与合同逐字一致 |
| IP4 | ✅ | 各二级页有"回到看板"按钮；完成 Toast 内嵌 |
| IP5 | ✅ | 候选 UI 均为"待核对"态 + 拒收按钮（原型演示态） |
| IP6 | ✅ | 每页原地表单 ≤1，编辑入口收「⋯ 更多」（DOM 结构走查） |
| IP7 | ✅ | 数值输入 inputmode="numeric" |
| IP8 | ✅ | 全文无"删除"文案，一律"改这一条" |
| IP9 | ✅（原型层） | 双通道同 demo 数据源；事实层在 M5 落库后补迁移级测试 |
| IP10 | ✅ | agent-draft 只填输入框不发送（complementary 区可见 + CustomEvent 监听演示） |

## 三、硬纪律扫描

- 禁词（达标/建议治疗/可停药/治愈率/应立即就诊/risk_level/diagnosis/severity/prognosis，除注释）：**0 命中**（曾命中 demo-data 字段名 diagnosis，已改 dxNameText 照抄语义）。
- `<details` 共 3 处，默认 `[open]` 计数 **0**；收/展两态实渲截图（proto-med-folded / proto-med-open）。
- SVG 根 class="chart" ✅（app.js:216）；smoothPath 自实现 Fritsch–Carlson 单调三次插值（app.js:94–110）✅；分类值（体格描述）不进折线，单列时间线 ✅。
- 页脚贴底（flex 布局 + .footer 固定结构）；隐藏一律 [hidden]；字号 12.5–15px（style.css 实测 clamp(24,2.2vw,30) 仅 h1 标题）；reduce motion 媒体查询关闭 3D ✅。
- 3D 反转实测：data-act="flip" 点击后 transition 0.48s（截图 proto-labs-flip）；键盘可达（focus + Enter 触发同 handler）。
- 指标选择窗口实测：4 系列分组弹层 open=true（截图 proto-onechart-picker）；选满 4 条提示"先去一条再选新的"文案在 app.js:486。
- 匹配指数：字段重合度分数呈现（如 5/7），无排序无推荐（trial/match 截图）。

## 四、偏差记录（不改合同，M5 处理）

1. 记录/候选/导出为原型演示态（内存态），事实层入库与迁移级测试在 M5 落。
2. `filterPrivate(list, exit)` 三出口为演示实现，M5 需代码级过滤单测。
3. 窄版（<980px）走查未截屏（宽版 1280×900 已截）；M5 开发版 HVT 补窄版。

## 改动追踪
| 日期 | 改动 |
| --- | --- |
| 2026-10-25 | v0.1 首版 + 本评审（实渲 8 截图） |

## 五、用户确认（2026-10-25）

用户在原型实渲走查后确认：「好很多，确认」——对象为指标卡（固定尺寸原位翻转、正面四要素、背面 sparkline 带端值与日期）与一图秀（左栏 chips/分组勾选即时更新/显示开关 + 每条线自身范围缩放 + 图例全期区间 + 点选 pin 读数）。
确认同时是**风格对齐指令的验收通过**：脚手架 + 乳腺癌口径（16 号一图秀 R1–R3、27 号指标卡）。G2 由此转为**用户签认通过**（此前为按推荐项默认执行 + 签认待补）。
