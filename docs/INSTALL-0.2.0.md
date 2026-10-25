# 装机记录 · 小淋宝 LymPal v0.2.0（M6）

日期：2026-10-25 · 操作者：本轮开发者（samqin123）

## 1. 包与四要素对照（06 号）

| 要素 | 要求 | 实测 |
| --- | --- | --- |
| patch | `cordis.patch.yml` 在包内、含 config.root | ✅ `config.root: !!js dshHomePath('cll-workbench')` |
| server | `dsh/index.js` + 12 域文件 | ✅ dsh/ 13 文件全在包内 |
| client | `lib/client.js`（单文件已构建） | ✅ 24.2kB，customFrame=true，会话 0.25–0.45 |
| assets/迁移 | public 四件套 + schema | ✅ public/ 4 + schema/ 2（0001 + freeze-contract） |
| 无真实数据/密钥 | — | ✅ 包内仅演示数据；.secrets 已 gitignore 且未打包 |

- tarball：`release/xyb-community-cll-workbench-0.2.0.tgz`（3.0 MB，40 files）
- sha256：`f9b1a18650cb9f8d85e09cccfb702500e52e589e839f7d49474e708ba1264d3b`
- 版本：0.2.0（VERSION / lib/version.js / package.json / public 三处一致，`npm run check` 内 check-version 8 处全绿）

## 2. 安装

- 目标 profile 勘误（实测）：DSH Desktop 实际使用 **`~/Library/Application Support/dsh-desktop/harness/profiles/web`**（13→14 bundles，兄弟工作台 pf-ild/cml/narcolepsy）。首轮误装到 `~/.dsh/profiles/desktop`（通用 CLI profile，同机另一套），已在该 profile 保留记录但**不作为 Desktop 交付证据**。
- 方式：`pnpm install`（corepack pnpm v10.28.2；未使用 dsh web / 通用 profile）
- 登记：`package.json` dependencies += `file:.../xyb-community-cll-workbench-0.2.0.tgz`；`dsh.profile.bundles` 追加 `@xyb-community/cll-workbench`（共 11 条）
- 实测：两个 profile 下 `node_modules/@xyb-community/cll-workbench` 均存在且 version=**0.2.0**；Desktop web profile 的 `dsh.profile.bundles` 已含本包（14 项）。

## 3. 真机界面加载（待用户新建会话）

宿主按会话授权资料目录，**必须先新建会话**再核验工作台出现。判据（`node scripts/verify-desktop-load.mjs`，本仓固化）：
运行段切片 → 装机先后 → dshHomePath → state.json → profile 兄弟工作台。

当前状态：**装机完成，界面加载待用户打开 DSH Desktop 并新建会话确认**（不虚报为已通过）。

## 4. 实测结果（2026-10-25 12:01）

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 安装副本版本 | **v0.2.0** | `node_modules/@xyb-community/cll-workbench/package.json` |
| profile bundles | 含本包（14 项） | `harness/profiles/web/package.json` |
| 宿主工作台清单 | 含 `xyb-openharness-dsh-plugins/cll-workbench` | `desktop-workbenches/state.json` added+pinned |
| 装机后重启 | 12:01:27 启动晚于 12:00:42 装机 | verify-desktop-load ✓「宿主侧加载成功」 |
| 安装副本激活烟测 | **PASS**（apply 走通、7 条宿主校验全过） | `node scripts/smoke-activate.mjs` 指向安装目录 |
| 宿主日志本包报错 | **0 条**（仅 pf-ild 旧包 peer 警告，与本包无关） | `~/Library/Logs/DSH Desktop/harness.log` |
| 本包 peer 范围 | 无 `@deepseek-ai/dsh` 直接 peer；宿主 0.2.1-rc.2 未声明不匹配 | package.json peerDependencies |

**未通过项（如实）**：
- 真机界面人眼走查（V3 业务闭环）**未做**——需要用户在 Desktop 里打开「小淋宝 LymPal」工作台并新建会话；本机无法代替点击。
- README 真机截图：待 V3 后替换（当前为原型实渲截图，已标注）。
