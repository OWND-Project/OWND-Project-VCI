import { ErrorPayload, Result } from "ownd-vci/dist/types";
import keyStore from "ownd-vci/dist/store/keyStore.js";
import store from "../store.js";
import {
  issueJwtCredential,
  X509CertificateInfo,
} from "ownd-vci/dist/credentials/jwt/issuer.js";

export const issueTicketCertificate = async (
  authorizedCode: string,
): Promise<Result<string, ErrorPayload>> => {
  const data = await store.getEventAndTicketByAuthCode(authorizedCode);
  if (!data) {
    return { ok: false, error: { error: "NotFound" } }; // todo define constant
  }
  const { event, ticketNo } = data;
  const keyPair = await keyStore.getLatestKeyPair();
  if (keyPair) {
    const { x509cert } = keyPair;
    const x5c = x509cert ? JSON.parse(x509cert) : [];

    // In the current library implementation, if both `x5u` and `x5c` are set,
    // only `x5u` is set to VC to reduce the size of VC.
    // In the Verifier implementation developed this time, only `x5c` is used,
    // so `x5u` should not be listed.
    // (If `x5u` is appended, `x5c` will be lost and an error will occur.)
    //
    // const x5u = new URL(
    //   "/issuer-certificate/chain.pem",
    //   process.env.CREDENTIAL_ISSUER,
    // ).toString();

    // issue vc
    const iss = process.env.CREDENTIAL_ISSUER_IDENTIFIER;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 24 * 365;
    const type = "EventTicketCredential";
    const {
      name,
      description,
      location,
      startDate,
      endDate,
      url,
      organizerUrl,
      organizerName,
    } = event;
    const claims = {
      vc: {
        credentialSubject: {
          ticketNo,
          eventName: name,
          description,
          location,
          startDate,
          endDate,
          url,
          organizerUrl,
          organizerName,
        },
        type: [type],
      },
      iss,
      iat,
      exp,
      type, // todo: remove. Also needs to be modified on the Wallet app side.
    };
    const info: X509CertificateInfo = {
      // x5u,
      x5c,
    };
    const credential = await issueJwtCredential(claims, keyPair, info);
    console.log({ credential });
    return { ok: true, payload: credential };
  } else {
    const error = { status: 500, error: "No keypair exists" };
    return { ok: false, error };
  }
};
