import { describe, expect, it } from "bun:test";
import { Project } from "ts-morph";
import { transform } from "../src";

describe("zod schema tests", () => {
  const project = new Project({});

  it("复杂组合测试 / should handle complex ", () => {
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
type int32 = number;
type int64 = number;
type float = number;
type double = number;
type date = string;
type datetime = string;
type password = string;
type binary = string;
type byte = string;

type Status = "placed" | "approved" | "delivered";

class Order {
  id: int64;
  petId: int64;
  quantity: int32;
  shipDate: datetime;
  status: Status;
  complete: boolean;
}

class Customer {
  id: int64;
  username: string;
  address: Address;
}

class Address {
  street: string;
  city: string;
  state: string;
  zip: number;
}

class Category {
  id: int64;
  name: string;
}

class User {
  id: int64;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  userStatus: int32;
}

class Tag {
  id: int64;
  name: string;
}

class Pet {
  /** Pet's id */
  id: int64 = 0;
  // getJsDocs() cannot see me
  category: Category; // but getLeadingCommentRanges/getTrailingCommentRanges can do it!
  // name with default
  name: string = "hi";
  /** photos */
  photoUrls: string[];
  tags: Tag[];
  status: Status;
}

class TreeLike {
    children: TreeLike[]
}

      `
    );

    const result = transform(project);
    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });

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
    expect(result).toMatchSnapshot();
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
    expect(result).toMatchSnapshot();
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
    expect(result).toMatchSnapshot();
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
    expect(result).toMatchSnapshot();

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
    expect(result).toMatchSnapshot();

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
    expect(result).toMatchSnapshot();

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
    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });
});
