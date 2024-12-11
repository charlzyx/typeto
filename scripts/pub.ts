import { execSync } from "child_process";
import * as inquirer from "@inquirer/prompts";

async function run() {
  // 步骤 1: 检查 git 状态
  try {
    const gitStatus = execSync("git status --porcelain").toString().trim();
    if (gitStatus) {
      console.error(
        "\u2716 Git 仓库中有未提交的更改，请先提交或暂存这些更改。"
      );
      process.exit(1);
    } else {
      console.log("\u2714 Git 仓库状态干净，无未提交更改。");
    }
  } catch (error) {
    console.error("检查 git 状态时出错:", error.message);
    process.exit(1);
  }

  // 步骤 2: 选择版本更新类型
  const versionType = await inquirer.select({
    message: "选择版本更新类型:",
    choices: [
      { name: "主版本 (Major)", value: "major" },
      { name: "次版本 (Minor)", value: "minor" },
      { name: "补丁版本 (Patch)", value: "patch" },
      { name: "预发布主版本 (Premajor, alpha/beta/rc)", value: "premajor" },
      { name: "预发布次版本 (Preminor, alpha/beta/rc)", value: "preminor" },
      { name: "预发布补丁版本 (Prepatch, alpha/beta/rc)", value: "prepatch" },
    ],
  });

  let prereleaseType = null;
  if (versionType.startsWith("pre")) {
    prereleaseType = await inquirer.select({
      message: "选择预发布类型:",
      choices: [
        { name: "Alpha", value: "alpha" },
        { name: "Beta", value: "beta" },
        { name: "候选版本 (RC)", value: "rc" },
      ],
    });
  }

  // 步骤 3: 生成版本号
  let newVersion;
  try {
    const npmVersionCmd = `npm version ${versionType}${
      prereleaseType ? ` --preid=${prereleaseType}` : ""
    } --no-git-tag-version`;
    newVersion = execSync(npmVersionCmd).toString().trim();
    console.log(`\n生成的新版本号: ${newVersion}`);
  } catch (error) {
    console.error("生成版本号时出错:", error.message);
    process.exit(1);
  }

  const confirm = await inquirer.confirm({
    message: `是否确认使用版本号 ${newVersion}?`,
    default: true,
  });

  if (!confirm) {
    console.log("已取消版本更新。");
    process.exit(0);
  }

  // 步骤 4: 创建 git 分支
  const branchName = `release/${newVersion}`;
  try {
    // execSync(`git checkout -b ${branchName}`);
    console.log(`\u2714 创建了新分支: ${branchName}`);
  } catch (error) {
    console.error("创建分支时出错:", error.message);
    process.exit(1);
  }

  // 步骤 5: 生成 changelog
  try {
    execSync(`bun run changelog -r ${branchName}`, { stdio: "inherit" });
    console.log("\u2714 Changelog 生成成功。");
  } catch (error) {
    console.error("生成 Changelog 时出错:", error.message);
    process.exit(1);
  }

  // 步骤 6: 输出 GitHub Release 链接
  const releaseUrl = `https://github.com/charlzyx/typeto`;
  console.log(`\u2714 请前往以下链接创建 Release: ${releaseUrl}`);
}

run().catch((error) => {
  console.error("发生意外错误:", error);
  process.exit(1);
});
