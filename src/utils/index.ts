import { ErrorPayload } from "../types.js";

export const toError = (
  error: string,
  errorDescription: string,
): ErrorPayload => {
  return {
    error,
    error_description: errorDescription,
  };
};
