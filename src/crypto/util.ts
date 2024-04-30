import keyutil from "js-crypto-key-utils";
import { createHash } from "crypto";

import { PrivateJwk } from "elliptic-jwk";
import * as jsrsasign from "jsrsasign";
import { CERT_PEM_POSTAMBLE, CERT_PEM_PREAMBLE } from "./x509/constant.js";

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
export const ellipticJwkToPem = async (jwk: {
  kty: string;
  d: string;
  crv: string;
  x: string;
  y: string | undefined;
}): Promise<PemKeyPair> => {
  // Check for convertibility.
  if (
    (jwk.kty !== "EC" && jwk.kty !== "OKP") ||
    (jwk.crv !== "P-256" && jwk.crv !== "secp256k1" && jwk.crv !== "Ed25519")
  ) {
    throw new Error(`Unsupported kty or crv: ${jwk.kty}, ${jwk.crv}`);
  }

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
export const checkEcdsaKeyEquality = (pem1: string, pem2: string) => {
  const kidPublicKey = jsrsasign.KEYUTIL.getKey(pem1);
  const certPublicKey = jsrsasign.KEYUTIL.getKey(pem2);
  if (
    !(kidPublicKey instanceof jsrsasign.KJUR.crypto.ECDSA) ||
    !(certPublicKey instanceof jsrsasign.KJUR.crypto.ECDSA)
  ) {
    throw new Error("The key type is assumed to be ECDSA");
  }
  const kidXY = kidPublicKey.getPublicKeyXYHex();
  const certXY = certPublicKey.getPublicKeyXYHex();
  return kidXY.x === certXY.x && kidXY.y === certXY.y;
};
export const positiveSerialNumber = (): string => {
  let hexValue: string;
  do {
    hexValue = jsrsasign.KJUR.crypto.Util.getRandomHexOfNbytes(20);
  } while (
    BigInt("0x" + hexValue) >> BigInt(hexValue.length * 4 - 1) ===
    BigInt(1)
  );
  return hexValue;
};

export const hexToBinary = (hex: string): Buffer => {
  return Buffer.from(hex, "hex");
};

export const sha1Binary = (binary: Buffer): string => {
  return createHash("sha1").update(binary).digest("hex");
};

const wrap64str = (str: string): string => {
  var result = "";
  for (const [index, char] of str.split("").entries()) {
    if (index % 64 == 0 && index != 0) {
      result += "\n";
    }
    result += char;
  }
  return result;
};

export const jsonCertChainToPem = (jsonCertChain: string): string => {
  const jsn = JSON.parse(jsonCertChain);
  return jsn
    .map((cert: string) => {
      const decodedBuffer: Buffer = Buffer.from(cert, "base64");
      const base64EncodedString: string = decodedBuffer.toString("base64");
      return (
        CERT_PEM_PREAMBLE +
        "\n" +
        wrap64str(base64EncodedString) +
        "\n" +
        CERT_PEM_POSTAMBLE
      );
    })
    .join("\n");
};
