
/**
 * UniApp 自定义图标文件更新工具
 * 用于从 ZIP 文件中提取 iconfont.ttf 和 iconfont.css 文件，并将其放置到 UniApp 项目的 static 目录中
 */

const fs = require('fs-extra')
const path = require('path')
const yauzl = require('yauzl')

class UniappUpdateCustomIconFiles {
    constructor() {
        this.workingDir = process.cwd()
        this.staticDir = path.join(this.workingDir, 'src/static')
        this.parseArgs()
    }

    /**
     * 解析命令行参数和环境变量
     */
    parseArgs() {
        const args = process.argv.slice(2)

        if (args.includes('--help') || args.includes('-h')) {
            this.showHelp()
            process.exit(0)
        }

        // 分离位置参数和选项参数
        const positionalArgs = []
        const options = {}
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            if (arg.startsWith('--')) {
                const nextArg = args[i + 1]
                if (nextArg && !nextArg.startsWith('--')) {
                    options[arg] = nextArg
                    i++ // 跳过下一个参数
                } else {
                    options[arg] = true
                }
            } else if (!arg.startsWith('-')) {
                positionalArgs.push(arg)
            }
        }

        // 处理位置参数：第一个参数是zip文件路径
        if (positionalArgs.length > 0) {
            this.zipFilePath = positionalArgs[0]
        } else if (options['--zip-file']) {
            this.zipFilePath = options['--zip-file']
        } else if (process.env.UNIAPP_ICON_ZIP_FILE) {
            this.zipFilePath = process.env.UNIAPP_ICON_ZIP_FILE
        } else {
            // 默认值：当前目录下的 download.zip
            this.zipFilePath = path.join(this.workingDir, 'download.zip')
        }

        // 处理 static-dir 参数
        if (options['--static-dir']) {
            this.staticDir = path.resolve(options['--static-dir'])
        } else if (process.env.UNIAPP_STATIC_DIR) {
            this.staticDir = path.resolve(process.env.UNIAPP_STATIC_DIR)
        }
        // 默认值已在构造函数中设置为 src/static

        // 处理删除 ZIP 文件选项
        this.deleteZipAfterExtraction = true // 默认删除
        if (options['--no-delete'] || process.env.UNIAPP_ICON_NO_DELETE === 'true') {
            this.deleteZipAfterExtraction = false
        }

        // 检查是否为调试模式
        this.debugMode = options['--debug'] || process.env.DEBUG === 'true'

        // 检查 ZIP 文件是否存在
        if (!fs.existsSync(this.zipFilePath)) {
            console.error(`❌ ZIP 文件不存在: ${this.zipFilePath}`)
            this.showHelp()
            process.exit(1)
        }

