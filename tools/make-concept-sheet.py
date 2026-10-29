from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = root / "assets" / "brand" / "concepts-preview.png"
names = ["concept-a", "concept-b", "concept-c", "concept-d", "concept-e"]
labels = ["A", "B", "C", "D", "E"]
cell_w, cell_h = 340, 390
gap = 18
cols, rows = 3, 2
width = cols * cell_w + (cols + 1) * gap
height = rows * cell_h + (rows + 1) * gap
canvas = Image.new("RGB", (width, height), "#0d0d10")
draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)
except Exception:
    font = ImageFont.load_default()

for index, (name, label) in enumerate(zip(names, labels)):
    col = index % cols
    row = index // cols
    x = gap + col * (cell_w + gap)
    y = gap + row * (cell_h + gap)
    draw.rounded_rectangle((x, y, x + cell_w, y + cell_h), radius=22, fill="#17171d", outline="#2b2b33", width=2)
    image = Image.open(root / "assets" / "brand" / "concepts" / f"{name}.jpg").convert("RGB")
    image.thumbnail((300, 300), Image.Resampling.LANCZOS)
    canvas.paste(image, (x + (cell_w - image.width) // 2, y + 20))
    draw.text((x + 20, y + 340), label, fill="#ffffff", font=font)
    draw.text((x + 58, y + 346), "SMOS", fill="#92929c", font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20))

canvas.save(out)
print(out)
