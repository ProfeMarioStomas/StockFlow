import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DeleteUserModal } from "../components/features/users/DeleteUserModal";
import { EditUserModal } from "../components/features/users/EditUserModal";
import { CreateUserModal } from "../components/features/users/CreateUserModal";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Pagination } from "../components/common/Pagination";
import { PageSpinner } from "../components/common/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "../components/common/Table";
import type { UserResponse } from "../models/user.model";
import { userService } from "../services/user.service";

type ModalState =
  | { type: "create" }
  | { type: "edit"; user: UserResponse }
  | { type: "delete"; user: UserResponse }
  | null;

const PAGE_SIZE = 20;

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", page],
    queryFn: () => userService.listUsers(page, PAGE_SIZE),
  });

  if (isLoading) return <PageSpinner />;

  const users = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Usuarios</h2>
            {meta && (
              <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                {meta.total} {meta.total === 1 ? "usuario" : "usuarios"} total
              </p>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={() => setModal({ type: "create" })}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Agregar Usuario
          </Button>
        </div>

        {/* Table */}
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Nombre</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Rol</TableHeader>
                <TableHeader>Estado</TableHeader>
                <TableHeader>Creado</TableHeader>
                <TableHeader className="text-right">Acciones</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableEmpty colSpan={6} message="No se encontraron usuarios." />
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "info" : "default"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "success" : "destructive"}>
                        {user.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ type: "edit", user })}
                          aria-label={`Edit ${user.name}`}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ type: "delete", user })}
                          aria-label={`Delete ${user.name}`}
                          className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrapper>

        {/* Pagination */}
        {meta && <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} />}
      </div>

      {/* Modals */}
      <CreateUserModal open={modal?.type === "create"} onClose={() => setModal(null)} />

      {modal?.type === "edit" && (
        <EditUserModal key={modal.user.id} user={modal.user} open onClose={() => setModal(null)} />
      )}

      {modal?.type === "delete" && (
        <DeleteUserModal user={modal.user} open onClose={() => setModal(null)} />
      )}
    </>
  );
}
