import { describe, expect, it } from "bun:test";
import { Project } from "ts-morph";
import { transform } from "../src";

describe("zod schema tests", () => {
  const project = new Project({});

  it("应该正确处理基本类型 / should handle basic types correctly", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      class BasicTypes {
        str: string;
        num: number;
        bool: boolean;
        nullValue: null;
        undefinedValue: undefined;
      }
      `
    );

    const result = transform(project);
    expect(result).toContain("str: z.string()");
    expect(result).toContain("num: z.number()");
    expect(result).toContain("bool: z.boolean()");
    expect(result).toContain("nullValue: z.null()");
    expect(result).toContain("undefinedValue: z.undefined()");

    project.removeSourceFile(sourceFile);
  });

  it("应该正确处理字面量类型 / should handle literal types correctly", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      class LiteralTypes {
        strLiteral: "hello";
        numLiteral: 42;
        boolLiteral: true;
      }
      `
    );

    const result = transform(project);

    expect(result).toContain('strLiteral: z.literal("hello")');
    expect(result).toContain("numLiteral: z.literal(42)");
    expect(result).toContain("boolLiteral: z.literal(true)");

    project.removeSourceFile(sourceFile);
  });

  it("应该正确处理联合类型 / should handle union types correctly", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      class User {
        status: "active" | "inactive";
        role: "admin" | "user" | "guest";
      }
      `
    );

    const result = transform(project);
    expect(result).toContain(
      'z.union([z.literal("active"), z.literal("inactive")])'
    );
    expect(result).toContain(
      'z.union([z.literal("admin"), z.literal("user"), z.literal("guest")])'
    );

    project.removeSourceFile(sourceFile);
  });

  it("应该正确处理判别联合 / should handle discriminated unions correctly", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      type Shape =
        | { kind: "circle"; radius: number }
        | { kind: "square"; sideLength: number };

      class Drawing {
        shape: Shape;
      }
      `
    );

    const result = transform(project);
    expect(result).toContain('z.discriminatedUnion("kind"');
    expect(result).toContain("radius: z.number()");
    expect(result).toContain("sideLength: z.number()");

    project.removeSourceFile(sourceFile);
  });

  it("应该正确处理交叉类型 / should handle intersection types correctly", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      interface Named { name: string }
      interface Aged { age: number }
      
      class Person {
        info: Named & Aged;
      }
      `
    );

    const result = transform(project);
    expect(result).toContain("z.intersection([");
    expect(result).toContain("name: z.string()");
    expect(result).toContain("age: z.number()");

    project.removeSourceFile(sourceFile);
  });

  // it("应该正确处理可选和可空属性 / should handle optional and nullable properties correctly", () => {
  //   /**
  //    * TODO: 有个小问题
  //    * https://ts-ast-viewer.com/#code/MYGwhgzhAECqEFMBO0DeAoaXoDswFsEAuaCAFyQEscBzAbk2zBoQH4ScBXfAI2QezQelAPYlyVWtAA+uTiBACmAE2VIEUdqQrUaMuQoYBfIA
  //    * string | null 节点在 compiler api 中使用 getTypeAtLocation 获取到的节点是 string 类型
  //    * 而不是 UnionType , 但是 online 页面是对的
  //    *
  //    */
  //   const sourceFile = project.createSourceFile(
  //     "test.ts",
  //     `
  //     class User {
  //       name: string;
  //       age?: number;
  //       bio: string | null;
  //       address?: string | null;
  //     }
  //     `
  //   );

  //   const result = transform(project);
  //   expect(result).toContain("name: z.string()");
  //   expect(result).toContain("age: z.number().optional()");
  //   expect(result).toContain("bio: z.string().nullable()");
  //   expect(result).toContain("address: z.string().nullable().optional()");

  //   project.removeSourceFile(sourceFile);
  // });

  it("应该正确处理嵌套对象和数组 / should handle nested objects and arrays correctly", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      class Address {
        street: string;
        city: string;
      }
      
      class User {
        name: string;
        address: Address;
        tags: string[];
        contacts: Address[];
      }
      `
    );

    const result = transform(project);
    expect(result).toContain("AddressSchema");
    expect(result).toContain("street: z.string()");
    expect(result).toContain("city: z.string()");
    expect(result).toContain("address: AddressSchema");
    expect(result).toContain("tags: z.array(z.string())");
    expect(result).toContain("contacts: z.array(AddressSchema)");

    project.removeSourceFile(sourceFile);
  });

  it("应该正确处理循环引用 / should handle circular references correctly", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      class Employee {
        name: string;
        // 直接循环引用
        supervisor?: Employee;
        // 嵌套循环引用
        team?: {
          leader: Employee;
          members: Employee[];
        };
      }
      `
    );

    const result = transform(project);
    // 检查是否正确生成了类型声明
    expect(result).toContain("EmployeeSchema: z.ZodSchema<EmployeeSchema>");
    // 检查是否使用了 lazy 进行循环引用处理
    expect(result).toContain("z.lazy(() =>");
    // 检查基本字段
    expect(result).toContain("name: z.string()");
    // 检查可选字段
    expect(result).toContain("supervisor: ");
    expect(result).toContain("optional()");
    // 检查嵌套结构
    expect(result).toContain("team: z.object");
    expect(result).toContain("members: z.array");

    project.removeSourceFile(sourceFile);
  });
});
