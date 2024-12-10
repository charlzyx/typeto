import { Project } from "ts-morph";
import { transformDefinitions, SCHEMA_REF_PREFIX } from "./transformer";
import { getEntryNodes } from "./entry";
import { ISchema } from "@formily/json-schema";

const resolveRefs = (schema: ISchema) => {
  const seen = new Map();

  const replacer = (k: string, v: any) => {
    if (k === "x-code") return undefined;
    let ref = typeof v === "object" ? v["$ref"] : null;
    if (!ref) return v;

    if (seen.has(ref)) {
      return { $ref: "#CircleRef" + ref };
    } else if (ref) {
      const link = schema[ref.replace(SCHEMA_REF_PREFIX, "")];
      link.comment = ref;
      seen.set(ref, link);
      return link;
    }
  };

  return JSON.parse(JSON.stringify(schema, replacer));
};

export const transform = (project: Project) => {
  const { definitions } = getEntryNodes(project);
  const schema = transformDefinitions(definitions);
  const resolved = resolveRefs(schema);
  return resolved["Form"];
};
