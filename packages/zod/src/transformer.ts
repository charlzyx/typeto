import { ClassDeclaration, Type } from "ts-morph";

interface ResolveTypeInfo {
  type: Type;
  globalRefs: WeakMap<Type, string>;
  selfCircularRefs: WeakMap<Type, string>;
  touched: { current: boolean };
}

const resolveType = (info: ResolveTypeInfo): string => {
  const { type, globalRefs, selfCircularRefs, touched } = info;

  // const itis = debugType(type as any);
  // 检测自身引用
  if (selfCircularRefs.has(type)) {
    const has = selfCircularRefs.get(type);
    touched.current = true;
    return has;
  }

  // 检测循环引用
  if (globalRefs.has(type)) {
    const has = globalRefs.get(type);
    return has;
  }

  // 处理 null 和 undefined
  if (type.isNull()) {
    return `z.null()`;
  }
  if (type.isUndefined()) {
    return `z.undefined()`;
  }

  // 处理字面量类型
  if (type.isLiteral()) {
    const value = type.getLiteralValue();
    if (type.isBooleanLiteral()) {
      return `z.literal(${type.getText()})`;
    }
    // 处理不同类型的字面量
    if (typeof value === "string") {
      return `z.literal(${JSON.stringify(value)})`;
    } else if (typeof value === "number") {
      return `z.literal(${value})`;
    } else if (typeof value === "boolean") {
      return `z.literal(${value})`;
    }
  }
  // 处理基本类型
  if (type.isString()) {
    return `z.string()`;
  }
  if (type.isNumber()) {
    return `z.number()`;
  }
  if (type.isBoolean()) {
    return `z.boolean()`;
  }
  if (type.isBoolean()) {
    return `z.bool()`;
  }

  // 处理交叉类型
  if (type.isIntersection()) {
    globalRefs.set(type, type.getText());
    const intersectionTypes = type
      .getIntersectionTypes()
      .map((t) =>
        resolveType({ type: t, globalRefs, selfCircularRefs, touched })
      )
      .join(", ");
    return `z.intersection([${intersectionTypes}])`;
  }

  // 处理联合类型 - 支持判别联合
  if (type.isUnion()) {
    globalRefs.set(type, type.getText());
    const unionTypes = type.getUnionTypes();

    // 尝试检测是否为判别联合
    const discriminator = findDiscriminator(unionTypes);
    if (discriminator) {
      return `z.discriminatedUnion("${discriminator}", [${unionTypes
        .map((t) =>
          resolveType({ type: t, globalRefs, selfCircularRefs, touched })
        )
        .join(", ")}])`;
    }

    // 普通联合类型
    return `z.union([${unionTypes
      .map((t) =>
        resolveType({ type: t, globalRefs, selfCircularRefs, touched })
      )
      .join(", ")}])`;
  }

  // 处理数组
  if (type.isArray()) {
    const elementType = resolveType({
      type: type.getArrayElementType(),
      globalRefs,
      selfCircularRefs,
      touched,
    });
    return `z.array(${elementType})`;
  }
  // 处理对象类型时添加对可选属性的特殊处理
  if (type.isObject()) {
    globalRefs.set(type, `${type.getText()}Schema`);
    selfCircularRefs.set(type, `${type.getText()}Schema`);

    const properties = type
      .getProperties()
      .map((propSymbol) => {
        // 获取属性的声明节点

        const propNode =
          propSymbol.getValueDeclaration() ?? propSymbol.getDeclarations()[0];

        // 获取属性的类型
        const propType = propNode
          ? propSymbol.getTypeAtLocation(propNode)
          : propSymbol.getDeclaredType();
        if (!propType) return "";

        let zodType = resolveType({
          type: propType,
          globalRefs,
          selfCircularRefs,
          touched,
        });

        // 处理可选属性
        const isOptional = propSymbol.isOptional();
        // 检查是否为 nullish (null 或 undefined)
        const isNullable = propType.isNull() || propType.isNullable();

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
  }
};

// 辅助函数：查找判别联合的判别字段
function findDiscriminator(types: Type[]): string | null {
  // 获取所有类型的属性
  const allProperties = types.map((t) =>
    t.isObject()
      ? new Set(t.getProperties().map((p) => p.getName()))
      : new Set<string>()
  );

  // 找到所有类型中都存在的属性
  const commonProps = [...allProperties[0]].filter((prop) =>
    allProperties.every((props) => props.has(prop))
  );

  // 检查每个共同属性是否可以作为判别字段
  for (const prop of commonProps) {
    const allLiterals = types.every((t) => {
      const propType = t.getProperty(prop)?.getValueDeclaration()?.getType();
      return propType?.isLiteral();
    });

    if (allLiterals) {
      return prop;
    }
  }

  return null;
}

export const transformDefinitions = (
  definitions: ClassDeclaration[]
): string => {
  const globalRefs = new WeakMap<Type, string>();

  const imports = `import { z } from "zod";\n\n`;

  // 第二遍遍历：生成 schema
  const schemas = definitions
    .map((def) => {
      const className = def.getName();
      const selfCircularRefs = new WeakMap<Type, string>();
      const touched = { current: false };
      const schema = resolveType({
        type: def.getType(),
        globalRefs,
        selfCircularRefs,
        touched,
      });

      if (touched.current) {
        return `export const ${className}Schema: z.ZodSchema<${className}Schema> = z.lazy(() =>  ${schema})`;
      } else {
        return `export const ${className}Schema = ${schema};`;
      }
    })
    .join("\n\n");

  return imports + schemas;
};
