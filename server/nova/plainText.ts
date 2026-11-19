/**
 * Plain-text rule for Nova (lot 2).
 *
 * The server always sends plain text to the client: the assembly prompt asks
 * for it, and every child-facing string is cleaned here because small models
 * still write Markdown sometimes ("*Pouf !*"). The interface renders text as
 * is (no Markdown), so no asterisk, underscore emphasis, heading mark or
 * backtick may reach the child.
 *
 * The only asterisk kept is the one that belongs to an official object name
 * ("Sagittarius A*", "Sgr A*"), which is not formatting.
 */

const NAME_STAR_PLACEHOLDER = '\u0000STAR\u0000';
const NAME_STAR_RE = /\b(Sagittarius|Sgr)\s+A\*/gi;

export function toPlainText(input: string): string {
  if (!input) return '';
  let text = input.replace(/\r\n?/g, '\n');

  // Protect "Sagittarius A*" / "Sgr A*".
  text = text.replace(NAME_STAR_RE, (match) => match.slice(0, -1) + NAME_STAR_PLACEHOLDER);

  // Fenced code and inline code → keep the content.
  text = text.replace(/```[a-z]*\n?([\s\S]*?)```/gi, '$1');
  text = text.replace(/`([^`\n]*)`/g, '$1');

  // Images and links → their label.
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\((?:[^)]*)\)/g, '$1');

  // Headings, blockquotes, horizontal rules.
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '');
  text = text.replace(/^[ \t]{0,3}>[ \t]?/gm, '');
  text = text.replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, '');

  // List markers → a typographic bullet (or nothing for numbered lists keep "1.").
  text = text.replace(/^[ \t]*[-*+][ \t]+/gm, '• ');

  // Emphasis: **x**, __x__, *x*, _x_ (underscores only around words).
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, '$1');
  text = text.replace(/__([^_\n]+?)__/g, '$1');
  text = text.replace(/\*([^*\n]+?)\*/g, '$1');
  text = text.replace(/(^|[^\p{L}\p{N}_])_([^_\n]+?)_(?=$|[^\p{L}\p{N}_])/gu, '$1$2');

  // Any stray asterisk left (unbalanced emphasis) is dropped.
  text = text.replace(/\*/g, '');

  // HTML tags never reach the child either.
  text = text.replace(/<\/?[a-z][^>]*>/gi, '');

  text = text.split(NAME_STAR_PLACEHOLDER).join('*');

  // Tidy whitespace without destroying intentional line breaks.
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}
