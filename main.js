/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-25 18:48:14
 * @Description: 
 */
let { config } = require('./config.js')(runtime, this)
let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, this)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog } = singletonRequire('LogUtils')
let commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')
let unlocker = require('./lib/Unlock.js')
let creditRunner = require('./core/CreditRunner.js')
// 不管其他脚本是否在运行 清除任务队列 适合只使用蚂蚁森林的用户
if (config.single_script) {
  logInfo('======单脚本运行直接清空任务队列=======')
  runningQueueDispatcher.clearAll()
}
logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()
/***********************
 * 初始化
 ***********************/
logInfo('======校验无障碍功能======')
// 检查手机是否开启无障碍服务
// 当无障碍经常莫名消失时  可以传递true 强制开启无障碍
// if (!commonFunctions.checkAccessibilityService(true)) {
if (!commonFunctions.checkAccessibilityService()) {
  try {
    auto.waitFor()
  } catch (e) {
    warnInfo('auto.waitFor()不可用')
    auto()
  }
}
logInfo('---前置校验完成;启动系统--->>>>')
// 打印运行环境信息
if (files.exists('version.json')) {
  let content = JSON.parse(files.read('version.json'))
  logInfo(['版本信息：{} nodeId:{}', content.version, content.nodeId])
} else {
  logInfo('无法获取脚本版本信息')
}

logInfo(['设备分辨率：[{}, {}]', config.device_width, config.device_height])
logInfo('======解锁并校验截图权限======')
try {
  unlocker.exec()
} catch (e) {
  errorInfo('解锁发生异常, 三分钟后重新开始' + e)
  commonFunctions.setUpAutoStart(3)
  runningQueueDispatcher.removeRunningTask()
  exit()
}
logInfo('解锁成功')

/************************
 * 主程序
 ***********************/
commonFunctions.showDialogAndWait(true)
commonFunctions.listenDelayStart()
if (config.develop_mode) {
  creditRunner.exec()
} else {
  try {
    creditRunner.exec()
  } catch (e) {
    commonFunctions.setUpAutoStart(1)
    errorInfo('执行异常, 1分钟后重新开始' + e)
  }
}

if (config.auto_lock === true && unlocker.needRelock() === true) {
  debugInfo('重新锁定屏幕')
  automator.lockScreen()
}
events.removeAllListeners()
events.recycle()
runningQueueDispatcher.removeRunningTask(true)
exit()