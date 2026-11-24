/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
declare module 'mp4box' {
  export interface MP4File {
    onReady?: (info: any) => void;
    onError?: (e: string) => void;
    appendBuffer(data: ArrayBuffer): number;
    flush(): void;
    boxes: any[];
  }

  export function createFile(): MP4File;
}
