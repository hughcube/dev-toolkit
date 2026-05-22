/**
 * UniappMpAlipayDevHelper 单元测试
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const UniappMpAlipayDevHelper = require('../lib/uniapp-mp-alipay-dev-helper')

// isPagePathMatched 不依赖 this，可直接在原型上调用
const isPagePathMatched = UniappMpAlipayDevHelper.prototype.isPagePathMatched

test('isPagePathMatched', async (t) => {
    await t.test('无过滤器时匹配所有页面', () => {
        assert.equal(isPagePathMatched('pages/user/index', null), true)
        assert.equal(isPagePathMatched('pages/user/index', ''), true)
    })

    await t.test('普通过滤器做包含匹配', () => {
        assert.equal(isPagePathMatched('pages/user/index', 'pages/user'), true)
        assert.equal(isPagePathMatched('pages/order/index', 'pages/user'), false)
    })

    await t.test('通配符 * 转正则匹配（从开头锚定）', () => {
        assert.equal(isPagePathMatched('pages/user/index', 'pages/*'), true)
        assert.equal(isPagePathMatched('pages/user/index', '*user'), true)
        assert.equal(isPagePathMatched('other/order/index', 'pages/*'), false)
    })

    await t.test('过滤器自动去除首尾引号', () => {
        assert.equal(isPagePathMatched('pages/user/index', '"pages/user"'), true)
        assert.equal(isPagePathMatched('pages/user/index', "'pages/user'"), true)
    })
})
