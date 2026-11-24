/**
 * Parser CSV compatible con RFC-4180 que tolera espacios de alineación
 * alrededor de las comas (incluyendo espacios antes de comillas de apertura),
 * BOM UTF-8, saltos CRLF/LF y comillas escapadas `""`.
 */
export function parseCsv(content: string): string[][] {
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;

  while (i < text.length) {
    while (i < text.length && (text[i] === ' ' || text[i] === '\t')) {
      i++;
    }

    let field = '';
    if (i < text.length && text[i] === '"') {
      i++;
      while (i < text.length) {
        const ch = text[i]!;
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          field += ch;
          i++;
        }
      }
      while (i < text.length && (text[i] === ' ' || text[i] === '\t')) {
        i++;
      }
    } else {
      const start = i;
      while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        i++;
      }
      field = text.slice(start, i);
    }

    row.push(field.trim());

    if (i < text.length && text[i] === ',') {
      i++;
      if (i === text.length) {
        row.push('');
      }
      continue;
    }

    if (i < text.length && text[i] === '\r') {
      i++;
    }
    if (i < text.length && text[i] === '\n') {
      i++;
    }

    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
    row = [];
  }

  if (row.length > 0 && row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  return rows;
}
