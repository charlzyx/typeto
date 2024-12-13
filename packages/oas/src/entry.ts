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
 * type getUser = {
 *    url: "/get/user"
 * }
 */
// 获取项目中的 d.ts 节点
export const getEntryNodes = (project: Project) => {
  // const typings: TypeAliasDeclaration[] = [];
  const definitions: ClassDeclaration[] = [];
  const operations: TypeAliasDeclaration[] = [];
  const unique = {} as Record<string, TypeAliasDeclaration>;

  project.getSourceFiles().forEach((sourceFile) => {
    sourceFile.getStatements().forEach((statement) => {
      // 处理类声明
      if (Node.isClassDeclaration(statement)) {
        if (shouldSkip(statement)) return; // 跳过被忽略的节点
        definitions.push(statement);
      }
      // 处理类型别名声明
      if (Node.isTypeAliasDeclaration(statement)) {
        const typ = statement.getTypeNode();
        if (shouldSkip(statement)) return; // 跳过被忽略的节点

        // 如果是带有泛型的说明是一些辅助类型定义, 虽然暂时没有什么用, 但是先保起来
        // const typeParams = statement.getTypeParameters();
        // 仅处理有泛型参数的类型别名
        // if (typeParams.length > 0) {
        //   typings.push(statement);
        // }

        // 否则就看是不是 ApiOperation 定义
        // 条件是必须是 TypeLiteral 字面量定义
        if (Node.isTypeLiteral(typ)) {
          const operation = statement;
          // 必须有 url 字段
          const hasUrl = operation.getType().getProperty("url");
          if (hasUrl) {
            const name = operation.getName();
            if (unique[name]) {
              throw new Error(
                "Api 操作定义出现了重复" +
                  name +
                  "重复定义所在文件: " +
                  unique[name].getSourceFile().getFilePath() +
                  ":" +
                  unique[name].getStartLineNumber() // 使用 getLine() 获取行号
              );
            }
            operations.push(operation);
            unique[name] = operation; // 记录唯一的操作
          }
        }
      }
    });
  });

  return {
    // typings,
    definitions,
    operations,
  };
};
