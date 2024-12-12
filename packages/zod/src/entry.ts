import { ClassDeclaration, Node, Project } from "ts-morph";
import { getNodeExtraInfo } from "@typeto/shared";

// 忽略规则的键
const IgnoreRuleKeys = {
  jsDoc: ["ignore", "WIP", "Draft"],
  classDecorators: ["ignore", "WIP", "Draft"],
  leadingComment: ["@ignore", "@WIP", "@Draft"],
};

// 判断是否应跳过该节点
const shouldSkip = (node: ClassDeclaration) => {
  const { decorators, jsDocs, leadingComments } = getNodeExtraInfo(node);

  // 检查装饰器中是否有忽略标签
  const skipByDecorator =
    Object.keys(decorators).findIndex((decoratorName) =>
      IgnoreRuleKeys.classDecorators.includes(decoratorName)
    ) > -1;
  if (skipByDecorator) return true;

  // 检查 jsDoc 中是否有忽略标签
  const skipByJsDoc =
    Object.keys(jsDocs).findIndex((tagName) =>
      IgnoreRuleKeys.jsDoc.includes(tagName)
    ) > -1;
  if (skipByJsDoc) return true;

  // 检查前导注释中是否有忽略标签
  const skipByComment =
    leadingComments
      .join("\n")
      .split(/\s+/)
      .findIndex((word) => IgnoreRuleKeys.leadingComment.includes(word)) > -1;
  if (skipByComment) return true;

  return false;
};

export const getEntryNodes = (project: Project) => {
  const definitions: ClassDeclaration[] = [];

  project.getSourceFiles().forEach((sourceFile) => {
    sourceFile.getClasses().forEach((classDec) => {
      if (!shouldSkip(classDec)) {
        definitions.push(classDec);
      }
    });
  });

  return { definitions };
};
