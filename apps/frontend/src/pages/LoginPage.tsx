import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { PageSpinner } from "../components/common/Spinner";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { loginSchema } from "../models/auth.model";
import { authService } from "../services/auth.service";

export function LoginPage() {
  const { data: user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await authService.login(value);
        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        navigate("/", { replace: true });
      } catch {
        setServerError("Invalid email or password. Please try again.");
      }
    },
  });

  if (isLoading) return <PageSpinner />;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="font-mono text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
            Stock<span className="text-[var(--color-accent)]">Flow</span>
          </span>
          <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            noValidate
            className="flex flex-col gap-5"
          >
            {/* Server-level error */}
            {serverError && (
              <div
                role="alert"
                className="rounded-[var(--radius-md)] border border-[var(--color-destructive)]/30 bg-[var(--color-error-bg)] px-3 py-2 text-sm text-[var(--color-error-text)]"
              >
                {serverError}
              </div>
            )}

            {/* Email */}
            <form.Field name="email">
              {(field) => (
                <Input
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  error={field.state.meta.errors[0]?.message}
                />
              )}
            </form.Field>

            {/* Password */}
            <form.Field name="password">
              {(field) => (
                <Input
                  label="Password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  error={field.state.meta.errors[0]?.message}
                />
              )}
            </form.Field>

            {/* Submit */}
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isSubmitting}
                  className="w-full"
                >
                  Sign in
                </Button>
              )}
            </form.Subscribe>
          </form>
        </div>
      </div>
    </div>
  );
}
