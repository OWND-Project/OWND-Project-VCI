import { generateRandomString } from "ownd-vci/dist/utils/randomStringUtils.js";
import store from "../store.js";
import {
  AccessTokenIssuer,
  AuthCodeStateProvider,
  AuthorizedCodeWithStoredData,
  TokenIssuerConfig,
} from "ownd-vci/dist/oid4vci/tokenEndpoint/types.js";

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

    // アクセストークンを追加
    await store.addAccessToken(
      newAccessToken,
      expiresIn,
      authorizedCode.storedData.id,
    );

    // TODO: needsProofの場合、c_nonceを別途追加する処理を実装
    if (needsProof) {
      // const cNonce = generateRandomString();
      // const cNonceExpiresIn = Number(
      //   process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN,
      // );
      // await authStore.addCNonce(accessTokenId, cNonce, cNonceExpiresIn);
      // nonce = {
      //   c_nonce: cNonce,
      //   c_nonce_expires_in: cNonceExpiresIn,
      // };
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
