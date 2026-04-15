import { generateInvoiceNumber } from './invoice-number.helper';

describe('InvoiceNumberHelper', () => {
  it('should generate zero-padded invoice number', () => {
    expect(generateInvoiceNumber(1)).toBe('#00000001');
    expect(generateInvoiceNumber(42)).toBe('#00000042');
    expect(generateInvoiceNumber(4037)).toBe('#00004037');
  });

  it('should handle large numbers', () => {
    expect(generateInvoiceNumber(99999999)).toBe('#99999999');
    expect(generateInvoiceNumber(100000000)).toBe('#100000000');
  });

  it('should handle zero', () => {
    expect(generateInvoiceNumber(0)).toBe('#00000000');
  });
});
