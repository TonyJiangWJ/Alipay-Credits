/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-25 16:46:06
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-06-09 10:19:05
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
  let _family_regex = /^\+(\d+)$/
  let _sign_regex = /^(\d+)$/

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
      sleep(500)
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

  this.collectCredits = function (position, regex) {
    // 等待稳定
    sleep(1000)
    let widgets = widgetUtils.widgetGetAll(regex, null, true)
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
          totalCollect += parseInt(regex.exec(contentInfo)[1])
          sleep(500)
        }
      })
      logUtils.infoLog(['{} 总共领取：「{}」分', position, totalCollect])
    }
  }

  this.checkAndCollect = function () {
    if (widgetUtils.widgetWaiting(_sign_regex)) {
      // 等待稳定
      this.collectCredits('会员积分', _sign_regex)
      sleep(1000)
    } else {
      logUtils.logInfo(['未找到待领取积分'], true)
    }
  }

  this.checkFamilyCredit = function () {
    sleep(1500)
    if (widgetUtils.widgetWaiting('.*家庭积分.*')) {
      sleep(1000)
      let target = widgetUtils.widgetGetOne('.*家庭积分.*')
      automator.clickCenter(target)
      sleep(1000)
      if (widgetUtils.widgetWaiting(".*成员管理.*")) {
        this.collectCredits('家庭积分', _family_regex)
      } else {
        logUtils.logInfo(['未找到待领取家庭积分'], true)
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