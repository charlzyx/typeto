import { Project } from "ts-morph";
import { transformDefinitions } from "./transformer";
import { getEntryNodes } from "./entry";

export const transform = (project: Project) => {
  const { definitions } = getEntryNodes(project);
  const schema = transformDefinitions(definitions);
  return schema;
};
