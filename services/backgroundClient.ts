import { browser } from 'wxt/browser';
import type { BackgroundRequest, BackgroundResponse } from '../types/messages';

export async function requestBackground(
  message: BackgroundRequest,
  fallback: string,
): Promise<void> {
  const response = (await browser.runtime.sendMessage(message)) as BackgroundResponse | undefined;
  if (!response?.ok) throw new Error(response?.error || fallback);
}
