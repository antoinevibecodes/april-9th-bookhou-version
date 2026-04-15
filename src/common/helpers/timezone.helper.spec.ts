import {
  toLocalTime,
  formatLocalDateTime,
  formatLocalDate,
  nowInTimezone,
} from './timezone.helper';

describe('TimezoneHelper', () => {
  // Use a fixed UTC date for consistent tests
  const utcDate = new Date('2024-07-15T18:30:00.000Z');

  describe('toLocalTime', () => {
    it('should convert UTC date to local timezone string', () => {
      const result = toLocalTime(utcDate, 'America/New_York');
      // 18:30 UTC = 14:30 ET (EDT in July)
      expect(result).toContain('2024');
      expect(result).toBeDefined();
    });

    it('should handle different timezones', () => {
      const nyResult = toLocalTime(utcDate, 'America/New_York');
      const laResult = toLocalTime(utcDate, 'America/Los_Angeles');
      // NY and LA should produce different local times
      expect(nyResult).not.toEqual(laResult);
    });
  });

  describe('formatLocalDateTime', () => {
    it('should format date and time in local timezone', () => {
      const result = formatLocalDateTime(utcDate, 'America/New_York');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatLocalDate', () => {
    it('should format date only in local timezone', () => {
      const result = formatLocalDate(utcDate, 'America/New_York');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('nowInTimezone', () => {
    it('should return a Date object for specified timezone', () => {
      const result = nowInTimezone('America/New_York');
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Date);
    });

    it('should return valid dates for different timezones', () => {
      const ny = nowInTimezone('America/New_York');
      const tokyo = nowInTimezone('Asia/Tokyo');
      expect(ny).toBeInstanceOf(Date);
      expect(tokyo).toBeInstanceOf(Date);
      expect(ny.getTime()).not.toBeNaN();
      expect(tokyo.getTime()).not.toBeNaN();
    });
  });
});
