import { describe, expect, it } from "bun:test";
import { Project } from "ts-morph";
import { transform } from "../src/index";
import { getEntryNodes } from "../src/entry";

describe("formily schema tests", () => {
  const project = new Project({});

  it("应该正确转换用户信息模式 / should transform user information schema correctly", () => {
    const sourceFile = project.createSourceFile(
      "case1.ts",
      `
  class Form {
    @title(用户信息)
    user: User;
  }

  class User {
    @title(用户名)
    name: string;
    /** 地址信息 */
    address: Address;
    /** 地址列表 */
    addressList: Address[]
  }

  class Address {
    /** @title 城市 */
    city: "北京" | "上海";
    @title(街道)
    street: string;
  }
        `
    );

    const result = transform(project);
    expect(result).toMatchSnapshot();

    project.removeSourceFile(sourceFile);
  });

  it("应该跳过被忽略的节点 / should skip ignored nodes", () => {
    const sourceFile = project.createSourceFile(
      "case2.ts",
      `
  class Form {
    @ignore
    ignoredClass: IgnoredClass;

    visibleClass: VisibleClass;
  }

  @ignore
  class IgnoredClass {
    name: string;
  }

  class VisibleClass {
    age: number;
  }
        `
    );

    const { definitions } = getEntryNodes(project);
    expect(
      definitions.find((x) => x.getName() == "IgnoredClass")
    ).toBeUndefined(); // 只应返回 VisibleClass

    project.removeSourceFile(sourceFile); // 删除虚拟文件
  });

  it("应该处理循环引用 / should handle circular references", () => {
    const sourceFile = project.createSourceFile(
      "case3.ts",
      `
class Form {
  a: A;
}

class A {
  b: B;
}

class B {
  a: A;
}
      `
    );

    const result = transform(project);

    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });

  it("应该正确转换基本类型 / should transform basic types correctly", () => {
    const sourceFile = project.createSourceFile(
      "case4.ts",
      `
  class Form {
    basicTypes: BasicTypes;
  }

  class BasicTypes {
    str: string;
    num: number;
    bool: boolean;
  }
        `
    );

    const result = transform(project);

    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });
});
