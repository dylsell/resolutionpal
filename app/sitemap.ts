import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://resolutionpal.com', changeFrequency: 'monthly', priority: 1 }, { url: 'https://resolutionpal.com/privacy', changeFrequency: 'yearly', priority: 0.2 }];
}
