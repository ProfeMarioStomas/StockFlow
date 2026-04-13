import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, { error: "Nombre requerido" }).max(255),
  email: z.email({ error: "Ingrese un correo electrónico válido" }),
  password: z.string().min(8, { error: "La contraseña debe tener al menos 8 caracteres" }),
  role: z.enum(["admin", "seller"], { error: "Seleccione un rol válido" }),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, { error: "Nombre requerido" }).max(255).optional(),
  email: z.email({ error: "Ingrese un correo electrónico válido" }).optional(),
  role: z.enum(["admin", "seller"], { error: "Seleccione un rol válido" }).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

export type UserResponse = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "seller";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedUsersResponse = {
  data: UserResponse[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
