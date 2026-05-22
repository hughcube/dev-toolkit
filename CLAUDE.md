# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作提供指导。

**重要提示：与此项目相关的所有沟通请永远使用中文。**

## 项目概述

这是 `@hughcube/dev-toolkit`，一个为 UniApp 和小程序开发提供的综合开发工具包，专注于微信和支付宝小程序的版本管理、代码上传和开发配置。

## 关键命令

### 开发命令
- `npm run prepare` - 运行准备脚本 (scripts/prepare.js)
- `node scripts/prepare.js` - 准备开发环境

### 测试
- `npm test` - 运行测试套件（基于 Node 内置 test runner，执行 `node --test`）
- 测试文件位于 `test/` 目录，命名为 `*.test.js`
- 测试覆盖各工具的纯逻辑方法（版本号计算、参数映射、页面路径匹配等），
  通过 `Object.create(Class.prototype)` 绕过依赖 `process.argv` 的构造函数
- 运行测试需要 Node 18+（不影响发布包的 `engines` 要求 >=14）
- 项目使用对等依赖 `minidev` 和 `miniprogram-ci`

### 可用的 CLI 工具
项目安装后提供 6 个 CLI 工具：
- `hctoolkit-uniapp-manifest-updater` - 更新 UniApp manifest.json 版本信息
- `hctoolkit-mp-alipay-uploader` - 上传到支付宝小程序平台
- `hctoolkit-mp-weixin-uploader` - 上传到微信小程序平台
- `hctoolkit-uniapp-mp-alipay-dev-helper` - 生成支付宝开发配置，支持页面导出
- `hctoolkit-uniapp-homepage-configurator` - 配置小程序首页
- `hctoolkit-uniapp-update-custom-icon-files` - 更新 UniApp 自定义图标文件

## 架构

### 核心结构
- `lib/` - 核心实现模块
  - `index.js` - 导出所有类的主入口点
  - `uniapp-manifest-updater.js` - UniApp manifest.json 版本管理
  - `mp-alipay-uploader.js` - 支付宝小程序上传器
  - `mp-weixin-uploader.js` - 微信小程序上传器
  - `uniapp-mp-alipay-dev-helper.js` - 支付宝开发助手
  - `uniapp-homepage-configurator.js` - 首页配置工具
  - `uniapp-update-custom-icon-files.js` - UniApp 自定义图标文件更新工具

- `bin/` - 封装 lib 类的 CLI 可执行脚本
- `scripts/` - 构建和准备脚本

### 关键设计模式
- 每个 CLI 工具遵循相同模式：bin 脚本创建类实例并调用 run()
- 所有 CLI 工具支持环境变量作为命令行参数的替代方案
- 统一的错误处理，使用 process.on('uncaughtException') 和 process.on('unhandledRejection')
- 使用 JSON5 解析 manifest.json 文件以支持注释和尾随逗号

### 依赖关系
- `json5` - 用于解析支持注释的 UniApp manifest.json
- 对等依赖：`minidev`（支付宝），`miniprogram-ci`（微信）
- 需要 Node.js >= 14.0.0

### 环境变量
工具支持带前缀的环境变量：
- `ALIMP_*` 用于支付宝小程序设置
- `WXMP_*` 用于微信小程序设置

优先级：CLI 参数 > 环境变量 > 默认值

## 常见工作流程

### 版本管理
manifest 更新器与 UniApp 的 `src/manifest.json` 文件配合工作，更新版本号并将其转换为小程序的版本代码。

### 小程序上传
支付宝和微信上传器都需要：
- 构建的分发目录
- 平台特定的认证（私钥/配置文件）
- App ID 和版本信息

### 开发配置
工具自动生成平台特定的配置文件，并可以在开发过程中监视变化。

支付宝开发助手（`--dump-pages` 标志）可以读取 `src/pages.json` 并生成包含所有页面配置的 `compileMode.json` 文件以便于开发。它从 `navigationBarTitleText` 提取页面标题并创建带有 "(helper)" 后缀的助手条目。

### 配置文件合并规则

工具在生成配置文件时采用智能合并策略：

#### project-ide.json 合并规则
- 如果文件已存在，读取现有配置并合并
- 以新配置为主，覆盖同名字段
- 保留原有的其他字段
- 使用 JSON5 解析以支持注释

#### compileMode.json 合并规则
- 如果文件已存在，保留原文件的所有信息（如其他配置字段）
- 只更新 `modes` 数组
- 按页面路径（`page` 字段）去重
- 如果存在相同页面路径，以新配置为主进行合并
- 不存在的页面路径会被添加到数组中
- 使用 JSON5 解析以支持注释和更灵活的格式

#### 合并优先级
1. 新生成的配置（最高优先级）
2. 现有文件中的配置
3. 默认配置（最低优先级）

## NPM 发布流程

当需要发布新版本到 npm 时，请按以下步骤操作：

1. **修改版本号**：更新 `package.json` 中的 `version` 字段
2. **提交更改**：将所有更改提交到 git
3. **创建标签**：创建新的 git tag 并推送到远程仓库
4. **发布到 npm**：执行 `npm publish` 命令

### 具体命令示例：

```bash
# 1. 修改 package.json 版本号（手动编辑）
# 2. 提交更改
git add .
git commit -m "版本更新: 更新到 vX.X.X"

# 3. 创建标签并推送
git tag vX.X.X
git push origin master
git push origin vX.X.X

# 4. 发布到 npm
npm publish
```

### 注意事项：
- 确保版本号遵循语义化版本规范 (SemVer)
- 提交信息应该清晰描述更改内容
- 标签名称应该与 package.json 中的版本号保持一致
- 发布前确保代码已经过充分测试