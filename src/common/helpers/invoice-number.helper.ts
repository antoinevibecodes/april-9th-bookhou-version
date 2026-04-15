/**
 * Generate a sequential invoice number with zero-padding
 * Format: #00004037
 */
export function generateInvoiceNumber(sequence: number): string {
  return `#${String(sequence).padStart(8, '0')}`;
}
