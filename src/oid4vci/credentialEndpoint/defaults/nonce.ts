import { UpdateNonce } from "../types";
import authStore, { StoredAccessToken } from "../../../store/authStore";
import { generateRandomString } from "../../../utils/randomStringUtils";

export const updateNonce: UpdateNonce<StoredAccessToken> = async (
  storedAccessToken: StoredAccessToken,
) => {
  const nonce = generateRandomString();
  const expiresIn = Number(process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN);
  await authStore.refreshNonce(storedAccessToken.id, nonce, expiresIn);
  return { nonce, expiresIn };
};
