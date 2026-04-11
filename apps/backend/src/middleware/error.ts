import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppContext } from "../types";

/**
 * Global error handler — registered via app.onError().
 * Maps all unhandled errors to the standard error response shape.
 *
 * Log levels follow the convention:
 *   4xx → WARN (except 404/400 which are INFO)
 *   5xx → ERROR
 */
export const errorHandler: ErrorHandler<AppContext> = (err, c) => {
  const correlationId = c.get("correlationId");

  if (err instanceof HTTPException) {
    const status = err.status;
    const level = status >= 500 ? "error" : status === 422 ? "warn" : "info";

    console[level === "error" ? "error" : "warn"](
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        service: "api",
        correlationId,
        message: err.message,
        status,
      }),
    );

    return c.json(
      {
        error: {
          code: httpStatusToCode(status),
          message: err.message,
          details: [],
        },
      },
      status,
    );
  }

  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "api",
      correlationId,
      message: err instanceof Error ? err.message : "Unknown error",
    }),
  );

  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        details: [],
      },
    },
    500,
  );
};

function httpStatusToCode(status: number): string {
  const codes: Record<number, string> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "UNPROCESSABLE_ENTITY",
    500: "INTERNAL_SERVER_ERROR",
    502: "BAD_GATEWAY",
  };
  return codes[status] ?? "HTTP_ERROR";
}
