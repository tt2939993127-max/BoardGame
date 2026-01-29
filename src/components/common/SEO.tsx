import React from 'react';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogType?: string;
    canonical?: string;
}

/**
 * SEO 组件 - 利用 React 19 的自动 Hoisting 功能
 * 可以在组件树的任何地方使用，React 会自动将其移动到 <head>
 */
export const SEO: React.FC<SEOProps> = ({
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogType = 'website',
    canonical,
}) => {
    const siteTitle = '桌游教学与联机平台';
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;

    return (
        <>
            <title>{fullTitle}</title>
            {description && <meta name="description" content={description} />}
            {keywords && <meta name="keywords" content={keywords} />}

            {/* Open Graph */}
            <meta property="og:title" content={ogTitle || fullTitle} />
            {ogDescription && <meta property="og:description" content={ogDescription} />}
            {ogImage && <meta property="og:image" content={ogImage} />}
            <meta property="og:type" content={ogType} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={ogTitle || fullTitle} />
            {ogDescription && <meta name="twitter:description" content={ogDescription} />}

            {/* Canonical */}
            {canonical && <link rel="canonical" href={canonical} />}
        </>
    );
};
