import { ISchema } from "@formily/json-schema";
import { getNodeExtraInfo, TypeResolver } from "@typeto/core";
import { ClassDeclaration, Type, Node } from "ts-morph";

export const SCHEMA_REF_PREFIX = "#";

type OutputSchema = ISchema & {
  "x-code"?: string;
  $ref?: string;
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

type ResolveContext = {
  extra: Record<string, string | boolean>;
  refs: WeakMap<Type, string>;
  defs: WeakMap<Node, string>;
  self: string;
};

const resolveDefs = (type: Type, ctx: ResolveContext) => {
  const maybe = type.getSymbol()?.getValueDeclaration();
  const has = ctx.defs.has(maybe);
  if (has) {
    return ctx.defs.get(maybe);
  }
};

const convertProps = (extra: ResolveContext["extra"]) => {
  return Object.keys(extra || {}).reduce((map, key) => {
    map[KeyMap[key] || key] = extra[key];
    return map;
  }, {});
};

const consumeExtra = (ctx: ResolveContext) => {
  const extra = convertProps(ctx.extra);
  ctx.extra = {};
  return extra;
};

const primitiveResolve =
  (basetype: ISchema["type"]) => (type: Type, ctx: ResolveContext) => {
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      type: basetype,
      "x-code": type.getText(),
    } satisfies ISchema;
  };

const literalResolve =
  (basetype: ISchema["type"]) => (type: Type, ctx: ResolveContext) => {
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      type: basetype,
      const: type.getLiteralValue(),
      "x-value": type.getLiteralValue(),
      "x-code": type.getText(),
    } satisfies ISchema;
  };

const schemaResolver = new TypeResolver<ISchema, ResolveContext>()
  .before((type, ctx, resolver) => {
    ctx.extra = type.isObject()
      ? ctx.extra
      : {
          "x-decorator": "FormItem",
          "x-component": "Input",
          ...ctx.extra,
        };
    if (ctx.refs.get(type)) {
      return (SCHEMA_REF_PREFIX + ctx.refs.get(type)) as unknown as ISchema;
    } else {
      const maybe = resolveDefs(type, ctx);
      if (maybe && maybe !== ctx.self)
        return (SCHEMA_REF_PREFIX + maybe) as unknown as ISchema;
    }
  })
  .string(primitiveResolve("string"))
  .stringLiteral(literalResolve("string"))
  .boolean(primitiveResolve("boolean"))
  .booleanLiteral(literalResolve("boolean"))
  .number(primitiveResolve("number"))
  .numberLiteral(literalResolve("number"))
  .void(primitiveResolve("void"))
  .undefined(primitiveResolve("null"))
  .null(primitiveResolve("null"))
  .array((type, ctx, resovler) => {
    ctx.refs.set(type, type.getText());
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      type: "array",
      "x-component": "ArrayTable",
      items: {
        type: "void",
        "x-component": "ArrayTable.Item",
        properties: resovler.resolve(
          type.getArrayElementType(),
          ctx
        ) as ISchema["properties"],
      },
    };
  })
  .union((type, ctx, resolver) => {
    ctx.refs.set(type, type.getText());
    const extra = consumeExtra(ctx);
    const subs = type
      .getUnionTypes()
      .map((subType) => resolver.resolve(subType, ctx));
    return {
      ...extra,
      enum: subs.map((item) => ({ label: item.const, value: item.const })),
    };
  })
  .intersection((type, ctx, resolver) => {
    ctx.refs.set(type, type.getText());
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      ...type
        .getIntersectionTypes()
        .map((subType) => resolver.resolve(subType, ctx))
        .reduce((allOf, sub) => {
          return {
            ...allOf,
            ...sub,
          };
        }, {}),
    };
  })
  .object((type, ctx, resolver) => {
    ctx.refs.set(type, type.getText());
    const extra = consumeExtra(ctx);
    return {
      ...extra,
      type: "object",
      properties: type.getProperties().reduce(
        (map, propSymbol) => {
          const propNode =
            propSymbol.getValueDeclaration() ?? propSymbol.getDeclarations()[0];
          const porpType = propNode
            ? propSymbol.getTypeAtLocation(propNode)
            : propSymbol.getDeclaredType();
          if (propNode) {
            const extra = getNodeExtraInfo(propNode);
            ctx.extra = extra.info;
            if (extra.initialValue) {
              ctx.extra["default"] = extra.initialValue;
            }
          }
          map[propSymbol.getName()] = resolver.resolve(porpType, ctx);
          return map;
        },
        {} as ISchema["properties"]
      ),
    };
  });

export const transformDefinitions = (
  definitions: ClassDeclaration[]
): ISchema => {
  const schemas = {} as Record<string, OutputSchema>;
  const globalDefs = new WeakMap<Node, string>();

  for (const def of definitions) {
    globalDefs.set(def, def.getName());
  }

  for (const def of definitions) {
    const extra = getNodeExtraInfo(def);
    const circularRefs = new WeakMap<Type, string>();
    const schema: OutputSchema = {
      ...extra.info,
      type: "object",
      properties: def.getProperties().reduce((map, prop) => {
        const extra = getNodeExtraInfo(prop);
        const ctxExtra = extra.info;
        if (extra.initialValue) {
          ctxExtra["default"] = extra.initialValue;
        }
        map[prop.getName()] = schemaResolver.resolve(prop.getType(), {
          extra: ctxExtra,
          refs: circularRefs,
          defs: globalDefs,
          self: def.getName(),
        });
        return map;
      }, {}),
    };

    schemas[def.getName()] = schema;
  }

  return schemas;
};
