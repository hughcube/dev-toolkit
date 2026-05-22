/**
 * UniApp manifest.json 统一更新工具
 */

const fs = require('fs')
const path = require('path')
const { parse, stringify } = require('comment-json')

class UniappManifestUpdater {
    constructor() {
        this.manifestPath = path.join(process.cwd(), 'src/manifest.json')
        this.parseArgs()
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

        // 解析 version 参数
        const versionIndex = args.findIndex(arg => arg === '--version')
        this.version = (versionIndex !== -1 && args[versionIndex + 1]) ? args[versionIndex + 1] : null

        // 解析 h5-public-path 参数
        const pathIndex = args.findIndex(arg => arg === '--h5-public-path')
        this.h5PublicPath = (pathIndex !== -1 && args[pathIndex + 1]) ? args[pathIndex + 1] : null

        // 解析 mp-weixin-appid 参数
        const appidIndex = args.findIndex(arg => arg === '--mp-weixin-appid')
        this.mpWeixinAppid = (appidIndex !== -1 && args[appidIndex + 1]) ? args[appidIndex + 1] : null

        // 检查是否为调试模式
        this.debugMode = args.includes('--debug')

        // 如果没有任何参数，显示帮助
        if (!this.version && !this.h5PublicPath && !this.mpWeixinAppid && args.length === 0) {
            this.showHelp()
            process.exit(0)
        }

        // 如果没有任何有效参数但有其他参数，提示错误
        if (!this.version && !this.h5PublicPath && !this.mpWeixinAppid && args.length > 0 && !this.debugMode) {
            console.error('❌ 请至少提供一个有效参数 (--version 或 --h5-public-path 或 --mp-weixin-appid)')
            console.error('使用 --help 查看帮助信息')
            process.exit(1)
        }

        // 处理版本号格式
        if (this.version) {
            // 确保版本号有 v 前缀
            if (!this.version.startsWith('v') && !this.version.startsWith('V')) {
                this.version = 'v' + this.version
            }

            // 验证版本号格式
            const versionWithoutV = this.version.replace(/^v/i, '')
            if (!/^(\d+\.)*\d+$/.test(versionWithoutV)) {
                console.error(`❌ 版本号格式错误: ${this.version}，应为 vx.x.x... 格式（支持任意位数）`)
                process.exit(1)
            }
        }

        // 处理 publicPath 格式
        if (this.h5PublicPath) {
            // 确保以 / 结尾
            if (!this.h5PublicPath.endsWith('/')) {
                this.h5PublicPath = this.h5PublicPath + '/'
            }
        }
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        console.log(`
UniApp manifest.json 统一更新工具

使用方法:
  hctoolkit-uniapp-manifest-updater [选项]

参数:
  --version <版本号>              更新版本号 (格式: vx.x.x...，支持任意位数)
  --h5-public-path <路径>         更新 h5 publicPath
  --mp-weixin-appid <appid>       更新微信小程序 appid
  --debug                         启用调试模式，显示详细信息
  --help, -h                      显示帮助信息

示例:
  # 只更新版本号
  hctoolkit-uniapp-manifest-updater --version v1.2.3
  
  # 只更新 publicPath
  hctoolkit-uniapp-manifest-updater --h5-public-path /static/
  hctoolkit-uniapp-manifest-updater --h5-public-path 'https://cdn.example.com/app/'
  
  # 只更新微信小程序 appid
  hctoolkit-uniapp-manifest-updater --mp-weixin-appid wx1234567890abcdef
  
  # 同时更新版本号和 publicPath
  hctoolkit-uniapp-manifest-updater --version v1.2.3 --h5-public-path /static/
  hctoolkit-uniapp-manifest-updater --version v2.0.0 --h5-public-path 'https://pcdn.x4k.net/p/ocula/h5/web/\${BUILD_NUMBER}/'
  
  # 同时更新版本号和微信小程序 appid
  hctoolkit-uniapp-manifest-updater --version v1.2.3 --mp-weixin-appid wx1234567890abcdef
  
  # 同时更新多个配置
  hctoolkit-uniapp-manifest-updater --version v1.2.3 --h5-public-path /static/ --mp-weixin-appid wx1234567890abcdef
  
  # 调试模式
  hctoolkit-uniapp-manifest-updater --version v1.2.3 --debug

功能:
  1. 更新 src/manifest.json 中的版本信息 (versionName, versionCode)
  2. 更新 src/manifest.json 中的 h5.publicPath
  3. 更新 src/manifest.json 中的 mp-weixin.appid
  4. 自动计算 versionCode (每个版本部分占用3位数字)
  5. 如果不存在 h5 或 mp-weixin 配置，会自动创建
  6. 支持相对路径和完整 URL (publicPath 必须以 / 结尾)
  7. 保留 manifest.json 中的注释（解析与写回均不丢失）
  8. 支持跨平台运行 (Windows, macOS, Linux)
`)
    }

