process.env.DATABASE_FILEPATH = "./TEST_DB";
process.env.BASIC_AUTH_USERNAME="username"
process.env.BASIC_AUTH_PASSWORD="password"
process.env.OAUTH2_TOKEN_ENDPOINT="https://example.com/oauth2/token"
process.env.CREDENTIAL_ISSUER="urn:example:audience"
process.env.CREDENTIAL_OFFER_ENDPOINT="openid-credential-offer://"
process.env.VCI_ACCESS_TOKEN_EXPIRES_IN="86400"
process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN="30"
process.env.X_ID_CLIENT_KEY_PAIR_PRIVATE="qlgqLQV7yE8GnxNpvjlpO/NEFFjUR+DIDKuYXHFe61E="
process.env.X_ID_CLIENT_KEY_PAIR_PUBLIC="BhKfDhAuKPf5XnvVhOCZQqNEgxuBqeuccpWXVi2I3QI="
process.env.X_ID_API_BASE_URL="https://api-uat.x-id.io/v5";

module.exports = {
    extension: ["ts"],
    spec: "tests/**/*.test.*",
    require: "ts-node/register",
    "node-option": [
        "experimental-specifier-resolution=node",
        "loader=ts-node/esm",
    ],
};
