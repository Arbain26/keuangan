import { z } from "zod";

/**
 * Zod validation schema for financial transactions.
 * Conforms to HANDBOOK_CLEANCODE.md Section 3 & 6.3 (Validation & Data Integrity).
 */
export const TransactionSchema = z.object({
  type: z.enum(["pemasukan", "pengeluaran"], {
    errorMap: () => ({ message: "Tipe transaksi harus berupa pemasukan atau pengeluaran" })
  }),
  category: z
    .string({ required_error: "Kategori wajib diisi" })
    .trim()
    .min(1, "Kategori tidak boleh kosong")
    .max(50, "Kategori maksimal 50 karakter"),
  amount: z
    .number({ required_error: "Nominal wajib diisi", invalid_type_error: "Nominal harus berupa angka" })
    .positive("Nominal harus lebih besar dari 0")
    .max(10_000_000_000_000, "Nominal melebihi batas wajar"),
  date: z
    .string({ required_error: "Tanggal transaksi wajib diisi" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  description: z
    .string()
    .trim()
    .max(255, "Deskripsi maksimal 255 karakter")
    .optional()
    .default("")
});

/**
 * Validates raw transaction input and returns parsed data or field errors.
 * @param {unknown} rawData 
 * @returns {{ success: boolean, data?: any, error?: string, fieldErrors?: Record<string, string[]> }}
 */
export function validateTransaction(rawData) {
  const result = TransactionSchema.safeParse(rawData);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const firstErrorMessage = Object.values(fieldErrors)[0]?.[0] || "Validasi gagal";
    return {
      success: false,
      error: firstErrorMessage,
      fieldErrors
    };
  }
  return {
    success: true,
    data: result.data
  };
}
