import { OasSchema30 } from "@hyperjump/json-schema/openapi-3-0";

import { JsonSchemaType } from "@hyperjump/json-schema/lib/common";
import { getNodeExtraInfo, TypeResolver } from "@typeto/core";
import { ClassDeclaration, Node, Type, TypeAliasDeclaration } from "ts-morph";

export type OasSchema = OasSchema30 & {
  _code?: string;
};

const SCHEMA_REF_PREFIX = "#components/schemas/";

type ResolveContext = {
  extra: Record<string, string | boolean>;
  refs: WeakMap<Type, string>;
  defs: WeakMap<Node, string>;
  wantRequired: boolean;
};

const consumeExtra = (ctx: ResolveContext) => {
  const extra = ctx.extra;
  ctx.extra = {
    wantRequired: extra.wantRequired,
  };
  return extra;
};

const resolveDefs = (type: Type, ctx: ResolveContext) => {
  const maybe = type.getSymbol().getValueDeclaration();
  const has = ctx.defs.has(maybe);
  if (has) {
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      $ref: SCHEMA_REF_PREFIX + ctx.defs.get(maybe),
    };
  }
};

const primitiveResolve =
  (basetype: JsonSchemaType) => (type: Type, ctx: ResolveContext) => {
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      type: basetype,
      _code: type.getText(),
    } satisfies OasSchema;
  };

const schemaResolver = new TypeResolver<OasSchema, ResolveContext>()
  .before((type, ctx, resolver) => {
    if (ctx.refs.get(type)) {
      const extra = consumeExtra(ctx);
      return {
        ...extra,
        default: ctx.extra?.initialValue,
        $ref: ctx.refs.get(type),
      };
    } else if (type.getSymbol()) {
      const definedType = resolveDefs(type, ctx);
      if (definedType) return definedType;
    }
  })
  .string(primitiveResolve("string"))
  .stringLiteral(primitiveResolve("string"))
  .boolean(primitiveResolve("boolean"))
  .booleanLiteral(primitiveResolve("boolean"))
  .number(primitiveResolve("number"))
  .numberLiteral(primitiveResolve("number"))
  .undefined(primitiveResolve("null"))
  .void(primitiveResolve("null"))
  .null(primitiveResolve("null"))
  .array((type, ctx, resovler) => {
    ctx.refs.set(type, type.getText());
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      type: "array",
      items: resovler.resolve(type.getArrayElementType(), ctx),
    };
  })
  .union((type, ctx, resolver) => {
    ctx.refs.set(type, type.getText());
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      oneOf: type
        .getUnionTypes()
        .map((subType) => resolver.resolve(subType, ctx)),
    };
  })
  .intersection((type, ctx, resolver) => {
    ctx.refs.set(type, type.getText());
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      allOf: type
        .getIntersectionTypes()
        .map((subType) => resolver.resolve(subType, ctx)),
    };
  })
  .object((type, ctx, resolver) => {
    ctx.refs.set(type, type.getText());
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      type: "object",
      properties: type.getProperties().reduce((map, propSymbol) => {
        const propNode =
          propSymbol.getValueDeclaration() ?? propSymbol.getDeclarations()[0];
        const porpType = propNode
          ? propSymbol.getTypeAtLocation(propNode)
          : propSymbol.getDeclaredType();

        const definedType = resolveDefs(porpType, ctx);

        if (definedType) return definedType;
        if (propNode) {
          ctx.extra = ctx.wantRequired
            ? {
                ...getNodeExtraInfo(propNode).info,
                required: propSymbol.isOptional() ? false : true,
              }
            : getNodeExtraInfo(propNode).info;
        }

        map[propSymbol.getName()] = resolver.resolve(porpType, ctx);
      }, {}),
    };
  });

export const transformDefinitions = (definitions: ClassDeclaration[]) => {
  const defSchema = {} as Record<string, OasSchema>;
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
    const schema: OasSchema = {
      ...extra.info,
      type: "object",
      properties: def.getProperties().reduce((map, prop) => {
        const extra = getNodeExtraInfo(prop);
        const symbol = prop.getSymbol();
        const schema = schemaResolver.resolve(prop.getType(), {
          defs,
          extra: {
            ...extra.info,
            default: extra.initialValue,
            required: symbol?.isOptional() ? false : true,
          },
          refs: circularRefs,
          wantRequired: true,
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
  const defMap = {} as Record<string, OasSchema>;
  for (const operation of operations) {
    const extra = getNodeExtraInfo(operation);
    const typeNode = operation.getTypeNode();
    const circularRefs = new WeakMap();

    if (Node.isTypeLiteral(typeNode)) {
      const schema: OasSchema = {
        ...extra.info,
        type: "object",
        properties: typeNode.getProperties().reduce((map, prop) => {
          const extra = getNodeExtraInfo(prop);
          const schema = schemaResolver.resolve(prop.getType(), {
            defs: defNameMap,
            extra: {
              ...extra.info,
              default: extra.initialValue,
            },
            refs: circularRefs,
            wantRequired: false,
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
