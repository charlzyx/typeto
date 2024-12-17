import { Node } from "ts-morph";

export const removeEmptyComments = (input: string): string => {
  // 使用正则表达式去掉空注释
  const lines = input
    .split("\n")
    .reduce((lines, line) => {
      const txt = line
        .trim()
        .replace(/^\s+/, "")
        .replace(/^\/\*\*/, "")
        .replace(/\*\/$/, "")
        .replace(/^\*\s?/, "")
        .replace(/^\/\//, "")
        .trim();
      if (txt) {
        lines.push(txt);
      }
      return lines;
    }, [])
    .join("\n");
  return lines;
};

export const getPropNodeTypeRefName = (node: Node, smallCaseOnly?: boolean) => {
  let refName = "";
  if (Node.isPropertyDeclaration(node) || Node.isPropertySignature(node)) {
    const typeNode = node.getTypeNode();
    refName = Node.isTypeReference(typeNode)
      ? typeNode.getTypeName().getText()
      : "";
  }
  return smallCaseOnly ? (/^[a-z]/.test(refName) ? refName : "") : "";
};
export const parseAndRemoveAnnotations = (input: string) => {
  const regex = /@(\w+)(?:\(([^)]+)\)|\s+(\S+))?/g;
  const result: Record<string, string | true> = {};
  let cleanedInput = input;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? true;
    result[key] =
      typeof value === "string"
        ? // 移除 开头和末尾的 " 或 '
          value.replace(/^("|')/g, "").replace(/("|')$/, "")
        : value;
    cleanedInput = cleanedInput.replace(match[0], "").trim();
  }

  return { parsed: result, cleaned: removeEmptyComments(cleanedInput) };
};

/**
 * 获取节点的额外信息
 * 包括：装饰器、JSDoc注释、前置注释和后置注释
 *
 * 信息优先级：
 * JSDoc description > 装饰器 description > 前置注释 > 后置注释
 *
 * @param node 待解析的节点
 * @returns 解析后的节点信息对象
 */
export const getNodeExtraInfo = (node: Node) => {
  let initialValue = Node.isInitializerExpressionGetable(node)
    ? node.getInitializer()?.getText()
    : undefined;

  if (initialValue) {
    try {
      initialValue = JSON.parse(initialValue);
    } catch (error) {
      console.warn(
        "parer initialValue Expression: ",
        initialValue,
        " use text"
      );
    }
  }
  // 获取装饰器信息
  const decorators = Node.isDecoratable(node)
    ? node.getDecorators().reduce(
        (map, dec) => {
          const propName = dec.getName();
          const args = dec.getArguments();
          const propValue = args
            // 移除开头和末尾的 " 和 '
            .map((arg) =>
              arg
                .getText()
                .replace(/^("|')/g, "")
                .replace(/("|')$/, "")
            )
            .join("/");
          map[propName] = args.length > 0 ? propValue : true;
          return map;
        },
        {} as Record<string, string | boolean>
      )
    : {};

  // 获取JSDoc标签信息
  const jsDocs = Node.isJSDocable(node)
    ? node.getJsDocs().reduce(
        (map, doc) => {
          const tags = doc
            .getTags()
            .filter(
              (tag) =>
                Node.isJSDocTypeTag(tag) ||
                Node.isJSDocTag(tag) ||
                Node.isJSDocDeprecatedTag(tag)
            )
            .reduce((tmap, tag) => {
              tmap[tag.getTagName()] = tag.getCommentText() ?? true;
              return tmap;
            }, {});

          return { ...map, ...tags };
        },
        {} as Record<string, string>
      )
    : {};

  // 获取前置和后置注释
  const leadingComments = node
    .getLeadingCommentRanges()
    .map((cmm) => cmm.getText());
  const trailingComments = node
    .getTrailingCommentRanges()
    .map((cmm) => cmm.getText());

  // 解析注释中的元数据和普通注释
  const { cleaned, parsed: commentMeta } = parseAndRemoveAnnotations(
    leadingComments.join("\n") + trailingComments.join("\n")
  );
  const comment = removeEmptyComments(cleaned);

  // 按优先级获取描述信息
  const desc =
    decorators.description ||
    commentMeta.description ||
    jsDocs.description ||
    comment;

  // 合并所有信息
  const info = {
    ...commentMeta,
    ...jsDocs,
    ...decorators,
  };

  if (desc) {
    info.description = desc;
  }

  return {
    initialValue,
    decorators,
    jsDocs,
    leadingComments,
    trailingComments,
    info,
    comment,
  };
};
