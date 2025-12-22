/**
 * Get the correct path for assets in both development and production Electron builds
 * In development, assets are served from the public folder at root
 * In production, assets are bundled in the app's resources
 */
export function getAssetPath(assetName: string): string {
  // Check if we're in Electron production environment
  const isElectronProd = typeof window !== 'undefined' && 
    window.location.protocol === 'file:';
  
  if (isElectronProd) {
    // In production Electron, assets are relative to the HTML file
    return `./${assetName}`;
  }
  
  // In development or web, use absolute path from public folder
  return `/${assetName}`;
}

/**
 * Get logo path - convenience function for the main logo
 */
export function getLogoPath(): string {
  return getAssetPath('logo-gold.png');
}
