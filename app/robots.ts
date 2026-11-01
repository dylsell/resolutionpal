import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/start', '/plan'] }, sitemap: 'https://resolutionpal.com/sitemap.xml' };
}
