import { describe, it, expect } from 'vitest';
import { htmlToPlainText, truncateLines } from './html.js';

describe('HTML utilities', () => {
  describe('htmlToPlainText', () => {
    it('should convert br tags to newlines', () => {
      const html = 'Line 1<br>Line 2<br/>Line 3';
      expect(htmlToPlainText(html)).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should convert p tags to double newlines', () => {
      const html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
      expect(htmlToPlainText(html)).toBe('Paragraph 1\n\nParagraph 2');
    });

    it('should convert list items to bullet points', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      expect(htmlToPlainText(html)).toBe('• Item 1\n• Item 2');
    });

    it('should convert links to text with URL', () => {
      const html = 'Check out <a href="https://example.com">this link</a>!';
      expect(htmlToPlainText(html)).toBe('Check out this link [https://example.com]!');
    });

    it('should handle empty input', () => {
      expect(htmlToPlainText('')).toBe('');
    });

    it('should remove all other HTML tags', () => {
      const html = '<strong>Bold</strong> and <em>italic</em> text';
      expect(htmlToPlainText(html)).toBe('Bold and italic text');
    });

    it('should limit consecutive newlines', () => {
      const html = 'Text<br><br><br><br>More text';
      expect(htmlToPlainText(html)).toBe('Text\n\nMore text');
    });
  });

  describe('truncateLines', () => {
    it('should not truncate if within limit', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      expect(truncateLines(text, 5)).toBe(text);
    });

    it('should truncate and add ellipsis if over limit', () => {
      const text = 'Line 1\nLine 2\nLine 3\nLine 4';
      expect(truncateLines(text, 2)).toBe('Line 1\nLine 2...');
    });

    it('should handle single line text', () => {
      const text = 'This is a single line';
      expect(truncateLines(text, 1)).toBe(text);
    });
  });
});
