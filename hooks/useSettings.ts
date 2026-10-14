import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultSettings } from '../types';
import { storageService } from '../services/storageService';
import { errorText } from '../utils/errorText';
export function useSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await storageService.read();
      if (request === sequence.current) setSettings(result);
    } catch (failure) {
      if (request === sequence.current) setError(errorText(failure));
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      void refresh();
    });
    void refresh();
    return () => {
      unsubscribe();
      sequence.current++;
    };
  }, [refresh]);
  return { settings, loading, error, refresh, setError };
}
