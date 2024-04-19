import { Message } from "./types.js";

export type RESULT_TYPE_INVALID_PARAMETER = "INVALID_PARAMETER";
export type RESULT_TYPE_NOT_FOUND = "NOT_FOUND";
export type RESULT_TYPE_DUPLICATED_ERROR = "DUPLICATED_ERROR";
export type RESULT_TYPE_GONE = "GONE";
export type RESULT_TYPE_INTERNAL_ERROR = "INTERNAL_ERROR";
export type RESULT_TYPE_UNSUPPORTED_CURVE = "UNSUPPORTED_CURVE";
export type RESULT_TYPE_KEY_DOES_NOT_MATCH = "KEY_DOES_NOT_MATCH";
export interface InvalidParameterResult {
  type: RESULT_TYPE_INVALID_PARAMETER;
}
export interface NotFoundResult {
  type: RESULT_TYPE_NOT_FOUND;
}
export interface DuplicatedErrorResult {
  type: RESULT_TYPE_DUPLICATED_ERROR;
}
export interface GoneResult {
  type: RESULT_TYPE_GONE;
}
export interface InternalError extends Message {
  type: RESULT_TYPE_INTERNAL_ERROR;
}

export interface UnsupportedCurve extends Message {
  type: RESULT_TYPE_UNSUPPORTED_CURVE;
}

export interface KeyDoesNotMatch extends Message {
  type: RESULT_TYPE_KEY_DOES_NOT_MATCH;
}

export type NotSuccessResult =
  | InvalidParameterResult
  | NotFoundResult
  | DuplicatedErrorResult
  | GoneResult
  | InternalError
  | UnsupportedCurve
  | KeyDoesNotMatch;

export interface RouteContext {
  status: number;
  body: any;
}

export const handleNotSuccessResult = (
  result: NotSuccessResult,
  ctx: RouteContext,
) => {
  if (result.type === "INVALID_PARAMETER") {
    ctx.status = 400;
    ctx.body = { status: "error", message: "Invalid data received." };
  } else if (result.type === "NOT_FOUND") {
    ctx.status = 404;
    ctx.body = { status: "error", message: `Not found.` };
  } else if (result.type === "DUPLICATED_ERROR") {
    ctx.status = 409;
    ctx.body = { status: "error", message: `Conflict` };
  } else if (result.type === "GONE") {
    ctx.status = 410;
    ctx.body = { status: "error", message: `Gone` };
  } else {
    ctx.body = { status: "error", message: result.message };
    ctx.status = 500;
  }
  console.debug(ctx.status, ctx.body);
};
