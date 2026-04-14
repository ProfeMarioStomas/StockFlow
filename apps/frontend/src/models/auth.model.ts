import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "Escriba una dirección de correo electrónico válida" }),
  password: z.string().min(1, { error: "Contraseña requerida" }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
