import { z } from "zod";

export const authValidation = z.object({
    email: z
        .string()
        .min(1, "The email field is required.")
        .email("The email field is invalid."),

    password: z
        .string()
        .min(1, "The password field is required.")
});