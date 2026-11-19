/**
 * Closed whitelist of web domains allowed for Nova's web search.
 *
 * Every source URL returned by the LLM is checked against this list.
 * Sources from domains not in this list are silently dropped — even
 * if the model proposed them.
 *
 * To add a domain: append it here and document the rationale.
 */
export const ALLOWED_DOMAINS: readonly string[] = [
  /* NASA */
  'nasa.gov',
  'science.nasa.gov',
  'jpl.nasa.gov',
  'ssd.jpl.nasa.gov',

  /* European Space Agency */
  'esa.int',

  /* European Southern Observatory */
  'eso.org',

  /* Centre national d'études spatiales (France) */
  'cnes.fr',

  /* International Astronomical Union */
  'iau.org',

  /* Observatoire de Paris */
  'obspm.fr',

  /* Space Telescope Science Institute */
  'stsci.edu',

  /* NOIRLab (US National Optical-Infrared Astronomy Research Laboratory) */
  'noirlab.edu',

  /* Harvard-Smithsonian Center for Astrophysics */
  'cfa.harvard.edu',

  /* Hubble / ESA-NASA Space Telescope */
  'spacetelescope.org',
];

/**
 * Check if a URL belongs to one of the allowed domains.
 * Returns true if the URL's hostname ends with an allowed domain.
 */
export function isAllowedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}
