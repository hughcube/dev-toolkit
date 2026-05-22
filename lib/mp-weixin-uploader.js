/**
 * 微信小程序上传工具
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

class MpWeixinUploader {
    constructor() {
        this.parseArgs()
        this.validateConfig()
    }

    /**
     * 解析命令行参数
     */
    parseArgs() {
        const args = process.argv.slice(2)

        if (args.includes('--help') || args.includes('-h')) {
            this.showHelp()
            process.exit(0)
        }

        // CLI 参数解析
        const getArgValue = (flags) => {
            for (const flag of flags) {
                const index = args.findIndex(arg => arg === flag)
                if (index !== -1 && args[index + 1]) {
                    return args[index + 1]
                }
            }
            return null
        }

        // 获取命令行参数
        this.appId = getArgValue(['--app-id', '-a']) || null
        this.distDir = getArgValue(['--dist-dir', '-d']) || null
        this.version = getArgValue(['--version', '-v']) || null
        this.privateKeyPath = getArgValue(['--private-key', '-k']) || null
        this.versionDescribe = getArgValue(['--version-describe']) || null
        this.robot = parseInt(getArgValue(['--robot', '-r']) || '1', 10)

        // 解析 setting 相关参数
        this.parseSettingArgs(args)

        // 确保版本号有 v 前缀
        if (this.version && !this.version.startsWith('v') && !this.version.startsWith('V')) {
            this.version = 'v' + this.version
        }

        // 设置默认版本描述
        if (!this.versionDescribe && this.version) {
            this.versionDescribe = `版本 ${this.version} 自动上传`
        }

        // 如果没有指定私钥路径，尝试默认路径
        if (!this.privateKeyPath && this.appId) {
            this.privateKeyPath = path.join(os.homedir(), `.miniprogram-ci/private.${this.appId}.key`)
        }
    }

    /**
 * 解析 setting 相关参数
 * @param {string[]} args 命令行参数数组
 */
    parseSettingArgs(args) {
        this.settings = {}

        // 解析 CLI 参数中以 --setting- 开头的参数
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            if (arg.startsWith('--setting-') && args[i + 1] !== undefined) {
                // 提取 setting 后面的部分，如 --setting-es6 -> es6, --setting-ab-cd -> abCd
                const settingKey = arg.substring(10) // 去掉 '--setting-' 前缀
                const camelCaseKey = this.mapSettingKey(settingKey)
                const value = this.parseSettingValue(args[i + 1])
                this.settings[camelCaseKey] = value
                i++ // 跳过值参数
            }
        }
    }

    /**
     * 映射 setting 参数名，处理特殊情况
     * @param {string} settingKey kebab-case 的 setting 参数名
     * @returns {string} 正确的 camelCase 属性名
     */
    mapSettingKey(settingKey) {
        // 特殊映射表，用于处理微信小程序特有的参数名
        const settingKeyMap = {
            'es6': 'es6',
            'es7': 'es7',
            'minify': 'minify',
            'code-protect': 'codeProtect',
            'minify-js': 'minifyJS',
            'minify-wxml': 'minifyWXML',
            'minify-wxss': 'minifyWXSS',
            'auto-prefix-wxss': 'autoPrefixWXSS'
        }

        // 如果在映射表中找到，直接返回映射的值
        if (settingKeyMap.hasOwnProperty(settingKey)) {
            return settingKeyMap[settingKey]
        }

        // 否则使用通用的 kebab-case 转 camelCase
        return this.kebabToCamelCase(settingKey)
    }

    /**
     * 将 kebab-case 转换为 camelCase
     * @param {string} str kebab-case 字符串
     * @returns {string} camelCase 字符串
     */
    kebabToCamelCase(str) {
        return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())
    }

    /**
     * 解析 setting 值，自动转换数据类型
     * @param {string} value 原始值
     * @returns {boolean|string} 转换后的值
     */
    parseSettingValue(value) {
        // 布尔值转换
        if (value === 'true') return true
        if (value === 'false') return false

        // 其他情况保持字符串
        return value
    }

    /**
     * 构建编译设置对象
     * @returns {object} 编译设置对象
     */
    buildSetting() {
        // 只保留 minify 的默认值，其他设置全部从外部读取
        const setting = {
            minify: true
        }

        // 如果用户通过参数或环境变量传递了设置，则添加到 setting 中
        if (this.settings && Object.keys(this.settings).length > 0) {
            Object.keys(this.settings).forEach(key => {
                setting[key] = this.settings[key]
            })
        }

        return setting
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        console.log(`
微信小程序上传工具

使用方法:
  hctoolkit-mp-weixin-uploader --app-id <AppID> --dist-dir <目录> --version <版本> --private-key <私钥文件>

参数:
  --app-id, -a           小程序 APPID (必填)
  --dist-dir, -d         构建产物目录 (必填)
  --version, -v          版本号 (必填，格式: vx.x.x)
  --private-key, -k      私钥文件路径 (必填)
  --version-describe     版本描述 (可选)
  --robot, -r            机器人编号 (可选，默认1)
  --setting-*            编译设置参数 (可选)
  --help, -h             显示帮助信息

编译设置参数 (可选):
  --setting-es6                ES6 转 ES5 (true/false)
  --setting-es7                ES7 转 ES5 (true/false)  
  --setting-minify             压缩代码 (true/false)
  --setting-code-protect       代码保护 (true/false)
  --setting-minify-js          压缩 JS (true/false)
  --setting-minify-wxml        压缩 WXML (true/false)
  --setting-minify-wxss        压缩 WXSS (true/false)
  --setting-auto-prefix-wxss   自动补全 WXSS (true/false)
  --setting-<custom-name>      自定义设置 (kebab-case 转 camelCase)

示例:
  hctoolkit-mp-weixin-uploader \\
    --app-id wx650d85ca4330d458 \\
    --dist-dir ./dist/build/mp-weixin \\
    --version v1.2.3 \\
    --private-key ./private.wx.key \\
    --version-describe "新版本发布" \\
    --robot 1 \\
    --setting-es6 true \\
    --setting-minify false \\
    --setting-custom-option true

前置条件:
  1. 安装依赖: npm install miniprogram-ci
  2. 准备私钥文件: 从微信公众平台下载代码上传密钥
  3. 确保构建产物目录存在
  4. 支持跨平台运行 (Windows, macOS, Linux)

获取私钥文件:
  1. 登录微信公众平台 https://mp.weixin.qq.com
  2. 进入开发 -> 开发管理 -> 开发设置 -> 小程序代码上传
  3. 生成并下载代码上传密钥
`)
    }

    /**
     * 验证配置
     */
    validateConfig() {
        const errors = []

        if (!this.appId) {
            errors.push('❌ 缺少小程序 APPID')
            errors.push('   请使用 --app-id 参数')
        }

        if (!this.distDir) {
            errors.push('❌ 缺少构建产物目录')
            errors.push('   请使用 --dist-dir 参数')
        } else if (!fs.existsSync(this.distDir)) {
            errors.push(`❌ 构建产物目录不存在: ${this.distDir}`)
        }

        if (!this.version) {
            errors.push('❌ 缺少版本号')
            errors.push('   请使用 --version 参数')
        } else {
            // 验证版本号格式（去掉v前缀后验证）
            const versionWithoutV = this.version.replace(/^v/i, '')
            if (!/^\d+\.\d+\.\d+$/.test(versionWithoutV)) {
                errors.push(`❌ 版本号格式错误: ${this.version}，应为 vx.x.x 格式`)
            }
        }

        if (!this.privateKeyPath) {
            errors.push('❌ 缺少私钥文件路径')
            errors.push('   请使用 --private-key 参数')
        } else if (!fs.existsSync(this.privateKeyPath)) {
            errors.push(`❌ 私钥文件不存在: ${this.privateKeyPath}`)
        }

        // 验证机器人编号（微信支持 1-30）
        if (!Number.isInteger(this.robot) || this.robot < 1 || this.robot > 30) {
            errors.push('❌ 机器人编号无效，--robot 应为 1-30 的整数')
        }

        if (errors.length > 0) {
            console.error('\n配置验证失败:')
            errors.forEach(err => console.error(err))
            console.error('\n请确保提供了所有必需参数。使用 --help 查看详细说明。\n')
            process.exit(1)
        }
    }

    /**
     * 上传小程序代码
     * @returns {Promise<boolean>}
     */
    async upload() {
        console.log('\n📤 开始上传小程序代码...')
        console.log(`   版本号: ${this.version}`)
        console.log(`   版本描述: ${this.versionDescribe}`)
        console.log(`   项目路径: ${this.distDir}`)
        console.log(`   机器人编号: ${this.robot}`)

        try {
            // 直接执行上传逻辑
            const ci = require('miniprogram-ci')
            const versionWithoutV = this.version.replace(/^v/i, '')

            const project = new ci.Project({
                appid: this.appId,
                type: 'miniProgram',
                projectPath: this.distDir,
                privateKeyPath: this.privateKeyPath,
                ignores: ['node_modules/**/*']
            })

            const uploadResult = await ci.upload({
                project,
                version: versionWithoutV,
                desc: this.versionDescribe,
                robot: this.robot,
                setting: this.buildSetting()
            })

            console.log('上传结果:', uploadResult)
            console.log('✅ 微信小程序上传成功')
            return true
        } catch (error) {
            console.error('❌ 代码上传失败:', error.message)
            return false
        }
    }

    /**
     * 查询版本状态（暂不实现具体查询，微信没有公开的查询API）
     * @return {Promise<{found: boolean, version: string, status: string}>}
     */
    async queryVersionStatus() {
        console.log('\n🔍 查询版本状态...')
        console.log('   注意：微信小程序暂不支持自动查询版本状态')
        console.log('   请手动登录微信公众平台查看上传结果')

        return {
            found: true,
            version: this.version.replace(/^v/i, ''),
            status: '已上传',
        }
    }

    /**
     * 执行上传流程
     */
    async run() {
        console.log('🚀 微信小程序上传工具')
        console.log('============================')
        console.log('🖥️  运行平台:', process.platform)
        console.log('📱 小程序 APPID:', this.appId)
        console.log('📌 版本号:', this.version)
        console.log('📝 版本描述:', this.versionDescribe)
        console.log('🔑 私钥文件:', this.privateKeyPath)
        console.log('🤖 机器人编号:', this.robot)
        console.log('📂 输出目录:', this.distDir)
        console.log('============================')

        // 显示最终使用的编译设置
        const finalSettings = this.buildSetting()
        console.log('⚙️  最终编译设置:')
        Object.keys(finalSettings).forEach(key => {
            const source = this.settings && this.settings.hasOwnProperty(key) ? '(外部指定)' : '(默认值)'
            console.log(`   ${key}: ${finalSettings[key]} ${source}`)
        })

        console.log('============================\n')

        try {
            // 上传代码
            const uploadSuccess = await this.upload()
            if (!uploadSuccess) {
                console.log('\n🔗 请手动登录微信公众平台：')
                console.log('   https://mp.weixin.qq.com/')
                console.error('\n❌ 上传失败，流程中止')
                process.exit(1)
            }

            console.log('\n✅ 代码上传流程完成！')
            console.log('============================')
            console.log('📱 请登录微信公众平台完成审核提交')
            console.log('🔗 https://mp.weixin.qq.com/')
            console.log('💡 进入版本管理 -> 开发版本，选择刚上传的版本提交审核')
            console.log('📋 建议您手动验证版本是否已成功上传')

        } catch (error) {
            console.error('❌ 执行失败:', error)
            process.exit(1)
        }
    }
}

module.exports = MpWeixinUploader; 