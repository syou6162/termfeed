export function convertHtmlToText(html: string): string {
  if (!html) {
    return '';
  }

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<\/?(p|div|br|h[1-6]|li|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + '...';
}

export function formatSummary(htmlContent: string | undefined, maxLength: number = 150): string {
  if (!htmlContent) {
    return '';
  }

  const plainText = convertHtmlToText(htmlContent);
  return truncateText(plainText, maxLength);
}
