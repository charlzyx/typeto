import * as ts from "typescript";
import { AstMatcher } from "./AstMatcher";

export function findFunctions(
  sourceFile: ts.SourceFile,
  namePattern: string = "$name"
): ts.FunctionDeclaration[] {
  const matcher = new AstMatcher();
  const results: ts.FunctionDeclaration[] = [];

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node)) {
      const result = matcher.match(`function ${namePattern}() {}`, node);
      if (result) {
        results.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

export function findClasses(
  sourceFile: ts.SourceFile,
  namePattern: string = "$name"
): ts.ClassDeclaration[] {
  const matcher = new AstMatcher();
  const results: ts.ClassDeclaration[] = [];

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node)) {
      const result = matcher.match(`class ${namePattern} {}`, node);
      if (result) {
        results.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

// 使用示例:
/*
const program = ts.createProgram(["file.ts"], {});
const sourceFile = program.getSourceFile("file.ts")!;

// 查找所有函数
const functions = findFunctions(sourceFile);

// 查找特定模式的函数
const testFunctions = findFunctions(sourceFile, "test$name");

// 查找所有类
const classes = findClasses(sourceFile);
*/
