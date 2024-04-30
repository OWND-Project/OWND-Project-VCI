module.exports = {
    env: {
        es2022: true,
        node: true,
        mocha: true,
    },
    extends: ['eslint:recommended', 'prettier'],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {},
};
