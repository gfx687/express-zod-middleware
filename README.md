# express-zod-validator

Middleware for [express](https://www.npmjs.com/package/express) to validate and / or parse user input with [zod](https://github.com/colinhacks/zod).

<a href="https://www.npmjs.com/package/@gfx687/express-zod-middleware" rel="nofollow"><img alt="npm" src="https://img.shields.io/npm/v/@gfx687/express-zod-middleware"></a>
<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/npm/l/@gfx687/express-zod-middleware" alt="License"></a>

## Table of Content

- [Table of Content](#table-of-content)
- [Installation](#installation)
- [Example](#example)
- [validateXXX vs withParsedXXX](#validatexxx-vs-withparsedxxx)
- [Error Format](#error-format)
- [API Reference](#api-reference)
  - [`validateRequest`](#validaterequest)
  - [`validateRequestParams / validateRequestQuery / validateRequestBody`](#validaterequestparams--validaterequestquery--validaterequestbody)
  - [`withParsedRequest`](#withparsedrequest)
  - [`withParsedRequestParams / withParsedRequestQuery / withParsedRequestBody`](#withparsedrequestparams--withparsedrequestquery--withparsedrequestbody)
  - [`sendError` and `sendErrors`](#senderror-and-senderrors)
- [TODO](#todo)

## Installation

Install [@gfx687/express-zod-middleware](https://www.npmjs.com/package/@gfx687/express-zod-middleware) with:

`npm install @gfx687/express-zod-middleware`

Peer dependencies:

- [express](https://www.npmjs.com/package/express)
- [zod](https://github.com/colinhacks/zod)

## Example

```typescript
import {
  validateRequestBody,
  withParsedRequestQuery,
} from "@gfx687/express-zod-validator";

// app is an express app
app.post(
  "/api/test",
  validateRequestBody(
    z.object({
      newName: z.string().min(6),
      newDescription: z.string().min(6).optional(),
    })
  ),
  (req, res, _next) => {
    // correctly typed based on zod schema
    console.log(req.body.newName);
    console.log(req.body.newDescription ?? "no new description provided");

    res.json({});
  }
);

// `express.Request.query` normally consists of string values, but sometimes
// we want something different. So here we will use zod's `transform` function
// together with `withParsedRequestQuery` to transform req.query
export const zodStringToBoolTransformation = z
  .string()
  .toLowerCase()
  .transform((x) => x === "true" || x === "1")
  .pipe(z.boolean());

app.get(
  "/api/test",
  withParsedRequestQuery(
    z.object({
      alwaysFail: zodStringToBoolTransformation.optional(),
    })
  ),
  (req, res, _next) => {
    // alwaysFail is `boolean | undefined`
    // if we used validateRequestQuery we would have gotten an error because
    // validate expects input to stay the same and not transform to bool
    if (req.query.alwaysFail) {
      return res.send(500).json({ msg: "scripted error" });
    }

    res.json({ msg: "all good" });
  }
);
```

## validateXXX vs withParsedXXX

**TL;DR** `validateXXX` does **not** modify the request. `withParsed` parses the requests and puts parsed data into `express.Request.{params,query,body}` fields.

Why is that a thing?

Because `express.Request.params` has type of `[key: string]: string`, a type values of which are always strings. But you don't always want your params to be strings. Sometimes it is useful for them to be a number, a UUID, etc.

Same thing with `express.Request.query` being either a string, an array of strings or a nested string / array.

**CAUTION**! Before modifying request make sure that none of the subsequent middlewares work with the affected data. This is not a problem for `express.Request.body` since it's type is `any`, but for `express.Request.params` and `express.Request.query` it could be an issue.

If your have a middleware that uses params / query but you want to type it anyway use zod's parse method directly. Example:

```typescript
import { sendError } from "@gfx687/express-zod-validator";

// app is an express app
app.get("/api/test", (req, res, _next) => {
  const parsed = z
    .object({
      alwaysFail: zodStringToBoolTransformation.optional(),
    })
    .safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, "query", parsed.error);
  }

  if (parsed.data.alwaysFail) {
    return res.send(500).json({ msg: "scripted error" });
  }

  res.json({ msg: "all good" });
});
```

## Error Format

Errors are returned in the [RFC9457 - Problem Details](https://datatracker.ietf.org/doc/html/rfc9457) format.

Error example:

```
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json; charset=utf-8

{
  "type": "https://datatracker.ietf.org/doc/html/rfc9110#name-422-unprocessable-content",
  "title": "Your request is not valid.",
  "detail": "Input is invalid, see 'errors' for more information.",
  "status": 422,
  "errors": [
    {
      "detail": "Required",
      "pointer": "#query/req"
    },
    {
      "detail": "Required",
      "pointer": "#body/name"
    },
    {
      "detail": "Required",
      "pointer": "#body/num"
    }
  ]
}
```

## API Reference

### `validateRequest`

```typescript
import { validateRequest } from "@gfx687/express-zod-validator";

// app is an express app
app.get(
  "/api/test/:id",
  validateRequest({
    params: z.object({
      id: z.string(),
    }),
    query: z.object({
      lang: z.string(),
      version: z.string(),
    }),
    body: z.object({
      newName: z.string().min(6),
      newAge: z.number(),
    }),
  }),
  (_req, res, _next) => {
    res.json({ msg: "all good" });
  }
);
```

### `validateRequestParams / validateRequestQuery / validateRequestBody`

All three are a short version of `validateRequest` when you only need to validate one aspect of the request. See [example](#example) above for usage.

### `withParsedRequest`

```typescript
import { validateRequest } from "@gfx687/express-zod-validator";

// app is an express app
app.get(
  "/api/test/:id",
  withParsedRequest({
    params: z.object({
      id: z.string().transform((x) => Number(x)),
    }),
    query: z.object({
      someFlag: z.string().transform((x) => x === "true"),
    }),
    body: z.object({
      newName: z.string().min(6),
      newAge: z.number().optional(),
    }),
  }),
  (_req, res, _next) => {
    res.json({ msg: "all good" });
  }
);
```

### `withParsedRequestParams / withParsedRequestQuery / withParsedRequestBody`

All three are a short version of `withParsedRequest` when you only need to parse one aspect of the request. See [example](#example) above for usage.

### `sendError` and `sendErrors`

Responds to the request with validation error. See [error example](#error-format) above.

```typescript
function sendError(
  res: express.Response,
  inputType: "params" | "query" | "body",
  zodError: z.ZodError<any>
);

function sendErrors(
  res: express.Response,
  zodErrors: ["params" | "query" | "body", z.ZodError<any>][]
);
```

## TODO

- allow users to customize error
- Idea for an alternative `withParsed` implementation - add new fields to the request `express.Request.{parsedParams,parsedQuery}` instead modifying.  
   Middleware wrapper instead of middleware chain for ease of typing `express.Request` without dealing with nullables and fields being accessible in non-validated endpoints?
