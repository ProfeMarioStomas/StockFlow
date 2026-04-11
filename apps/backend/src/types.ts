// Shared Hono context types.
// Import these wherever Hono's generics are needed.

export type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: "development" | "test" | "production";
};

export type Variables = {
  correlationId: string;
};

export type AppContext = {
  Bindings: Bindings;
  Variables: Variables;
};
