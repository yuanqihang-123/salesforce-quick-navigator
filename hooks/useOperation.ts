import { useState } from 'react';
import { errorText } from '../utils/errorText';
export function useOperation(onSuccess?: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(operation: () => Promise<unknown>) {
    setError('');
    setBusy(true);
    try {
      await operation();
      await onSuccess?.();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}
