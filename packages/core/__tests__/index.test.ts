import { describe, it, expect } from "bun:test";
import {
  removeEmptyComments,
  parseAndRemoveAnnotations,
} from "../src/getNodeExtraInfo";

describe("removeEmptyComments", () => {
  it("应该移除空注释 / should remove empty comments from the input string", () => {
    const input = `
      /**
       * 
       */
      // 
      // another comment
    `;
    const result = removeEmptyComments(input.trim());
    expect(result).toMatchSnapshot();
  });

  it("当没有空注释时应返回原字符串 / should return the original string if no empty comments are present", () => {
    const input = `
      // another comment
    `;
    const result = removeEmptyComments(input.trim());
    expect(result).toMatchSnapshot();
  });

  it("应该移除多行注释中的空行 / should remove empty lines in multi-line comments", () => {
    const input = `
      /**
       * 
       * 这是一段描述
       * 
       */
      // 
      // another comment
    `;
    const result = removeEmptyComments(input.trim());
    expect(result).toMatchSnapshot();
  });

  it("应该移除单行注释 / should remove single line comments", () => {
    const input = `
      // 这是一个注释
    `;
    const result = removeEmptyComments(input.trim());
    expect(result).toMatchSnapshot();
  });

  it("应该处理没有注释的情况 / should handle cases with no comments", () => {
    const input = ``;
    const result = removeEmptyComments(input.trim());
    expect(result).toMatchSnapshot();
  });
});

describe("parseAndRemoveAnnotations", () => {
  it("应该解析注解并从输入字符串中移除它们 / should parse annotations and remove them from the input string", () => {
    const input = "@title(Example) some text @flag";
    const result = parseAndRemoveAnnotations(input);
    expect(result).toMatchSnapshot();
  });

  it("当没有注解时应返回空的解析对象和清理后的字符串 / should return empty parsed object and cleaned string if no annotations are present", () => {
    const input = "some text without annotations";
    const result = parseAndRemoveAnnotations(input);
    expect(result).toMatchSnapshot();
  });
});
