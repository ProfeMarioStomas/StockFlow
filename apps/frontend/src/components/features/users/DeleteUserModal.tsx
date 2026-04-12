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
      setServerError("Failed to delete the user. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete User"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} loading={isDeleting}>
            Delete
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-foreground)]">
          Are you sure you want to delete <span className="font-semibold">{user.name}</span>? This
          action cannot be undone.
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
