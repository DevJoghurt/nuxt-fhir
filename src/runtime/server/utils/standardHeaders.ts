import type { 
    NextFunction, 
    Request, 
    Response } from 'express';
import { useRuntimeConfig } from '#imports';

/**
 * Sets standard headers for all requests.
 * @param _req - The request.
 * @param res - The response.
 * @param next - The next handler.
 */
export function standardHeaders(_req: Request, res: Response, next: NextFunction): void {
    const { baseUrl } = useRuntimeConfig().fhir;
    // Disables all caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
  
    if (baseUrl.startsWith('https://')) {
      // Only connect to this site and subdomains via HTTPS for the next two years
      // and also include in the preload list
      res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
  
    // Set Content Security Policy
    // As an API server, block everything
    // See: https://stackoverflow.com/a/45631261/2051724
    res.set(
      'Content-Security-Policy',
      "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';"
    );
  
    // Disable browser features
    res.set(
      'Permission-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()'
    );
  
    // Never send the Referer header
    res.set('Referrer-Policy', 'no-referrer');
  
    // Prevent browsers from incorrectly detecting non-scripts as scripts
    res.set('X-Content-Type-Options', 'nosniff');
  
    // Disallow attempts to iframe site
    res.set('X-Frame-Options', 'DENY');
  
    // Block pages from loading when they detect reflected XSS attacks
    res.set('X-XSS-Protection', '1; mode=block');
    next();
  }