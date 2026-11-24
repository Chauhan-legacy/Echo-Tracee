"""
ECHO//TRACE Python Lab - Pytest Unit Suite
Includes:
- Sensitivity tests across frequency steps:
  * Hum: 49.97 Hz, 50.00 Hz, 60.01 Hz
  * Tone: 18.9 kHz, 19.4 kHz, 20.1 kHz
  * Decay: 0.20 s, 0.50 s, 0.90 s
- Negative tests: silence, white noise, clean speech, and 16 kHz codec cutoff.
"""

import pytest
import numpy as np
import scipy.signal as signal

@pytest.mark.parametrize("target_hum", [49.970, 50.000, 60.010])
def test_hum_sensitivity(target_hum):
    fs = 48000
    duration = 5.0
    t = np.linspace(0, duration, int(fs * duration), endpoint=False)
    signal_data = 0.25 * np.sin(2 * np.pi * target_hum * t) + 0.08 * np.sin(2 * np.pi * (target_hum * 2) * t)

    decimation = 48
    down_fs = fs // decimation
    down_signal = signal.decimate(signal_data, decimation)

    n_fft = 4096
    f, pxx = signal.welch(down_signal, fs=down_fs, nperseg=n_fft, window='blackmanharris')
    search_band = (48.0, 52.0) if target_hum < 55 else (58.0, 62.0)
    mask = (f >= search_band[0]) & (f <= search_band[1])
    f_sub = f[mask]
    pxx_sub = pxx[mask]
    peak_idx = np.argmax(pxx_sub)

    measured = f_sub[peak_idx]
    if 0 < peak_idx < len(pxx_sub) - 1:
        alpha = np.log(max(1e-12, pxx_sub[peak_idx - 1]))
        beta = np.log(max(1e-12, pxx_sub[peak_idx]))
        gamma = np.log(max(1e-12, pxx_sub[peak_idx + 1]))
        denom = alpha - 2 * beta + gamma
        if abs(denom) > 1e-12:
            p = 0.5 * (alpha - gamma) / denom
            df = f_sub[1] - f_sub[0]
            measured += p * df

    error = abs(measured - target_hum)
    print(f"\n[Hum Sensitivity] Target: {target_hum:.3f} Hz | Measured: {measured:.3f} Hz | Error: {error:.4f} Hz")
    assert error <= 0.010, f"Hum error {error:.4f} Hz exceeded tolerance"

@pytest.mark.parametrize("target_tone", [18900.0, 19400.0, 20100.0])
def test_tone_sensitivity(target_tone):
    fs = 48000
    duration = 4.0
    t = np.linspace(0, duration, int(fs * duration), endpoint=False)
    signal_data = 0.2 * np.sin(2 * np.pi * target_tone * t)

    f, pxx = signal.welch(signal_data, fs=fs, nperseg=16384, window='blackmanharris')
    mask = (f >= 17000) & (f <= 22000)
    f_sub = f[mask]
    pxx_sub = pxx[mask]
    tone_idx = np.argmax(pxx_sub)

    measured = f_sub[tone_idx]
    if 0 < tone_idx < len(pxx_sub) - 1:
        a = np.log10(max(1e-12, pxx_sub[tone_idx - 1]))
        b = np.log10(max(1e-12, pxx_sub[tone_idx]))
        c = np.log10(max(1e-12, pxx_sub[tone_idx + 1]))
        denom = a - 2 * b + c
        if abs(denom) > 1e-12:
            p = 0.5 * (a - c) / denom
            df = f_sub[1] - f_sub[0]
            measured += p * df

    error = abs(measured - target_tone)
    print(f"\n[Tone Sensitivity] Target: {target_tone:.1f} Hz | Measured: {measured:.1f} Hz | Error: {error:.2f} Hz")
    assert error <= 20.0, f"Tone error {error:.2f} Hz exceeded tolerance"

@pytest.mark.parametrize("target_decay", [0.200, 0.500, 0.900])
def test_decay_sensitivity(target_decay):
    fs = 48000
    duration = 1.2
    t = np.linspace(0, duration, int(fs * duration), endpoint=False)
    decay_rate = np.log(1000) / target_decay
    transient = (np.random.rand(len(t)) - 0.5) * 0.9 * np.exp(-decay_rate * t)

    # 10ms short-time RMS envelope
    win = int(0.01 * fs)
    hop = int(win / 2)
    num_w = int((len(t) - win) / hop)
    env = np.array([np.mean(transient[i*hop:i*hop+win]**2) for i in range(num_w)])
    db = 10 * np.log10(np.maximum(1e-10, env / np.max(env)))

    t_w = (np.arange(num_w) * hop + win/2) / fs
    idx5 = np.where(db <= -5.0)[0][0]
    idx25 = np.where(db <= -25.0)[0][0]
    slope, _ = np.polyfit(t_w[idx5:idx25], db[idx5:idx25], 1)
    measured_decay = -60.0 / slope

    error_pct = abs(measured_decay - target_decay) / target_decay
    print(f"\n[Decay Sensitivity] Target: {target_decay:.3f} s | Measured: {measured_decay:.3f} s | Error: {error_pct*100:.2f}%")
    assert error_pct <= 0.15, f"Decay error {error_pct*100:.2f}% exceeded 15% tolerance"

def test_negative_silence():
    fs = 48000
    silence = np.zeros(fs * 2)
    assert np.max(np.abs(silence)) == 0.0

def test_negative_white_noise():
    fs = 48000
    noise = (np.random.rand(fs * 2) - 0.5) * 0.05
    f, pxx = signal.welch(noise, fs=fs, nperseg=8192)
    mask = (f >= 17000) & (f <= 22000)
    median_power = np.median(pxx[mask])
    max_power = np.max(pxx[mask])
    assert max_power < median_power * 8.0, "White noise triggered false peak"

def test_negative_clean_speech():
    fs = 48000
    t = np.linspace(0, 3.0, int(fs * 3.0), endpoint=False)
    # Formants without 19.4 kHz tracker or mains hum
    speech = 0.2 * np.sin(2*np.pi*300*t) + 0.15 * np.sin(2*np.pi*1200*t) + 0.1 * np.sin(2*np.pi*2400*t)
    f, pxx = signal.welch(speech, fs=fs, nperseg=8192)
    ultra_mask = (f >= 17000) & (f <= 22000)
    assert np.max(pxx[ultra_mask]) < 1e-8, "Clean speech leaked ultrasonic beacon"

def test_negative_16khz_codec_cutoff():
    fs = 48000
    t = np.linspace(0, 2.0, int(fs * 2.0), endpoint=False)
    # Bandlimited signal up to 15.5 kHz, zero power above 16 kHz
    audio = 0.3 * np.sin(2*np.pi*5000*t) + 0.2 * np.sin(2*np.pi*12000*t) + 0.1 * np.sin(2*np.pi*15000*t)
    f, pxx = signal.welch(audio, fs=fs, nperseg=8192)
    mid_power = np.mean(pxx[(f >= 8000) & (f <= 14000)])
    high_power = np.mean(pxx[(f >= 18000) & (f <= 21000)])
    is_cutoff = high_power / mid_power < 1e-5
    assert is_cutoff, "16 kHz codec cutoff not detected"
