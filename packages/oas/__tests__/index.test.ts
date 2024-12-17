import { describe, expect, it } from "bun:test";
import { Project } from "ts-morph";
import { transform } from "../src/index";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const full = readFileSync(
  path.resolve(import.meta.dir, "./full.ts")
).toString();

describe("to-oas transformer", () => {
  const project = new Project({});

  it("全量测试 / Full Test", () => {
    const sourceFile = project.createSourceFile("temp/full.ts", full);
    const result = transform(project);
    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });

  it("应该正确处理多种注释 /  should transform extran info correctly", () => {
    const sourceFile = project.createSourceFile(
      "temp/basic-types.ts",
      `
      @Where("ClassDecorator")
      class BasicType {
        @Where("property Decorator")
        id: number;
        // @Where(before)
        name?: string;
        isActive: boolean; // @Where(after)
        /** @Where JSDOC */
        tags: string[];
      }
      
      // @Where TypeAlias
      type test = {
        // interesting
        url: "somthing";
        // @Where("覆盖情况")
        basic: BasicType;
        // 这种呢 
        array: Array<
          // 拿不到, 这是 Node 上的信息, 在我们这个解析逻辑中, 遍历
          // 这里的时候, 是直接拿到 Type 的, 没有办法获取到这个注释
          // 似乎也不常用?
          BasicType
        >
      }
      `,
      { overwrite: true }
    );

    const result = transform(project);
    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });

  it("应该正确转换基本类型定义 / should transform basic type definitions correctly", () => {
    const sourceFile = project.createSourceFile(
      "temp/basic-types.ts",
      `
      class BasicType {
        id: number;
        name: string;
        isActive: boolean;
        tags: string[];
      }
      `,
      { overwrite: true }
    );

    const result = transform(project);
    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });

  it("应该正确处理类的注释和装饰器 / should handle class comments and decorators correctly", () => {
    const sourceFile = project.createSourceFile(
      "temp/comments.ts",
      `
      /** 用户实体 */
      class User {
        /** 用户ID */
        id: number;
        // 用户名
        name: string;
      }

      @ignore
      class Hidden {
        value: string;
      }
      `,
      { overwrite: true }
    );

    const result = transform(project);
    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });

  it("应该正确处理嵌套对象的类型转换 / should transform nested object types correctly", () => {
    const sourceFile = project.createSourceFile(
      "temp/nested-objects.ts",
      `
      class Address {
        city: string;
        street: string;
      }

      class Contact {
        email: string;
        phone: string;
      }

      class Company {
        name: string;
        address: Address;
        contact: Contact;
        branches: Address[];
      }
      `,
      { overwrite: true }
    );

    const result = transform(project);
    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });

  it("应该正确处理复杂的装饰器和注释组合 / should handle complex decorator and comment combinations", () => {
    const sourceFile = project.createSourceFile(
      "temp/complex-decorators.ts",
      `
      /**
       * 用户配置类
       * @description 这是用户的详细配置信息
       */
      @entity
      @description(用户配置实体)
      class UserConfig {
        /**
         * @title 配置ID
         * @description 唯一标识符
         */
        @primary
        id: number;

        /**
         * 创建时间
         * @format date-time
         */
        createdAt: string;

        /**
         * 配置项
         * @deprecated
         */
        @deprecated
        options: string[];
      }
      `,
      { overwrite: true }
    );

    const result = transform(project);
    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });

  it("应该正确处理默认值 / should handle default values correctly", () => {
    const sourceFile = project.createSourceFile(
      "temp/defaults.ts",
      `
      class Settings {
        /** 默认端口 */
        port: number = 3000;

        /** 默认主机 */
        host: string = "localhost";

        /** 是否开启调试 */
        debug: boolean = false;

        /** 默认标签 */
        tags: string[] = ["default"];
      }
      `,
      { overwrite: true }
    );

    const result = transform(project);
    expect(result).toMatchSnapshot();
    project.removeSourceFile(sourceFile);
  });
});
