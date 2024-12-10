import { describe, expect, it } from "bun:test";
import { Project } from "ts-morph";
import { transform } from "../index";

describe("to-oas transformer", () => {
  const project = new Project({});

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
    expect(result.definitions.BasicType).toEqual({
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        isActive: { type: "boolean" },
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
    });
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
    expect(result.definitions.User).toEqual({
      description: "用户实体",
      type: "object",
      properties: {
        id: {
          description: "用户ID",
          type: "number",
        },
        name: {
          description: "用户名",
          type: "string",
        },
      },
    });
    expect(result.definitions.Hidden).toBe(undefined);
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
    expect(result.definitions.Company).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        address: { $ref: "#components/schemas/Address" },
        contact: { $ref: "#components/schemas/Contact" },
        branches: {
          type: "array",
          items: { $ref: "#components/schemas/Address" },
        },
      },
    });
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
    expect(result.definitions.UserConfig).toEqual({
      description: "用户配置实体",
      entity: true,
      type: "object",
      properties: {
        id: {
          title: "配置ID",
          primary: true,
          description: "唯一标识符",
          type: "number",
        },
        createdAt: {
          description: "创建时间",
          format: "date-time",
          type: "string",
        },
        options: {
          description: "配置项",
          deprecated: true,
          type: "array",
          items: { type: "string" },
        },
      },
    });
    project.removeSourceFile(sourceFile);
  });

  // it("应该正确处理默认值 / should handle default values correctly", () => {
  //   const sourceFile = project.createSourceFile(
  //     "temp/defaults.ts",
  //     `
  //     class Settings {
  //       /** 默认端口 */
  //       port: number = 3000;

  //       /** 默认主机 */
  //       host: string = "localhost";

  //       /** 是否开启调试 */
  //       debug: boolean = false;

  //       /** 默认标签 */
  //       tags: string[] = ["default"];
  //     }
  //     `,
  //     { overwrite: true }
  //   );

  //   const result = transform(project);
  //   expect(result.definitions.Settings).toEqual({
  //     type: "object",
  //     properties: {
  //       port: {
  //         description: "默认端口",
  //         type: "number",
  //         default: 3000,
  //       },
  //       host: {
  //         description: "默认主机",
  //         type: "string",
  //         default: "localhost",
  //       },
  //       debug: {
  //         description: "是否开启调试",
  //         type: "boolean",
  //         default: false,
  //       },
  //       tags: {
  //         description: "默认标签",
  //         type: "array",
  //         items: { type: "string" },
  //         default: ["default"],
  //       },
  //     },
  //   });
  //   project.removeSourceFile(sourceFile);
  // });
});
