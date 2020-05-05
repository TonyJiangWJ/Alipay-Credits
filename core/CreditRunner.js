/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-25 16:46:06
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-25 18:33:37
 * @Description: 
 */

let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let alipayUnlocker = singletonRequire('AlipayUnlocker')
let widgetUtils = singletonRequire('WidgetUtils')
let logUtils = singletonRequire('LogUtils')
let automator = singletonRequire('Automator')

function CreditRunner () {

  let _package_name = 'com.eg.android.AlipayGphone'
  let _regex = /^\+(\d+)$/

  this.openCreditPage = function () {
    commonFunctions.launchPackage(_package_name, false)
    if (config.is_alipay_locked) {
      alipayUnlocker.unlockAlipay()
    }
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=20000160&url=%2Fwww%2FmyPoints.html',
      packageName: _package_name
    })
    sleep(500)
    let confirm = widgetUtils.widgetGetOne(/^打开$/, 3000)
    if (confirm) {
      automator.clickCenter(confirm)
    }
  }

  this.canCollect = function (val) {
    let bounds = val.bounds()
    if (bounds && bounds.bottom <= 850) {
      return true
    } else {
      return false
    }
  }

  this.collectCredits = function (position) {
    // 等待稳定
    sleep(1000)
    let widgets = widgetUtils.widgetGetAll(_regex, null, true)
    if (widgets) {
      logUtils.logInfo(['总数：{}', widgets.target.length])
      let targets = widgets.target
      let isDesc = widgets.isDesc
      let totalCollect = 0
      targets.forEach(val => {
        let contentInfo = isDesc ? val.desc() : val.text()
        if (this.canCollect(val)) {
          automator.clickCenter(val)
          logUtils.logInfo([
            'value: {}', contentInfo
          ])
          totalCollect += parseInt(_regex.exec(contentInfo)[1])
          sleep(500)
        }
      })
      logUtils.infoLog(['{} 总共领取：「{}」分', position, totalCollect])
    }
  }

  this.checkAndCollect = function () {
    if (widgetUtils.widgetWaiting('做任务赚积分.*') && widgetUtils.widgetWaiting(_regex)) {
      // 等待稳定
      this.collectCredits('会员积分')
    } else {
      logUtils.logInfo(['未找到目标'], true)
    }
  }

  this.checkFamilyCredit = function () {
    if (widgetUtils.widgetWaiting('.*家庭积分.*')) {
      let target = widgetUtils.widgetGetOne('.*家庭积分.*')
      automator.clickCenter(target)
      sleep(1000)
      if (widgetUtils.widgetWaiting(".*成员管理.*")) {
        this.collectCredits('家庭积分')
      } else {
        logUtils.logInfo(['未找到目标'], true)
      }
    }
  }


  this.exec = function () {
    this.openCreditPage()
    this.checkAndCollect()
    this.checkFamilyCredit()
    commonFunctions.minimize()
  }
}


module.exports = new CreditRunner()