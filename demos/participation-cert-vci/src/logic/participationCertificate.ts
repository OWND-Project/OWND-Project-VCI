import { ErrorPayload, Result } from "../../../../src/types";
import keyStore from "../../../../src/store/keyStore.js";
import store from "../store.js";
import {
  issueJwtCredential,
  X509CertificateInfo,
} from "../../../../src/credentials/jwt/issuer.js";

const issueParticipationCertificate = async (
  authorizedCode: string,
): Promise<Result<string, ErrorPayload>> => {
  const data = await store.getPreAuthCodeAndConference(authorizedCode);
  if (!data) {
    return { ok: false, error: { error: "NotFound" } }; // todo define constant
  }
  const { conference } = data;
  const keyPair = await keyStore.getLatestKeyPair();
  if (keyPair) {
    const { x509cert } = keyPair;
    const x5c = x509cert ? JSON.parse(x509cert) : [];
    const x5u = new URL(
      "/issuer-certificate/chain.pem",
      process.env.CREDENTIAL_ISSUER,
    ).toString();
    // issue vc
    const iss = process.env.CREDENTIAL_ISSUER_IDENTIFIER;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 24 * 365;
    const type = "ParticipationCertificate";
    const {
      name,
      description,
      location,
      startDate,
      endDate,
      url,
      organizerUrl,
      organizerName,
    } = conference;
    const claims = {
      vc: {
        credentialSubject: {
          name,
          description,
          organizerName,
          location,
          startDate,
          endDate,
          url,
          organizerUrl,
        },
        type: [type],
      },
      iss,
      iat,
      exp,
      type, // todo: remove. Also needs to be modified on the Wallet app side.
    };
    const info: X509CertificateInfo = {
      x5u,
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

export default {
  issueParticipationCertificate,
};
