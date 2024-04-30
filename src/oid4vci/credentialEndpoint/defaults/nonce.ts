import { UpdateNonce } from "../types.js";
import authStore, { StoredAccessToken } from "../../../store/authStore.js";
import { generateRandomString } from "../../../utils/randomStringUtils.js";

export const updateNonce: UpdateNonce<StoredAccessToken> = async (
  storedAccessToken: StoredAccessToken,
) => {
  const nonce = generateRandomString();
  const expiresIn = Number(process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN);
  await authStore.refreshNonce(storedAccessToken.id, nonce, expiresIn);
  return { nonce, expiresIn };
};
