declare module 'ssim.js' {
  export interface SSIMOptions {
    windowSize?: number;
    k1?: number;
    k2?: number;
    bitDepth?: number;
    downsample?: 'fast' | 'original' | false;
    maxSize?: number;
  }

  export interface SSIMResult {
    mssim: number;
    performance: number;
  }

  export function ssim(
    image1: { data: Uint8ClampedArray | Uint8Array | number[]; width: number; height: number },
    image2: { data: Uint8ClampedArray | Uint8Array | number[]; width: number; height: number },
    options?: SSIMOptions
  ): SSIMResult;

  export default function ssim(
    image1: { data: Uint8ClampedArray | Uint8Array | number[]; width: number; height: number },
    image2: { data: Uint8ClampedArray | Uint8Array | number[]; width: number; height: number },
    options?: SSIMOptions
  ): SSIMResult;
}
