import stylisticJs from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";
import eslint from "@eslint/js";
import globals from "globals";

import sortImportsRule from "./eslint.rule.js";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      custom: {
        rules: {
          "sort-imports": sortImportsRule,
        },
      },
    },
    rules: {
      "custom/sort-imports": [
        "error",
        {
          internalPatterns: ["@/", "~/", "src/"],
        },
      ],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
    },
  },
  {
    rules: {
      "@stylistic/indent": [
        "error",
        2,
        {
          ignoreComments: true,
          offsetTernaryExpressions: true,
          ObjectExpression: 1,
          ArrayExpression: "first",
          StaticBlock: { body: 1 },
          VariableDeclarator: "first",
          SwitchCase: 1,
        },
      ],
      "@stylistic/jsx-quotes": ["error", "prefer-double"],
      "@stylistic/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: "always" }],
      "@stylistic/quote-props": ["error", "as-needed"],
      "@stylistic/comma-style": ["error", "last"],
      "@stylistic/comma-spacing": ["error", { before: false, after: true }],
      "@stylistic/comma-dangle": [
        "error",
        {
          arrays: "always-multiline",
          objects: "always-multiline",
          imports: "never",
          exports: "never",
          functions: "never",
        },
      ],
      "@stylistic/max-len": [
        "error",
        {
          code: 140,
          ignoreComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      "@stylistic/array-bracket-newline": ["error", { multiline: true }],
      "@stylistic/spaced-comment": ["error", "always"],
      "@stylistic/dot-location": ["error", "property"],
      "@stylistic/space-infix-ops": ["error", { int32Hint: false }],
      "@stylistic/no-extra-semi": "error",
      "@stylistic/semi": ["warn", "always"],
      "@stylistic/semi-spacing": ["error", { before: false, after: true }],
      "@stylistic/semi-style": ["error", "last"],
      "@stylistic/no-multiple-empty-lines": ["error", { max: 2, maxEOF: 1, maxBOF: 2 }],
      "@stylistic/no-floating-decimal": "error",
      "@stylistic/no-multi-spaces": ["error", { ignoreEOLComments: true }],
      "@stylistic/no-whitespace-before-property": "error",
      "@stylistic/array-bracket-spacing": ["error", "never", { singleValue: false, objectsInArrays: false }],
      "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/space-before-function-paren": [
        "error",
        {
          anonymous: "always",
          named: "never",
          asyncArrow: "always",
        },
      ],
      "@stylistic/space-in-parens": ["error", "never"],
      "@stylistic/template-curly-spacing": "error",
      "@stylistic/function-call-argument-newline": ["error", "consistent"],
      "@stylistic/computed-property-spacing": ["error", "never", { enforceForClassMembers: true }],
      "@stylistic/key-spacing": ["error", { beforeColon: false, afterColon: true }],
      "@stylistic/keyword-spacing": ["error", { after: true, before: true }],
      "@stylistic/yield-star-spacing": ["error", "after"],
      "@stylistic/template-tag-spacing": ["error", "never"],
      "@stylistic/switch-colon-spacing": ["error", { after: true, before: false }],
    },

    plugins: stylisticJs.configs.all.plugins,
  }
);
