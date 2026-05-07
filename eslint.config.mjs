import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Council /council 2026-05-07 surgical fix S3 (frontend-engineer R2):
  // bump exhaustive-deps from warn → error so stale-closure classes of bug
  // fail the build at PR-check time rather than ship silently. Pre-empted
  // the qa-risk RED on planDay capture (already fixed surgically in 29d7307;
  // this guards future regressions).
  {
    rules: {
      "react-hooks/exhaustive-deps": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
