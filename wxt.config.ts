import { defineConfig } from 'wxt';
import { SALESFORCE_PATTERNS } from './services/backgroundPatterns';
export default defineConfig({
  outDir: 'dist',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    minimum_chrome_version: '127',
    name: 'Salesforce Quick Navigator',
    description: 'Quick navigation for Salesforce environments.',
    permissions: ['activeTab', 'storage', 'contextMenus'],
    optional_permissions: ['bookmarks'],
    host_permissions: SALESFORCE_PATTERNS,
    content_security_policy: {
      extension_pages: "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none';",
    },
    action: { default_title: 'Salesforce Quick Navigator' },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Ctrl+Shift+Y', mac: 'Command+Shift+Y' },
      },
    },
    icons: { 16: 'icon/16.png', 48: 'icon/48.png', 128: 'icon/128.png' },
  },
});
