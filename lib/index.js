/**
 * @hughcube/dev-toolkit - 一套完整的开发工具集
 * @author HughCube <hugh.li@foxmail.com>
 * @description 包含小程序版本管理、代码上传、开发配置等功能
 */

module.exports = {
  /**
   * UniApp manifest.json 统一更新器
   */
  UniappManifestUpdater: require('./uniapp-manifest-updater'),

  /**
   * 支付宝小程序上传器
   */
  MpAlipayUploader: require('./mp-alipay-uploader'),

  /**
   * 微信小程序上传器  
   */
  MpWeixinUploader: require('./mp-weixin-uploader'),

  /**
   * UniApp 支付宝小程序开发助手
   */
  UniappMpAlipayDevHelper: require('./uniapp-mp-alipay-dev-helper'),

  /**
   * UniApp 首页配置器
   */
  UniappHomepageConfigurator: require('./uniapp-homepage-configurator'),

  /**
   * UniApp 自定义图标文件更新工具
   */
  UniappUpdateCustomIconFiles: require('./uniapp-update-custom-icon-files'),
}; 