    /**
     * 计算 versionCode
     * 将版本号转换为数字，每个版本部分占用3位数字
     */
    calculateVersionCode(version) {
        const versionWithoutV = version.replace(/^v/i, '')
        const parts = versionWithoutV.split('.')

        if (parts.length === 0) {
            throw new Error('版本号格式错误，至少需要一个数字')
        }

        // 验证每个部分都是有效数字且不超过999
        for (let i = 0; i < parts.length; i++) {
            const num = parseInt(parts[i])
            if (isNaN(num) || num < 0) {
                throw new Error(`版本号部分 "${parts[i]}" 不是有效的非负整数`)
            }
            if (num > 999) {
                throw new Error(`版本号部分 ${num} 超过最大值 999（每部分最多3位数字）`)
            }
        }

        // 将每个部分转换为3位数字字符串，然后连接
        const paddedParts = parts.map(part => {
            const num = parseInt(part)
            return num.toString().padStart(3, '0')
        })

        const versionCodeStr = paddedParts.join('')
        const versionCode = parseInt(versionCodeStr)

        if (versionCode > Number.MAX_SAFE_INTEGER) {
            throw new Error('版本号过长，计算出的 versionCode 超过安全范围')
        }

        return versionCode
    }

    /**
     * 更新 manifest.json 文件
     */
    updateManifest() {
        console.log('📝 更新 manifest.json...')
        console.log('   文件路径:', this.manifestPath)

        if (this.version) {
            console.log('   目标版本:', this.version)
        }
        if (this.h5PublicPath) {
            console.log('   目标路径:', this.h5PublicPath)
        }
        if (this.mpWeixinAppid) {
            console.log('   目标appid:', this.mpWeixinAppid)
        }

        try {
            // 检查文件是否存在
            if (!fs.existsSync(this.manifestPath)) {
                throw new Error(`manifest.json 文件不存在: ${this.manifestPath}`)
            }

            // 读取 manifest.json
            const manifestContent = fs.readFileSync(this.manifestPath, 'utf8')

            if (this.debugMode) {
                console.log('🔍 调试信息:')
                console.log('   原始文件大小:', manifestContent.length)
            }

            // 解析带注释的 JSON（comment-json 保留注释，写回时不丢失）
            const manifest = parse(manifestContent)
            if (this.debugMode) {
                console.log('✅ 解析成功')
            }

            // 更新版本信息
            if (this.version) {
                const versionCode = this.calculateVersionCode(this.version)
                const oldVersionName = manifest.versionName || '未设置'
                const oldVersionCode = manifest.versionCode || '未设置'

                manifest.versionName = this.version
                manifest.versionCode = versionCode.toString()

                console.log('✅ 版本信息更新成功:')
                console.log('   versionName:', oldVersionName, '->', this.version)
                console.log('   versionCode:', oldVersionCode, '->', versionCode)
            }

            // 更新 h5 publicPath
            if (this.h5PublicPath) {
                const oldPublicPath = (manifest.h5 && manifest.h5.publicPath) ? manifest.h5.publicPath : '未设置'

                // 确保 h5 配置存在
                if (!manifest.h5) {
                    manifest.h5 = {}
                }

                manifest.h5.publicPath = this.h5PublicPath

                console.log('✅ publicPath 更新成功:')
                console.log('   h5.publicPath:', oldPublicPath, '->', this.h5PublicPath)
            }

            // 更新微信小程序 appid
            if (this.mpWeixinAppid) {
                const oldAppid = (manifest['mp-weixin'] && manifest['mp-weixin'].appid) ? manifest['mp-weixin'].appid : '未设置'

                // 确保 mp-weixin 配置存在
                if (!manifest['mp-weixin']) {
                    manifest['mp-weixin'] = {}
                }

                manifest['mp-weixin'].appid = this.mpWeixinAppid

                console.log('✅ 微信小程序 appid 更新成功:')
                console.log('   mp-weixin.appid:', oldAppid, '->', this.mpWeixinAppid)
            }

            // 将修改后的对象转换为格式化字符串（保留原有注释）
            const updatedContent = stringify(manifest, null, 2)

            // 写回文件
            fs.writeFileSync(this.manifestPath, updatedContent, 'utf8')

        } catch (error) {
            console.error('❌ 更新 manifest.json 失败:', error.message)
            process.exit(1)
        }
    }

    /**
     * 执行更新
     */
    run() {
        try {
            console.log('🚀 UniApp manifest.json 统一更新工具')
            console.log('============================')
            console.log('🖥️  运行平台:', process.platform)

            if (this.version) {
                console.log('📌 目标版本:', this.version)
            }
            if (this.h5PublicPath) {
                console.log('📌 目标路径:', this.h5PublicPath)
            }
            if (this.mpWeixinAppid) {
                console.log('📌 目标appid:', this.mpWeixinAppid)
            }

            console.log('============================')

            this.updateManifest()

            console.log('============================')
            console.log('✅ 更新完成！')
        } catch (error) {
            console.error('❌ 执行失败:', error.message)
            process.exit(1)
        }
    }
}

module.exports = UniappManifestUpdater; 