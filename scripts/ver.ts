import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import * as path from "path";

// 工具函数: 读取 JSON 文件并解析
const readJSON = (filePath: string) =>
  JSON.parse(readFileSync(filePath, "utf-8"));

// 工具函数: 写入 JSON 文件
const writeJSON = (filePath: string, data: unknown) => {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
};

// 工具函数: 获取子目录中的 package.json 文件
const getChildPackagePaths = (packagesDir: string): string[] => {
  const dirs = readdirSync(packagesDir);
  return dirs
    .map((dir) => path.join(packagesDir, dir, "package.json"))
    .filter(
      (pkgPath) =>
        statSync(path.dirname(pkgPath)).isDirectory() &&
        statSync(pkgPath).isFile()
    );
};

// 主逻辑
const updateWorkspaceVersions = (): void => {
  const rootPackagePath = path.resolve(process.cwd(), "package.json");

  // 步骤 1: 读取主目录 package.json
  const rootPackage = readJSON(rootPackagePath);
  const rootVersion = rootPackage.version;

  console.log(`主目录版本: ${rootVersion}`);

  // 步骤 2: 遍历子包
  const packagesPath = path.resolve(process.cwd(), "packages");
  const childPackages = getChildPackagePaths(packagesPath);

  childPackages.forEach((packagePath) => {
    const packageJSON = readJSON(packagePath);

    let updated = false;

    // 更新 dependencies 和 devDependencies 中的 "workspace:*"
    ["dependencies", "devDependencies"].forEach((depType) => {
      if (packageJSON[depType]) {
        for (const [dep, version] of Object.entries<string>(
          packageJSON[depType]
        )) {
          if (version === "workspace:*") {
            console.log(
              `更新 ${packageJSON.name} -> ${dep}: workspace:* -> ${rootVersion}`
            );
            packageJSON[depType][dep] = rootVersion;
            updated = true;
          }
        }
      }
    });

    // 将子包版本与主目录对齐
    if (packageJSON.version !== rootVersion) {
      console.log(
        `更新 ${packageJSON.name} 版本: ${packageJSON.version} -> ${rootVersion}`
      );
      packageJSON.version = rootVersion;
      updated = true;
    }

    // 写回修改后的子包 package.json
    if (updated) {
      writeJSON(packagePath, packageJSON);
    }
  });

  console.log("\u2714 子包版本和依赖已更新完毕。");
};

updateWorkspaceVersions();
