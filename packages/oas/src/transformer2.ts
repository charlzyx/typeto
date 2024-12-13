import { OasSchema30 } from "@hyperjump/json-schema/openapi-3-0";

type OutputSchema = OasSchema30 & {
  _code?: string;
};

import { ClassDeclaration, Node, Type, TypeAliasDeclaration } from "ts-morph";
import { getNodeExtraInfo, TypeResolver } from "@typeto/core";
import { JsonSchemaType } from "@hyperjump/json-schema/lib/common";

// import { debugType, collectDebugInfo } from "./debug";

const SCHEMA_REF_PREFIX = "#components/schemas/";
type ResolveContext = {
  extra: Record<string, string | boolean>;
  refs: WeakMap<Type, string>;
  defs: WeakMap<Node, string>;
};

const resolveDefs = (type: Type, defs: ResolveContext["defs"]) => {
  const maybe = type.getSymbol().getValueDeclaration();
  const has = defs.has(maybe);
  if (has) {
    return {
      $ref: SCHEMA_REF_PREFIX + defs.get(maybe),
    };
  }
};

const baseResolve =
  (basetype: JsonSchemaType) => (type: Type, ctx: ResolveContext) => {
    return {
      ...ctx.extra,
      type: basetype,
      _code: type.getText(),
    } satisfies OutputSchema;
  };

const schemaResolver = new TypeResolver<OutputSchema, ResolveContext>()
  .before((type, ctx, resolver) => {
    if (ctx.refs.get(type)) {
      return {
        $ref: ctx.refs.get(type),
      };
    } else if (type.getSymbol()) {
      const definedType = resolveDefs(type, ctx.defs);
      if (definedType) return definedType;
    }
  })
  .string(baseResolve("string"))
  .stringLiteral(baseResolve("string"))
  .boolean(baseResolve("boolean"))
  .booleanLiteral(baseResolve("boolean"))
  .number(baseResolve("number"))
  .numberLiteral(baseResolve("number"))
  .undefined(baseResolve("null"))
  .void(baseResolve("null"))
  .null(baseResolve("null"))
  .array((type, ctx, resovler) => {
    ctx.refs.set(type, type.getText());
    return {
      ...ctx.extra,
      type: "array",
      items: resovler.resolve(type.getArrayElementType(), ctx),
    };
  })
  .union((type, ctx, resolver) => {
    ctx.refs.set(type, type.getText());
    return {
      ...ctx.extra,
      oneOf: type
        .getUnionTypes()
        .map((subType) => resolver.resolve(subType, ctx)),
    };
  })
  .intersection((type, ctx, resolver) => {
    ctx.refs.set(type, type.getText());
    return {
      ...ctx.extra,
      allOf: type
        .getIntersectionTypes()
        .map((subType) => resolver.resolve(subType, ctx)),
    };
  })
  .object((type, ctx, resolver) => {
    ctx.refs.set(type, type.getText());
    return {
      ...ctx.extra,
      type: "object",
      properties: type.getProperties().reduce((map, propSymbol) => {
        const propNode =
          propSymbol.getValueDeclaration() ?? propSymbol.getDeclarations()[0];
        const porpType = propNode
          ? propSymbol.getTypeAtLocation(propNode)
          : propSymbol.getDeclaredType();
        const definedType = resolveDefs(porpType, ctx.defs);
        if (definedType) return definedType;
        if (propNode) {
          ctx.extra = getNodeExtraInfo(propNode as any).info;
        }
        map[propSymbol.getName()] = resolver.resolve(porpType, ctx);
      }, {}),
    };
  });

export const transformDefinitions = (definitions: ClassDeclaration[]) => {
  const defSchema = {} as Record<string, OutputSchema>;
  const defs = new WeakMap();
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
    defs.set(def, clzName);
  }

  for (const def of definitions) {
    const extra = getNodeExtraInfo(def);
    let clzName = defs.get(def);
    const circularRefs = new WeakMap();
    const schema: OutputSchema = {
      ...extra.info,
      type: "object",
      properties: def.getProperties().reduce((map, prop) => {
        const extra = getNodeExtraInfo(prop);
        const schema = schemaResolver.resolve(prop.getType(), {
          defs,
          extra: extra.info,
          refs: circularRefs,
        });
        map[prop.getName()] = schema;
        return map;
      }, {}),
    };

    defSchema[clzName] = schema;
  }

  return { defSchema, defNameMap: defs };
};

export const transformOperations = (
  operations: TypeAliasDeclaration[],
  defNameMap: WeakMap<ClassDeclaration, string>
) => {
  const defMap = {} as Record<string, OutputSchema>;
  for (const operation of operations) {
    const extra = getNodeExtraInfo(operation);
    const typeNode = operation.getTypeNode();
    const circularRefs = new WeakMap();

    if (Node.isTypeLiteral(typeNode)) {
      const schema: OutputSchema = {
        ...extra.info,
        type: "object",
        properties: typeNode.getProperties().reduce((map, prop) => {
          const extra = getNodeExtraInfo(prop);
          const schema = schemaResolver.resolve(prop.getType(), {
            defs: defNameMap,
            extra: extra.info,
            refs: circularRefs,
          });
          map[prop.getName()] = schema;
          return map;
        }, {}),
      };

      defMap[operation.getName()] = schema;
    }
  }

  return defMap;
};
