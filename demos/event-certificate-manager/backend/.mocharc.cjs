process.env.APP_NAME="event-certificate-manager";
process.env.DATABASE_FILEPATH = "./TEST_DB";
process.env.BASIC_AUTH_USERNAME="username"
process.env.BASIC_AUTH_PASSWORD="password"
process.env.OAUTH2_TOKEN_ENDPOINT="https://example.com/oauth2/token"
process.env.CREDENTIAL_ISSUER="https://example.com"
process.env.CREDENTIAL_OFFER_ENDPOINT="openid-credential-offer://"
process.env.VCI_ACCESS_TOKEN_EXPIRES_IN="86400"
process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN="30"
process.env.OID4VP_AUTH_REQUEST_SIGN_KEY_ID="key-1"
process.env.OID4VP_HOST="https://example.com"
process.env.OID4VP_REQUEST_URI="https://example.com/vp/requesturi"
process.env.OID4VP_RESPONSE_URI="https://example.com/vp/responseuri"
process.env.OID4VP_REDIRECT_URI_AFTER_DIRECT_POST="https://example.com/participant/credential-offer"
// session周りの環境変数のモック
process.env.ENVIRONMENT = "local";
process.env.ADMIN_AUTH_USERNAME = "admin";
process.env.ADMIN_AUTH_PASSWORD = "password";

module.exports = {
    extension: ["ts"],
    spec: "tests/**/*.test.*",
    require: "ts-node/register",
    "node-option": [
        "experimental-specifier-resolution=node",
        "loader=ts-node/esm",
    ],
};
