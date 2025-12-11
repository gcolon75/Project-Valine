// src/utils/__tests__/formatTime.test.js
import { describe, it, expect } from 'vitest';
import { formatRelativeTime, groupNotificationsByDate } from '../formatTime';

describe('formatTime utilities', () => {
  describe('formatRelativeTime', () => {
    it('should return "just now" for very recent times', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
      
      const fiveSecondsAgo = new Date(now.getTime() - 5000);
      expect(formatRelativeTime(fiveSecondsAgo)).toBe('just now');
    });

    it('should format minutes correctly', () => {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      expect(formatRelativeTime(twoMinutesAgo)).toBe('2m ago');
      
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      expect(formatRelativeTime(thirtyMinutesAgo)).toBe('30m ago');
    });

    it('should format hours correctly', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
      
      const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);
      expect(formatRelativeTime(twentyHoursAgo)).toBe('20h ago');
    });

    it('should format days correctly', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
      
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(fiveDaysAgo)).toBe('5d ago');
    });

    it('should format weeks correctly', () => {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoWeeksAgo)).toBe('2w ago');
    });

    it('should format months correctly', () => {
      const now = new Date();
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoMonthsAgo)).toBe('2mo ago');
    });

    it('should format years correctly', () => {
      const now = new Date();
      const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoYearsAgo)).toBe('2y ago');
    });

    it('should handle string dates', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      expect(formatRelativeTime(oneHourAgo.toISOString())).toBe('1h ago');
    });
  });

  describe('groupNotificationsByDate', () => {
    it('should group notifications by date categories', () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const notifications = [
        { id: '1', createdAt: new Date(today.getTime() + 1000).toISOString() }, // Today
        { id: '2', createdAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString() }, // Yesterday (this week)
        { id: '3', createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() }, // 3 days ago (this week)
        { id: '4', createdAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() }, // 10 days ago (earlier)
      ];

      const grouped = groupNotificationsByDate(notifications);

      expect(grouped.today).toHaveLength(1);
      expect(grouped.today[0].id).toBe('1');
      
      expect(grouped.thisWeek).toHaveLength(2);
      expect(grouped.thisWeek.map(n => n.id)).toEqual(['2', '3']);
      
      expect(grouped.earlier).toHaveLength(1);
      expect(grouped.earlier[0].id).toBe('4');
    });

    it('should handle empty notifications array', () => {
      const grouped = groupNotificationsByDate([]);
      
      expect(grouped.today).toHaveLength(0);
      expect(grouped.thisWeek).toHaveLength(0);
      expect(grouped.earlier).toHaveLength(0);
    });

    it('should handle notifications with timestamp field', () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const notifications = [
        { id: '1', timestamp: new Date(today.getTime() + 1000).toISOString() }
      ];

      const grouped = groupNotificationsByDate(notifications);
      expect(grouped.today).toHaveLength(1);
    });
  });
});
