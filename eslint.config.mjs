import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    languageOptions:{
      parser: tsParser,
    },
    plugins: {
      tsPlugin,
    },
    files: ["src/**/*.ts"],
  },
  eslintConfigPrettier,
];
