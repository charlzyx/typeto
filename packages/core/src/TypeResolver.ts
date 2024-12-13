import { Type } from "ts-morph";

// 类型推导工具，用于提取满足类型守卫的方法对应的类型
type ExtractTypeGuard<T, Method extends keyof T> = T[Method] extends (
  ...args: any[]
) => boolean // 检查是否是方法
  ? T[Method] extends () => this is Type<infer U> // 检查是否是类型守卫
    ? Type<U> // 提取具体类型
    : Type
  : never;

type NodeResolver<ResolvedNode, Context> = (
  type: Type,
  ctx: Context,
  self: TypeResolver<ResolvedNode, Context>
) => ResolvedNode;

type NodeResolverHook<ResolvedNode, Context> = (
  type: Type,
  ctx: Context,
  self: TypeResolver<ResolvedNode, Context>
) => false | undefined | ResolvedNode;

export class TypeResolver<ResolvedNode, Context> {
  // 用于处理类型的集合，存储映射
  private mappings: {
    [key: string]: NodeResolverHook<ResolvedNode, Context>;
  } = {};

  private hooks = {
    before: null as NodeResolverHook<ResolvedNode, Context>,
  };

  // 在每次解析之前都会调用, 返回 false 会阻止 resovler 调用
  before(beforeHook: NodeResolver<ResolvedNode, Context>) {
    this.hooks.before = beforeHook;
    return this;
  }
  // 解析方法
  resolve(
    type: Type, // 传入类型对象
    ctx: Context
  ): ResolvedNode | undefined {
    // 在 mappings 中查找并执行相应的 resolver
    const keys = Object.keys(this.mappings);
    // type.isType 是存在多个的情况
    //  object 和 literal 类型都会有多种匹配情况
    // 比如 class => object ;interfalce => object
    // stringliteral => literal
    // 所以, 我们把他们排到最后来处理
    keys.sort((a, b) => {
      if (/object|literal/.test(a)) return 1; // 匹配 "object" 或 "literal" 的项排到最后
      if (/object|literal/.test(b)) return -1; // 匹配 "object" 或 "literal" 的项排到最后
      return 0; // 如果都不匹配，保持原有顺序
    });

    const before = this.hooks.before;
    const next = before && before(type, ctx, this);
    if (next === false) return undefined;
    if (next != undefined) return next as ResolvedNode;

    for (const key of keys) {
      const isType = "is" + key.replace(/^\w/, (m) => m.toUpperCase());
      const isMatch = type[isType]?.();
      if (!isMatch) return;
      const resolver = this.mappings[key];
      const ans = resolver(type, ctx, this);
      if (ans) {
        return ans;
      }
    }
    return undefined; // 如果没有匹配的 resolver，返回 undefined
  }
  // 获取匿名类型
  anonymous(
    resolver: (
      type: ExtractTypeGuard<Type, "isAnonymous">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["anonymous"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 any 类型
  any(
    resolver: (
      type: ExtractTypeGuard<Type, "isAny">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["any"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 never 类型
  never(
    resolver: (
      type: ExtractTypeGuard<Type, "isNever">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["never"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 array 类型
  array(
    resolver: (
      type: ExtractTypeGuard<Type, "isArray">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["array"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 readonly array 类型
  readonlyArray(
    resolver: (
      type: ExtractTypeGuard<Type, "isReadonlyArray">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["readonlyArray"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取模板字面量类型
  templateLiteral(
    resolver: (
      type: ExtractTypeGuard<Type, "isTemplateLiteral">
    ) => ResolvedNode
  ): this {
    this.mappings["templateLiteral"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 boolean 类型
  boolean(
    resolver: (
      type: ExtractTypeGuard<Type, "isBoolean">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["boolean"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 string 类型
  string(
    resolver: (
      type: ExtractTypeGuard<Type, "isString">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["string"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 number 类型
  number(
    resolver: (
      type: ExtractTypeGuard<Type, "isNumber">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["number"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 BigInt 类型
  bigInt(
    resolver: (
      type: ExtractTypeGuard<Type, "isBigInt">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["bigInt"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取字面量类型
  literal(
    resolver: (
      type: ExtractTypeGuard<Type, "isLiteral">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["literal"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 boolean 字面量类型
  booleanLiteral(
    resolver: (
      type: ExtractTypeGuard<Type, "isBooleanLiteral">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["booleanLiteral"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 BigInt 字面量类型
  bigIntLiteral(
    resolver: (
      type: ExtractTypeGuard<Type, "isBigIntLiteral">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["bigIntLiteral"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取枚举字面量类型
  enumLiteral(
    resolver: (
      type: ExtractTypeGuard<Type, "isEnumLiteral">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["enumLiteral"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 number 字面量类型
  numberLiteral(
    resolver: (
      type: ExtractTypeGuard<Type, "isNumberLiteral">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["numberLiteral"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 string 字面量类型
  stringLiteral(
    resolver: (
      type: ExtractTypeGuard<Type, "isStringLiteral">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["stringLiteral"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 class 类型
  class(
    resolver: (
      type: ExtractTypeGuard<Type, "isClass">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["class"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 class 或 interface 类型
  classOrInterface(
    resolver: (
      type: ExtractTypeGuard<Type, "isClassOrInterface">
    ) => ResolvedNode
  ): this {
    this.mappings["classOrInterface"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取枚举类型
  enum(
    resolver: (
      type: ExtractTypeGuard<Type, "isEnum">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["enum"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 interface 类型
  interface(
    resolver: (
      type: ExtractTypeGuard<Type, "isInterface">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["interface"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取对象类型
  object(
    resolver: (
      type: ExtractTypeGuard<Type, "isObject">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["object"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取类型参数
  typeParameter(
    resolver: (
      type: ExtractTypeGuard<Type, "isTypeParameter">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["typeParameter"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 tuple 类型
  tuple(
    resolver: (
      type: ExtractTypeGuard<Type, "isTuple">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["tuple"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 union 类型
  union(
    resolver: (
      type: ExtractTypeGuard<Type, "isUnion">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["union"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 intersection 类型
  intersection(
    resolver: (
      type: ExtractTypeGuard<Type, "isIntersection">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["intersection"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 union 或 intersection 类型
  unionOrIntersection(
    resolver: (
      type: ExtractTypeGuard<Type, "isUnionOrIntersection">
    ) => ResolvedNode
  ): this {
    this.mappings["unionOrIntersection"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 unknown 类型
  unknown(
    resolver: (
      type: ExtractTypeGuard<Type, "isUnknown">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["unknown"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 null 类型
  null(
    resolver: (
      type: ExtractTypeGuard<Type, "isNull">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["null"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 undefined 类型
  undefined(
    resolver: (
      type: ExtractTypeGuard<Type, "isUndefined">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["undefined"] = resolver;
    return this; // 返回自身，支持链式调用
  }

  // 获取 void 类型
  void(
    resolver: (
      type: ExtractTypeGuard<Type, "isVoid">,
      ctx: Context,
      resolver: typeof this
    ) => ResolvedNode
  ): this {
    this.mappings["void"] = resolver;
    return this; // 返回自身，支持链式调用
  }
}

// 使用示例
const resolver = new TypeResolver()
  .number((type) => {
    console.log("Resolved number type:", type);
  })
  .string((type) => {
    console.log("Resolved string type:", type);
  });
