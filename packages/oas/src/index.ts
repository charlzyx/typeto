import { Project } from "ts-morph";
// import { transformDefinitions, transformOperations } from "./transformer";
import { transformDefinitions, transformOperations } from "./transformer2";
import { getEntryNodes } from "./entry";

const clean = (x: any) =>
  JSON.parse(
    JSON.stringify(x, (k: string, v) => {
      if (k === "_code") return undefined;
      return v;
    })
  );

export const transform = (project: Project) => {
  const { definitions, operations } = getEntryNodes(project);
  const { defSchema, defNameMap } = transformDefinitions(definitions);
  const opSchema = transformOperations(operations, defNameMap);
  return { operations: clean(opSchema), definitions: clean(defSchema) };
};
