export function pageName(title: string): string {
  return title
    .replace(/\s*[|｜]\s*Salesforce\s*$/i, '')
    .trim()
    .slice(0, 100);
}
