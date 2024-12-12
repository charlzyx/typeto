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
    // 重置捕获
    this.captures = {};

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

  /**
   * 匹配标识符模式
   * @param pattern 模式字符串 (例如: "$name", "$prefixName", "$nameSuffix")
   * @param text 要匹配的文本
   * @returns 是否匹配成功
   *
   * 示例:
   * - matchIdentifierPattern("$nameModel", "UserModel") => true
   * - matchIdentifierPattern("$prefix$name", "getUserData") => true
   * - matchIdentifierPattern("get$name", "getData") => true
   */
  public matchIdentifierPattern(pattern: string, text: string): boolean {
    const parts = pattern.split(/(\$[a-zA-Z]+)/).filter(Boolean);
    let remainingText = text;

    for (const part of parts) {
      if (part.startsWith("$")) {
        const captureName = part.slice(1);
        const nextPart = parts[parts.indexOf(part) + 1];

        if (!nextPart) {
          this.captures[captureName] =
            ts.factory.createIdentifier(remainingText);
          remainingText = "";
        } else {
          const index = remainingText.indexOf(nextPart);
          if (index === -1) return false;

          const captured = remainingText.slice(0, index);
          if (!captured) return false;

          this.captures[captureName] = ts.factory.createIdentifier(captured);
          remainingText = remainingText.slice(index);
        }
      } else {
        if (!remainingText.startsWith(part)) {
          return false;
        }
        remainingText = remainingText.slice(part.length);
      }
    }

    return remainingText.length === 0;
  }

  private matchIdentifier(text: string, node: ts.Node): boolean {
    // 处理多个变量捕获
    const parts = text.split(/(\$[a-zA-Z]+)/).filter(Boolean);
    let nodeText = node.getText();
    let remainingText = nodeText;

    for (const part of parts) {
      if (part.startsWith("$")) {
        const captureName = part.slice(1);
        // 如果是最后一个部分，捕获剩余所有文本
        if (parts.indexOf(part) === parts.length - 1) {
          this.captures[captureName] =
            ts.factory.createIdentifier(remainingText);
          remainingText = "";
        } else {
          // 否则查找下一个固定部分的位置
          const nextPart = parts[parts.indexOf(part) + 1];
          const index = remainingText.indexOf(nextPart);
          if (index === -1) return false;

          const captured = remainingText.slice(0, index);
          if (!captured) return false;

          this.captures[captureName] = ts.factory.createIdentifier(captured);
          remainingText = remainingText.slice(index);
        }
      } else {
        if (!remainingText.startsWith(part)) {
          return false;
        }
        remainingText = remainingText.slice(part.length);
      }
    }

    return remainingText === "";
  }

  private matchNode(pattern: ts.Node, node: ts.Node): MatchResult | null {
    // 处理捕获变量
    if (ts.isIdentifier(pattern)) {
      const text = pattern.text;
      if (text.includes("$")) {
        if (this.matchIdentifier(text, node)) {
          return {
            node,
            captures: this.captures,
          };
        }
        return null;
      }
    }

    // 节点类型必须匹配
    if (pattern.kind !== node.kind) {
      return null;
    }

    // 根据节点类型进行具体匹配
    if (ts.isFunctionDeclaration(pattern) && ts.isFunctionDeclaration(node)) {
      return this.matchFunction(pattern, node);
    }

    if (ts.isClassDeclaration(pattern) && ts.isClassDeclaration(node)) {
      return this.matchClass(pattern, node);
    }

    if (ts.isInterfaceDeclaration(pattern) && ts.isInterfaceDeclaration(node)) {
      return this.matchInterface(pattern, node);
    }

    if (ts.isTypeAliasDeclaration(pattern) && ts.isTypeAliasDeclaration(node)) {
      return this.matchTypeAlias(pattern, node);
    }

    if (ts.isMethodDeclaration(pattern) && ts.isMethodDeclaration(node)) {
      return this.matchMethod(pattern, node);
    }

    if (ts.isPropertyDeclaration(pattern) && ts.isPropertyDeclaration(node)) {
      return this.matchProperty(pattern, node);
    }

    if (ts.isDecorator(pattern) && ts.isDecorator(node)) {
      return this.matchDecorator(pattern, node);
    }

    if (ts.isJSDoc(pattern) && ts.isJSDoc(node)) {
      return this.matchJSDoc(pattern, node);
    }

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

    return {
      node,
      captures: this.captures,
    };
  }

  private matchClass(
    pattern: ts.ClassDeclaration,
    node: ts.ClassDeclaration
  ): MatchResult | null {
    // 匹配类名
    if (pattern.name && node.name) {
      if (pattern.name.text.startsWith("$")) {
        const captureName = pattern.name.text.slice(1);
        this.captures[captureName] = node.name;
      } else if (pattern.name.text !== node.name.text) {
        return null;
      }
    }

    return {
      node,
      captures: this.captures,
    };
  }

  private matchInterface(
    pattern: ts.InterfaceDeclaration,
    node: ts.InterfaceDeclaration
  ): MatchResult | null {
    if (pattern.name && node.name) {
      if (pattern.name.text.startsWith("$")) {
        const captureName = pattern.name.text.slice(1);
        this.captures[captureName] = node.name;
      } else if (pattern.name.text !== node.name.text) {
        return null;
      }
    }

    return {
      node,
      captures: this.captures,
    };
  }

  private matchTypeAlias(
    pattern: ts.TypeAliasDeclaration,
    node: ts.TypeAliasDeclaration
  ): MatchResult | null {
    if (pattern.name && node.name) {
      if (pattern.name.text.startsWith("$")) {
        const captureName = pattern.name.text.slice(1);
        this.captures[captureName] = node.name;
      } else if (pattern.name.text !== node.name.text) {
        return null;
      }
    }

    return {
      node,
      captures: this.captures,
    };
  }

  private matchMethod(
    pattern: ts.MethodDeclaration,
    node: ts.MethodDeclaration
  ): MatchResult | null {
    if (
      pattern.name &&
      ts.isIdentifier(pattern.name) &&
      ts.isIdentifier(node.name)
    ) {
      if (pattern.name.text.startsWith("$")) {
        const captureName = pattern.name.text.slice(1);
        this.captures[captureName] = node.name;
      } else if (pattern.name.text !== node.name.text) {
        return null;
      }
    }

    return {
      node,
      captures: this.captures,
    };
  }

  private matchProperty(
    pattern: ts.PropertyDeclaration,
    node: ts.PropertyDeclaration
  ): MatchResult | null {
    if (
      pattern.name &&
      ts.isIdentifier(pattern.name) &&
      ts.isIdentifier(node.name)
    ) {
      if (pattern.name.text.startsWith("$")) {
        const captureName = pattern.name.text.slice(1);
        this.captures[captureName] = node.name;
      } else if (pattern.name.text !== node.name.text) {
        return null;
      }
    }

    return {
      node,
      captures: this.captures,
    };
  }

  private matchDecorator(
    pattern: ts.Decorator,
    node: ts.Decorator
  ): MatchResult | null {
    if (
      !ts.isCallExpression(pattern.expression) ||
      !ts.isCallExpression(node.expression)
    ) {
      return null;
    }

    // 匹配装饰器名称
    const patternName = pattern.expression.expression.getText();
    const nodeName = node.expression.expression.getText();

    if (patternName.startsWith("$")) {
      const captureName = patternName.slice(1);
      this.captures[captureName] = node.expression.expression;
    } else if (patternName !== nodeName) {
      return null;
    }

    // 匹配装饰器参数
    const patternArgs = pattern.expression.arguments;
    const nodeArgs = node.expression.arguments;

    if (patternArgs.length !== nodeArgs.length) {
      return null;
    }

    // 递归匹配每个参数
    for (let i = 0; i < patternArgs.length; i++) {
      const patternArg = patternArgs[i];
      const nodeArg = nodeArgs[i];

      if (ts.isIdentifier(patternArg) && patternArg.text.startsWith("$")) {
        const captureName = patternArg.text.slice(1);
        this.captures[captureName] = nodeArg;
      } else if (patternArg.getText() !== nodeArg.getText()) {
        return null;
      }
    }

    return {
      node,
      captures: this.captures,
    };
  }

  private matchJSDoc(pattern: ts.JSDoc, node: ts.JSDoc): MatchResult | null {
    // 匹配注释文本
    if (pattern.comment && typeof pattern.comment === "string") {
      if (pattern.comment.startsWith("$")) {
        const captureName = pattern.comment.slice(1);
        this.captures[captureName] = node;
      } else if (pattern.comment !== node.comment) {
        return null;
      }
    }

    // 匹配标签
    if (pattern.tags && node.tags) {
      if (pattern.tags.length !== node.tags.length) {
        return null;
      }

      for (let i = 0; i < pattern.tags.length; i++) {
        const patternTag = pattern.tags[i];
        const nodeTag = node.tags[i];

        if (patternTag.tagName.text.startsWith("$")) {
          const captureName = patternTag.tagName.text.slice(1);
          this.captures[captureName] = nodeTag;
        } else if (patternTag.tagName.text !== nodeTag.tagName.text) {
          return null;
        }

        // 匹配标签注释
        if (patternTag.comment && typeof patternTag.comment === "string") {
          if (patternTag.comment.startsWith("$")) {
            const captureName = patternTag.comment.slice(1);
            this.captures[captureName] = nodeTag;
          } else if (patternTag.comment !== nodeTag.comment) {
            return null;
          }
        }
      }
    }

    return {
      node,
      captures: this.captures,
    };
  }
}

export const createMatcher = () => new AstMatcher();
