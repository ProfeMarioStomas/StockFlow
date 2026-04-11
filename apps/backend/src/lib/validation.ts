import { HTTPException } from "hono/http-exception";
import type { ZodError } from "zod";

type ValidationDetail = {
  field: string;
  message: string;
};

/**
 * Converts a ZodError into the standard 400 error response shape.
 * Throws an HTTPException with a `details` array attached.
 *
 * Usage (in controllers):
 *   const result = Schema.safeParse(body);
 *   if (!result.success) throwValidationError(result.error);
 */
export function throwValidationError(error: ZodError): never {
  const details: ValidationDetail[] = error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
  }));

  const exception = new HTTPException(400, { message: "Validation failed" }) as HTTPException & {
    details: ValidationDetail[];
  };
  exception.details = details;

  throw exception;
}
