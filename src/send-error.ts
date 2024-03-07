import { Response } from "express";
import { z } from "zod";
import { RequestInputType } from ".";

export { sendError, sendErrors };

export const PackageConfiguration: {
  sendErrors?: (
    res: Response,
    zodErrors: [RequestInputType, z.ZodError<any>][]
  ) => void;
} = {};

/**
 * Sends a response to the request with an error built from received zodError
 */
function sendError(
  res: Response,
  inputType: RequestInputType,
  zodError: z.ZodError<any>
) {
  sendErrors(res, [[inputType, zodError]]);
}

/**
 * Sends a response to the request with an error built from received zodErrors
 */
function sendErrors(
  res: Response,
  zodErrors: [RequestInputType, z.ZodError<any>][]
) {
  // if user override exists
  if (PackageConfiguration.sendErrors) {
    return PackageConfiguration.sendErrors(res, zodErrors);
  }

  const errors = zodErrors.flatMap(([inputType, zodError]) => {
    return zodError.errors.map((x) => ({
      detail: x.message,
      pointer: `#${inputType}/${x.path[0]}`,
    }));
  });
  const problem = {
    type: "https://datatracker.ietf.org/doc/html/rfc9110#name-422-unprocessable-content",
    title: "Your request is not valid.",
    detail: "Input is invalid, see 'errors' for more information.",
    status: 422,
    errors: errors,
  };

  res.status(problem.status);
  res.setHeader("content-type", "application/problem+json");
  res.json(problem);
}
