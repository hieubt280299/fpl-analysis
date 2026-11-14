/**
 * App icons for the PWA, generated from the SVG logo: `npm run icons` (writes PNGs to public/).
 * - "any" icons keep the logo's own rounded square.
 * - maskable (Android adaptive icons) and Apple touch icons need an opaque, full-bleed
 *   background with the logo inside the safe zone, so they get padding on the brand colour.
 */
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const LOGO_GREEN = '#2a6045';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.3,
      resizeOptions: { background: LOGO_GREEN },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0.3,
      resizeOptions: { background: LOGO_GREEN },
    },
  },
  images: ['public/favicon.svg'],
});
