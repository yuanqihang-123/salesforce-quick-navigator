import { PopupApp } from './popup/PopupApp';
import { SettingsApp } from './settings/SettingsApp';
import './style.css';
export function App({ mode }: { mode: 'popup' | 'options' }) {
  return mode === 'popup' ? <PopupApp /> : <SettingsApp />;
}
