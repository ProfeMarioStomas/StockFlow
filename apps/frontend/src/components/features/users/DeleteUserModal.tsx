import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { UserResponse } from "../../../models/user.model";
import { userService } from "../../../services/user.service";
import { Button } from "../../common/Button";
import { Modal } from "../../common/Modal";

interface DeleteUserModalProps {
  user: UserResponse;
  open: boolean;
  onClose: () => void;
}

export function DeleteUserModal({ user, open, onClose }: DeleteUserModalProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setServerError(null);
    try {
      await userService.deleteUser(user.id);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    } catch {
      setServerError("No fue posible eliminar usuario. Por favor, inténtelo de nuevo.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar Usuario"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} loading={isDeleting}>
            Eliminar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-foreground)]">
          ¿Estás seguro de que quieres eliminar <span className="font-semibold">{user.name}</span>? Esta
          acción no se puede deshacer.
        </p>

        {serverError && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-destructive)]/30 bg-[var(--color-error-bg)] px-3 py-2 text-sm text-[var(--color-error-text)]"
          >
            {serverError}
          </div>
        )}
      </div>
    </Modal>
  );
}
