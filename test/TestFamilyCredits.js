let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let widgetUtils = singletonRequire('WidgetUtils')
let logUtils = singletonRequire('LogUtils')
let widgets = widgetUtils.widgetGetAll(/^\+(\d+)$/, null, true)
if (widgets) {
  let targets = widgets.target
  let isDesc = widgets.isDesc
  targets.forEach(val => {
    let contentInfo = isDesc ? val.desc() : val.text()
    toastLog(contentInfo + " bounds: " + JSON.stringify(val.bounds()))
    let bounds = val.bounds()
    let flag = Math.abs(bounds.width() - bounds.height()) <= 10 && bounds.width() > 30
    logUtils.debugInfo(['校验控件形状是否符合：[{}, {}] result: {}', bounds.width(), bounds.height(), flag])
  })
} else {
  toastLog('未找到对象')
}