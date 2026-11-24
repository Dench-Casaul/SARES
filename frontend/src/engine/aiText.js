/**
 * Turns AI-generated text into clean plain text for display and printing.
 *
 * Gemini tends to answer in Markdown ("**Status:**", "* item", "## Heading"). SARES
 * shows AI text as plain text, so those symbols would appear literally. This strips
 * the Markdown while keeping the structure readable: headings stay on their own
 * line, list items get a bullet, and numbered steps keep their numbers.
 *
 * Safe to run on text that is already plain, and on records saved before this
 * cleanup existed.
 */
export function formatAiText(text, { bullet = '•' } = {}) {
  if (typeof text !== 'string') return '';

  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((rawLine) => {
    let line = rawLine.replace(/\s+$/, '');

    // Headings ("## Next steps") → "Next steps"
    line = line.replace(/^\s{0,3}#{1,6}\s+/, '');
    // Horizontal rules ("---", "***") → blank line
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) return '';
    // Block quotes ("> text") → "text"
    line = line.replace(/^\s*>\s?/, '');

    // Bullets ("* item", "- item", "+ item") → "• item", keeping nesting indentation.
    const bulletMatch = /^(\s*)[*+-]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      const depth = Math.min(Math.floor(bulletMatch[1].replace(/\t/g, '  ').length / 2), 3);
      line = `${'  '.repeat(depth)}${bullet} ${bulletMatch[2]}`;
    }

    return line
      // Bold / italic markers: **text**, __text__, *text*, _text_
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1$2')
      .replace(/(^|[^\w_])_(?!\s)([^_\n]+?)_(?!\w)/g, '$1$2')
      // Inline code and links: `code` → code, [label](url) → label
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Any asterisks left over from unbalanced Markdown
      .replace(/\*+/g, '');
  });

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** True for description sources written by the AI (see violationDescription.js). */
export function isAiTextSource(source) {
  return source === 'ai_counselor_recommendation' || source === 'ai_assisted_solution';
}
