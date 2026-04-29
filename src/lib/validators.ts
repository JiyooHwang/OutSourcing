import { z } from "zod";

export const vendorSchema = z.object({
  name: z.string().min(1, "외주처명은 필수입니다."),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email("이메일 형식이 올바르지 않습니다.").optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  businessNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type VendorInput = z.infer<typeof vendorSchema>;

export const paymentSchema = z.object({
  vendorId: z.string().min(1, "외주처를 선택해주세요."),
  projectName: z.string().min(1, "프로젝트명은 필수입니다."),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().nonnegative("금액은 0 이상이어야 합니다."),
  currency: z.string().default("KRW"),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELED"]).default("PENDING"),
  invoiceDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  paidDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
