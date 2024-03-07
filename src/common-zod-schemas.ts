import { INVALID, z } from "zod";

export const zodStringToNumberSchema = z
  .string()
  .regex(/^\d+$/, "Invalid, expected Number or String containing Number")
  .transform(Number);

// export const zodStringToBoolSchema = z
//   .union([
//     z.literal("1"),
//     z.literal("0"),
//     z.literal("true"),
//     z.literal("false"),
//     z.literal("True"),
//     z.literal("False"),
//   ])
//   .transform((x) => x === "1" || x.toLowerCase() === "true");

export const zodStringToBoolSchema = z
  .string()
  .toLowerCase()
  .transform((x) => {
    if (x === "1" || x === "true") return true;
    else if (x === "0" || x === "false") return false;
    else return INVALID;
  })
  .pipe(
    z.boolean({ invalid_type_error: "Expected '1', '0', 'true' or 'false'" })
  );
