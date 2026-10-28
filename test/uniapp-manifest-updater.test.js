/**
 * UniappManifestUpdater 单元测试
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const os = require('os')

const UniappManifestUpdater = require('../lib/uniapp-manifest-updater')

// calculateVersionCode 与 normalizeVersion 不依赖 this 状态，可直接在原型上调用
const calculateVersionCode = UniappManifestUpdater.prototype.calculateVersionCode
const normalizeVersion = UniappManifestUpdater.prototype.normalizeVersion

test('normalizeVersion - 三位规范化截取/补齐', async (t) => {
    await t.test('多段截取为标准三位 (如 v1.0.0.0 -> 1.0.0)', () => {
        const res = normalizeVersion('v1.0.0.0')
        assert.equal(res.semver, '1.0.0')
        assert.equal(res.versionName, 'v1.0.0')
        assert.equal(res.versionCode, 1000000)
    })

    await t.test('标准三位标准化 (如 9.9.9)', () => {
        const res = normalizeVersion('9.9.9')
        assert.equal(res.semver, '9.9.9')
        assert.equal(res.versionName, 'v9.9.9')
        assert.equal(res.versionCode, 9009009)
    })

    await t.test('两段式补齐为三位 (如 v1.2 -> 1.2.0)', () => {
        const res = normalizeVersion('v1.2')
        assert.equal(res.semver, '1.2.0')
        assert.equal(res.versionName, 'v1.2.0')
        assert.equal(res.versionCode, 1002000)
    })

    await t.test('单段式补齐为三位 (如 2 -> 2.0.0)', () => {
        const res = normalizeVersion('2')
        assert.equal(res.semver, '2.0.0')
        assert.equal(res.versionName, 'v2.0.0')
        assert.equal(res.versionCode, 2000000)
    })

    await t.test('容错过滤 refs/tags/ 前缀', () => {
        const res = normalizeVersion('refs/tags/v1.0.5')
        assert.equal(res.semver, '1.0.5')
        assert.equal(res.versionName, 'v1.0.5')
        assert.equal(res.versionCode, 1000005)
    })

    await t.test('非法格式直接报错', () => {
        assert.throws(() => normalizeVersion('master'), /必须是数字版本号或合法 Tag/)
        assert.throws(() => normalizeVersion('dev'), /必须是数字版本号或合法 Tag/)
        assert.throws(() => normalizeVersion('1.a.0'), /必须是数字版本号或合法 Tag/)
        assert.throws(() => normalizeVersion(''), /必须提供有效的版本号/)
    })
})

test('calculateVersionCode', async (t) => {
    await t.test('标准三段版本号转换为 versionCode', () => {
        assert.equal(calculateVersionCode('v1.2.3'), 1002003)
    })

    await t.test('忽略 v / V 前缀', () => {
        assert.equal(calculateVersionCode('V1.2.3'), 1002003)
        assert.equal(calculateVersionCode('1.2.3'), 1002003)
    })

    await t.test('每段补齐为 3 位', () => {
        assert.equal(calculateVersionCode('v10.20.30'), 10020030)
        assert.equal(calculateVersionCode('v0.0.1'), 1)
    })

    await t.test('支持单段版本号', () => {
        assert.equal(calculateVersionCode('v1'), 1)
    })

    await t.test('支持四段版本号', () => {
        assert.equal(calculateVersionCode('v1.2.3.4'), 1002003004)
    })

    await t.test('每段最大值 999', () => {
        assert.equal(calculateVersionCode('v999.999.999'), 999999999)
    })

    await t.test('某段超过 999 时抛错', () => {
        assert.throws(() => calculateVersionCode('v1000.0.0'), /超过最大值 999/)
    })

    await t.test('非数字段抛错', () => {
        assert.throws(() => calculateVersionCode('v1.2.x'), /不是有效的非负整数/)
    })

    await t.test('负数段抛错', () => {
        assert.throws(() => calculateVersionCode('v-1.0.0'), /不是有效的非负整数/)
    })

    await t.test('版本号过长导致 versionCode 溢出时抛错', () => {
        assert.throws(
            () => calculateVersionCode('v999.999.999.999.999.999'),
            /超过安全范围/
        )
    })
})

test('updateManifest - 更新版本并同步写回 package.json', async (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hctoolkit-manifest-'))
    const origCwd = process.cwd()

    t.after(() => {
        process.chdir(origCwd)
        fs.rmSync(tempDir, { recursive: true, force: true })
    })

    process.chdir(tempDir)

    // 准备 src/manifest.json 和 package.json
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true })
    fs.writeFileSync(path.join(tempDir, 'src/manifest.json'), '{\n  // 注释保留\n  "versionName": "1.0.0",\n  "versionCode": "1000000"\n}')
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test-app', version: '1.0.0' }, null, 2))

    await t.test('更新版本号并同步更新 package.json version', () => {
        const updater = Object.create(UniappManifestUpdater.prototype)
        updater.manifestPath = path.join(tempDir, 'src/manifest.json')
        updater.version = 'v1.2.3'
        updater.semver = '1.2.3'

        updater.updateManifest()

        // 验证 manifest.json
        const updatedManifest = fs.readFileSync(updater.manifestPath, 'utf8')
        assert.match(updatedManifest, /"versionName": "v1\.2\.3"/)
        assert.match(updatedManifest, /"versionCode": "1002003"/)
        assert.match(updatedManifest, /\/\/ 注释保留/)

        // 验证 package.json
        const updatedPkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'))
        assert.equal(updatedPkg.version, '1.2.3')
    })
})

