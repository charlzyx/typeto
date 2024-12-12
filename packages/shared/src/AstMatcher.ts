import * as ts from "typescript";

type Pattern = string;
type MatchResult = {
  node: ts.Node;
  captures: Record<string, ts.Node>;
};

export class AstMatcher {
  private captures: Record<string, ts.Node> = {};

  /**
   * 匹配模式语法:
   * $name - 捕获任意标识符
   * $expr - 捕获任意表达式
   * $stmt - 捕获任意语句
   * $type - 捕获任意类型
   */
  match(pattern: Pattern, node: ts.Node): MatchResult | null {
    // 解析模式字符串为 AST
    const sourceFile = ts.createSourceFile(
      "pattern.ts",
      pattern,
      ts.ScriptTarget.Latest,
      true
    );

    const patternNode = sourceFile.statements[0];
    return this.matchNode(patternNode, node);
  }

  private matchNode(pattern: ts.Node, node: ts.Node): MatchResult | null {
    // 处理捕获变量
    if (ts.isIdentifier(pattern) && pattern.text.startsWith("$")) {
      const captureName = pattern.text.slice(1);
      this.captures[captureName] = node;
      return {
        node,
        captures: this.captures,
      };
    }

    // 节点类型必须匹配
    if (pattern.kind !== node.kind) {
      return null;
    }

    // 根据节点类型进行具体匹配
    if (ts.isFunctionDeclaration(pattern) && ts.isFunctionDeclaration(node)) {
      return this.matchFunction(pattern, node);
    }

    // 可以继续添加其他节点类型的匹配...

    return null;
  }

  private matchFunction(
    pattern: ts.FunctionDeclaration,
    node: ts.FunctionDeclaration
  ): MatchResult | null {
    // 匹配函数名
    if (pattern.name && node.name) {
      if (pattern.name.text.startsWith("$")) {
        const captureName = pattern.name.text.slice(1);
        this.captures[captureName] = node.name;
      } else if (pattern.name.text !== node.name.text) {
        return null;
      }
    }

    // 可以继续匹配参数、返回类型、函数体等...

    return {
      node,
      captures: this.captures,
    };
  }
}

// 使用示例:
export const createMatcher = () => new AstMatcher();

// 使用方式:
/*
const matcher = createMatcher();
const result = matcher.match("function $name() {}", node);
if (result) {
  const funcName = result.captures.name; // 获取匹配的函数名节点
}
*/
