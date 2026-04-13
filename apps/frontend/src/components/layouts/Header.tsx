import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { authService } from "../../services/auth.service";
import { Button } from "../common/Button";

interface HeaderProps {
  title?: string | undefined;
}

export function Header({ title }: HeaderProps) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      queryClient.clear();
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6">
      {title ? (
        <h1 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h1>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-3">
        {user && <span className="text-xs text-[var(--color-muted-foreground)]">{user.email}</span>}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          aria-label="Log out"
          className="gap-1.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
          Cerrar Sesión
        </Button>
      </div>
    </header>
  );
}
