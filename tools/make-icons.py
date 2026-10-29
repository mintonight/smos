from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "extension" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

SCALE = 4
SIZE = 128 * SCALE
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Rounded dark tile with a subtle edge.
draw.rounded_rectangle((0, 0, SIZE, SIZE), radius=28 * SCALE, fill="#141418")
draw.rounded_rectangle(
    (2 * SCALE, 2 * SCALE, SIZE - 2 * SCALE, SIZE - 2 * SCALE),
    radius=26 * SCALE,
    outline="#2b2b33",
    width=2 * SCALE,
)

# Magnifying glass: white ring + coral handle.
draw.ellipse(
    (28 * SCALE, 24 * SCALE, 82 * SCALE, 78 * SCALE),
    outline="#ffffff",
    width=10 * SCALE,
)
draw.line(
    (72 * SCALE, 68 * SCALE, 101 * SCALE, 97 * SCALE),
    fill="#ff2442",
    width=11 * SCALE,
)
draw.ellipse(
    (36 * SCALE, 32 * SCALE, 48 * SCALE, 44 * SCALE),
    fill="#ff2442",
)

for size in (16, 32, 48, 128):
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(OUT / f"icon{size}.png")

print("Generated extension icons in", OUT)
