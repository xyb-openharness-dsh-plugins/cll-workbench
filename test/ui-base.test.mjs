/* 接口基址回归：`apiBase()` 必须只返回**挂载前缀**，不能把 `/api/cll` 再带出来。
 *
 * 踩坑现场（2026-10-21）：apiBase() 返回 `/api/cll`，调用处又写成
 * `${apiBase()}/api/cll/bootstrap` → 实际请求
 * `/api/cll/api/cll/bootstrap` 404。页面 catch 里回退演示数据，
 * 所以**看起来有数据、其实一条都没连上库**；导出/导入接口同样 404。
 * 这类错误跑单测不会红（读模型、路由都是好的），只能把前端基址单独钉住。
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const SRC = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

function loadApiBase() {
  const m = SRC.match(/function apiBase\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'public/app.js 里找不到 apiBase()');
  /* eslint-disable no-new-func */
  return new Function('location', `${m[0]}\nreturn apiBase();`);
}

test('① 独立启动 / Desktop：页面在 /api/cll/ui/ 下，前缀必须是空串', () => {
  const apiBase = loadApiBase();
  assert.equal(apiBase({ pathname: '/api/cll/ui/index.html' }), '');
  assert.equal(apiBase({ pathname: '/api/cll/ui/' }), '');
});

test('② 挂到子路径下：只留前缀，不能留 /api/cll', () => {
  const apiBase = loadApiBase();
  assert.equal(apiBase({ pathname: '/w/abc/api/cll/ui/index.html' }), '/w/abc');
  assert.equal(apiBase({ pathname: '/p/xyz/ui/index.html' }), '/p/xyz');
});

test('③ 拼出来的 bootstrap / export 路径必须只有一个 /api/cll', () => {
  const apiBase = loadApiBase();
  const base = apiBase({ pathname: '/api/cll/ui/index.html' });
  for (const p of ['bootstrap', 'export/A.md', 'health']) {
    const url = `${base}/api/cll/${p}`;
    assert.equal(url, `/api/cll/${p}`, `拼出错路径：${url}`);
    assert.equal(url.includes('/api/cll/api/cll'), false);
  }
});

test('④ 路径里没有 /ui/：返回空串（file:// 直接打开也不许拼出绝对路径）', () => {
  const apiBase = loadApiBase();
  assert.equal(apiBase({ pathname: '/index.html' }), '');
});
