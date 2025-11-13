// テスト用環境変数の一元管理
module.exports = function setupTestEnv() {
  process.env.DATABASE_FILEPATH = "./TEST_DB";
  process.env.BASIC_AUTH_USERNAME = "username";
  process.env.BASIC_AUTH_PASSWORD = "password";
  process.env.OAUTH2_TOKEN_ENDPOINT = "https://example.com/oauth2/token";
  process.env.CREDENTIAL_ISSUER = "https://example.com";
  process.env.CREDENTIAL_OFFER_ENDPOINT = "openid-credential-offer://";
  process.env.VCI_ACCESS_TOKEN_EXPIRES_IN = "86400";
  process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN = "30";
};
