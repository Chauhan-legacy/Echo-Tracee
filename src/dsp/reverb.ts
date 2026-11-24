/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { Finding } from '../types';
import { analyzeRoomAcousticsM4 } from './room/acoustics';

export interface RoomCharacterResult {
  rt60Sec: number;
  confidence: number;
  roomTypeEstimate: string;
  decayClass?: string;
  isHeavilyReverberant: boolean;
  findings: Finding[];
}

/**
 * Estimates room acoustic reverberation time (RT60) blindly from continuous audio.
 * Delegates to M4 Lundeby truncation, Schroeder backward integration, and bootstrap CI.
 */
export function analyzeRoomCharacter(
  channelData: Float32Array,
  sampleRate: number
): RoomCharacterResult {
  if (channelData.length === 0) {
    return {
      rt60Sec: 0.20,
      confidence: 0,
      roomTypeEstimate: 'Silent / Negligible Reverberation',
      decayClass: 'Dry Acoustic Space',
      isHeavilyReverberant: false,
      findings: [],
    };
  }

  const m4Res = analyzeRoomAcousticsM4(channelData, sampleRate);

  return {
    rt60Sec: m4Res.rt60Sec > 0 ? m4Res.rt60Sec : 0.20,
    confidence: m4Res.rt60Sec > 0 ? 0.88 : 0,
    roomTypeEstimate: m4Res.roomClass,
    decayClass: m4Res.roomClass,
    isHeavilyReverberant: m4Res.rt60Sec > 0.65,
    findings: m4Res.findings,
  };
}
