import { setAssetsBaseUrl } from './src/core/AssetLoader';

// Tests should be deterministic and not depend on external/CDN base URLs.
setAssetsBaseUrl('/assets');
