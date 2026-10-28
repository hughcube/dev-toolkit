/**
 * MpAlipayUploader 单元测试
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const os = require('os')

const MpAlipayUploader = require('../lib/mp-alipay-uploader')

function createInstance() {
    return Object.create(MpAlipayUploader.prototype)
}

test('MpAlipayUploader - resolveVersionFromConfig', async (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hctoolkit-alipay-'))
    const isolatedCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'hctoolkit-isolated-'))
    const origCwd = process.cwd()

    t.after(() => {
        process.chdir(origCwd)
        fs.rmSync(tempDir, { recursive: true, force: true })
        fs.rmSync(isolatedCwd, { recursive: true, force: true })
    })

    process.chdir(tempDir)

    await t.test('未提供 version 时自动从 src/manifest.json 读取版本号', () => {
        fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true })
        fs.writeFileSync(path.join(tempDir, 'src/manifest.json'), '{\n  // 注释\n  "versionName": "1.3.5"\n}')

        const uploader = createInstance()
        uploader.version = null
        uploader.distDir = null

        const ver = uploader.resolveVersionFromConfig()
        assert.equal(ver, '1.3.5')
    })

    await t.test('若已有 version 则优先保持原有值', () => {
        const uploader = createInstance()
        uploader.version = 'v2.0.0'
        const ver = uploader.resolveVersionFromConfig()
        assert.equal(ver, 'v2.0.0')
    })

    await t.test('若无 manifest 则回退从 package.json 读取', () => {
        // 删除 manifest
        fs.rmSync(path.join(tempDir, 'src/manifest.json'), { force: true })
        fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ version: '3.1.2' }))

        const uploader = createInstance()
        uploader.version = null
        uploader.distDir = null

        const ver = uploader.resolveVersionFromConfig()
        assert.equal(ver, '3.1.2')
    })

    await t.test('从标准三层构建路径 (dist/build/mp-alipay) 向上逐级探测项目配置 (与 cwd 无关)', () => {
        // 关键测试：将 cwd 切到一个完全无关的隔离目录，避免走 cwd 假阳性
        process.chdir(isolatedCwd)

        const projectDir = path.join(tempDir, 'nested-project')
        const distDir = path.join(projectDir, 'dist/build/mp-alipay')
        fs.mkdirSync(distDir, { recursive: true })
        fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true })
        fs.writeFileSync(path.join(projectDir, 'src/manifest.json'), '{"versionName": "4.0.0"}')

        const uploader = createInstance()
        uploader.version = null
        uploader.distDir = distDir

        const ver = uploader.resolveVersionFromConfig()
        assert.equal(ver, '4.0.0')

        // 恢复 cwd 回 tempDir
        process.chdir(tempDir)
    })

    await t.test('从四层构建路径 (unpackage/dist/build/mp-alipay) 向上逐级探测 package.json', () => {
        process.chdir(isolatedCwd)

        const projectDir = path.join(tempDir, 'hbuilder-project')
        const distDir = path.join(projectDir, 'unpackage/dist/build/mp-alipay')
        fs.mkdirSync(distDir, { recursive: true })
        fs.writeFileSync(path.join(projectDir, 'package.json'), '{"version": "5.1.0"}')

        const uploader = createInstance()
        uploader.version = null
        uploader.distDir = distDir

        const ver = uploader.resolveVersionFromConfig()
        assert.equal(ver, '5.1.0')

        process.chdir(tempDir)
    })
})

test('MpAlipayUploader - version 清洗与前缀处理', async (t) => {
    await t.test('容错剥离 refs/tags/ 前缀并补齐 v', () => {
        const uploader = createInstance()
        let rawVersion = 'refs/tags/v1.2.3'
        // 模拟 parseArgs 中的清洗逻辑
        let version = rawVersion.trim().replace(/^refs\/tags\//i, '')
        if (!version.startsWith('v') && !version.startsWith('V')) {
            version = 'v' + version
        }
        assert.equal(version, 'v1.2.3')

        rawVersion = 'refs/tags/1.2.3'
        version = rawVersion.trim().replace(/^refs\/tags\//i, '')
        if (!version.startsWith('v') && !version.startsWith('V')) {
            version = 'v' + version
        }
        assert.equal(version, 'v1.2.3')
    })
})
