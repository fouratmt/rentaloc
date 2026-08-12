const browserGlobals = {
  Blob: "readonly",
  CustomEvent: "readonly",
  URL: "readonly",
  document: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  window: "readonly",
};

export default [
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["src/**/*.js", "sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...browserGlobals,
        caches: "readonly",
        clients: "readonly",
        fetch: "readonly",
        module: "readonly",
        require: "readonly",
        Response: "readonly",
        self: "readonly",
      },
    },
    rules: {
      eqeqeq: "error",
      "no-constant-binary-expression": "error",
      "no-redeclare": "error",
      "no-undef": "error",
      "no-unreachable": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["tests/**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        require: "readonly",
      },
    },
    rules: {
      eqeqeq: "error",
      "no-redeclare": "error",
      "no-undef": "error",
      "no-unreachable": "error",
      "no-unused-vars": "error",
    },
  },
];
