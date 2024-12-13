import {
  ClassDeclaration,
  Node,
  Project,
  TypeAliasDeclaration,
} from "ts-morph";

// 忽略规则的键
const IgnoreRuleKeys = {
  jsDoc: ["ignore", "WIP", "Draft"],
  classDecorators: ["ignore", "WIP", "Draft"],
  leadingComment: ["@ignore", "@WIP", "@Draft"],
};

import { getNodeExtraInfo } from "@typeto/core";

// 判断是否应跳过该节点
const shouldSkip = (node: ClassDeclaration | TypeAliasDeclaration) => {
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

  return false; // 如果没有任何忽略标签，返回 false
};

/**
 * 获取符合要求的节点
 *
 * class User { namne: string }
 *
 */
// 获取项目中的 d.ts 节点
export const getEntryNodes = (project: Project) => {
  const definitions: ClassDeclaration[] = [];

  project.getSourceFiles().forEach((sourceFile) => {
    sourceFile.getStatements().forEach((statement) => {
      // 处理类声明
      if (Node.isClassDeclaration(statement)) {
        if (shouldSkip(statement)) return; // 跳过被忽略的节点
        definitions.push(statement);
      }
    });
  });

  return {
    // typings,
    definitions,
  };
};
