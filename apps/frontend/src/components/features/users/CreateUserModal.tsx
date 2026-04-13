import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useState } from "react";
import { cn } from "../../../lib/cn";
import { createUserSchema } from "../../../models/user.model";
import { userService } from "../../../services/user.service";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Label } from "../../common/Label";
import { Modal } from "../../common/Modal";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "seller" as "admin" | "seller",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: createUserSchema as any },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await userService.createUser(value);
        await queryClient.invalidateQueries({ queryKey: ["users"] });
        handleClose();
      } catch (err) {
        const axiosError = err as AxiosError<{ error: { message: string } }>;
        setServerError(
          axiosError.response?.data?.error?.message ?? "Error desconocido.",
        );
      }
    },
  });

  function handleClose() {
    form.reset();
    setServerError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Agregar usuario"
      description="Crear un nuevo usuario del sistema con un rol."
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="create-user-form"
                loading={isSubmitting}
              >
                Crear Usuario
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="create-user-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        {serverError && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-destructive)]/30 bg-[var(--color-error-bg)] px-3 py-2 text-sm text-[var(--color-error-text)]"
          >
            {serverError}
          </div>
        )}

        <form.Field name="name">
          {(field) => (
            <Input
              label="Nombre"
              required
              placeholder="John Doe"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <Input
              label="Email"
              type="email"
              required
              placeholder="john@example.com"
              autoComplete="off"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <Input
              label="Contraseña"
              type="password"
              required
              placeholder="Min. 8 caracteres"
              autoComplete="new-password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} required>
                Rol
              </Label>
              <select
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value as "admin" | "seller")}
                aria-invalid={!!field.state.meta.errors[0]}
                className={cn(
                  "h-9 w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 text-sm",
                  "text-[var(--color-foreground)]",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1",
                  field.state.meta.errors[0]
                    ? "border-[var(--color-destructive)]"
                    : "border-[var(--color-input)] hover:border-[var(--color-secondary)]",
                )}
              >
                <option value="seller">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
              {field.state.meta.errors[0] && (
                <p role="alert" className="text-xs text-[var(--color-error-text)]">
                  {field.state.meta.errors[0].message}
                </p>
              )}
            </div>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
