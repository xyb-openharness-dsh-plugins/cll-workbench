/* 极简 DOM 桩：让 public/app.js 这套零框架页面能在 node --test 里真的跑一遍。
 *
 * 为什么不用 jsdom：本仓没有前端依赖，`npm test` 只跑 node 内置模块。
 * 需要的 DOM 面很小——页面渲染就是给 #view 赋 innerHTML，事件靠 document 上的
 * 三个委托监听（click / change / input）。所以这里只实现「够用的那几个方法」，
 * 并明确记录它不解析 HTML（断言因此只针对渲染出来的字符串与状态副作用）。
 *
 * 判据必须落在行为上：调用点击/勾选后，class 是否真的切换、aria-expanded 是否更新、
 * #chart-panel 是否重绘、localStorage 是否写入——这些都在真实 DOM 上跑的同一段代码。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

class ClassList {
  constructor() { this._set = new Set() }
  add(...names) { names.forEach((n) => this._set.add(n)) }
  remove(...names) { names.forEach((n) => this._set.delete(n)) }
  contains(name) { return this._set.has(name) }
  toggle(name, force) {
    const on = force === undefined ? !this._set.has(name) : !!force
    if (on) this._set.add(name)
    else this._set.delete(name)
    return on
  }
  values() { return [...this._set] }
  toString() { return [...this._set].join(' ') }
}

function makeNode(selector, options = {}) {
  const attrs = Object.create(null)
  const classList = new ClassList()
  const node = {
    _selector: selector,
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    type: 'checkbox',
    open: false,
    classList,
    getAttribute(name) { return name in attrs ? attrs[name] : null },
    setAttribute(name, value) { attrs[name] = String(value) },
    removeAttribute(name) { delete attrs[name] },
    hasAttribute(name) { return name in attrs },
    focus() {},
    blur() {},
    addEventListener() {},
    getBoundingClientRect() { return { width: options.width ?? 700, height: 420 } },
    closest(query) { return (options.closestMap && options.closestMap[query]) || null },
    querySelector() { return null },
    querySelectorAll() { return [] },
    showModal() { node.open = true },
    close() { node.open = false },
  }
  return node
}

/**
 * 启动一份工作台页面。
 * @param {{hash?: string, width?: number, storage?: Record<string,string>, mutateDemo?: (demo:any)=>void}} opts
 */
export function bootWorkbench(opts = {}) {
  const hash = opts.hash || '#onechart'
  const width = opts.width ?? 700
  const storage = new Map(Object.entries(opts.storage || {}))
  const handlers = { click: [], change: [], input: [], focusin: [] }
  const windowHandlers = {}
  const nodes = new Map()
  const arrays = {}

  const view = makeNode('#view', { width })
  nodes.set('#view', view)
  nodes.set('#view-sub-count', makeNode('#view-sub-count'))
  nodes.set('.onechart-layout', makeNode('.onechart-layout', { closestMap: { '#view': view } }))
  nodes.set('#onechart-collapsed .oc-sum', makeNode('#onechart-collapsed .oc-sum'))
  nodes.set('#picker-count', makeNode('#picker-count'))
  nodes.set('#chart-panel', makeNode('#chart-panel'))
  nodes.set('#chart-sub', makeNode('#chart-sub'))
  nodes.set('#subnav-dock', makeNode('#subnav-dock'))
  nodes.set('#toast', makeNode('#toast'))

  /* 一级导航锚点（可选）：给 render() 打 aria-current 用，顺序与 index.html 一致 */
  if (opts.navRoutes) {
    arrays['#navList a'] = opts.navRoutes.map((route) => {
      const a = makeNode('nav:' + route)
      a.setAttribute('data-route', route)
      return a
    })
  }
  /* 页内二级页签（可选）：paintSubnavDock 会把它抄到停靠位 */
  if (opts.subnavHtml !== undefined) {
    const sub = makeNode('#view .subnav')
    sub.innerHTML = opts.subnavHtml
    nodes.set('#view .subnav', sub)
  }

  /* 页头与收起条各有一颗「展开/收起指标」按钮：applyOnechartLayout 必须两颗都更新 */
  const headToggle = makeNode('head-toggle')
  headToggle.setAttribute('data-act', 'toggle-onechart-side')
  headToggle.setAttribute('data-role', 'onechart-toggle-head')
  const barToggle = makeNode('bar-toggle')
  barToggle.setAttribute('data-act', 'toggle-onechart-side')
  barToggle.setAttribute('data-role', 'onechart-toggle-bar')
  arrays['[data-act="toggle-onechart-side"]'] = [headToggle, barToggle]

  const document = {
    readyState: 'complete',
    activeElement: null,
    body: { scrollHeight: 1000 },
    addEventListener(type, fn) { (handlers[type] = handlers[type] || []).push(fn) },
    querySelector(selector) { return nodes.has(selector) ? nodes.get(selector) : null },
    querySelectorAll(selector) { return arrays[selector] ? arrays[selector].slice() : [] },
  }

  const window = {
    addEventListener(type, fn) { windowHandlers[type] = fn },
    scrollTo() {},
    parent: null,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null },
      setItem(key, value) { storage.set(key, String(value)) },
      removeItem(key) { storage.delete(key) },
    },
  }

  const location = { hash, pathname: '/api/cll/ui/index.html', origin: 'http://127.0.0.1:8317' }

  const demo = readFileSync(join(ROOT, 'public/demo-data.js'), 'utf8')
  new Function('window', demo)(window)
  if (opts.mutateDemo) opts.mutateDemo(window.LYMPAL_DEMO)

  const app = readFileSync(join(ROOT, 'public/app.js'), 'utf8')
  new Function('window', 'document', 'location', 'fetch', app)(
    window,
    document,
    location,
    () => Promise.reject(new Error('harness: 不走网络')),
  )

  function eventTarget(act, attrs) {
    const el = makeNode('event-target')
    el.setAttribute('data-act', act)
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v))
    return el
  }

  function handlerOf(type) {
    const list = handlers[type]
    if (!list || !list.length) throw new Error(`app.js 没有注册 document ${type} 委托`)
    return list
  }

  return {
    window,
    document,
    view,
    nodes,
    arrays,
    storage,
    headToggle,
    barToggle,
    fireClick(act, attrs) {
      const el = eventTarget(act, attrs)
      const event = { target: { closest: (s) => (s === '[data-act]' ? el : null) } }
      handlerOf('click').forEach((fn) => fn(event))
      return el
    },
    fireChange(act, attrs, checked) {
      const el = eventTarget(act, attrs)
      el.checked = checked === undefined ? true : !!checked
      const event = { target: { closest: (s) => (s === `[data-act="${act}"]` ? el : null) } }
      handlerOf('change').forEach((fn) => fn(event))
      return el
    },
    get html() { return view.innerHTML },
    text(selector) { return nodes.has(selector) ? nodes.get(selector).textContent : '' },
  }
}