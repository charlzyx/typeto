import { Project } from "ts-morph";
import { transformDefinitions } from "./transformer";
import { getEntryNodes } from "./entry";
import { ISchema } from "@formily/json-schema";

const clean = (schema: ISchema) => {
  const replacer = (k: string, v: any) => {
    if (k === "x-code") return undefined;
    return v;
  };

  return JSON.parse(JSON.stringify(schema, replacer));
};

export const transform = (project: Project) => {
  const { definitions } = getEntryNodes(project);
  const schema = transformDefinitions(definitions);
  const schemaDefs = clean(schema);
  const prefix = 'import { ISchema } from "@formily/json-schema";';
  const reforamt = Object.keys(schemaDefs).map((def) => {
    return `const ${def}: ISchema = ${JSON.stringify(
      schemaDefs[def],
      null,
      2
    )};\n`.replace(/"#\w+"/g, (m) => {
      return m.replace(/"/g, "").replace("#", "");
    });
  });
  return [prefix, ...reforamt].join("\n");
};
