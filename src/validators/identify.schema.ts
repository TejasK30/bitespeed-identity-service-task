import { z } from "zod"

export const identifyRequestSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email format")
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    phoneNumber: z
      .union([z.string(), z.number()])
      .nullable()
      .optional()
      .transform((v) => {
        if (v === null || v === undefined) return null
        return String(v)
      }),
  })
  .refine((data) => data.email != null || data.phoneNumber != null, {
    message: "At least one of email or phoneNumber must be provided",
  })

export type IdentifyRequest = z.infer<typeof identifyRequestSchema>
