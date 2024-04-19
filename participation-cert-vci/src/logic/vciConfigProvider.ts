import { generateRandomString } from "../../../common/src/utils/randomStringUtils.js";
import store from "../store.js";
import assert from "assert";
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
  const result = await store.getPreAuthCodeAndConference(authorizedCode);
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
  assert(!needsProof, "needsProof is not supported for this VCI");

  try {
    const expiresIn = Number(process.env.VCI_ACCESS_TOKEN_EXPIRES_IN);
    await store.addAccessToken(
      newAccessToken,
      expiresIn,
      "",
      0,
      authorizedCode.storedData.id,
    );
    const tokenResponse = {
      access_token: newAccessToken,
      token_type: "bearer",
      expires_in: expiresIn,
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
