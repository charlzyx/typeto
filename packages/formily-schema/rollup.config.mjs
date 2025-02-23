import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
    },
  ],
  plugins: [
    nodeResolve(),
    typescript({
      tsconfig: "tsconfig.build.json",
    }),
  ],
  external: ["ts-morph", "typescript"], // 将外部依赖排除，例如: ['react', 'lodash']
};
