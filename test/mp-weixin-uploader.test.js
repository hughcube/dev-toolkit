/**
 * MpWeixinUploader 单元测试
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const MpWeixinUploader = require('../lib/mp-weixin-uploader')

// 绕过依赖 process.argv 的构造函数，只测试纯逻辑方法
function createInstance() {
    return Object.create(MpWeixinUploader.prototype)
}

test('kebabToCamelCase', async (t) => {
    const uploader = createInstance()

    await t.test('单个连字符转驼峰', () => {
        assert.equal(uploader.kebabToCamelCase('foo-bar'), 'fooBar')
    })

    await t.test('多个连字符转驼峰', () => {
        assert.equal(uploader.kebabToCamelCase('a-b-c'), 'aBC')
    })

    await t.test('无连字符时原样返回', () => {
        assert.equal(uploader.kebabToCamelCase('es6'), 'es6')
        assert.equal(uploader.kebabToCamelCase('minify'), 'minify')
    })
})

test('mapSettingKey', async (t) => {
    const uploader = createInstance()

    await t.test('映射表中的特殊键', () => {
        assert.equal(uploader.mapSettingKey('minify-js'), 'minifyJS')
        assert.equal(uploader.mapSettingKey('minify-wxml'), 'minifyWXML')
        assert.equal(uploader.mapSettingKey('auto-prefix-wxss'), 'autoPrefixWXSS')
    })

    await t.test('映射表外的键走通用 kebab 转驼峰', () => {
        assert.equal(uploader.mapSettingKey('custom-option'), 'customOption')
    })
})

test('parseSettingValue', async (t) => {
    const uploader = createInstance()

    await t.test('字符串 true/false 转布尔值', () => {
        assert.equal(uploader.parseSettingValue('true'), true)
        assert.equal(uploader.parseSettingValue('false'), false)
    })

    await t.test('其他值保持字符串', () => {
        assert.equal(uploader.parseSettingValue('hello'), 'hello')
        assert.equal(uploader.parseSettingValue('123'), '123')
    })
})

test('buildSetting', async (t) => {
    await t.test('默认包含 minify: true', () => {
        const uploader = createInstance()
        uploader.settings = {}
        assert.deepEqual(uploader.buildSetting(), { minify: true })
    })

    await t.test('外部设置会合并进来', () => {
        const uploader = createInstance()
        uploader.settings = { es6: true, customOption: 'local' }
        assert.deepEqual(uploader.buildSetting(), {
            minify: true,
            es6: true,
            customOption: 'local',
        })
    })

    await t.test('外部设置可覆盖默认的 minify', () => {
        const uploader = createInstance()
        uploader.settings = { minify: false }
        assert.deepEqual(uploader.buildSetting(), { minify: false })
    })
})

test('parseSettingArgs', async (t) => {
    await t.test('解析 --setting-* 参数为 settings 对象', () => {
        const uploader = createInstance()
        uploader.parseSettingArgs(['--setting-es6', 'true', '--setting-minify-js', 'false'])
        assert.deepEqual(uploader.settings, { es6: true, minifyJS: false })
    })

    await t.test('自定义键走 kebab 转驼峰', () => {
        const uploader = createInstance()
        uploader.parseSettingArgs(['--setting-custom-opt', 'hello'])
        assert.deepEqual(uploader.settings, { customOpt: 'hello' })
    })

    await t.test('无 --setting-* 参数时 settings 为空对象', () => {
        const uploader = createInstance()
        uploader.parseSettingArgs(['--app-id', 'wx123', '--version', 'v1.0.0'])
        assert.deepEqual(uploader.settings, {})
    })
})
