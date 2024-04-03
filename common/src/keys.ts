import { CRV, newPrivateJwk, PrivateJwk, PublicJwk } from "elliptic-jwk";
import keyutil from "js-crypto-key-utils";

import { NotSuccessResult } from "./routerCommon";
import { UNIQUE_CONSTRAINT_FAILED } from "./store.js";
import keyStore from "./store/keyStore.js";
import { NgResult, Result } from "./types";
import {
  CERT_PEM_POSTAMBLE,
  CERT_PEM_PREAMBLE,
  checkEcdsaKeyEquality,
  createEcdsaCsr,
  createEcdsaSelfCertificate,
} from "./x509.js";

interface Csr {
  csr: string;
}
interface X509Cert {
  cert: string;
}

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

interface PemKeyPair {
  publicKey: string;
  privateKey: string;
}

const curveNistName = (crv: string): string => {
  switch (crv) {
    case "secp256k1":
      return "P-256K";
    case "secp256r1":
      return "P-256";
    case "secp384r1":
      return "P-384";
    case "secp521r1":
      return "P-521";
    default:
      throw new Error(`Unsupported curve: ${crv}`);
  }
};

const jwkToPem = async (jwk: {
  kty: "EC" | "OKP";
  d: string;
  crv: "P-256" | "secp256k1" | "Ed25519";
  x: string;
  y: string | undefined;
}): Promise<PemKeyPair> => {
  // See https://github.com/junkurihara/jscu/blob/8168ab947e23876d2915ed8849f021d59673e8aa/packages/js-crypto-key-utils/src/params.ts#L12
  const preprocessedJwk = jwk.crv.startsWith("sec")
    ? {
        kty: jwk.kty,
        d: jwk.d,
        crv: curveNistName(jwk.crv),
        x: jwk.x,
        y: jwk.y,
      }
    : jwk;

  const keyObj = new keyutil.Key("jwk", preprocessedJwk);
  const privatePem = (await keyObj.export("pem")) as string;
  const publicPem = (await keyObj.export("pem", {
    outputPublic: true,
  })) as string;
  return { publicKey: publicPem, privateKey: privatePem };
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
    const { publicKey, privateKey } = await jwkToPem(jwkPair);
    const csr = createEcdsaCsr(subject, publicKey, privateKey);
    const payload = {
      csr: csr,
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
    const { privateKey } = await jwkToPem(jwkPair);
    const cert = createEcdsaSelfCertificate(csr, privateKey);
    const payload = {
      cert: cert,
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

    const { publicKey } = await jwkToPem(jwkPair);
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

export const getKeyAlgorithm = (jwk: PrivateJwk): string => {
  switch (jwk.kty) {
    case "EC":
      // todo add patterns of crv
      if (jwk.crv === "P-256") {
        return "ES256";
      } else {
        return "ES256K";
      }
    case "OKP":
      return "EdDSA";
    default:
      throw new Error("Unsupported key type");
  }
};

export default { genKey, getKey, revokeKey };
