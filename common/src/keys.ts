import { CRV, newPrivateJwk, PublicJwk } from "elliptic-jwk";

import { NotSuccessResult } from "./routes/routerCommon.js";
import { UNIQUE_CONSTRAINT_FAILED } from "./store.js";
import keyStore from "./store/keyStore.js";
import { NgResult, Result } from "./types.js";
import {
  generateCsr,
  trimmer,
  generateRootCertificate,
} from "./crypto/x509/issue.js";
import { checkEcdsaKeyEquality, ellipticJwkToPem } from "./crypto/util.js";
import {
  CERT_PEM_POSTAMBLE,
  CERT_PEM_PREAMBLE,
} from "./crypto/x509/constant.js";
import { addSeconds, getCurrentUTCDate } from "./utils/datetime.js";

const INVALID_PARAMETER_ERROR: NgResult<NotSuccessResult> = {
  ok: false,
  error: { type: "INVALID_PARAMETER" },
};
const NOT_FOUND_ERROR: NgResult<NotSuccessResult> = {
  ok: false,
  error: { type: "NOT_FOUND" },
};
const GONE_ERROR: NgResult<NotSuccessResult> = {
  ok: false,
  error: { type: "GONE" },
};
const DUPLICATED_ERROR: NgResult<NotSuccessResult> = {
  ok: false,
  error: { type: "DUPLICATED_ERROR" },
};
const UNKNOWN_ERROR: NgResult<NotSuccessResult> = {
  ok: false,
  error: {
    type: "INTERNAL_ERROR",
    message: "unknown error",
  },
};
const toInternalError = (
  name: string,
  message: string,
): NgResult<NotSuccessResult> => {
  return {
    ok: false,
    error: {
      type: "INTERNAL_ERROR",
      message: `name: ${name} message: ${message}`,
    },
  };
};
const toUnsupportedCurveError = (
  description: string,
): NgResult<NotSuccessResult> => {
  return {
    ok: false,
    error: { type: "UNSUPPORTED_CURVE", message: description },
  };
};
const isSupportedCurve = (value: string): Result<CRV, string> => {
  switch (value) {
    case "P-256":
      return { ok: true, payload: value };
    case "secp256k1":
      return { ok: true, payload: value };
    case "Ed25519":
      return { ok: true, payload: value };
    default:
      return {
        ok: false,
        error: `Invalid value: ${value}. Allowed values are: secp256k1, Ed25519`,
      };
  }
};

export const genKey = async (
  keyId: string,
  curve: string,
): Promise<Result<number, NotSuccessResult>> => {
  if (!keyId) {
    return INVALID_PARAMETER_ERROR;
  }
  const curveCheck = isSupportedCurve(curve);
  if (!curveCheck.ok) {
    return INVALID_PARAMETER_ERROR;
  }
  const _curve = curveCheck.payload;
  const privateJwk = newPrivateJwk(_curve);
  const { kty, crv, x, y, d } = privateJwk;
  try {
    const ret = await keyStore.insertECKeyPair({
      kid: keyId,
      kty,
      crv,
      x,
      y: y || "",
      d,
    });
    return { ok: true, payload: ret.lastID! };
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      const { name, message } = err;
      if (message === UNIQUE_CONSTRAINT_FAILED) {
        return DUPLICATED_ERROR;
      } else {
        return toInternalError(name, message);
      }
    }
    return UNKNOWN_ERROR;
  }
};
export const getKey = async (
  keyId: string,
): Promise<Result<PublicJwk, NotSuccessResult>> => {
  if (!keyId) {
    return INVALID_PARAMETER_ERROR;
  }
  try {
    const data = await keyStore.getEcKeyPair(keyId);
    if (data) {
      const { kid, kty, crv, x, y, revokedAt } = data;
      if (revokedAt) {
        return GONE_ERROR;
      } else {
        const payload = {
          kid,
          kty,
          crv,
          x,
          y,
        };
        return { ok: true, payload };
      }
    } else {
      return NOT_FOUND_ERROR;
    }
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      const { name, message } = err;
      return toInternalError(name, message);
    }
    return UNKNOWN_ERROR;
  }
};
export const revokeKey = async (
  keyId: string,
): Promise<Result<{}, NotSuccessResult>> => {
  if (!keyId) {
    return INVALID_PARAMETER_ERROR;
  }
  try {
    const data = await keyStore.getEcKeyPair(keyId);
    if (data) {
      const { revokedAt } = data;
      if (revokedAt) {
        return DUPLICATED_ERROR;
      } else {
        await keyStore.revokeECKeyPair(keyId);
      }
      return { ok: true, payload: {} };
    } else {
      return NOT_FOUND_ERROR;
    }
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      const { name, message } = err;
      return toInternalError(name, message);
    }
    return UNKNOWN_ERROR;
  }
};

