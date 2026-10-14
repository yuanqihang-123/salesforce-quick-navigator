import { useEffect, useState } from 'react';
import type { SalesforceOrg } from '../types';
import { parseOrg, extractRoute } from '../services/salesforceUrlResolver';
import { tabService } from '../services/tabService';
import { environmentService } from '../services/environmentService';
import { errorText } from '../utils/errorText';
export function useCurrentOrg() {
  const [org, setOrg] = useState<SalesforceOrg>();
  const [ready, setReady] = useState(false);
  const [supportedRoute, setSupportedRoute] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void tabService
      .getActiveTab()
      .then(async (tab) => {
        if (!active) return;
        try {
          setOrg(parseOrg(tab.url));
        } catch {
          return;
        }
        try {
          extractRoute(tab.url);
          setSupportedRoute(true);
        } catch {
          setSupportedRoute(false);
        }
        await environmentService.remember(tab.url);
      })
      .catch((failure) => {
        if (active) setError(errorText(failure));
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return { org, ready, supportedRoute, error };
}
