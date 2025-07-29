
const fs = require('fs-extra');
const path = require('path');
const yauzl = require('yauzl');

class UniappUpdateCustomIconFiles {
    constructor() {
        this.parseArgs();
    }

    parseArgs() {
        const args = process.argv.slice(2);

        if (args.includes('--help') || args.includes('-h')) {
            this.showHelp();
            process.exit(0);
        }

        const zipFileIndex = args.findIndex(arg => arg === '--zip-file');
        this.zipFilePath = (zipFileIndex !== -1 && args[zipFileIndex + 1]) ? args[zipFileIndex + 1] : null;

        if (!this.zipFilePath) {
            console.error('❌ 请提供 --zip-file 参数');
            this.showHelp();
            process.exit(1);
        }
    }

    showHelp() {
        console.log(`
UniApp 自定义图标更新工具

使用方法:
  hctoolkit-uniapp-update-custom-icon-files [选项]

参数:
  --zip-file <文件路径>      指定包含 iconfont.ttf 和 iconfont.css 的 ZIP 文件路径
  --help, -h                 显示帮助信息

示例:
  hctoolkit-uniapp-update-custom-icon-files --zip-file /path/to/your/iconfont.zip
`);
    }

    async run() {
        try {
            console.log('🚀 UniApp 自定义图标更新工具');
            console.log('============================');
            console.log('🖥️  运行平台:', process.platform);
            console.log('📌 ZIP 文件:', this.zipFilePath);
            console.log('============================');

            await this.extractAndPlaceFiles();

            console.log('============================');
            console.log('✅ 更新完成！');
        } catch (error) {
            console.error('❌ 执行失败:', error.message);
            process.exit(1);
        }
    }

    async extractAndPlaceFiles() {
        const staticDir = path.join(process.cwd(), 'src/static');
        await fs.ensureDir(staticDir);

        return new Promise((resolve, reject) => {
            yauzl.open(this.zipFilePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) reject(err);
                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    if (entry.fileName.endsWith('iconfont.ttf') || entry.fileName.endsWith('iconfont.css')) {
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) reject(err);
                            const destPath = path.join(staticDir, path.basename(entry.fileName));
                            if (entry.fileName.endsWith('iconfont.css')) {
                                const chunks = [];
                                readStream.on('data', chunk => chunks.push(chunk));
                                readStream.on('end', () => {
                                    let content = Buffer.concat(chunks).toString('utf8');
                                    content = content.replace(/src:[\s\S]*?;/, "src: url('/static/iconfont.ttf') format('truetype');");
                                    fs.writeFile(destPath, content, 'utf8', (err) => {
                                        if (err) reject(err);
                                        console.log(`✅ 成功提取、修改并放置 iconfont.css 到 ${staticDir}`);
                                        zipfile.readEntry();
                                    });
                                });
                            } else {
                                const writeStream = fs.createWriteStream(destPath);
                                readStream.pipe(writeStream);
                                writeStream.on('finish', () => {
                                    console.log(`✅ 成功提取并放置 ${path.basename(entry.fileName)} 到 ${staticDir}`);
                                    zipfile.readEntry();
                                });
                                writeStream.on('error', reject);
                            }
                        });
                    } else {
                        zipfile.readEntry();
                    }
                });
                zipfile.on('end', resolve);
            });
        });
    }
}

module.exports = UniappUpdateCustomIconFiles;
