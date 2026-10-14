import { validateSettings } from './validation';
import { storageService } from './storageService';
import { mergeBackup } from './mergeBackup';
import { linkIdentity } from './linkIdentity';
export type ImportMode = 'merge' | 'replace';
export function parseBackup(json: string) {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON file.');
  }
  return validateSettings(data);
}
export const importExportService = {
  async exportJson() {
    return JSON.stringify(await storageService.read(), null, 2);
  },
  async importJson(json: string, mode: ImportMode): Promise<{ imported: number; skipped: number }> {
    if (mode !== 'merge' && mode !== 'replace') throw new Error('Invalid import mode.');
    const backup = parseBackup(json);
    return storageService.mutate((settings) => {
      if (mode === 'replace') {
        const identities = new Set<string>();
        const quickLinks = backup.quickLinks.filter((link) => {
          const identity = linkIdentity(link);
          if (identities.has(identity)) return false;
          identities.add(identity);
          return true;
        });
        Object.assign(settings, { ...backup, quickLinks });
        return {
          imported: quickLinks.length,
          skipped: backup.quickLinks.length - quickLinks.length,
        };
      }
      return mergeBackup(settings, backup);
    });
  },
};
