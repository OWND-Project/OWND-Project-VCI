import { generateRandomString } from "../../../common/src/utils/randomStringUtils.js";
import store from "../store.js";
import {
  AccessTokenIssuer,
  AuthCodeStateProvider,
  AuthorizedCodeWithStoredData,
  TokenIssuerConfig,
} from "../../../common/src/oid4vci/tokenEndpoint/types";

export const authCodeStateProvider: AuthCodeStateProvider = async (
  authorizedCode: string,
) => {
  // get stored `pre-authorized_code` data
  const result = await store.getPreAuthCodeAndEmployee(authorizedCode);
  if (!result) {
    return { exists: false };
  }
  // adjust interface to SDK requirements
  const { storedAuthCode } = result;
  const { usedAt, ...rest } = storedAuthCode;
  const _preAuthorizedCode = {
    ...rest,
    isUsed: usedAt !== null,
    storedData: { id: storedAuthCode.id },
  };
  return {
    exists: true,
    payload: {
      authorizedCode: _preAuthorizedCode,
    },
  };
};
export const accessTokenIssuer: AccessTokenIssuer = async (
  authorizedCode: AuthorizedCodeWithStoredData,
) => {
  const newAccessToken = generateRandomString();

  const { needsProof } = authorizedCode;
  try {
    const expiresIn = Number(process.env.VCI_ACCESS_TOKEN_EXPIRES_IN);
    let nonce = {};
    if (needsProof) {
      const cNonce = generateRandomString();
      const cNonceExpiresIn = Number(
        process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN,
      );
      await store.addAccessToken(
        newAccessToken,
        expiresIn,
        cNonce,
        cNonceExpiresIn,
        authorizedCode.storedData.id,
      );
      nonce = {
        c_nonce: cNonce,
        c_nonce_expires_in: cNonceExpiresIn,
      };
    }
    const tokenResponse = {
      access_token: newAccessToken,
      token_type: "bearer",
      expires_in: expiresIn,
      ...nonce,
    };
    return { ok: true, payload: tokenResponse };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: { error: "INTERNAL_ERROR", internalError: true },
    };
  }
};

export const tokenConfigure = (): TokenIssuerConfig => {
  return {
    authCodeStateProvider,
    accessTokenIssuer,
  };
};
