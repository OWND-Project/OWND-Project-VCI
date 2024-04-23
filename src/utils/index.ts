import { ErrorPayload } from "../types";

export const toError = (
  error: string,
  errorDescription: string,
): ErrorPayload => {
  return {
    error,
    error_description: errorDescription,
  };
};
