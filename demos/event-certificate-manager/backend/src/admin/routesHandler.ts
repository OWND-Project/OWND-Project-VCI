import store, { Event, NewEvent, Participation, Ticket } from "../store.js";

import { Result } from "ownd-vci/dist/types";
import { NotSuccessResult } from "ownd-vci/dist/routes/common";
import { generatePreAuthCredentialOffer } from "ownd-vci/dist/oid4vci/CredentialOffer.js";
import {
  generateRandomNumericString,
  generateRandomString,
} from "ownd-vci/dist/utils/randomStringUtils.js";

export const registerEvent = async (
  payload: any,
): Promise<Result<Event, NotSuccessResult>> => {
  try {
    if (typeof payload !== "object" || !payload) {
      return { ok: false, error: { type: "INVALID_PARAMETER" } };
    }

    const {
      name,
      description = null, // デフォルト値を null に設定
      location = null,
      startDate,
      endDate,
      url = null,
      organizerName,
      organizerUrl = null,
    } = payload;

    // 必須項目のチェック
    if (
      typeof name !== "string" ||
      typeof startDate !== "string" ||
      typeof endDate !== "string" ||
      typeof organizerName !== "string"
    ) {
      return { ok: false, error: { type: "INVALID_PARAMETER" } };
    }

    const newEvent: NewEvent = {
      name,
      description,
      location,
      startDate,
      endDate,
      url,
      organizerName,
      organizerUrl,
    };

    let id = await store.registerEvent(newEvent);
    let responsePayload = { ...newEvent, id };

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

export const getAllEvents = async (
  sortField = "startDate",
  sortOrder = "ASC",
): Promise<Result<Event[], NotSuccessResult>> => {
  try {
    const events = await store.getAllEvents(sortField, sortOrder);
    return { ok: true, payload: events };
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

export const getEventById = async (
  eventId: string,
): Promise<Result<Event | null, NotSuccessResult>> => {
  try {
    const event = await store.getEventById(eventId);
    return { ok: true, payload: event };
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

export const updateEventById = async (
  eventId: string,
  payload: any,
): Promise<Result<Event, NotSuccessResult>> => {
  try {
    const {
      name,
      description = null,
      location = null,
      startDate,
      endDate,
      url = null,
      organizerName,
      organizerUrl = null,
    } = payload;

    // バリデーションチェック
    if (
      typeof name !== "string" ||
      typeof startDate !== "string" ||
      typeof endDate !== "string" ||
      typeof organizerName !== "string"
    ) {
      return { ok: false, error: { type: "INVALID_PARAMETER" } };
    }

    // イベント存在チェック
    const existingEvent = await store.getEventById(eventId);
    if (!existingEvent) {
      return { ok: false, error: { type: "NOT_FOUND" } };
    }

    // イベント更新
    const updatedEvent: NewEvent = {
      name,
      description,
      location,
      startDate,
      endDate,
      url,
      organizerName,
      organizerUrl,
    };
    const result = await store.updateEvent(parseInt(eventId), updatedEvent);

    if (result) {
      return { ok: true, payload: result };
    } else {
      return {
        ok: false,
        error: {
          type: "INTERNAL_ERROR",
          message: "Failed to fetch updated event",
        },
      };
    }
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

export interface TicketWithCredentialOffer extends Ticket {
  credentialOffer: string;
}

export const credentialOfferForEventTicket = async (
  payload: any,
): Promise<Result<TicketWithCredentialOffer, NotSuccessResult>> => {
  if (typeof payload !== "object" || !payload) {
    return { ok: false, error: { type: "INVALID_PARAMETER" } };
  }
  const { eventId } = payload;
  if (!eventId) {
    return { ok: false, error: { type: "INVALID_PARAMETER" } };
  }
  // get employee
  const event = await store.getEventById(eventId);
  if (!event) {
    console.info("event not found");
    return { ok: false, error: { type: "INVALID_PARAMETER" } };
  }

  // generate pre-auth code
  const code = generateRandomString();
  const expiresIn = Number(process.env.VCI_PRE_AUTH_CODE_EXPIRES_IN || "86400");
  const userPin = generateRandomNumericString();
  const ticket = await store.addPreAuthCodeAsTicket(
    code,
    expiresIn,
    userPin,
    event.id,
  );

  const credentialOfferUrl = generatePreAuthCredentialOffer(
    process.env.CREDENTIAL_ISSUER || "",
    ["EventTicketCredential"],
    code,
    true,
  );

  // todo usedAtがそのまま返されるのでIFと一致しないバグの扱いを考える(IFを変えるか実装を変えるか)
  const { authorizedCode, ...rest } = ticket;
  // @ts-ignore
  const usedAt = authorizedCode.usedAt;
  const authorizedCodeRef = {
    id: authorizedCode.id,
    code: authorizedCode.code,
    userPin: authorizedCode.userPin,
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

export const allTickets = async (): Promise<
  Result<Ticket[], NotSuccessResult>
> => {
  try {
    const tickets = await store.getTickets();
    const payload = tickets.map((ticket) => {
      const credentialOfferUrl = generatePreAuthCredentialOffer(
        process.env.CREDENTIAL_ISSUER || "",
        ["EventTicketCredential"],
        ticket.authorizedCode.code,
        true,
      );
      return { ...ticket, credentialOffer: credentialOfferUrl };
    });
    return { ok: true, payload };
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

export const getTicketById = async (
  ticketId: string,
): Promise<Result<TicketWithCredentialOffer | null, NotSuccessResult>> => {
  try {
    const ticket = await store.getTicketById(ticketId);
    if (!ticket) {
      return { ok: true, payload: null };
    }
    const credentialOfferUrl = generatePreAuthCredentialOffer(
      process.env.CREDENTIAL_ISSUER || "",
      ["EventTicketCredential"],
      ticket.authorizedCode.code,
      true,
    );
    const payload = { ...ticket, credentialOffer: credentialOfferUrl };
    return { ok: true, payload };
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

export const updateTicketById = async (
  ticketId: string,
  payload: any,
): Promise<Result<TicketWithCredentialOffer | null, NotSuccessResult>> => {
  try {
    if (typeof payload !== "object" || !payload) {
      return { ok: false, error: { type: "INVALID_PARAMETER" } };
    }

    const { eventId } = payload;
    if (!eventId) {
      return { ok: false, error: { type: "INVALID_PARAMETER" } };
    }

    const ticket = await store.getTicketById(ticketId);
    if (!ticket) {
      return { ok: false, error: { type: "NOT_FOUND" } };
    }

    // update
    await store.updateTicket(ticketId, eventId);

    // updated data
    const updated = await store.getTicketById(ticketId);
    const credentialOfferUrl = generatePreAuthCredentialOffer(
      process.env.CREDENTIAL_ISSUER || "",
      ["EventTicketCredential"],
      updated!.authorizedCode.code,
      true,
    );
    const result = { ...updated!, credentialOffer: credentialOfferUrl };
    return { ok: true, payload: result };
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

export const allParticipation = async (): Promise<
  Result<Participation[], NotSuccessResult>
> => {
  try {
    const participationList = await store.getAllParticipation();
    const payload = participationList.map((participation) => {
      const credentialOfferUrl = generatePreAuthCredentialOffer(
        process.env.CREDENTIAL_ISSUER || "",
        ["ParticipationCertificate"],
        participation.authorizedCode.code,
        false,
      );
      return { ...participation, credentialOffer: credentialOfferUrl };
    });
    return { ok: true, payload };
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

export interface ParticipationWithCredentialOffer extends Participation {
  credentialOffer: string;
}
export const getParticipationById = async (
  participationId: string,
): Promise<
  Result<ParticipationWithCredentialOffer | null, NotSuccessResult>
> => {
  try {
    const participation = await store.getParticipationById(participationId);
    if (!participation) {
      return { ok: true, payload: null };
    }
    const credentialOfferUrl = generatePreAuthCredentialOffer(
      process.env.CREDENTIAL_ISSUER || "",
      ["ParticipationCertificate"],
      participation.authorizedCode.code,
      false,
    );
    const payload = { ...participation, credentialOffer: credentialOfferUrl };
    return { ok: true, payload };
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
