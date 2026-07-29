import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
    },
  },
  globalIgnores([
    "**/dist/**",
    "**/.next/**",
    "**/.open-next/**",
    "**/coverage/**",
    "playwright-report/**",
    "test-results/**",
    "packages/database/src/generated/database.types.ts",
  ]),
]);
