# gocz

一个简单的命令行工具，用于生成规范的 git commit message / A simple CLI tool for generating standardized git commit messages.

> 基本都是从 [goji](https://github.com/goji/goji) 抄的, 但是我用不到那么多功能

![demo](https://r2.chaogpt.space/gocz.gif)

## 特性 / Features

- 🎯 交互式提交信息生成 / Interactive commit message generation
- 🌈 支持 emoji 表情符号 / Emoji support
- 🔍 智能范围检测 (packages/_) / Smart scope detection (packages/_)
- 🎨 双语界面 (中文/英文) / Bilingual interface (Chinese/English)
- ⚙️ 可自定义配置 / Customizable configuration

## 安装 / Installation

没有发布, 自己 build 吧

> 源码

```bash
# 克隆仓库 / Clone repository
git clone https://github.com/charlzyx/typeto.git
cd typeto/gocz
# 安装依赖 / Install dependencies
go mod tidy
# 本地构建 / Local build
go build
```

## 配置 / Configuration

> 其实就是 changelogen 的 json 文件里面的 types 字段

工具会按以下顺序查找配置文件：

1. 当前目录的 `changelog.config.json`
2. 用户目录的 `~/.changelog.config.json`
3. 内置的默认配置

配置文件示例 / Configuration example:

```json
{
  "types": {
    "build": {
      "semver": "patch",
      "title": "📦 构建相关 / Build"
    },
    "chore": {
      "title": "🏡 杂务处理 / Chore"
    },
    "ci": {
      "title": "🤖 持续集成 / CI"
    },
    "docs": {
      "semver": "patch",
      "title": "📖 文档更新 / Documentation"
    },
    "examples": {
      "title": "🏀 示例更新 / Examples"
    },
    "feat": {
      "semver": "minor",
      "title": "🚀 增强功能 / Enhancements"
    },
    "fix": {
      "semver": "patch",
      "title": "🩹 修复问题 / Fixes"
    },
    "perf": {
      "semver": "patch",
      "title": "🔥 性能优化 / Performance"
    },
    "refactor": {
      "semver": "patch",
      "title": "💅 代码重构 / Refactors"
    },
    "style": {
      "title": "🎨 代码风格 / Styles"
    },
    "test": {
      "title": "✅ 测试用例 / Tests"
    },
    "types": {
      "semver": "patch",
      "title": "🌊 类型定义 / Types"
    },
    "wip": {
      "title": "🚧 未完成 / Work in Progress"
    }
  }
}
```
