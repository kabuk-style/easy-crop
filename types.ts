
export interface CropPreset {
  id: string;
  label: string;
  baseWidth: number;
  baseHeight: number;
  suffix: string;
}

export interface CropTarget {
  id: string;
  width: number;
  height: number;
  suffix?: string;
  label?: string;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface ImageInfo {
  src: string;
  element: HTMLImageElement;
  width: number;
  height: number;
  name: string;
  size: number;
}
