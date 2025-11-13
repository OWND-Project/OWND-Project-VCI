import { generateRandomString } from "ownd-vci/dist/utils/randomStringUtils.js";
import authStore from "ownd-vci-common/dist/store/authStore.js";
import {
  NonceIssuer,
  NonceIssuerConfig,
} from "ownd-vci/dist/oid4vci/nonceEndpoint/types.js";

export const nonceIssuer: NonceIssuer = async () => {
  try {
    // Generate new c_nonce
    const cNonce = generateRandomString();
    const cNonceExpiresIn = Number(
      process.env.VCI_ACCESS_TOKEN_C_NONCE_EXPIRES_IN,
    );

    // Add c_nonce to database
    await authStore.addCNonce(cNonce, cNonceExpiresIn);

    const nonceResponse = {
      c_nonce: cNonce,
      c_nonce_expires_in: cNonceExpiresIn,
    };
    return { ok: true, payload: nonceResponse };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: { error: "INTERNAL_ERROR", internalError: true },
    };
  }
};

export const nonceConfigure = (): NonceIssuerConfig => {
  return {
    nonceIssuer,
  };
};
