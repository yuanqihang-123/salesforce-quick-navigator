import type { SalesforceOrg, SalesforceDomainType } from '../types';
const domains: [string, SalesforceDomainType][] = [
  ['lightning.force.com', 'lightning'],
  ['my.salesforce-setup.com', 'setup'],
  ['my.salesforce.com', 'my-domain'],
];
const unsafe = /[\u0000-\u0020\u007f\\]|%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i;
export function parseOrg(input: string): SalesforceOrg {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid Salesforce URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || unsafe.test(input))
    throw new Error('Invalid Salesforce URL. HTTPS is required.');
  for (const [suffix, domainType] of domains) {
    const match = url.hostname.match(
      new RegExp(
        `^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(\\.sandbox)?\\.${suffix.replaceAll('.', '\\.')}$`,
      ),
    );
    if (match?.[1] && match[1].length <= 63) {
      const orgDomain = match[1];
      return {
        orgDomain,
        isSandbox: !!match[2],
        domainType,
        hostname: url.hostname,
        environmentName: match[2]
          ? orgDomain.split('--').slice(1).join('--') || undefined
          : undefined,
      };
    }
  }
  throw new Error(
    'Unsupported Salesforce URL. Please enter a valid Salesforce URL or relative route.',
  );
}
function validateRelativeRoute(route: string): URL {
  if (route.length > 4096 || !route.startsWith('/') || route.startsWith('//') || unsafe.test(route))
    throw new Error('Invalid Route. Enter a supported Lightning route.');
  const url = new URL(route, 'https://route.invalid');
  // Reject dot segments and other parser transformations instead of silently changing a route.
  if (url.origin !== 'https://route.invalid' || url.pathname + url.search + url.hash !== route)
    throw new Error('Invalid Route.');
  return url;
}
export function detectRouteType(route: string): 'lightning' | 'setup' {
  const url = validateRelativeRoute(route);
  if (/^\/lightning\/setup\/[^/?#]+/.test(url.pathname)) return 'setup';
  if (/^\/lightning\/[or]\/[^/?#]+/.test(url.pathname)) return 'lightning';
  throw new Error('Invalid Route. Use /lightning/o/, /lightning/r/ or /lightning/setup/.');
}
export function extractRoute(input: string, routeDomain?: SalesforceDomainType): string {
  if (input.startsWith('/')) {
    if (routeDomain) validateRelativeRoute(input);
    else detectRouteType(input);
    return input;
  }
  parseOrg(input);
  const url = new URL(input);
  const route = url.pathname + url.search + url.hash;
  if (routeDomain) validateRelativeRoute(route);
  else detectRouteType(route);
  return route;
}
export function resolveUrl(
  org: SalesforceOrg,
  route: string,
  routeDomain?: SalesforceDomainType,
): string {
  const type = routeDomain ?? detectRouteType(route);
  validateRelativeRoute(route);
  // Verify even supplied org objects before using them to construct a hostname.
  const verified = parseOrg(`https://${org.hostname}/`);
  if (verified.orgDomain !== org.orgDomain || verified.isSandbox !== org.isSandbox)
    throw new Error('Invalid Salesforce Org.');
  const suffix =
    type === 'setup'
      ? 'my.salesforce-setup.com'
      : type === 'my-domain'
        ? 'my.salesforce.com'
        : 'lightning.force.com';
  const url = `https://${org.orgDomain}${org.isSandbox ? '.sandbox' : ''}.${suffix}${route}`;
  validateNavigationUrl(url, routeDomain);
  return url;
}
export function validateNavigationUrl(url: string, routeDomain?: SalesforceDomainType): void {
  parseOrg(url);
  extractRoute(url, routeDomain);
}
export function isSalesforceUrl(url: string): boolean {
  try {
    parseOrg(url);
    return true;
  } catch {
    return false;
  }
}
export const salesforceUrlResolver = {
  parseOrg,
  extractRoute,
  resolveUrl,
  detectRouteType,
  isSalesforceUrl,
};
