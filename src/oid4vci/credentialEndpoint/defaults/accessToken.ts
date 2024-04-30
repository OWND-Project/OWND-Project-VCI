import { AccessTokenStateProvider } from "../types.js";
import authStore, { StoredAccessToken } from "../../../store/authStore.js";

export const accessTokenStateProvider: AccessTokenStateProvider<
  StoredAccessToken
> = async (accessToken: string) => {
  const storedAccessToken = await authStore.getAccessToken(accessToken);
  if (!storedAccessToken) {
    return { exists: false };
  }
  const { cNonce, cNonceExpiresIn, cNonceCreatedAt } = storedAccessToken;
  const proofElements = storedAccessToken.authorizedCode.needsProof
    ? {
        cNonce: cNonce!,
        createdAt: cNonceCreatedAt!,
        expiresIn: cNonceExpiresIn!,
      }
    : undefined;
  const payload = {
    authorizedCode: {
      code: storedAccessToken.authorizedCode.code,
      proofElements,
    },
    expiresIn: storedAccessToken.expiresIn,
    createdAt: new Date(storedAccessToken.createdAt),
    storedAccessToken,
  };
  return { exists: true, payload };
};
