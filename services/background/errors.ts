export function reportBackgroundError(error: unknown): void {
  // No page URLs, title, session data or raw stacks in the service-worker log.
  console.warn(
    'Quick Navigator background action failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );
}
