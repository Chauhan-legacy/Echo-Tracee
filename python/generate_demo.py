"""
ECHO//TRACE Python Lab - Synthetic Demo Generator
Builds INCIDENT-001 audio matching ground truth and writes ground_truth.json.
"""

import json
import math
import numpy as np
import soundfile as sf
from pathlib import Path

def generate_incident_001():
    out_dir = Path(__file__).parent
    sample_rate = 48000
    duration = 15.0
    num_samples = int(sample_rate * duration)
    t = np.linspace(0, duration, num_samples, endpoint=False)

    # 1. Mains Hum (50.02 Hz base + harmonics, jump to 50.09 Hz at 11.0s)
    hum_freq = np.where(t < 11.0, 50.02 + 0.002 * np.sin(0.4 * t), 50.09 + 0.002 * np.cos(0.3 * t))
    hum_phase = np.cumsum(2 * np.pi * hum_freq / sample_rate)
    hum_audio = 0.12 * np.sin(hum_phase) + 0.04 * np.sin(2 * hum_phase) + 0.02 * np.sin(3 * hum_phase)

    # 2. Keyed 19.4 kHz Ultrasonic Tracker Tone (active 3.0s - 9.5s)
    ultra_tone = np.zeros(num_samples)
    mask = (t >= 3.0) & (t <= 9.5)
    cycle = (t[mask] - 3.0) % 0.75
    pulse_on = cycle < 0.6
    ultra_tone[mask] = np.where(pulse_on, 0.12 * np.sin(2 * np.pi * 19400.0 * t[mask]), 0.0)

    # 3. Speech Formants
    speech = np.zeros(num_samples)
    speech_mask = ((t >= 1.2) & (t <= 4.0)) | ((t >= 7.5) & (t <= 10.5))
    s_t = t[speech_mask]
    speech_env = 0.12 * np.sin(2 * np.pi * 3.5 * s_t)
    speech[speech_mask] = speech_env * (
        0.5 * np.sin(2 * np.pi * 320 * s_t) +
        0.3 * np.sin(2 * np.pi * 1150 * s_t) +
        0.2 * np.sin(2 * np.pi * 2200 * s_t)
    )

    # 4. Room Decay Transient Clicks (RT60 = 0.38s)
    decay_rate = np.log(1000) / 0.38
    clicks = np.zeros(num_samples)
    for ct in [2.5, 6.8, 11.8]:
        click_mask = (t >= ct) & (t <= ct + 0.6)
        dt = t[click_mask] - ct
        clicks[click_mask] += (np.random.rand(np.sum(click_mask)) - 0.5) * 0.85 * np.exp(-decay_rate * dt)

    # 5. Room Tone Ambient Floor (-54 dB)
    room_noise = (np.random.rand(num_samples) - 0.5) * 0.002

    audio = hum_audio + ultra_tone + speech + clicks + room_noise
    audio = np.clip(audio, -1.0, 1.0).astype(np.float32)

    # Save audio WAV
    wav_path = out_dir / "incident_001_audio.wav"
    sf.write(wav_path, audio, sample_rate)
    print(f"[+] Saved synthetic audio to: {wav_path}")

    # Write Ground Truth
    ground_truth = {
        "source": "INCIDENT-001: The Hostel Reel",
        "sample_rate": sample_rate,
        "duration_sec": duration,
        "base_hum_hz": 50.020,
        "hum_harmonics": [100.040, 150.060],
        "hum_jump_sec": 11.0,
        "hum_post_jump_hz": 50.090,
        "ultrasonic_tone_hz": 19400.0,
        "ultrasonic_window_sec": [3.0, 9.5],
        "ultrasonic_is_keyed": True,
        "room_rt60_sec": 0.380,
        "room_decay_class": "Medium Room",
        "gps": {
            "latitude": 23.2156,
            "longitude": 72.6369,
            "location": "Hostel Block C, Gandhinagar, Gujarat, India"
        }
    }

    gt_path = out_dir / "ground_truth.json"
    with open(gt_path, "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, indent=2)
    print(f"[+] Wrote ground truth values to: {gt_path}")

if __name__ == "__main__":
    generate_incident_001()
