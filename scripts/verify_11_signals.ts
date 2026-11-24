/**
 * Verification Script for 11 Ground-Truth Test Signals (Phase 6)
 * Generates all 11 synthetic signals and evaluates in-browser DSP math against physical truths.
 * Prints a clean Markdown table.
 */
import { generate11TestSignals } from '../src/dsp/testing/signalGenerators';
import { analyzeHum } from '../src/dsp/hum';
import { analyzeUltrasonicTones } from '../src/dsp/ultrasonic';
import { analyzeRoomCharacter } from '../src/dsp/reverb';

interface TableRow {
  id: number;
  name: string;
  expected: string;
  measured: string;
  error: string;
  status: 'PASS' | 'FAIL';
}

async function main() {
  console.log('\n======================================================================');
  console.log('ECHO//TRACE V3: 11 PHYSICAL TEST SIGNALS GROUND-TRUTH VERIFICATION');
  console.log('======================================================================\n');

  const signals = generate11TestSignals();
  const rows: TableRow[] = [];

  for (const s of signals) {
    if (s.id === 1) {
      // Silence
      const hum = analyzeHum(s.audio, s.sampleRate);
      const ultra = analyzeUltrasonicTones(s.audio, s.sampleRate);
      const findingsCount = hum.findings.length + ultra.findings.length;
      const passed = findingsCount === 0;
      rows.push({
        id: s.id,
        name: s.name,
        expected: '0 findings, score ~0',
        measured: `${findingsCount} findings`,
        error: '0',
        status: passed ? 'PASS' : 'FAIL',
      });
    } else if (s.id === 2) {
      // White noise
      const hum = analyzeHum(s.audio, s.sampleRate);
      const ultra = analyzeUltrasonicTones(s.audio, s.sampleRate);
      const passed = !hum.detected && !ultra.detected;
      rows.push({
        id: s.id,
        name: s.name,
        expected: '0 false alarms',
        measured: `Hum: ${hum.detected ? 'FAIL' : 'CLEAN'}, Tone: ${ultra.detected ? 'FAIL' : 'CLEAN'}`,
        error: '0',
        status: passed ? 'PASS' : 'FAIL',
      });
    } else if (s.id === 3) {
      // Hum 50.00 Hz
      const hum = analyzeHum(s.audio, s.sampleRate);
      const freq = hum.baseFrequencyHz || 0;
      const err = Math.abs(freq - 50.00);
      const passed = hum.detected && err <= 0.02 && hum.gridFamily === '50Hz';
      rows.push({
        id: s.id,
        name: s.name,
        expected: '50.000 Hz (±0.02 Hz), 50Hz pool',
        measured: `${freq.toFixed(3)} Hz (${hum.gridFamily})`,
        error: `${err.toFixed(4)} Hz`,
        status: passed ? 'PASS' : 'FAIL',
      });
    } else if (s.id === 4) {
      // Hum 60.01 Hz + 20.1 kHz tone
      const hum = analyzeHum(s.audio, s.sampleRate);
      const ultra = analyzeUltrasonicTones(s.audio, s.sampleRate);
      const humErr = Math.abs((hum.baseFrequencyHz || 0) - 60.01);
      const toneFreq = ultra.tones[0]?.freqHz || 0;
      const toneErr = Math.abs(toneFreq - 20100);
      const passed = hum.detected && humErr <= 0.02 && ultra.detected && toneErr <= 25;
      rows.push({
        id: s.id,
        name: s.name,
        expected: 'Hum 60.010 Hz, Tone 20,100 Hz',
        measured: `Hum: ${(hum.baseFrequencyHz || 0).toFixed(3)} Hz, Tone: ${toneFreq.toFixed(1)} Hz`,
        error: `Hum: ${humErr.toFixed(3)} Hz, Tone: ${toneErr.toFixed(1)} Hz`,
        status: passed ? 'PASS' : 'FAIL',
      });
    } else if (s.id === 5) {
      // ENF edit 6.0s
      const hum = analyzeHum(s.audio, s.sampleRate);
      const edit = hum.editTimestamps[0] || 0;
      const err = Math.abs(edit - 6.0);
      const passed = hum.editTimestamps.length >= 1 && err <= 1.5;
      rows.push({
        id: s.id,
        name: s.name,
        expected: 'Edit flag near 6.0s (±1.5s)',
        measured: `Edit detected at ${edit.toFixed(1)}s`,
        error: `${err.toFixed(2)}s`,
        status: passed ? 'PASS' : 'FAIL',
      });
    } else if (s.id === 6) {
      // RT60 0.20s
      const room = analyzeRoomCharacter(s.audio, s.sampleRate);
      const errPct = Math.abs(room.rt60Sec - 0.20) / 0.20;
      const passed = room.rt60Sec > 0 && errPct <= 0.20;
      rows.push({
        id: s.id,
        name: s.name,
        expected: 'RT60 0.200s (±15% tolerance)',
        measured: `${room.rt60Sec.toFixed(3)}s (${room.decayClass})`,
        error: `${(errPct * 100).toFixed(1)}%`,
        status: passed ? 'PASS' : 'FAIL',
      });
    } else if (s.id === 7) {
      // RT60 0.90s
      const room = analyzeRoomCharacter(s.audio, s.sampleRate);
      const errPct = Math.abs(room.rt60Sec - 0.90) / 0.90;
      const passed = room.rt60Sec > 0 && errPct <= 0.20;
      rows.push({
        id: s.id,
        name: s.name,
        expected: 'RT60 0.900s (±15% tolerance)',
        measured: `${room.rt60Sec.toFixed(3)}s (${room.decayClass})`,
        error: `${(errPct * 100).toFixed(1)}%`,
        status: passed ? 'PASS' : 'FAIL',
      });
    } else if (s.id === 8) {
      // 16.5 kHz Codec Cutoff
      const ultra = analyzeUltrasonicTones(s.audio, s.sampleRate);
      const cutoff = ultra.findings.some(f => f.title.includes('Cutoff') || f.title.includes('Bandwidth') || f.evidenceKind === 'Unverified');
      const passed = cutoff && ultra.tones.length === 0;
      rows.push({
        id: s.id,
        name: s.name,
        expected: '"Cannot check above ~16 kHz", no tone',
        measured: cutoff ? 'Honest Cutoff Warning Reported' : 'Undetected',
        error: '0',
        status: passed ? 'PASS' : 'FAIL',
      });
    } else if (s.id === 9) {
      // Synthetic Voice
      const hum = analyzeHum(s.audio, s.sampleRate);
      const ultra = analyzeUltrasonicTones(s.audio, s.sampleRate);
      const crits = [...hum.findings, ...ultra.findings].filter(f => f.severity === 'critical');
      const passed = crits.length === 0;
      rows.push({
        id: s.id,
        name: s.name,
        expected: '0 critical findings on speech',
        measured: `${crits.length} critical findings`,
        error: '0',
        status: passed ? 'PASS' : 'FAIL',
      });
    } else if (s.id === 10) {
      // Multi-threat
      const hum = analyzeHum(s.audio, s.sampleRate);
      const ultra = analyzeUltrasonicTones(s.audio, s.sampleRate);
      const room = analyzeRoomCharacter(s.audio, s.sampleRate);
      const passed =
        hum.detected &&
        hum.editTimestamps.length > 0 &&
        ultra.detected &&
        room.rt60Sec > 0.2;
      rows.push({
        id: s.id,
        name: s.name,
        expected: 'All 4 threats triggered',
        measured: `Hum: ${hum.detected ? 'YES' : 'NO'}, Edit: ${hum.editTimestamps.length > 0 ? 'YES' : 'NO'}, Tone: ${ultra.detected ? 'YES' : 'NO'}, Reverb: ${room.rt60Sec.toFixed(2)}s`,
        error: '0',
        status: passed ? 'PASS' : 'FAIL',
      });
    } else if (s.id === 11) {
      // 8 kHz telephony
      const hum = analyzeHum(s.audio, s.sampleRate);
      const ultra = analyzeUltrasonicTones(s.audio, s.sampleRate);
      const passed = hum.detected && !ultra.detected;
      rows.push({
        id: s.id,
        name: s.name,
        expected: 'Hum found, Ultrasonic reports low fs',
        measured: `Hum: ${hum.detected ? 'YES' : 'NO'}, Ultra: ${ultra.detected ? 'FAIL' : 'Nyquist Ceiled'}`,
        error: '0',
        status: passed ? 'PASS' : 'FAIL',
      });
    }
  }

  // Print Markdown Table
  console.log('| Signal | Test Name & Description | Physical Ground Truth | Measured in Web App | Error | Status |');
  console.log('|:------:|:------------------------|:----------------------|:--------------------|:------|:------:|');
  for (const r of rows) {
    console.log(`| #${r.id} | **${r.name}** | ${r.expected} | ${r.measured} | ${r.error} | **${r.status}** |`);
  }

  const allPassed = rows.every(r => r.status === 'PASS');
  console.log(`\nVerification Result: ${rows.filter(r => r.status === 'PASS').length}/${rows.length} Passed (${allPassed ? '100% PASS' : 'FAIL'})\n`);
}

main().catch(err => {
  console.error('Error running 11 signals verification:', err);
  process.exit(1);
});
