
import type { CropPreset } from './types';

export const APP_VERSION = 'ver. 20260119.01';

export const SCALE_PRESETS = [0.5, 1, 1.5, 2, 2.5];

export const CROP_PRESETS: readonly CropPreset[] = [
  { 
    id: 'mobile',
    label: 'Mobile',
    baseWidth: 1055, 
    baseHeight: 967,
    suffix: '_S'
  },
  { 
    id: 'desktop',
    label: 'Desktop',
    baseWidth: 1024, 
    baseHeight: 440,
    suffix: '_L'
  },
];

export const MAX_PREVIEW_WIDTH: number = 400;
