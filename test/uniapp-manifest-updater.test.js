/**
 * UniappManifestUpdater 单元测试
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const UniappManifestUpdater = require('../lib/uniapp-manifest-updater')

// calculateVersionCode 不依赖 this，可直接在原型上调用
const calculateVersionCode = UniappManifestUpdater.prototype.calculateVersionCode

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