        // 解析为绝对路径
        this.zipFilePath = path.resolve(this.zipFilePath)
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        console.log(`
UniApp 自定义图标文件更新工具

功能说明:
  从 ZIP 文件中提取 iconfont.ttf 和 iconfont.css 文件，并将其放置到 UniApp 项目的 static 目录中。
  会自动修改 iconfont.css 中的字体路径为 UniApp 兼容的格式。
  处理完成后默认删除原 ZIP 文件。

使用方法:
  hctoolkit-uniapp-update-custom-icon-files [zip文件路径] [选项]

参数:
  zip文件路径               ZIP 文件的路径 (默认: ./download.zip)
  --static-dir <目录路径>   指定静态文件目录路径 (默认: ./src/static)
  --no-delete              处理完成后不删除 ZIP 文件
  --debug                   启用调试模式，输出详细信息
  --help, -h                显示帮助信息

  向后兼容选项:
  --zip-file <文件路径>     指定 ZIP 文件路径 (等同于位置参数)

环境变量:
  UNIAPP_ICON_ZIP_FILE      ZIP 文件路径
  UNIAPP_STATIC_DIR         静态文件目录路径
  UNIAPP_ICON_NO_DELETE     不删除 ZIP 文件 (true/false)
  DEBUG                     调试模式 (true/false)

使用示例:
  # 最简单的使用 (使用默认参数)
  hctoolkit-uniapp-update-custom-icon-files

  # 指定 ZIP 文件路径
  hctoolkit-uniapp-update-custom-icon-files ./download.zip
  hctoolkit-uniapp-update-custom-icon-files ./my-icons.zip --static-dir ./assets/fonts

  # 指定目标目录且不删除 ZIP 文件
  hctoolkit-uniapp-update-custom-icon-files ./icons.zip --static-dir ./src/static --no-delete

  # 向后兼容的写法
  hctoolkit-uniapp-update-custom-icon-files --zip-file ./icons.zip --static-dir ./src/static

优先级: 位置参数 > 选项参数 > 环境变量 > 默认值
`)
    }

    /**
     * 运行图标文件更新流程
     */
    async run() {
        try {
            console.log('🚀 UniApp 自定义图标文件更新工具')
            console.log('============================')
            console.log('🖥️  运行平台:', process.platform)
            console.log('📂 工作目录:', this.workingDir)
            console.log('📌 ZIP 文件:', this.zipFilePath)
            console.log('📁 目标目录:', this.staticDir)
            if (this.debugMode) {
                console.log('🐛 调试模式: 已启用')
            }
            console.log('============================')

            // 确保目标目录存在
            await this.ensureStaticDir()

            // 提取并放置文件
            await this.extractAndPlaceFiles()

            // 删除 ZIP 文件（如果启用）
            await this.deleteZipFileIfNeeded()

            console.log('============================')
            console.log('✅ 图标文件更新完成！')
            console.log('')
            console.log('📝 接下来的步骤:')
            console.log('   1. 在 App.vue 中导入样式: @import "@/static/iconfont.css"')
            console.log('   2. 使用 uni-icons 组件: <uni-icons custom-prefix="iconfont" type="icon-名称" size="30">')
        } catch (error) {
            console.error('❌ 执行失败:', error.message)
            if (this.debugMode) {
                console.error('错误详情:', error)
            }
            process.exit(1)
        }
    }

    /**
     * 确保静态文件目录存在
     */
    async ensureStaticDir() {
        try {
            await fs.ensureDir(this.staticDir)
            if (this.debugMode) {
                console.log(`✓ 确保目录存在: ${this.staticDir}`)
            }
        } catch (error) {
            throw new Error(`无法创建静态文件目录 ${this.staticDir}: ${error.message}`)
        }
    }

    /**
     * 如果需要，删除 ZIP 文件
     */
    async deleteZipFileIfNeeded() {
        if (!this.deleteZipAfterExtraction) {
            if (this.debugMode) {
                console.log('🗂️  保留 ZIP 文件 (--no-delete 选项已启用)')
            }
            return
        }

        try {
            await fs.remove(this.zipFilePath)
            console.log(`🗑️  已删除 ZIP 文件: ${path.basename(this.zipFilePath)}`)
            
            if (this.debugMode) {
                console.log(`✓ 删除文件路径: ${this.zipFilePath}`)
            }
        } catch (error) {
            // 删除失败不应该阻止整个流程，只输出警告
            console.warn(`⚠️  删除 ZIP 文件失败: ${error.message}`)
            if (this.debugMode) {
                console.warn('删除失败详情:', error)
            }
        }
    }

    /**
     * 从 ZIP 文件中提取并放置图标文件
     */
    async extractAndPlaceFiles() {
        return new Promise((resolve, reject) => {
            const extractedFiles = []
            const targetFiles = []

            yauzl.open(this.zipFilePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(new Error(`无法打开 ZIP 文件: ${err.message}`))
                    return
                }

                if (this.debugMode) {
                    console.log('📦 开始解析 ZIP 文件...')
                }

                // 先收集所有目标文件信息
                zipfile.readEntry()

                zipfile.on('entry', (entry) => {
                    const fileName = path.basename(entry.fileName)
                    
                    if (this.debugMode) {
                        console.log(`📄 发现文件: ${entry.fileName}`)
                    }

                    // 检查是否为目标文件（只要文件名匹配即可，不管在什么目录下）
                    if (fileName === 'iconfont.ttf' || fileName === 'iconfont.css') {
                        targetFiles.push({
                            entry: entry,
                            fileName: fileName,
                            fullPath: entry.fileName
                        })
                        
                        if (this.debugMode) {
                            console.log(`✨ 找到目标文件: ${fileName}`)
                        }
                    }
                    
                    zipfile.readEntry()
                })

                zipfile.on('end', async () => {
                    if (targetFiles.length === 0) {
                        reject(new Error('ZIP 文件中未找到 iconfont.ttf 或 iconfont.css 文件'))
                        return
                    }

                    if (this.debugMode) {
                        console.log(`📋 找到 ${targetFiles.length} 个目标文件，开始处理...`)
                    }

                    try {
                        // 处理所有目标文件
                        for (const targetFile of targetFiles) {
                            await this.processTargetFile(targetFile)
                            extractedFiles.push(targetFile.fileName)
                        }

                        if (this.debugMode) {
                            console.log(`📊 处理完成统计: ${extractedFiles.length}/${targetFiles.length}`)
                            console.log(`📁 提取的文件: ${extractedFiles.join(', ')}`)
                        }

                        resolve()
                    } catch (error) {
                        reject(error)
                    }
                })

                zipfile.on('error', (err) => {
                    reject(new Error(`ZIP 文件处理错误: ${err.message}`))
                })
            })
        })
    }

    /**
     * 处理单个目标文件
     */
    async processTargetFile(targetFile) {
        return new Promise((resolve, reject) => {
            // 重新打开ZIP文件来读取特定文件
            yauzl.open(this.zipFilePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(new Error(`无法重新打开 ZIP 文件: ${err.message}`))
                    return
                }

                zipfile.readEntry()

                zipfile.on('entry', (entry) => {
                    if (entry.fileName === targetFile.fullPath) {
                        zipfile.openReadStream(entry, async (err, readStream) => {
                            if (err) {
                                reject(new Error(`无法读取文件 ${targetFile.fileName}: ${err.message}`))
                                return
                            }

                            const destPath = path.join(this.staticDir, targetFile.fileName)

                            try {
                                if (targetFile.fileName === 'iconfont.css') {
                                    await this.processCssFile(readStream, destPath, targetFile.fileName)
                                } else {
                                    await this.processTtfFile(readStream, destPath, targetFile.fileName)
                                }
                                
                                zipfile.close()
                                resolve()
                            } catch (error) {
                                zipfile.close()
                                reject(error)
                            }
                        })
                    } else {
                        zipfile.readEntry()
                    }
                })

                zipfile.on('end', () => {
                    reject(new Error(`未找到文件: ${targetFile.fullPath}`))
                })
            })
        })
    }

    /**
     * 处理 CSS 文件
     */
    async processCssFile(readStream, destPath, fileName) {
        return new Promise((resolve, reject) => {
            const chunks = []
            
            readStream.on('data', chunk => chunks.push(chunk))
            
            readStream.on('end', async () => {
                try {
                    let content = Buffer.concat(chunks).toString('utf8')
                    
                    if (this.debugMode) {
                        console.log(`📝 原始 CSS 内容长度: ${content.length}`)
                    }

                    // 修改字体源路径为 UniApp 兼容格式
                    const originalContent = content
                    content = content.replace(
                        /src\s*:\s*[^;]+;/g, 
                        "src: url('/static/iconfont.ttf') format('truetype');"
                    )

                    if (this.debugMode && content !== originalContent) {
                        console.log('🔧 已修改 CSS 文件中的字体路径')
                    }

                    await fs.writeFile(destPath, content, 'utf8')
                    console.log(`✅ 成功处理并保存 ${fileName}`)
                    resolve()
                } catch (error) {
                    reject(new Error(`处理 CSS 文件失败: ${error.message}`))
                }
            })

            readStream.on('error', (err) => {
                reject(new Error(`读取 CSS 文件失败: ${err.message}`))
            })
        })
    }

    /**
     * 处理 TTF 文件
     */
    async processTtfFile(readStream, destPath, fileName) {
        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(destPath)
            
            readStream.pipe(writeStream)
            
            writeStream.on('finish', () => {
                console.log(`✅ 成功保存 ${fileName}`)
                resolve()
            })

            writeStream.on('error', (err) => {
                reject(new Error(`写入 TTF 文件失败: ${err.message}`))
            })

            readStream.on('error', (err) => {
                reject(new Error(`读取 TTF 文件失败: ${err.message}`))
            })
        })
    }

}

module.exports = UniappUpdateCustomIconFiles;
