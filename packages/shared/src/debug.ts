/**
 * TypeScript Compiler API 的三个核心概念:
 *
 * 1. Node (节点)
 *    - AST(抽象语法树)中的节点
 *    - 表示源代码的语法结构
 *    - 例如: 类声明、接口声明、函数声明等
 *
 * 2. Symbol (符号)
 *    - 表示命名实体(如变量、函数、类等)
 *    - 包含实体的声明信息和类型信息
 *    - 用于链接声明和使用处
 *
 * 3. Type (类型)
 *    - 表示值的类型信息
 *    - 可以是基本类型、对象类型、联合类型等
 *    - 用于类型检查和推断
 *
 * 关系:
 * - Node 可以有关联的 Symbol (通过 getSymbol())
 * - Node 可以有关联的 Type (通过 getType())
 * - Symbol 可以有关联的 Type (通过 getTypeAtLocation())
 * - Symbol 可以有关联的 Declarations (Node) (通过 getDeclarations())
 * - Type 可以有关联的 Symbol (通过 getSymbol())
 */

import { Node, Symbol, SymbolFlags, Type } from "ts-morph";

const typeIs = (type: Type) => {
  return [
    "isAnonymous",
    "isAny",
    "isNever",
    "isArray",
    "isReadonlyArray",
    "isTemplateLiteral",
    "isBoolean",
    "isString",
    "isNumber",
    "isBigInt",
    "isLiteral",
    "isBooleanLiteral",
    "isBigIntLiteral",
    "isEnumLiteral",
    "isNumberLiteral",
    "isStringLiteral",
    "isClass",
    "isClassOrInterface",
    "isEnum",
    "isInterface",
    "isObject",
    "isTypeParameter",
    "isTuple",
    "isUnion",
    "isIntersection",
    "isUnionOrIntersection",
    "isUnknown",
    "isNull",
    "isUndefined",
    "isVoid",
  ].reduce((ll, method) => {
    if (type[method]()) {
      ll.push(method.replace("is", ""));
    }
    return ll;
  }, []);
};

const symbolIs = (symbol: Symbol) => {
  return [
    "None",
    "FunctionScopedVariable",
    "BlockScopedVariable",
    "Property",
    "EnumMember",
    "Function",
    "Class",
    "Interface",
    "ConstEnum",
    "RegularEnum",
    "ValueModule",
    "NamespaceModule",
    "TypeLiteral",
    "ObjectLiteral",
    "Method",
    "Constructor",
    "GetAccessor",
    "SetAccessor",
    "Signature",
    "TypeParameter",
    "TypeAlias",
    "ExportValue",
    "Alias",
    "Prototype",
    "ExportStar",
    "Optional",
    "Transient",
    "Assignment",
    "ModuleExports",
    "All",
    "Enum",
    "Variable",
    "Value",
    "Type",
    "Namespace",
    "Module",
    "Accessor",
    "FunctionScopedVariableExcludes",
    "BlockScopedVariableExcludes",
    "ParameterExcludes",
    "PropertyExcludes",
    "EnumMemberExcludes",
    "FunctionExcludes",
    "ClassExcludes",
    "InterfaceExcludes",
    "RegularEnumExcludes",
    "ConstEnumExcludes",
    "ValueModuleExcludes",
    "NamespaceModuleExcludes",
    "MethodExcludes",
    "GetAccessorExcludes",
    "SetAccessorExcludes",
    "AccessorExcludes",
    "TypeParameterExcludes",
    "TypeAliasExcludes",
    "AliasExcludes",
    "ModuleMember",
    "ExportHasLocal",
    "BlockScoped",
    "PropertyOrAccessor",
    "ClassMember",
  ].reduce((ll, flag) => {
    if (symbol.hasFlags(SymbolFlags[flag])) {
      ll.push(flag);
    }
    return ll;
  }, []);
};

interface SymbolInfo {
  name: string;
  flags: string[];
  declarations?: Array<{
    kind: string;
    text: string;
  }>;
  valueDeclaration?: {
    kind: string;
    text: string;
  };
}

interface TypeInfo {
  text: string;
  is: string[];
  symbol?: SymbolInfo;
  aliasSymbol?: SymbolInfo;
}

interface NodeInfo {
  kind: string;
  text: string;
  symbol?: SymbolInfo;
  type?: TypeInfo;
}

export const debugNode = (node: Node): NodeInfo => {
  const info: NodeInfo = {
    kind: node.getKindName(),
    text: node.getText(),
  };

  const symbol = node.getSymbol();
  if (symbol) {
    info.symbol = debugSymbol(symbol);
  }

  const type = node.getType();
  if (type) {
    info.type = debugType(type);
  }

  return info;
};

export const debugType = (type: Type): TypeInfo => {
  const info: TypeInfo = {
    text: type.getText(),
    is: typeIs(type),
  };

  const symbol = type.getSymbol();
  if (symbol) {
    info.symbol = debugSymbol(symbol);
  }

  const aliasSymbol = type.getAliasSymbol();
  if (aliasSymbol) {
    info.aliasSymbol = debugSymbol(aliasSymbol);
  }

  return info;
};

export const debugSymbol = (symbol: Symbol): SymbolInfo => {
  const info: SymbolInfo = {
    name: symbol.getName(),
    flags: symbolIs(symbol),
  };

  const declarations = symbol.getDeclarations();
  if (declarations.length > 0) {
    info.declarations = declarations.map((decl) => ({
      kind: decl.getKindName(),
      text: decl.getText(),
    }));
  }

  const valueDeclaration = symbol.getValueDeclaration();
  if (valueDeclaration) {
    info.valueDeclaration = {
      kind: valueDeclaration.getKindName(),
      text: valueDeclaration.getText(),
    };
  }

  return info;
};

// 新增的辅助函数，用于收集调试信息
export const debugInfo = (type?: Type, typeNode?: Node, symbol?: Symbol) => {
  const debug = {
    type: type ? debugType(type) : null,
    typeSymbol: type.getSymbol() ? debugSymbol(type.getSymbol()) : null,
    typeAliasSymbol: type.getAliasSymbol()
      ? debugSymbol(type.getAliasSymbol())
      : null,
    node: typeNode ? debugNode(typeNode) : null,
    symbol: symbol ? debugSymbol(symbol) : null,
  };
  console.log("\n=== Type Node Info ===", debug.node);
  console.log("\n=== Type Symbol Info ===", debug.typeSymbol);
  console.log("\n=== Type Alias Info ===", debug.typeAliasSymbol);
  return debug;
};
