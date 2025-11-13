const setupTestEnv = require("./test-env-setup.cjs");
setupTestEnv();

module.exports = {
    extension: ["ts"],
    spec: "tests/**/*.test.*",
    require: "ts-node/register",
    "node-option": [
        "experimental-specifier-resolution=node",
        "loader=ts-node/esm",
    ],
};
