import numpy as np
import scipy.io.wavfile as wav
import subprocess

def generate_clips():
    print("[*] Generating test media clips...")
    sr = 48000
    duration = 5.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)

    # 1. ev2.mp4: Voice-like / speech clip (440 Hz tone + harmonics), no hum, no ultrasonic tone, no GPS
    subprocess.run([
        'ffmpeg', '-y',
        '-f', 'lavfi', '-i', 'testsrc=duration=5:size=640x360:rate=15',
        '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=5',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        'ev2.mp4'
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("  [✓] Generated ev2.mp4 (440 Hz speech-like tone, clean)")

    # 2. silent_clip.mp4: Total silence, no video motion, no metadata
    subprocess.run([
        'ffmpeg', '-y',
        '-f', 'lavfi', '-i', 'color=c=black:s=640x360:d=5:r=15',
        '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono:d=5',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        'silent_clip.mp4'
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("  [✓] Generated silent_clip.mp4 (Pure silence)")

    # 3. hum60_tone20k.wav & .mp4: 60.01 Hz Hum + 20100 Hz Ultrasonic Tone
    hum = 0.3 * np.sin(2 * np.pi * 60.01 * t)
    hum_h2 = 0.1 * np.sin(2 * np.pi * 120.02 * t)
    hum_h3 = 0.05 * np.sin(2 * np.pi * 180.03 * t)
    tone = 0.25 * np.sin(2 * np.pi * 20100.0 * t)
    audio = hum + hum_h2 + hum_h3 + tone
    audio_int16 = (audio * 32767).astype(np.int16)
    wav.write('hum60_tone20k.wav', sr, audio_int16)

    # Convert to MP4
    subprocess.run([
        'ffmpeg', '-y',
        '-f', 'lavfi', '-i', 'color=c=navy:s=640x360:d=5:r=15',
        '-i', 'hum60_tone20k.wav',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '320k',
        'hum60_tone20k.mp4'
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("  [✓] Generated hum60_tone20k.wav & hum60_tone20k.mp4 (60.01 Hz hum + 20.1 kHz tone)")

if __name__ == '__main__':
    generate_clips()
