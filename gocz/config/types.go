package config

import (
	"encoding/json"
	"os"
)

type CommitType struct {
	Name        string  `json:"name"`
	Emoji       string  `json:"emoji"`
	Title       string  `json:"title"`
	Semver      *string `json:"semver"`
	Description string  `json:"description"`
}

type Config struct {
	Types  map[string]CommitType `json:"types"`
	Scopes []string              `json:"scopes"`
}

const DefaultConfig = `{
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
}`

func LoadConfig() (*Config, error) {
	// 按顺序尝试加载配置文件
	configPaths := []string{
		"changelog.config.json",                      // 当前目录
		os.ExpandEnv("$HOME/.changelog.config.json"), // 用户目录
	}

	var data []byte
	var err error

	// 尝试从不同位置读取配置文件
	for _, path := range configPaths {
		data, err = os.ReadFile(path)
		if err == nil {
			break
		}
	}

	// 如果所有位置都没有找到配置文件，使用默认配置
	if err != nil {
		data = []byte(DefaultConfig)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func (c *Config) GetTypesSlice() []CommitType {
	types := make([]CommitType, 0, len(c.Types))
	for _, t := range c.Types {
		types = append(types, t)
	}
	return types
}
