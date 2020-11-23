/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-25 16:46:06
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-23 19:07:22
 * @Description: 
 */

let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let alipayUnlocker = singletonRequire('AlipayUnlocker')
let widgetUtils = singletonRequire('WidgetUtils')
let logUtils = singletonRequire('LogUtils')
let automator = singletonRequire('Automator')
let floatyUtil = singletonRequire('FloatyUtil')

function CreditRunner () {

  let _package_name = 'com.eg.android.AlipayGphone'
  let _family_regex = /^\+(\d+)$/

  this.collectFamily = false

  this.openCreditPage = function () {
    commonFunctions.launchPackage(_package_name, false)
    sleep(500)
    if (config.is_alipay_locked) {
      alipayUnlocker.unlockAlipay()
    }
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=20000160&url=%2Fwww%2FmyPoints.html',
      packageName: _package_name
    })
    sleep(500)
    floatyUtil.setFloatyText('校验是否有打开确认弹框')
    let confirm = widgetUtils.widgetGetOne(/^打开$/, 3000)
    if (confirm) {
      sleep(500)
      floatyUtil.setFloatyInfo(
        {
          x: confirm.bounds().centerX(),
          y: confirm.bounds().centerY()
        },
        '找到了确认打开按钮')
      automator.clickCenter(confirm)
    } else {
      floatyUtil.setFloatyText('没有打开确认弹框')
    }
  }


  /**
   * 判断比例 是不是正方形
   * @param {目标控件} bounds 
   */
  this.isCollectableBall = function (bounds) {
    if (bounds) {
      let flag = Math.abs(bounds.width() - bounds.height()) <= 10 && bounds.width() > 30
      logUtils.debugInfo(['校验控件形状是否符合：[{}, {}] result: {}', bounds.width(), bounds.height(), flag])
      return flag
    }
    return false
  }

  this.canCollect = function (val) {
    let bounds = val.bounds()
    return this.isCollectableBall(bounds)
  }

  this.collectCredits = function (position, regex) {
    // 等待稳定
    sleep(1000)
    let widgets = widgetUtils.widgetGetAll(regex, null, true)
    let collected = true
    while (widgets && collected) {
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
      collected = totalCollect > 0
      if (collected) {
        sleep(1000)
        // 再次检测, 缩短检测超时时间为两秒
        widgets = widgetUtils.widgetGetAll(regex, 2000, true)
      }
    }
  }

  this.checkAndCollect = function () {
    floatyUtil.setFloatyTextColor('#00ff00')
    floatyUtil.setFloatyText('等待会员积分控件')
    let target = widgetUtils.widgetGetOne(/^\s*今日签到.*(\d+)$/)
    if (target) {
      floatyUtil.setFloatyInfo(
        {
          x: target.bounds().centerX(),
          y: target.bounds().centerY()
        },
        '等待会员积分控件成功，准备进入签到页面'
      )
      automator.clickCenter(target)
      sleep(1000)
      target = widgetUtils.widgetGetOne('签到领积分')
      if (target) {
        floatyUtil.setFloatyInfo(
          {
            x: target.bounds().centerX(),
            y: target.bounds().centerY()
          },
          '进入签到页面成功'
        )
        sleep(200)
        automator.clickCenter(target)
        sleep(500)
        automator.back()
      }
    } else {
      floatyUtil.setFloatyTextColor('#ff0000')
      floatyUtil.setFloatyText('未找到待领取积分')
      logUtils.logInfo(['未找到待领取积分'], true)
    }
    sleep(500)
    floatyUtil.setFloatyTextColor('#00ff00')
    floatyUtil.setFloatyText('检测是否有今日支付积分')
    // 今日支付积分
    target = widgetUtils.widgetGetOne('全部领取')
    if (target) {
      floatyUtil.setFloatyInfo(
        {
          x: target.bounds().centerX(),
          y: target.bounds().centerY()
        },
        '找到了支付积分，准备收取'
      )
      automator.clickCenter(target)
    } else {
      floatyUtil.setFloatyTextColor('#ff0000')
      floatyUtil.setFloatyText('未找到今日支付积分')
    }
    sleep(500)
  }

  this.checkFamilyCredit = function () {
    sleep(2000)
    floatyUtil.setFloatyText('等待家庭积分控件')
    let limit = 5
    let target = widgetUtils.widgetGetOne(/家庭积分.*\d+|家庭积分待领取/)
    sleep(200)
    if (target) {
      floatyUtil.setFloatyInfo(
        {
          x: target.bounds().centerX(),
          y: target.bounds().centerY()
        },
        '家庭积分'
      )
      automator.clickCenter(target)
      if (widgetUtils.widgetWaiting('.*家庭共享积分.*', limit === 0 ? 2000 : null)) {
        floatyUtil.setFloatyText('进入家庭积分页面成功，等待3秒福袋动画结束')
        sleep(2000)
        this.collectFamily = true
        this.collectCredits('家庭积分', _family_regex)
        automator.back()
      } else {
        floatyUtil.setFloatyTextColor('#ff0000')
        floatyUtil.setFloatyText('进入家庭积分页面失败')
        logUtils.logInfo(['未找到待领取家庭积分'], true)
      }
    } else {
      floatyUtil.setFloatyText('未找到待领取的家庭积分')
    }
    sleep(500)
  }


  this.exec = function () {
    floatyUtil.init()
    floatyUtil.setFloatyPosition(400, 400)
    floatyUtil.setFloatyText('准备打开领取积分页面')
    this.openCreditPage()
    floatyUtil.setFloatyText('准备领取家庭积分')
    this.checkFamilyCredit()
    floatyUtil.setFloatyText('准备领取积分')
    this.checkAndCollect()
    floatyUtil.setFloatyText('领取完毕')
    commonFunctions.minimize()
  }
}


module.exports = new CreditRunner()
