import { RequestHandler, Response } from "express";
import { ParamsDictionary, Query } from "express-serve-static-core";
import { z } from "zod";

export {
  RequestSchemas,
  RequestInputType,
  sendError,
  sendErrors,
  validateRequest,
  withParsedRequest,
  validateRequestBody,
  withParsedRequestBody,
  validateRequestQuery,
  withParsedRequestQuery,
  validateRequestParams,
  withParsedRequestParams,
};

type RequestSchemas<TParams, TQuery, TBody> = {
  params?: z.ZodSchema<TParams, any, ParamsDictionary>;
  query?: z.ZodSchema<TQuery, any, Query>;
  body?: z.ZodSchema<TBody>;
};

type RequestInputType = "params" | "query" | "body";

/**
 * NOTE: validateXXX functions do not transform the Request.
 *
 * Meaning if your zod schema contains transformations / refinements / etc you will not see the effect of it on the validated data (but it will still be validated, just not modified)
 *
 * If you want to parse params / query / body and not only validate them use {@link withParsedRequest}
 */
function validateRequest<
  TParams extends ParamsDictionary = ParamsDictionary,
  TQuery extends Query = Query,
  TBody = any,
>(
  schemas: RequestSchemas<TParams, TQuery, TBody>
): RequestHandler<TParams, any, TBody, TQuery> {
  return (req, res, next) => {
    const errors: [RequestInputType, z.ZodError<any>][] = [];

    if (schemas.params) {
      const parseResult = schemas.params.safeParse(req.params);
      if (!parseResult.success) {
        errors.push(["params", parseResult.error]);
      }
    }

    if (schemas.query) {
      const parseResult = schemas.query.safeParse(req.query);
      if (!parseResult.success) {
        errors.push(["query", parseResult.error]);
      }
    }

    if (schemas.body) {
      const parseResult = schemas.body.safeParse(req.body);
      if (!parseResult.success) {
        errors.push(["body", parseResult.error]);
      }
    }

    if (errors.length > 0) {
      return sendErrors(res, errors);
    }

    return next();
  };
}

/**
 * NOTE: validateXXX functions do not transform the Request.
 *
 * Meaning if your zod schema contains transformations / refinements / etc you will not see the effect of it on the validated data (but it will still be validated, just not modified)
 *
 * If you want to parse params and not only validate them use {@link withParsedRequestParams}
 */
const validateRequestParams = <T extends ParamsDictionary>(
  schema: z.ZodSchema<T, any, ParamsDictionary>
) => validateRequest({ params: schema });

/**
 * NOTE: validateXXX functions do not transform the Request.
 *
 * Meaning if your zod schema contains transformations / refinements / etc you will not see the effect of it on the validated data (but it will still be validated, just not modified)
 *
 * If you want to parse query and not only validate it use {@link withParsedRequestQuery}
 */
const validateRequestQuery = <T extends Query>(
  schema: z.ZodSchema<T, any, Query>
) => validateRequest({ query: schema });

/**
 * NOTE: validateXXX functions do not transform the Request.
 *
 * Meaning if your zod schema contains transformations / refinements / etc you will not see the effect of it on the validated data (but it will still be validated, just not modified)
 *
 * If you want to parse body and not only validate it use {@link withParsedRequestBody}
 */
const validateRequestBody = <T>(schema: z.ZodSchema<T>) =>
  validateRequest({ body: schema });

/**
 * Use zod schema to validate and potentially transform the incoming request's input.
 *
 * Result of the zod schema parsing will rewrite `express.Request.{params,query,body}`.
 *
 * IMPORTANT: normally `express.Request.params` and `express.Request.query` are `[string]: string` type but here we will transform it into arbitrary types. It is fine to do if your handler is last in the chain or the following handlers do not interact with `express.Request.{params,query}`. But if any of the following middlewares require them it might be safer to use validation and then parse schema in your handler to not modify the input,
 */
function withParsedRequest<
  TParams = ParamsDictionary,
  TQuery = Query,
  TBody = any,
>(
  schemas: RequestSchemas<TParams, TQuery, TBody>
): RequestHandler<TParams, any, TBody, TQuery> {
  return (req, res, next) => {
    const errors: [RequestInputType, z.ZodError<any>][] = [];

    if (schemas.params) {
      const parseResult = schemas.params.safeParse(req.params);
      if (!parseResult.success) {
        errors.push(["params", parseResult.error]);
      } else {
        req.params = parseResult.data;
      }
    }

    if (schemas.query) {
      const parseResult = schemas.query.safeParse(req.query);
      if (!parseResult.success) {
        errors.push(["query", parseResult.error]);
      } else {
        req.query = parseResult.data;
      }
    }

    if (schemas.body) {
      const parseResult = schemas.body.safeParse(req.body);
      if (!parseResult.success) {
        errors.push(["body", parseResult.error]);
      } else {
        req.body = parseResult.data;
      }
    }

    if (errors.length > 0) {
      return sendErrors(res, errors);
    }

    return next();
  };
}

/**
 * Use zod schema to validate and potentially transform the incoming request's params.
 *
 * Result of the zod schema parsing will rewrite `express.Request.params`.
 *
 * IMPORTANT: normally `express.Request.params` is a `[string]: string` type but here we will transform it into an arbitrary type. It is fine to do if your handler is last in the chain or the following handlers do not interact with `express.Request.params`. But if any of the following middlewares require params it might be safer to use validation and then parse schema in your handler to not modify the input,
 */
const withParsedRequestParams = <T>(
  schema: z.ZodSchema<T, any, ParamsDictionary>
) => withParsedRequest({ params: schema });

/**
 * Use zod schema to validate and potentially transform the incoming request's query.
 *
 * Result of the zod schema parsing will rewrite `express.Request.query`.
 *
 * IMPORTANT: normally `express.Request.query` is a `[string]: string` type but here we will transform it into an arbitrary type. It is fine to do if your handler is last in the chain or the following handlers do not interact with `express.Request.query`. But if any of the following middlewares require query it might be safer to use validation and then parse schema in your handler to not modify the input,
 */
const withParsedRequestQuery = <T>(schema: z.ZodSchema<T, any, Query>) =>
  withParsedRequest({ query: schema });

/**
 * Use zod schema to validate and potentially transform the incoming request's body.
 *
 * Result of the zod schema parsing will rewrite `express.Request.body`.
 *
 * This should be completely fine to do as `express.Request.body` is a generic of `any` type.
 */
const withParsedRequestBody = <T>(schema: z.ZodSchema<T>) =>
  withParsedRequest({ body: schema });

/**
 * Sends a response to the request with an error built from received zodError
 */
function sendError(
  res: Response,
  inputType: RequestInputType,
  zodError: z.ZodError<any>
) {
  const errors = zodError.errors.map((x) => ({
    detail: x.message,
    pointer: `#${inputType}/${x.path[0]}`,
  }));
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

/**
 * Sends a response to the request with an error built from received zodErrors
 */
function sendErrors(
  res: Response,
  zodErrors: [RequestInputType, z.ZodError<any>][]
) {
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
