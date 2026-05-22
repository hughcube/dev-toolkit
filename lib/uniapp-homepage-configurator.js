/**
 * UniApp 小程序启动首页配置工具
 */

const fs = require('fs')
const path = require('path')
const { parse, stringify } = require('comment-json')

class UniappHomepageConfigurator {
    constructor(options = {}) {
        // 如果没有传入 options，则解析命令行参数
        if (Object.keys(options).length === 0) {
            this.parseArgs()
        } else {
            // 编程接口调用时直接使用传入的 options
            this.pageConfig = options.pageConfig || path.join(process.cwd(), 'src/pages.json')
            this.appId = options.appId
            this.platform = options.platform
            this.page = options.page
        }
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

        this.appId = getArgValue(['--app-id'])
        this.platform = getArgValue(['--platform'])
        this.page = getArgValue(['--page'])
        this.pageConfig = getArgValue(['--page-config']) || path.join(process.cwd(), 'src/pages.json')

        // 参数验证
        if (!this.page && (!this.appId || !this.platform)) {
            console.error('❌ 参数错误：必须提供 --page 或者 (--app-id 和 --platform)')
            console.error('使用方法: hctoolkit-uniapp-homepage-configurator --app-id <AppID> --platform <平台>')
            process.exit(1)
        }
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        console.log(`
UniApp 小程序启动首页配置工具

使用方法:
  hctoolkit-uniapp-homepage-configurator --app-id <AppID> --platform <平台> [选项]
  或
  hctoolkit-uniapp-homepage-configurator --page <页面路径> [选项]

参数:
  --app-id         小程序 AppID (与 platform 配合使用)
  --platform       平台类型 (任意字符串)
  --page           直接指定页面路径
  --page-config    pages.json 文件路径 (可选，默认: src/pages.json)
  --help, -h       显示帮助信息

示例:
  # 根据 AppID 和平台自动匹配页面
  hctoolkit-uniapp-homepage-configurator --app-id wx123456789 --platform mp-weixin
  
  # 直接指定页面路径
  hctoolkit-uniapp-homepage-configurator --page pages/order/index
  
  # 自定义 pages.json 路径
  hctoolkit-uniapp-homepage-configurator --app-id 2021005160675311 --platform mp-alipay --page-config ./src/pages.json

功能:
  1. 根据小程序 AppID 和平台自动匹配首页路径
  2. 支持直接指定页面路径
  3. 自动更新 pages.json 文件，将目标页面设置为启动首页
  4. 支持任意平台类型
  5. 支持自定义 pages.json 文件路径

配置匹配规则:
  从 src/config/features.js 文件中根据 AppID 匹配对应的页面路径:
  - mp-weixin: 匹配 wxmp_appid 字段
  - mp-alipay: 匹配 alimp_appid 字段
  - 其他平台: 匹配 <platform>_appid 字段 (如: mp-toutiao -> mp-toutiao_appid, custom -> custom_appid)
  匹配成功后使用对应的 order_path 作为首页路径
`)
    }

    findTargetPagePaths() {
        if (this.page) {
            return [this.page]
        }

        if (this.appId && this.platform) {
            return this.getMatchedPagePaths(this.appId, this.platform)
        }

        throw new Error('未能确定目标页面路径')
    }

    getMatchedPagePaths(appId, platform) {
        const normalizedPlatform = platform.toLowerCase()

        // 生成 appId 字段名：支持常见平台映射 + 通用格式
        let appIdFieldName = normalizedPlatform + '_appid'

        const featuresPath = path.join(process.cwd(), 'src/config/features.js')
        if (!fs.existsSync(featuresPath)) {
            throw new Error(`features.js 不存在: ${featuresPath}`)
        }

        const featuresContent = fs.readFileSync(featuresPath, 'utf8')
        // 仅去掉 export default；注释交给 eval（JS 引擎）处理，不会误伤字符串里的 //
        const cleanContent = featuresContent.replace(/export\s+default\s+/, '')

        const features = eval('(' + cleanContent + ')')
        const matchedPagePaths = []

        for (const [key, feature] of Object.entries(features)) {
            if (feature[appIdFieldName] === appId && feature.order_path) {
                matchedPagePaths.push(feature.order_path)
            }
        }

        return matchedPagePaths
    }

    updatePagesHomepage(candidatePaths) {
        if (!fs.existsSync(this.pageConfig)) {
            throw new Error(`pages.json 不存在: ${this.pageConfig}`)
        }

        const pagesContent = fs.readFileSync(this.pageConfig, 'utf8')
        // comment-json 解析，保留注释；写回时不丢失
        const pagesConfig = parse(pagesContent)
        if (!pagesConfig.pages || !Array.isArray(pagesConfig.pages)) {
            throw new Error('pages.json 格式错误：缺少 pages 数组')
        }

        let targetPageIndex = -1
        let selectedPath = null

        for (const candidatePath of candidatePaths) {
            const normalizedPath = candidatePath.replace(/^\//, '')
            const pageIndex = pagesConfig.pages.findIndex(page => page.path === normalizedPath)

            if (pageIndex !== -1) {
                targetPageIndex = pageIndex
                selectedPath = normalizedPath
                break
            }
        }

        if (targetPageIndex === -1) {
            throw new Error(`未找到任何有效的页面路径`)
        }

        if (targetPageIndex === 0) {
            return {success: true, message: `页面${selectedPath}已经是启动首页`}
        }

        const targetPage = pagesConfig.pages.splice(targetPageIndex, 1)[0]
        pagesConfig.pages.unshift(targetPage)

        const updatedContent = stringify(pagesConfig, null, 2)
        fs.writeFileSync(this.pageConfig, updatedContent, 'utf8')

        return {success: true, message: `已将页面${selectedPath}设置为启动首页`}
    }

    run() {
        try {
            const candidatePagePaths = this.findTargetPagePaths()
            const result = this.updatePagesHomepage(candidatePagePaths)

            // 如果是命令行调用（即构造函数中解析了参数），输出结果并退出
            if (process.argv.length > 2) {
                console.log('🚀 UniApp 小程序启动首页配置工具')
                console.log('============================')
                console.log('✅', result.message)
                process.exit(0)
            }

            return result
        } catch (error) {
            // 如果是命令行调用，输出错误并退出
            if (process.argv.length > 2) {
                console.error('❌ 执行失败:', error.message)
                process.exit(1)
            }

            throw error
        }
    }
}

module.exports = UniappHomepageConfigurator; 