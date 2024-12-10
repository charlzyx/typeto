import { ISchema } from "@formily/json-schema";
type OutputSchema = ISchema & {
  "x-code"?: string;
  $ref?: string;
};

import { getNodeExtraInfo } from "@typeto/shared";
import { ClassDeclaration, Type } from "ts-morph";
export const SCHEMA_REF_PREFIX = "#";
/**
 * 类型转换的参数接口
 */
interface ResolveTypeInfo {
  /** 要转换的 TypeScript 类型 */
  type: Type;
  /** 类型定义名称映射表 */
  defNameMap: WeakMap<ClassDeclaration, string>;
  /** 额外的 schema 属性 */
  extra?: Record<string, string | boolean>;
  /** 循环引用检测集合 */
  circularRefs?: WeakMap<Type, string>;
}

const resolveLiteral = (type: Type) => {
  if (type.isLiteral) {
    return {
      const: type.getLiteralValue(),
      "x-decorator": undefined,
      "x-component": undefined,
    };
  } else {
    return {};
  }
};

const KeyMap = {
  Component: "x-component",
  ComponentProps: "x-component-props",
  value: "x-value",
  index: "x-index",
  pattern: "x-pattern",
  display: "x-display",
  validator: "x-validator",
  decorator: "x-decorator",
  decoratorProps: "x-decorator-props",
  component: "x-component",
  componentProps: "x-component-props",
  reactions: "x-reactions",
  content: "x-content",
  data: "x-data",
  visible: "x-visible",
  hidden: "x-hidden",
  disabled: "x-disabled",
  editable: "x-editable",
  readOnly: "x-read-only",
  readPretty: "x-read-pretty",
  compileOmitted: "x-compile-omitted",
};
const covertProps = (extra: ResolveTypeInfo["extra"]) => {
  return Object.keys(extra || {}).reduce((map, key) => {
    map[KeyMap[key] || key] = extra[key];
    return map;
  }, {});
};

const resolveType = (info: ResolveTypeInfo): OutputSchema => {
  const {
    type,
    defNameMap,
    extra = {},
    circularRefs = new WeakMap<Type, string>(),
  } = info;

  // 输出调试信息,帮助理解类型结构
  // console.log("\n=== Resolving Type ===", debugType(type));

  // 收集类型的相关信息用于调试
  // const debug = collectDebugInfo(type, typeNode);

  const base: OutputSchema = {
    "x-decorator": "FormItem",
    "x-component": "Input",
    ...covertProps(extra),
    "x-code": type.getText(),
    ...resolveLiteral(type),
  };
  // 检测并处理循环引用
  if (circularRefs.has(type)) {
    return {
      ...base,
      $ref: circularRefs.get(type),
    };
  }
  if (type.getSymbol()) {
    // 检查属性类型是否是已定义的类型
    const maybeTypeDecl = type.getSymbol().getValueDeclaration();
    const isDefinedType = defNameMap.has(maybeTypeDecl as ClassDeclaration);

    // 如果是已定义类型,使用引用
    if (isDefinedType) {
      return {
        ...base,
        $ref:
          SCHEMA_REF_PREFIX + defNameMap.get(maybeTypeDecl as ClassDeclaration),
      };
    }
  }

  // 处理基本类型和字面量类型
  if (type.isString() || type.isStringLiteral()) {
    return {
      ...base,
      type: "string",
    };
  }

  if (type.isNumber() || type.isNumberLiteral()) {
    return {
      ...base,
      type: "number",
    };
  }

  if (type.isBoolean() || type.isBooleanLiteral()) {
    return {
      ...base,
      type: "boolean",
    };
  }

  // 处理其他字面量类型
  if (type.isLiteral()) {
    return {
      ...base,
      type: "string",
    };
  }

  // 处理数组类型
  if (type.isArray()) {
    return {
      ...base,
      type: "array",
      items: resolveType({
        type: type.getArrayElementType(),
        defNameMap,
        circularRefs,
      }),
    };
  }

  if (type.isUnion()) {
    circularRefs.set(type, type.getText());
    const subs = type.getUnionTypes().map((subType) =>
      resolveType({
        type: subType,
        defNameMap,
        extra,
        circularRefs,
      })
    );
    return {
      ...base,
      enum: subs.map((item) => ({ label: item.const, value: item.const })),
    };
  }
  if (type.isIntersection()) {
    circularRefs.set(type, type.getText());
    const allOf = type.getIntersectionTypes().map((subType) => {
      return resolveType({
        type: subType,
        defNameMap,
        extra,
        circularRefs,
      });
    });
    return {
      ...base,
      ...allOf.reduce((map, sub) => ({ ...map, ...sub }), {}),
    };
  }

  // 处理对象类型和交叉类型
  if (type.isObject()) {
    circularRefs.set(type, type.getText());
    return {
      ...base,
      type: "object",
      properties: type.getProperties().reduce((map, propSymbol) => {
        // const debug = collectDebugInfo(null, null, propSymbol);

        // 获取属性的声明节点
        const propNode =
          propSymbol.getValueDeclaration() ?? propSymbol.getDeclarations()[0];

        // 获取属性的类型
        const propType = propNode
          ? propSymbol.getTypeAtLocation(propNode)
          : propSymbol.getDeclaredType();

        // 检查属性类型是否是已定义的类型
        const maybeTypeDecl = propType.getSymbol()?.getValueDeclaration();
        const isDefinedType =
          maybeTypeDecl && defNameMap.has(maybeTypeDecl as ClassDeclaration);

        // 如果是已定义类型,使用引用
        if (isDefinedType) {
          map[propSymbol.getName()] = {
            $ref:
              SCHEMA_REF_PREFIX +
              defNameMap.get(maybeTypeDecl as ClassDeclaration),
          };
          return map;
        }

        // 递归处理属性类型
        map[propSymbol.getName()] = resolveType({
          type: propType,
          defNameMap,
          circularRefs,
        });
        return map;
      }, {}),
    };
  }
};

export const transformDefinitions = (
  definitions: ClassDeclaration[]
): ISchema => {
  const defSchema = {} as Record<string, OutputSchema>;
  const defNameMap = new WeakMap();
  for (const def of definitions) {
    let clzName = def.getName();
    // 检查是否存在重复名称
    if (defSchema[clzName]) {
      const atFile = def.getSourceFile().getFilePath();
      const basechain = atFile.split("/");
      clzName =
        clzName + "At" + basechain[basechain.length - 1].replace(/\.w+/, "");
      let acc = 0;
      const baseName = clzName;

      // 生成唯一名称
      while (defSchema[clzName]) {
        acc = acc + 1;
        clzName = baseName + acc;
      }
    }
    defNameMap.set(def, clzName);
  }

  for (const def of definitions) {
    const extra = getNodeExtraInfo(def);
    let clzName = defNameMap.get(def);
    const schema: OutputSchema = {
      ...extra.info,
      type: "object",
      properties: def.getProperties().reduce((map, prop) => {
        const extra = getNodeExtraInfo(prop);
        map[prop.getName()] = resolveType({
          type: prop.getType(),
          defNameMap: defNameMap,
          extra: extra.info,
        });
        return map;
      }, {}),
    };

    defSchema[clzName] = schema;
  }

  return defSchema;
};
