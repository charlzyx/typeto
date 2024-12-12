import * as ts from "typescript";
import { AstMatcher } from "./AstMatcher";

/**
 * 查找函数声明
 * @param sourceFile 源文件
 * @param namePattern 名称模式 (例如: "$name", "$prefixName", "$nameSuffix")
 */
export function findFunctions(
  sourceFile: ts.SourceFile,
  namePattern: string = "$name"
): ts.FunctionDeclaration[] {
  const matcher = new AstMatcher();
  const results: ts.FunctionDeclaration[] = [];

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (matcher.matchIdentifierPattern(namePattern, node.name.text)) {
        results.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

/**
 * 查找类声明
 * @param sourceFile 源文件
 * @param namePattern 名称模式 (例如: "$name", "$prefixName", "$nameSuffix")
 */
export function findClasses(
  sourceFile: ts.SourceFile,
  namePattern: string = "$name"
): ts.ClassDeclaration[] {
  const matcher = new AstMatcher();
  const results: ts.ClassDeclaration[] = [];

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name) {
      if (matcher.matchIdentifierPattern(namePattern, node.name.text)) {
        results.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

/**
 * 查找接口声明
 * @param sourceFile 源文件
 * @param namePattern 名称模式 (例如: "$name", "$prefixName", "$nameSuffix")
 */
export function findInterfaces(
  sourceFile: ts.SourceFile,
  namePattern: string = "$name"
): ts.InterfaceDeclaration[] {
  const matcher = new AstMatcher();
  const results: ts.InterfaceDeclaration[] = [];

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node)) {
      const result = matcher.match(`interface ${namePattern} {}`, node);
      if (result) {
        results.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

/**
 * 查找类型别名声明
 * @param sourceFile 源文件
 * @param namePattern 名称模式 (例如: "$name", "$prefixName", "$nameSuffix")
 */
export function findTypeAliases(
  sourceFile: ts.SourceFile,
  namePattern: string = "$name"
): ts.TypeAliasDeclaration[] {
  const matcher = new AstMatcher();
  const results: ts.TypeAliasDeclaration[] = [];

  function visit(node: ts.Node) {
    if (ts.isTypeAliasDeclaration(node)) {
      const result = matcher.match(`type ${namePattern} = any;`, node);
      if (result) {
        results.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

/**
 * 查找方法声明
 * @param sourceFile 源文件
 * @param namePattern 名称模式 (例如: "$name", "$prefixName", "$nameSuffix")
 */
export function findMethods(
  sourceFile: ts.SourceFile,
  namePattern: string = "$name"
): ts.MethodDeclaration[] {
  const matcher = new AstMatcher();
  const results: ts.MethodDeclaration[] = [];

  function visit(node: ts.Node) {
    if (ts.isMethodDeclaration(node)) {
      const result = matcher.match(`class X { ${namePattern}() {} }`, node);
      if (result) {
        results.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

/**
 * 查找属性声明
 * @param sourceFile 源文件
 * @param namePattern 名称模式 (例如: "$name", "$prefixName", "$nameSuffix")
 */
export function findProperties(
  sourceFile: ts.SourceFile,
  namePattern: string = "$name"
): ts.PropertyDeclaration[] {
  const matcher = new AstMatcher();
  const results: ts.PropertyDeclaration[] = [];

  function visit(node: ts.Node) {
    if (ts.isPropertyDeclaration(node)) {
      const result = matcher.match(`class X { ${namePattern}: any; }`, node);
      if (result) {
        results.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

/**
 * 查找装饰器
 */
export function findDecorators(
  sourceFile: ts.SourceFile,
  namePattern: string = "$name"
): ts.Decorator[] {
  const matcher = new AstMatcher();
  const results: ts.Decorator[] = [];

  function visit(node: ts.Node) {
    if (ts.isDecorator(node)) {
      const result = matcher.match(`@${namePattern}()`, node);
      if (result) {
        results.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

/**
 * 查找带有特定JSDoc的节点
 */
export function findNodesWithJSDoc<T extends ts.Node>(
  sourceFile: ts.SourceFile,
  tagPattern: string = "$tag",
  commentPattern: string = "$comment"
): T[] {
  const matcher = new AstMatcher();
  const results: T[] = [];

  function visit(node: ts.Node | undefined) {
    if (!node) return;

    if (ts.getJSDocTags(node).length > 0) {
      const jsDocPattern = `
        /**
         * ${commentPattern}
         * @${tagPattern}
         */
      `;
      const result = matcher.match(jsDocPattern, node);
      if (result) {
        results.push(node as T);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}
