import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useState } from "react";
import { cn } from "../../../lib/cn";
import type { UserResponse } from "../../../models/user.model";
import { updateUserSchema } from "../../../models/user.model";
import { userService } from "../../../services/user.service";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Label } from "../../common/Label";
import { Modal } from "../../common/Modal";

interface EditUserModalProps {
  user: UserResponse;
  open: boolean;
  onClose: () => void;
}

export function EditUserModal({ user, open, onClose }: EditUserModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
    validators: { onSubmit: updateUserSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await userService.updateUser(user.id, value);
        await queryClient.invalidateQueries({ queryKey: ["users"] });
        onClose();
      } catch (err) {
        const axiosError = err as AxiosError<{ error: { message: string } }>;
        setServerError(
          axiosError.response?.data?.error?.message ?? "An unexpected error occurred.",
        );
      }
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit User"
      description={`Editing ${user.name}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="edit-user-form"
                loading={isSubmitting}
              >
                Save Changes
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="edit-user-form"
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
              label="Name"
              required
              value={field.state.value ?? ""}
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
              autoComplete="off"
              value={field.state.value ?? ""}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-role-${user.id}`} required>
                Role
              </Label>
              <select
                id={`edit-role-${user.id}`}
                value={field.state.value ?? "seller"}
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
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
              {field.state.meta.errors[0] && (
                <p role="alert" className="text-xs text-[var(--color-error-text)]">
                  {field.state.meta.errors[0].message}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="isActive">
          {(field) => (
            <div className="flex items-center gap-3">
              <input
                id={`edit-active-${user.id}`}
                type="checkbox"
                checked={field.state.value ?? true}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-[var(--color-input)] accent-[var(--color-accent)]"
              />
              <Label htmlFor={`edit-active-${user.id}`} className="cursor-pointer">
                Active account
              </Label>
            </div>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
