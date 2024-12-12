import { ParticipationWithCredentialOffer } from "../admin/routesHandler";
import { Result } from "ownd-vci/dist/types";
import { NotSuccessResult } from "ownd-vci/dist/routes/common.js";
import store from "../store.js";
import {
  generateRandomNumericString,
  generateRandomString,
} from "ownd-vci/dist/utils/randomStringUtils.js";
import { generatePreAuthCredentialOffer } from "ownd-vci/dist/oid4vci/CredentialOffer.js";
import { jsonCertChainToPem } from "ownd-vci/dist/crypto/util.js";
import keyStore from "ownd-vci/dist/store/keyStore.js";

export const credentialOfferForParticipation = async (
  eventId: any,
): Promise<Result<ParticipationWithCredentialOffer, NotSuccessResult>> => {
  if (!eventId) {
    return { ok: false, error: { type: "INVALID_PARAMETER" } };
  }
  const event = await store.getEventById(eventId);
  if (!event) {
    console.info("event not found");
    return { ok: false, error: { type: "NOT_FOUND" } };
  }

  // generate pre-auth code
  const code = generateRandomString();
  const expiresIn = Number(process.env.VCI_PRE_AUTH_CODE_EXPIRES_IN || "86400");

  // todo: It would be better to use null instead of an empty string. This can be fixed when complying with ID1.
  const txCode = ""; //generateRandomNumericString();
  const participation = await store.addPreAuthCodeAsParticipation(
    code,
    expiresIn,
    txCode,
    event.id,
  );

  const credentialOfferUrl = generatePreAuthCredentialOffer(
    process.env.CREDENTIAL_ISSUER || "",
    ["ParticipationCertificate"],
    code,
    undefined,
  );

  // todo usedAtがそのまま返されるのでIFと一致しないバグの扱いを考える(IFを変えるか実装を変えるか)
  const { authorizedCode, ...rest } = participation;
  // @ts-ignore
  const usedAt = authorizedCode.usedAt;
  const authorizedCodeRef = {
    id: authorizedCode.id,
    code: authorizedCode.code,
    txCode: authorizedCode.txCode,
    expiresIn: authorizedCode.expiresIn,
    createdAt: authorizedCode.createdAt,
    needsProof: authorizedCode.needsProof,
    preAuthFlow: authorizedCode.preAuthFlow,
    usedAt,
  };
  const result = {
    ...rest,
    authorizedCode: authorizedCodeRef,
    credentialOffer: credentialOfferUrl,
  };
  return { ok: true, payload: result };
};

export const handleCertificateChain = async (): Promise<
  Result<string, NotSuccessResult>
> => {
  const keyPair = await keyStore.getLatestKeyPair();
  if (keyPair) {
    const { x509cert } = keyPair;
    if (x509cert) {
      const result = jsonCertChainToPem(x509cert);
      return { ok: true, payload: result };
    } else {
      return { ok: false, error: { type: "NOT_FOUND" } };
    }
  } else {
    return { ok: false, error: { type: "NOT_FOUND" } };
  }
};

export const getTicketCredentialOffer = async (
  ticketNo: any,
): Promise<Result<{ credentialOffer: string }, NotSuccessResult>> => {
  if (!ticketNo) {
    return { ok: false, error: { type: "INVALID_PARAMETER" } };
  }
  const ticket = await store.getTicketByTicketNo(ticketNo);
  if (!ticket) {
    return { ok: false, error: { type: "INVALID_PARAMETER" } };
  }

  const credentialOfferUrl = generatePreAuthCredentialOffer(
    process.env.CREDENTIAL_ISSUER || "",
    ["EventTicketCredential"],
    ticket.authorizedCode.code,
    {},
  );
  return { ok: true, payload: { credentialOffer: credentialOfferUrl } };
};
