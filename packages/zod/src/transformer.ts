import { ClassDeclaration, Node, Type, YieldExpression } from "ts-morph";
import {
  TypeResolver,
  getNodeExtraInfo,
  getPropNodeTypeRefName,
} from "@typeto/core";

interface ResolveContext {
  globalRefs: WeakMap<Type, string>;
  selfCircularRefs: WeakMap<Type, string>;
  touched: { current: boolean };
  self: string;
}

const zodResolver = new TypeResolver<string, ResolveContext>()
  .before((type, ctx, resolver) => {
    // const itis = debugType(type as any);
    // 检测自身引用
    if (ctx.selfCircularRefs.has(type)) {
      const has = ctx.selfCircularRefs.get(type);
      ctx.touched.current = true;
      return has;
    }

    // 检测循环引用
    if (ctx.globalRefs.has(type)) {
      const has = ctx.globalRefs.get(type);
      if (has !== ctx.self) return has;
    }
  })
  .null(() => `z.null()`)
  .undefined(() => `z.undefined()`)
  .stringLiteral(
    (type) => `z.literal(${JSON.stringify(type.getLiteralValue())})`
  )
  .numberLiteral((type) => `z.literal(${type.getLiteralValue()})`)
  .booleanLiteral((type) => `z.literal(${type.getText()})`)
  .string((type) => {
    return `z.string()`;
  })
  .boolean(() => `z.boolean()`)
  .number(() => `z.number()`)
  .literal((type) => `z.literal(${JSON.stringify(type.getLiteralValue())})`)
  .intersection((type, ctx, resovler) => {
    const intersectionTypes = type
      .getIntersectionTypes()
      .map((t) => resovler.resolve(t, ctx))
      .join(", ");
    return `z.intersection([${intersectionTypes}])`;
  })
  .union((type, ctx, resolver) => {
    const unionTypes = type.getUnionTypes();
    const subTypes = unionTypes.map((t) => resolver.resolve(t, ctx));

    // 尝试检测是否为判别联合
    const discriminator = subTypes.find((x) => /object/.test(x));
    const prefix = discriminator ? "z.discriminatedUnion" : "z.union";
    // 普通联合类型
    return `${prefix}([${subTypes.join(", ")}])`;
  })
  .array((type, ctx, resovler) => {
    return `z.array(${resovler.resolve(type.getArrayElementType(), ctx)})`;
  })
  .object((type, ctx, resolver) => {
    ctx.globalRefs.set(type, `${type.getText()}`);
    ctx.selfCircularRefs.set(type, `${type.getText()}`);

    const properties = type
      .getProperties()
      .map((propSymbol) => {
        // 获取属性的声明节点

        const propNode =
          propSymbol.getValueDeclaration() ?? propSymbol.getDeclarations()[0];

        const extra = getNodeExtraInfo(propNode);

        const message = extra.info["message"] || extra.comment;

        // 获取属性的类型
        const propType = propNode
          ? propSymbol.getTypeAtLocation(propNode)
          : propSymbol.getDeclaredType();
        if (!propType) return "";

        let zodType = resolver.resolve(propType, ctx);
        const stringSpecific = getPropNodeTypeRefName(propNode, true);

        // 处理可选属性
        const isOptional = propSymbol.isOptional();
        // 检查是否为 nullish (null 或 undefined)
        const isNullable = propType.isNull() || propType.isNullable();
        if (message) {
          zodType = zodType.replace("()", `({ message: "${message}"})`);
        }
        if (stringSpecific) {
          zodType = `${zodType}.${stringSpecific}()`;
        }
        if (isNullable) {
          zodType = `${zodType}.nullable()`;
        }
        if (isOptional) {
          zodType = `${zodType}.optional()`;
        }

        return `${propSymbol.getName()}: ${zodType}`;
      })
      .filter(Boolean)
      .join(",\n  ");

    return `z.object({\n  ${properties}\n})`;
  });

export const transformDefinitions = (
  definitions: ClassDeclaration[]
): string => {
  const globalRefs = new WeakMap<Type, string>();

  const imports = `import { z } from "zod";\n\n`;

  const schemas = definitions
    .map((def) => {
      const className = def.getName();
      const selfCircularRefs = new WeakMap<Type, string>();
      const touched = { current: false };

      const schema = zodResolver.resolve(def.getType(), {
        globalRefs,
        selfCircularRefs,
        touched,
        self: def.getName(),
      });

      if (touched.current) {
        return `export const ${className}: z.ZodSchema<${className}> = z.lazy(() =>  ${schema})`;
      } else {
        return `export const ${className} = ${schema};`;
      }
    })
    .join("\n\n");

  return imports + schemas;
};
