import React, { useEffect } from 'react';
import { siteConfig } from '../../config/site';

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  type?: 'website' | 'article';
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description = 'The Inspire Business Academy - Physical Academy and Online LMS in Sadiqabad, Punjab, Pakistan. Mission: Hunarmand Pakistan.',
  canonicalPath = '',
  type = 'website',
}) => {
  const fullTitle = title
    ? `${title} | ${siteConfig.name}`
    : `${siteConfig.name} - Physical Academy & Online LMS | Sadiqabad`;

  useEffect(() => {
    // 1. Update Title
    document.title = fullTitle;

    // 2. Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // 3. Update Open Graph Title & Description
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    let ogType = document.querySelector('meta[property="og:type"]');
    if (ogType) ogType.setAttribute('content', type);

    // 4. Update Canonical Link
    const baseUrl = siteConfig.publicSiteUrl || window.location.origin;
    const canonicalUrl = `${baseUrl}${canonicalPath}`;
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);
  }, [fullTitle, description, canonicalPath, type]);

  return null;
};
