import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // The Supabase client is not generated with database types here,
      // so query results are intentionally loosely typed.
      "@typescript-eslint/no-explicit-any": "off",
      // Existing components predate React 19's compiler-oriented lint rules.
      // Keep CI focused on correctness while these patterns are refactored gradually.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts"]),
]);
