import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  // commander/yamlはESMネイティブ対応。noExternalにするとCJS requireエラーが出るのでexternal扱い
  external: ["commander", "yaml"],
});
