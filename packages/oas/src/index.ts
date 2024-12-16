import { Project } from "ts-morph";
import { transformDefinitions, transformOperations } from "./transformer";
import { getEntryNodes } from "./entry";

const clean = (x: any, reformatRequired: boolean) =>
  JSON.parse(
    JSON.stringify(x, (k: string, v) => {
      if (k === "_code") return undefined;
      // 清理 required: false
      if (k === "required" && v === false) return undefined;
      // 转换成 oas 的 required
      if (reformatRequired && v?.type === "object" && v?.properties) {
        v.required = Object.keys(v.properties).filter((prop) => {
          if (v.properties[prop]["required"]) {
            delete v.properties[prop]["required"];
            return prop;
          }
          return false;
        });
      }
      return v;
    })
  );

export const transform = (project: Project) => {
  const { definitions, operations } = getEntryNodes(project);
  const { defSchema, defNameMap } = transformDefinitions(definitions);
  const opSchema = transformOperations(operations, defNameMap);
  return {
    operations: clean(opSchema, false),
    definitions: clean(defSchema, true),
  };
};
