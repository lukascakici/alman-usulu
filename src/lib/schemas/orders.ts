import { z } from "zod";

export const CartItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  qty: z.number().int().min(1).max(20),
  modifier_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().max(200).optional(),
});

export const SubmitOrderInputSchema = z.object({
  tableSessionId: z.string().uuid(),
  items: z.array(CartItemSchema).min(1).max(30),
});

export type CartItemPayload = z.infer<typeof CartItemSchema>;
export type SubmitOrderInput = z.infer<typeof SubmitOrderInputSchema>;