interface Csr {
  csr: string;
}
interface X509Cert {
  cert: string;
}

export const createCsr = async (
  keyId: string,
  subject: string,
): Promise<Result<Csr, NotSuccessResult>> => {
  if (!keyId || !subject) {
    return INVALID_PARAMETER_ERROR;
  }
  try {
    const data = await keyStore.getEcKeyPair(keyId);
    if (!data) {
      return NOT_FOUND_ERROR;
    }
    const { kty, crv, x, y, d } = data;
    if (crv !== "secp256k1" && crv != "P-256") {
      return toUnsupportedCurveError(
        "Currently, curve secp256k1,P-256 is supported for CSR creation",
      );
    }
    const jwkPair = {
      kty,
      crv,
      x,
      y,
      d,
    };
    const { publicKey, privateKey } = await ellipticJwkToPem(jwkPair);
    const csr = generateCsr(
      subject,
      publicKey,
      privateKey,
      "SHA256withECDSA",
      [],
    );
    const payload = {
      csr: trimmer(csr),
    };
    return { ok: true, payload };
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      const { name, message } = err;
      return toInternalError(name, message);
    }
    return UNKNOWN_ERROR;
  }
};

export const createSelfCert = async (
  keyId: string,
  csr: string,
): Promise<Result<X509Cert, NotSuccessResult>> => {
  if (!keyId || !csr) {
    return INVALID_PARAMETER_ERROR;
  }
  try {
    const data = await keyStore.getEcKeyPair(keyId);
    if (!data) {
      return NOT_FOUND_ERROR;
    }
    const { kty, crv, x, y, d } = data;
    if (crv !== "secp256k1" && crv !== "P-256") {
      return toUnsupportedCurveError(
        "Currently, curve secp256k1,P-256 is supported for self signing cert",
      );
    }
    const jwkPair = {
      kty,
      crv,
      x,
      y,
      d,
    };
    const { privateKey } = await ellipticJwkToPem(jwkPair);

    const notBefore = getCurrentUTCDate();
    const notAfter = addSeconds(notBefore, 86400 * 365);
    const cert = generateRootCertificate(
      csr,
      notBefore,
      notAfter,
      "SHA256withECDSA",
      privateKey,
    );
    const payload = {
      cert: trimmer(cert),
    };
    return { ok: true, payload };
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      const { name, message } = err;
      return toInternalError(name, message);
    }
    return UNKNOWN_ERROR;
  }
};

export const registerCert = async (
  keyId: string,
  certificates: string[],
): Promise<Result<number | undefined, NotSuccessResult>> => {
  if (!keyId || certificates.length === 0) {
    return INVALID_PARAMETER_ERROR;
  }

  try {
    const data = await keyStore.getEcKeyPair(keyId);
    if (!data) {
      return NOT_FOUND_ERROR;
    }
    const { kty, crv, x, y, d } = data;
    if (crv !== "secp256k1" && crv !== "P-256") {
      return toUnsupportedCurveError(
        "Currently, curve secp256k1,P-256 is supported for Certificate Registration.",
      );
    }
    const jwkPair = {
      kty,
      crv,
      x,
      y,
      d,
    };

    const { publicKey } = await ellipticJwkToPem(jwkPair);
    const endCertificate = certificates[0];
    const certWithMarker =
      CERT_PEM_PREAMBLE + "\n" + endCertificate + "\n" + CERT_PEM_POSTAMBLE;
    if (!checkEcdsaKeyEquality(certWithMarker, publicKey)) {
      return {
        ok: false,
        error: {
          type: "KEY_DOES_NOT_MATCH",
          message: "The key of the certificate does not match the issuer key",
        },
      };
    }

    const ret = await keyStore.insertEcKeyX509Certificate(
      keyId,
      JSON.stringify(certificates),
    );
    return { ok: true, payload: ret.lastID };
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      const { name, message } = err;
      return toInternalError(name, message);
    }
    return UNKNOWN_ERROR;
  }
};

export default {
  genKey,
  getKey,
  revokeKey,
  createCsr,
  createSelfCert,
  registerCert,
};
