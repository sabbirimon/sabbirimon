#!/usr/bin/env python3
"""Generate the original, clickable README button artwork (requires Pillow)."""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / 'docs/fonts/press-start-2p.ttf'
title = ImageFont.truetype(str(FONT), 25)
small = ImageFont.truetype(str(FONT), 9)
frames = []
for i in range(32):
    image = Image.new('RGB', (960, 164), '#071023')
    draw = ImageDraw.Draw(image)
    phase = i / 32 * math.tau
    # Stepped corners and a solid raised edge, with a slow traveling sparkle.
    draw.rectangle((20, 13, 939, 139), fill='#26334a')
    draw.rectangle((12, 21, 947, 131), fill='#26334a')
    draw.rectangle((25, 23, 934, 130), fill='#80521a')
    draw.rectangle((25, 18, 934, 119), fill='#eea923')
    draw.rectangle((31, 18, 928, 112), fill='#ffd820')
    draw.rectangle((37, 24, 922, 29), fill='#fff09e')
    draw.rectangle((37, 103, 922, 111), fill='#e9b310')
    draw.text((480, 59), 'ENTER IMON WORLD', font=title, fill='#3c2912', anchor='mm')
    draw.text((480, 91), "LET'S CODE TOGETHER", font=small, fill='#705017', anchor='mm')
    arrow = 852 + round(math.sin(phase) * 5)
    draw.polygon([(arrow, 43), (arrow+22, 65), (arrow, 87)], fill='#382d22')
    draw.rectangle((arrow-18, 58, arrow+4, 71), fill='#382d22')
    coin_y = 45 + round(math.sin(phase) * 3)
    draw.rectangle((64, coin_y+4, 96, coin_y+39), fill='#b87711')
    draw.rectangle((69, coin_y, 91, coin_y+42), fill='#fff3a8')
    draw.rectangle((75, coin_y+7, 85, coin_y+34), fill='#f0b021')
    spark_x = 30 + round(i / 31 * 896)
    draw.rectangle((spark_x-8, 10, spark_x+8, 13), fill='#75f4ec')
    draw.rectangle((spark_x-2, 6, spark_x+2, 17), fill='#d8ffff')
    draw.text((480, 150), 'PIXEL WORLDS  /  ARCADE  /  GRIDWORKS', font=small, fill='#b7caff', anchor='mm')
    frames.append(image)

frames[0].save(ROOT / 'assets/enter-world.png')
frames[0].save(ROOT / 'assets/enter-world.gif', save_all=True, append_images=frames[1:], duration=120, loop=0, optimize=True)
print('Created assets/enter-world.gif and assets/enter-world.png')
