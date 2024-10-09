import { generateRandomString } from "ownd-vci/dist/utils/randomStringUtils.js";
import store from "../store.js";
import assert from "assert";
import {
  AccessTokenIssuer,
  AuthCodeStateProvider,
  AuthorizedCodeWithStoredData,
  TokenIssuerConfig,
} from "ownd-vci/dist/oid4vci/tokenEndpoint/types";

export const authCodeStateProvider: AuthCodeStateProvider = async (
  authorizedCode: string,
) => {
  // get stored `pre-authorized_code` data
  const forParticipationCredential = await (async () => {
    try {
      return await store.getPreAuthCodeForParticipationCredentialAndEvent(
        authorizedCode,
      );
    } catch {
      return null;
    }
  })();

  const forTicketCredential = await (async () => {
    try {
      return await store.getPreAuthCodeForTicketCredentialAndEvent(
        authorizedCode,
      );
    } catch {
      return null;
    }
  })();

  if (forParticipationCredential && forTicketCredential) {
    console.warn(
      `The authorizedCode should be tied to only ParticipationCredential or the TicketCredential: ${authorizedCode}`,
    );
    return { exists: false };
  }

  if (!forParticipationCredential && !forTicketCredential) {
    console.warn(
      `The authorizedCode is not tied to either the participation certificate or the ticket: ${authorizedCode}`,
    );
    return { exists: false };
  }

  let storedAuthCode;
  if (forParticipationCredential) {
    storedAuthCode = forParticipationCredential.storedAuthCode;
  } else if (forTicketCredential) {
    storedAuthCode = forTicketCredential.storedAuthCode;
  }

  if (!storedAuthCode) {
    console.warn("One or the other must exist.");
    return { exists: false };
  }

  // adjust interface to SDK requirements
  // const { storedAuthCode } = forParticipationCredential;
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
