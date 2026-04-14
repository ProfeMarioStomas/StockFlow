import { useForm } from "@tanstack/react-form";
import type { AxiosError } from "axios";
import { useState } from "react";
import { changePasswordSchema } from "../../../models/user.model";
import type { UserResponse } from "../../../models/user.model";
import { userService } from "../../../services/user.service";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Modal } from "../../common/Modal";

interface ChangePasswordModalProps {
  user: UserResponse;
  open: boolean;
  onClose: () => void;
}

type ServerError = {
  message: string;
  details?: { field: string; message: string }[];
};

export function ChangePasswordModal({ user, open, onClose }: ChangePasswordModalProps) {
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: changePasswordSchema as any },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await userService.changePassword(user.id, value);
        onClose();
      } catch (err) {
        const axiosError = err as AxiosError<{
          error: { message: string; details?: { field: string; message: string }[] };
        }>;
        const error = axiosError.response?.data?.error;
        const details = error?.details?.length ? error.details : undefined;
        setServerError({
          message: error?.message ?? "Error desconocido.",
          ...(details && { details }),
        });
      }
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cambiar Contraseña"
      description={`Cambiando contraseña de ${user.name}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="change-password-form"
                loading={isSubmitting}
              >
                Guardar Contraseña
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="change-password-form"
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
            <p>{serverError.message}</p>
            {serverError.details && (
              <ul className="mt-1 list-inside list-disc">
                {serverError.details.map((d, i) => (
                  <li key={i}>
                    <span className="font-medium">{d.field}</span>: {d.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form.Field name="currentPassword">
          {(field) => (
            <Input
              label="Contraseña actual"
              type="password"
              required
              autoComplete="current-password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="newPassword">
          {(field) => (
            <Input
              label="Nueva contraseña"
              type="password"
              required
              autoComplete="new-password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
