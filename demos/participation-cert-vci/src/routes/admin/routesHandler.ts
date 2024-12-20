import Koa from "koa";

import { Result } from "ownd-vci/dist/types";
import {
  handleNotSuccessResult,
  NotSuccessResult,
} from "ownd-vci/dist/routes/common.js";
import { generateRandomString } from "ownd-vci/dist/utils/randomStringUtils.js";
import { generatePreAuthCredentialOffer } from "ownd-vci/dist/oid4vci/CredentialOffer.js";

import store, { Conference, NewConference } from "../../store.js";

export async function handleNewConference(ctx: Koa.Context) {
  if (!ctx.request.body) {
    ctx.body = { status: "error", message: "Invalid data received!" };
    ctx.status = 400;
    return;
  }
  const conference = ctx.request.body.conference;

  const result = await registerConference(conference);
  if (result.ok) {
    ctx.body = result.payload;
    ctx.status = 201;
  } else {
    handleNotSuccessResult(result.error, ctx);
  }
}

export async function handleConferenceCredentialOffer(ctx: Koa.Context) {
  const { conferenceId } = ctx.params;
  const result = await credentialOfferForConference(conferenceId);
  if (result.ok) {
    ctx.body = result.payload;
    ctx.status = 201;
  } else {
    handleNotSuccessResult(result.error, ctx);
  }
}

const registerConference = async (
  payload: any,
): Promise<Result<Conference, NotSuccessResult>> => {
  try {
    if (typeof payload !== "object" || !payload) {
      return { ok: false, error: { type: "INVALID_PARAMETER" } };
    }

    const {
      name,
      description,
      location,
      startDate,
      endDate,
      url,
      organizerName,
      organizerUrl,
    } = payload;

    if (
      typeof name !== "string" ||
      typeof description !== "string" ||
      typeof location !== "string" ||
      typeof startDate !== "string" ||
      typeof endDate !== "string" ||
      typeof url !== "string" ||
      typeof organizerName !== "string" ||
      typeof organizerUrl !== "string"
    ) {
      return { ok: false, error: { type: "INVALID_PARAMETER" } };
    }

    const newConference: NewConference = {
      name,
      description,
      location,
      startDate,
      endDate,
      url,
      organizerName,
      organizerUrl,
    };

    let id = await store.registerConference(newConference);
    let responsePayload = { ...newConference, id };

    return { ok: true, payload: responsePayload };
  } catch (e) {
    console.error(e);
    if (e instanceof Error) {
      return {
        ok: false,
        error: { type: "INTERNAL_ERROR", message: e.message },
      };
    } else {
      return { ok: false, error: { type: "INTERNAL_ERROR", message: "" } };
    }
  }
};

export type GenerateCredentialOfferResult = {
  subject: any;
  credentialOffer: string;
};
const credentialOfferForConference = async (
  conferenceId: string,
): Promise<Result<GenerateCredentialOfferResult, NotSuccessResult>> => {
  const conference = await store.getConferenceById(conferenceId);
  if (!conference) {
    return { ok: false, error: { type: "NOT_FOUND" } };
  }

  // generate pre-auth code
  const code = generateRandomString();
  const expiresIn = Number(process.env.VCI_PRE_AUTH_CODE_EXPIRES_IN || "86400");
  await store.addPreAuthCode(code, expiresIn, "", conference.id);

  const credentialOfferUrl = generatePreAuthCredentialOffer(
    process.env.CREDENTIAL_ISSUER || "",
    ["ParticipationCertificate"],
    code,
  );

  const payload = {
    subject: { conferenceId: conferenceId },
    credentialOffer: credentialOfferUrl,
  };
  return { ok: true, payload };
};

export default {
  handleNewConference,
  handleConferenceCredentialOffer,
};
