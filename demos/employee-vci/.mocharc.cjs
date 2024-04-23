process.env.DATABASE_FILEPATH = "./TEST_DB";
process.env.BASIC_AUTH_USERNAME="username"
process.env.BASIC_AUTH_PASSWORD="password"
process.env.OAUTH2_TOKEN_ENDPOINT="https://example.com/oauth2/token"
process.env.CREDENTIAL_ISSUER="https://datasign-vci.tunnelto.dev"
process.env.CREDENTIAL_OFFER_ENDPOINT="openid-credential-offer://"
process.env.VCI_ACCESS_TOKEN_EXPIRES_IN="86400"
process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN="30"

module.exports = {
    extension: ["ts"],
    spec: "tests/**/*.test.*",
    require: "ts-node/register",
    "node-option": [
        "experimental-specifier-resolution=node",
        "loader=ts-node/esm",
    ],
};
