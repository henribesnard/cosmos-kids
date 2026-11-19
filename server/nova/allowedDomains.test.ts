import { describe, expect, it } from 'vitest';
import { isAllowedDomain, ALLOWED_DOMAINS } from './allowedDomains';

describe('ALLOWED_DOMAINS', () => {
  it('contains all required domains', () => {
    const required = [
      'nasa.gov', 'science.nasa.gov', 'jpl.nasa.gov', 'ssd.jpl.nasa.gov',
      'esa.int', 'eso.org', 'cnes.fr', 'iau.org', 'obspm.fr',
      'stsci.edu', 'noirlab.edu', 'cfa.harvard.edu', 'spacetelescope.org',
    ];
    for (const domain of required) {
      expect(ALLOWED_DOMAINS).toContain(domain);
    }
  });
});

describe('isAllowedDomain', () => {
  it('accepts exact domain matches', () => {
    expect(isAllowedDomain('https://nasa.gov/page')).toBe(true);
    expect(isAllowedDomain('https://esa.int/article')).toBe(true);
    expect(isAllowedDomain('https://iau.org/')).toBe(true);
  });

  it('accepts subdomains of allowed domains', () => {
    expect(isAllowedDomain('https://www.nasa.gov/article')).toBe(true);
    expect(isAllowedDomain('https://science.nasa.gov/mars')).toBe(true);
    expect(isAllowedDomain('https://ssd.jpl.nasa.gov/horizons')).toBe(true);
    expect(isAllowedDomain('https://www.esa.int/page')).toBe(true);
    expect(isAllowedDomain('https://hubblesite.stsci.edu')).toBe(true);
  });

  it('rejects domains not in the whitelist', () => {
    expect(isAllowedDomain('https://wikipedia.org/space')).toBe(false);
    expect(isAllowedDomain('https://reddit.com/r/space')).toBe(false);
    expect(isAllowedDomain('https://evil-nasa.gov.fake.com')).toBe(false);
    expect(isAllowedDomain('https://google.com')).toBe(false);
    expect(isAllowedDomain('https://example.com')).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(isAllowedDomain('not-a-url')).toBe(false);
    expect(isAllowedDomain('')).toBe(false);
  });

  it('handles URLs with paths and query strings', () => {
    expect(isAllowedDomain('https://science.nasa.gov/solar-system/planets/saturn?lang=en')).toBe(true);
    expect(isAllowedDomain('https://jpl.nasa.gov/missions/mars-2020/#overview')).toBe(true);
  });
});
