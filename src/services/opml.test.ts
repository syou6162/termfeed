import { describe, it, expect } from 'vitest';
import { OPMLService } from './opml.js';
import type { Feed } from '@/types';

describe('OPMLService', () => {
  const mockFeeds: Feed[] = [
    {
      id: 1,
      url: 'https://example.com/feed1.rss',
      title: 'Example Feed 1',
      rating: 0,
      description: 'First test feed',
      last_updated_at: new Date('2025-01-01'),
      created_at: new Date('2025-01-01'),
    },
    {
      id: 2,
      url: 'https://example.com/feed2.xml',
      title: 'Feed with <special> & characters',
      description: 'Test "quotes" and \'apostrophes\'',
      rating: 0,
      last_updated_at: new Date('2025-01-01'),
      created_at: new Date('2025-01-01'),
    },
  ];

  describe('exportToOPML', () => {
    it('should export feeds to valid OPML format', () => {
      const opml = OPMLService.exportToOPML(mockFeeds);

      expect(opml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(opml).toContain('<opml version="2.0">');
      expect(opml).toContain('<head>');
      expect(opml).toContain('<title>termfeed subscriptions</title>');
      expect(opml).toContain('</head>');
      expect(opml).toContain('<body>');
      expect(opml).toContain('</body>');
      expect(opml).toContain('</opml>');
    });

    it('should include all feed URLs', () => {
      const opml = OPMLService.exportToOPML(mockFeeds);

      expect(opml).toContain('xmlUrl="https://example.com/feed1.rss"');
      expect(opml).toContain('xmlUrl="https://example.com/feed2.xml"');
    });

    it('should escape XML special characters', () => {
      const opml = OPMLService.exportToOPML(mockFeeds);

      expect(opml).toContain('title="Feed with &lt;special&gt; &amp; characters"');
      expect(opml).not.toContain('<special>');
      expect(opml).not.toContain('& characters');
    });

    it('should handle empty feed list', () => {
      const opml = OPMLService.exportToOPML([]);

      expect(opml).toContain('<body>');
      expect(opml).toContain('</body>');
      expect(opml).not.toContain('<outline');
    });
  });

  describe('parseOPML', () => {
    it('should parse valid OPML and extract URLs', () => {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Test</title>
  </head>
  <body>
    <outline text="Feed 1" xmlUrl="https://example.com/feed1.rss" />
    <outline text="Feed 2" xmlUrl="https://example.com/feed2.xml" />
  </body>
</opml>`;

      const urls = OPMLService.parseOPML(opml);

      expect(urls).toEqual(['https://example.com/feed1.rss', 'https://example.com/feed2.xml']);
    });

    it('should handle escaped XML characters', () => {
      const opml = `<opml>
  <body>
    <outline xmlUrl="https://example.com/feed?param=1&amp;other=2" />
  </body>
</opml>`;

      const urls = OPMLService.parseOPML(opml);

      expect(urls).toEqual(['https://example.com/feed?param=1&other=2']);
    });

    it('should ignore invalid URLs', () => {
      const opml = `<opml>
  <body>
    <outline xmlUrl="https://example.com/valid.rss" />
    <outline xmlUrl="not-a-url" />
    <outline xmlUrl="ftp://example.com/invalid.rss" />
    <outline xmlUrl="" />
  </body>
</opml>`;

      const urls = OPMLService.parseOPML(opml);

      expect(urls).toEqual(['https://example.com/valid.rss']);
    });

    it('should handle empty OPML', () => {
      const opml = `<opml><body></body></opml>`;
      const urls = OPMLService.parseOPML(opml);

      expect(urls).toEqual([]);
    });
  });

  describe('exportToText', () => {
    it('should export feeds as one URL per line', () => {
      const text = OPMLService.exportToText(mockFeeds);
      const lines = text.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('https://example.com/feed1.rss');
      expect(lines[1]).toBe('https://example.com/feed2.xml');
    });

    it('should handle empty feed list', () => {
      const text = OPMLService.exportToText([]);

      expect(text).toBe('');
    });
  });

  describe('parseText', () => {
    it('should parse text file with one URL per line', () => {
      const text = `https://example.com/feed1.rss
https://example.com/feed2.xml
https://example.com/feed3.atom`;

      const urls = OPMLService.parseText(text);

      expect(urls).toEqual([
        'https://example.com/feed1.rss',
        'https://example.com/feed2.xml',
        'https://example.com/feed3.atom',
      ]);
    });

    it('should ignore empty lines and comments', () => {
      const text = `https://example.com/feed1.rss

# This is a comment
https://example.com/feed2.xml
  
  https://example.com/feed3.atom  `;

      const urls = OPMLService.parseText(text);

      expect(urls).toEqual([
        'https://example.com/feed1.rss',
        'https://example.com/feed2.xml',
        'https://example.com/feed3.atom',
      ]);
    });

    it('should filter out invalid URLs', () => {
      const text = `https://example.com/valid.rss
not-a-url
ftp://example.com/invalid.rss
http://example.com/also-valid.xml`;

      const urls = OPMLService.parseText(text);

      expect(urls).toEqual(['https://example.com/valid.rss', 'http://example.com/also-valid.xml']);
    });
  });

  describe('detectFormat', () => {
    it('should detect OPML format from .opml extension', () => {
      expect(OPMLService.detectFormat('feeds.opml')).toBe('opml');
      expect(OPMLService.detectFormat('FEEDS.OPML')).toBe('opml');
      expect(OPMLService.detectFormat('/path/to/feeds.opml')).toBe('opml');
    });

    it('should detect OPML format from .xml extension', () => {
      expect(OPMLService.detectFormat('feeds.xml')).toBe('opml');
      expect(OPMLService.detectFormat('FEEDS.XML')).toBe('opml');
    });

    it('should default to text format for other extensions', () => {
      expect(OPMLService.detectFormat('feeds.txt')).toBe('text');
      expect(OPMLService.detectFormat('feeds')).toBe('text');
      expect(OPMLService.detectFormat('feeds.csv')).toBe('text');
    });
  });

  describe('detectFormatFromContent', () => {
    it('should detect OPML from XML declaration', () => {
      const content = `<?xml version="1.0"?>
<opml version="2.0">`;

      expect(OPMLService.detectFormatFromContent(content)).toBe('opml');
    });

    it('should detect OPML from opml tag', () => {
      const content = `  <opml version="2.0">
  <head>`;

      expect(OPMLService.detectFormatFromContent(content)).toBe('opml');
    });

    it('should default to text for non-XML content', () => {
      const content = `https://example.com/feed1.rss
https://example.com/feed2.xml`;

      expect(OPMLService.detectFormatFromContent(content)).toBe('text');
    });

    it('should handle whitespace correctly', () => {
      const xmlContent = `  
      <?xml version="1.0"?>`;
      const textContent = `  
      https://example.com/feed.rss`;

      expect(OPMLService.detectFormatFromContent(xmlContent)).toBe('opml');
      expect(OPMLService.detectFormatFromContent(textContent)).toBe('text');
    });
  });
});
