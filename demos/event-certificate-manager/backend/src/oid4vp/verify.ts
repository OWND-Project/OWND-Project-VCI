import * as jose from "jose";
// import * as crypto from "crypto";
// import * as asn1 from "@lapo/asn1js";
import { verifyCertificateChain } from "./x509.js";

import {
  DecodedVcJwt,
  DecodedVpJwt,
  InputDescriptor,
  PresentationSubmission,
  VerifiableCredential,
  VerifiablePresentation,
} from "./types";

class OID4VpError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export const verifyVpForW3CVcDataV1 = async (
  vpJwt: string,
): Promise<VerifiablePresentation<string>> => {
  console.debug("verifyVpForW3CVcDataV1 start");
  console.debug("jose.decodeProtectedHeader");
  const protectedHeader = jose.decodeProtectedHeader(vpJwt);
  const { jwk, alg } = protectedHeader;
  if (!jwk) {
    // return { ok: false, error: { type: "INVALID_PARAMETER" } };
    throw new OID4VpError(
      "jwk property is not found in jwt header of vp_token",
    );
  }

  console.debug("jose.importJWK");
  const publicKey = await jose.importJWK(jwk, alg);

  console.debug("jose.jwtVerify");
  const { payload } = await jose.jwtVerify(vpJwt, publicKey);
  console.debug("jose.jwtVerify done");
  /*
        vp: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [<vcJwt>],
        },
     */
  const { vp } = payload as unknown as DecodedVpJwt;
  return vp;
};

export interface VerifiedW3CVcDataV1<T> {
  header: jose.ProtectedHeaderParameters;
  vc: VerifiableCredential<T>;
}
export const verifyVcForW3CVcDataV1 = async <T>(
  vcJwt: string,
  verifyChain: boolean = true,
): Promise<VerifiedW3CVcDataV1<T>> => {
  const protectedHeader = jose.decodeProtectedHeader(vcJwt);
  const { x5c, alg } = protectedHeader;
  if (!x5c) {
    throw new OID4VpError("x5c property is not found in jwt header");
  }
  const x509 = `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`;
  const publicKey = await jose.importX509(x509, alg || "ES256");
  const { payload } = await jose.jwtVerify(vcJwt, publicKey);

  /*
        vc: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["TicketCredential"],
          credentialSubject: ticketCredential,
        },
     */
  const { vc } = payload as unknown as DecodedVcJwt<T>;

  if (verifyChain) {
    await verifyCertificateChain(x5c);
  }

  return { header: protectedHeader, vc };
};
export const verifyDescriptorMap = (
  presentationSubmission: PresentationSubmission,
  inputDescriptorChoices: InputDescriptor[],
) => {
  for (const target of presentationSubmission.descriptorMap) {
    const descriptorId = target.id;
    const descriptorFormat = target.pathNested
      ? target.pathNested.format
      : target.format;
    let check = false;
    for (const choice of inputDescriptorChoices) {
      console.debug("InputDescriptor Choice");
      console.debug(choice);
      console.debug("descriptorId:", descriptorId);
      console.debug("descriptorFormat:", descriptorFormat);
      if (
        choice.id === descriptorId &&
        Object.prototype.hasOwnProperty.call(choice.format, descriptorFormat)
      ) {
        check = true;
        break;
      } else {
        console.warn(
          `!!! ${choice.id} != ${descriptorId} or ${descriptorFormat} not in ${choice.format}`,
        );
      }
    }
    if (!check) {
      return false;
    }
  }
  return true;
};
