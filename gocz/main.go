package main

import (
	"errors"
	"fmt"
	"math"
	"os"
	"os/exec"
	"strings"

	"github.com/charlzyx/gocz/config"
	"github.com/charmbracelet/huh"
)

type CommitMessage struct {
	Type        string
	Scope       string
	Subject     string
	Description string
}

func getPackageScopes() []string {
	scopes := []string{}
	entries, err := os.ReadDir("packages")
	if err == nil { // 如果目录存在就读取
		for _, entry := range entries {
			if entry.IsDir() {
				scopes = append(scopes, entry.Name())
			}
		}
	}
	return scopes
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func askQuestions(config *config.Config, presetType, presetMessage string) (*CommitMessage, error) {
	var commitType, commitScope, commitSubject, commitDescription string

	commitTypeOptions := make([]huh.Option[string], 0, len(config.Types))
	for key, ct := range config.Types {
		commitTypeOptions = append(commitTypeOptions,
			huh.NewOption[string](ct.Title, key))
	}

	if presetType != "" {
		for _, option := range commitTypeOptions {
			if strings.HasPrefix(option.Value, presetType) {
				commitType = option.Value
				break
			}
		}
	}
	if presetMessage != "" {
		commitSubject = presetMessage
	}

	// 合并配置的 scopes 和 packages 目录的 scopes
	allScopes := append(getPackageScopes(), config.Scopes...)

	form := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("类型 Type:").
				Options(commitTypeOptions...).
				Height(len(commitTypeOptions)).
				Value(&commitType),
			huh.NewInput().
				Title("范围 Scope:").
				Placeholder(func() string {
					if len(allScopes) > 0 {
						return strings.Join(allScopes[:int(math.Min(float64(3), float64(len(allScopes))))], ", ")
					}
					return "e.g. api, cli"
				}()).
				CharLimit(50).
				Suggestions(allScopes).
				Value(&commitScope),
		),
		huh.NewGroup(
			huh.NewInput().
				Title("简述 Summary:").
				Placeholder("Brief description").
				CharLimit(70).
				Value(&commitSubject).
				Validate(func(s string) error {
					if s == "" {
						return errors.New("Required")
					}
					return nil
				}),
			huh.NewText().
				Title("详情 Details:").
				CharLimit(80).
				Placeholder("Detailed description").
				Value(&commitDescription).
				WithHeight(4),
		),
	)

	if err := form.Run(); err != nil {
		if err.Error() == "user aborted" {
			os.Exit(0)
		}
		return nil, err
	}

	return &CommitMessage{
		Type:        commitType,
		Scope:       commitScope,
		Subject:     commitSubject,
		Description: commitDescription,
	}, nil
}

func checkGitStatus() error {
	// 检查 git 状态
	// git status --porcelain 输出格式为 XY PATH
	// X 表示暂存区的状态
	// Y 表示工作区的状态
	// 状态码含义:
	// ' ' = 未修改
	// M = 已修改
	// A = 新增
	// D = 删除
	// R = 重命名
	// C = 复制
	// ? = 未跟踪
	// ! = 忽略
	// 例如:
	// M  file1    = 暂存区有修改
	//  M file2    = 工作区有修改
	// MM file3    = 暂存区和工作区都有修改
	// A  file4    = 新增到暂存区
	// ?? file5    = 未跟踪文件
	output, err := exec.Command("git", "status", "--porcelain").Output()
	if err != nil {
		return fmt.Errorf("git 仓库检查失败 \nFailed to check git status: %v", err)
	}

	// 收集未暂存的文件
	var unstaged []string
	for _, line := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		if line == "" {
			continue
		}
		// 第二列不为空格，表示工作区有未暂存的修改
		// 这意味着文件有改动但还没有 git add
		if len(line) >= 2 && line[1] != ' ' {
			// 提取文件路径（去掉状态码和空格）
			path := strings.TrimSpace(line[2:])
			unstaged = append(unstaged, fmt.Sprintf("  %s (%s)", path, line[:2]))
		}
	}

	if len(unstaged) > 0 {
		return fmt.Errorf("以下文件有未暂存的更改，请先使用 git add \nUnstaged changes found in:\n%s",
			strings.Join(unstaged, "\n"))
	}

	return nil
}

func formatPreview(cmd string) string {
	// 将命令按 -m 参数分割并格式化
	parts := strings.Split(cmd, " -m ")
	formatted := parts[0]
	for i := 1; i < len(parts); i++ {
		formatted += "\n    -m " + parts[i]
	}
	return formatted
}

func showError(title, message string) {
	var confirmed bool
	huh.NewConfirm().
		Title(title).
		Description(message).
		Affirmative("了解 / OK").
		Negative("退出 / Exit").
		Value(&confirmed).
		Run()
	os.Exit(1)
}

func main() {
	// 检查 git 状态
	if err := checkGitStatus(); err != nil {
		showError("❌ 错误 / Error", err.Error())
	}

	cfg, err := config.LoadConfig()
	if err != nil {
		showError("❌ 配置错误 / Config Error", fmt.Sprintf("加载配置失败 / Failed to load config: %v", err))
	}

	// 获取命令行参数
	var presetType, presetMessage string
	args := os.Args[1:]
	if len(args) > 0 {
		presetType = args[0]
	}
	if len(args) > 1 {
		presetMessage = args[1]
	}

	message, err := askQuestions(cfg, presetType, presetMessage)
	if err != nil {
		showError("❌ 输入错误 / Input Error", err.Error())
	}

	// 生成主消息
	mainMessage := message.Type
	if message.Scope != "" {
		mainMessage += fmt.Sprintf("(%s)", message.Scope)
	}

	emoji := ""
	if selectedType, ok := cfg.Types[message.Type]; ok && len(selectedType.Title) > 0 {
		emoji = string([]rune(selectedType.Title)[0]) + " "
	}

	mainMessage += fmt.Sprintf(": %s%s", emoji, message.Subject)

	// 构建完整的 git commit 命令
	var cmdParts []string
	cmdParts = append(cmdParts, "git", "commit", "-m", fmt.Sprintf(`"%s"`, mainMessage))

	// 处理长描述，按行分割并为每行添加 -m 参数
	if message.Description != "" {
		for _, line := range strings.Split(strings.TrimSpace(message.Description), "\n") {
			if trimmedLine := strings.TrimSpace(line); trimmedLine != "" {
				cmdParts = append(cmdParts, "-m", fmt.Sprintf(`"%s"`, trimmedLine))
			}
		}
	}

	cmd := strings.Join(cmdParts, " ")

	// 显示预览并确认
	var confirmed bool
	huh.NewConfirm().
		Title("即将执行 / Will execute:").
		Description(formatPreview(cmd)).
		Affirmative("执行 / Execute").
		Negative("取消 / Cancel").
		Value(&confirmed).
		Run()

	if confirmed {
		// 执行 git commit 命令
		if err := exec.Command("sh", "-c", cmd).Run(); err != nil {
			showError("❌ 执行错误 / Execution Error", fmt.Sprintf("执行 git commit 失败 / Failed to execute git commit: %v", err))
		}
	} else {
		os.Exit(0)
	}
}
