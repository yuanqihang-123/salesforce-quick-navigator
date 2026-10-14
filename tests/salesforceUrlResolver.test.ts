import { describe, expect, it } from 'vitest';
import {
  parseOrg,
  extractRoute,
  resolveUrl,
  detectRouteType,
  isSalesforceUrl,
} from '../services/salesforceUrlResolver';
const sandbox = 'casecentral--pesdev';
const lightning = `https://${sandbox}.sandbox.lightning.force.com/`;
const setup = `https://${sandbox}.sandbox.my.salesforce-setup.com/`;
describe('Salesforce URL Resolver', () => {
  it('retains the complete org domain and detects environment', () => {
    expect(parseOrg(setup)).toEqual({
      orgDomain: sandbox,
      environmentName: 'pesdev',
      isSandbox: true,
      domainType: 'setup',
      hostname: `${sandbox}.sandbox.my.salesforce-setup.com`,
    });
  });
  it.each([
    [lightning, '/lightning/o/FlowRecord/home', lightning + 'lightning/o/FlowRecord/home'],
    [
      setup,
      '/lightning/r/FlowRecord/2aF85000003RucSEAS/view',
      lightning + 'lightning/r/FlowRecord/2aF85000003RucSEAS/view',
    ],
    [
      lightning,
      '/lightning/setup/CustomMetadata/page?address=%2F01IIW000003q5Bj%3Fsetupid%3DCustomMetadata',
      setup +
        'lightning/setup/CustomMetadata/page?address=%2F01IIW000003q5Bj%3Fsetupid%3DCustomMetadata',
    ],
    [
      'https://mycompany.lightning.force.com/',
      '/lightning/o/Account/list',
      'https://mycompany.lightning.force.com/lightning/o/Account/list',
    ],
    [
      'https://mycompany.my.salesforce-setup.com/',
      '/lightning/setup/CustomMetadata/home',
      'https://mycompany.my.salesforce-setup.com/lightning/setup/CustomMetadata/home',
    ],
    [
      setup,
      '/lightning/o/FlowRecord/home?filterName=Recent#test',
      lightning + 'lightning/o/FlowRecord/home?filterName=Recent#test',
    ],
  ])('resolves %s + %s', (current, route, expected) => {
    expect(resolveUrl(parseOrg(current), route)).toBe(expected);
  });
  it.each(['lightning.force.com', 'my.salesforce-setup.com', 'my.salesforce.com'])(
    'supports production and sandbox %s',
    (suffix) => {
      for (const prefix of ['', '.sandbox'])
        expect(parseOrg(`https://some-org${prefix}.${suffix}/`).isSandbox).toBe(Boolean(prefix));
    },
  );
  it('extracts without double encoding or saving origin', () => {
    const route = '/lightning/setup/Example/page?address=%2Fa%3Fb%3Dc#anchor';
    expect(extractRoute(setup.slice(0, -1) + route)).toBe(route);
    expect(extractRoute(route)).toBe(route);
  });
  it.each([
    'https://example.com/lightning/o/Account/list',
    'https://company.lightning.force.com.attacker.example/lightning/o/Account/list',
    'https://nested.company.lightning.force.com/lightning/o/Account/list',
    'http://company.lightning.force.com/lightning/o/Account/list',
    'https://user:password@company.lightning.force.com/lightning/o/Account/list',
    'https://company.lightning.force.com:8443/lightning/o/Account/list',
    'javascript:alert(1)',
  ])('rejects unsupported URL %s', (url) => {
    expect(() => extractRoute(url)).toThrow();
    expect(isSalesforceUrl(url)).toBe(false);
  });
  it.each([
    '//evil.example/path',
    '/lightning/o/Account/../../evil',
    '/lightning/o/Account/%2e%2e/../evil',
    '/lightning/o/Account\\evil',
    '/lightning/o/Account/list\n',
    '/lightning/o/Account/%5cfoo',
    '/lightning/o/Account/list?x=%0aevil',
    '/apex/foo',
    '/lightning/setup/',
    '/lightning/object/Account',
    '/lightning/o/Account/list?',
  ])('rejects unsafe route %s', (route) => {
    expect(() => detectRouteType(route)).toThrow();
  });
  it('rejects a forged org', () => {
    expect(() =>
      resolveUrl(
        { ...parseOrg(lightning), orgDomain: 'evil.example' },
        '/lightning/o/Account/list',
      ),
    ).toThrow();
  });
});
