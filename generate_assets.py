from PIL import Image, ImageDraw, ImageFont
import math
from pathlib import Path

def generate_og_image():
    out_dir = Path(__file__).parent / "public"
    out_dir.mkdir(exist_ok=True)

    # 1. OG Image 1200x630
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), (8, 11, 17, 255))
    draw = ImageDraw.Draw(img)

    # Grid pattern
    for x in range(0, w, 40):
        draw.line([(x, 0), (x, h)], fill=(21, 29, 42, 100), width=1)
    for y in range(0, h, 40):
        draw.line([(0, y), (w, y)], fill=(21, 29, 42, 100), width=1)

    # Glowing border
    draw.rectangle([(20, 20), (w - 20, h - 20)], outline=(0, 240, 255, 200), width=3)

    # Waveform background graphic
    num_bars = 64
    bar_w = (w - 120) / num_bars
    for i in range(num_bars):
        norm = i / num_bars
        bar_h = abs(math.sin(norm * math.pi * 3) * 120 + math.sin(norm * math.pi * 6) * 60) + 15
        bx = 60 + i * bar_w
        by = 380 - bar_h / 2
        alpha = int(80 + math.sin(norm * math.pi) * 120)
        color = (0, 240, 255, alpha) if norm < 0.75 else (255, 51, 102, alpha)
        draw.rectangle([(bx, by), (bx + bar_w - 4, by + bar_h)], fill=color)

    # Main Brand text
    draw.text((60, 60), "ECHO//TRACE", fill=(0, 240, 255, 255))
    draw.text((60, 140), "CLIENT-SIDE PRIVACY X-RAY FOR VIDEO & AUDIO", fill=(255, 255, 255, 255))
    draw.text((60, 200), "Drop any video you were about to post. See what it secretly leaks.", fill=(142, 155, 174, 255))
    draw.text((60, 240), "Fix it in one tap. Real acoustic DSP + visual computer vision.", fill=(142, 155, 174, 255))

    # Badge
    draw.rectangle([(60, 480), (450, 550)], fill=(15, 20, 32, 230), outline=(0, 240, 255, 200), width=2)
    draw.text((80, 502), "100% CLIENT-SIDE // ZERO UPLOADS", fill=(0, 240, 255, 255))

    draw.rectangle([(w - 420, 480), (w - 60, 550)], fill=(255, 51, 102, 40), outline=(255, 51, 102, 200), width=2)
    draw.text((w - 390, 502), "#DeployWithEmbarko", fill=(255, 51, 102, 255))

    og_path = out_dir / "og-image.png"
    img.save(og_path, "PNG")
    print(f"[+] Saved OG Image: {og_path}")

    # 2. PWA Icon 192x192
    icon192 = Image.new("RGBA", (192, 192), (8, 11, 17, 255))
    d192 = ImageDraw.Draw(icon192)
    d192.rounded_rectangle([(10, 10), (182, 182)], radius=24, fill=(15, 20, 32, 255), outline=(0, 240, 255, 255), width=4)
    # Waveform
    points = [(30, 96), (55, 96), (70, 45), (96, 145), (120, 65), (140, 115), (150, 96), (165, 96)]
    d192.line(points, fill=(0, 240, 255, 255), width=6)
    d192.ellipse([(92, 141), (100, 149)], fill=(255, 51, 102, 255))
    icon192_path = out_dir / "icon-192.png"
    icon192.save(icon192_path, "PNG")
    print(f"[+] Saved PWA Icon 192: {icon192_path}")

    # 3. PWA Icon 512x512
    icon512 = Image.new("RGBA", (512, 512), (8, 11, 17, 255))
    d512 = ImageDraw.Draw(icon512)
    d512.rounded_rectangle([(24, 24), (488, 488)], radius=64, fill=(15, 20, 32, 255), outline=(0, 240, 255, 255), width=10)
    points512 = [(80, 256), (150, 256), (190, 120), (256, 390), (320, 170), (370, 310), (400, 256), (440, 256)]
    d512.line(points512, fill=(0, 240, 255, 255), width=16)
    d512.ellipse([(246, 380), (266, 400)], fill=(255, 51, 102, 255))
    icon512_path = out_dir / "icon-512.png"
    icon512.save(icon512_path, "PNG")
    print(f"[+] Saved PWA Icon 512: {icon512_path}")

if __name__ == "__main__":
    generate_og_image()
