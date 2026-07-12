#!/usr/bin/env python
"""把白底立绘转换为透明背景，并清理指定区域的浅色水印。"""

from __future__ import annotations

import sys

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage


def key_white_to_transparent(arr, white_thresh):
    height, width, _ = arr.shape
    rgb = arr[:, :, :3].astype(int)
    dist = np.sqrt(((rgb - 255) ** 2).sum(axis=2))
    near_white = dist < white_thresh
    seed = np.zeros_like(near_white)
    seed[0, :] = near_white[0, :]
    seed[-1, :] = near_white[-1, :]
    seed[:, 0] = near_white[:, 0]
    seed[:, -1] = near_white[:, -1]
    cur = seed.copy()
    changed = True
    while changed:
        dilated = ndimage.binary_dilation(cur)
        new = dilated & near_white
        changed = bool(new.sum() > cur.sum())
        cur = new
    arr[cur, 3] = 0

    alpha = arr[:, :, 3]
    mask = alpha > 10
    closed = ndimage.binary_closing(mask, iterations=2)
    filled = ndimage.binary_fill_holes(closed)
    holes = filled & ~mask
    arr[holes, 3] = 0


def remove_watermark(arr, y0, y1, x0, x1, inpaint_radius):
    height, width, _ = arr.shape
    y0, y1 = max(0, y0), min(height, y1)
    x0, x1 = max(0, x0), min(width, x1)
    mask = np.zeros((height, width), dtype=np.uint8)
    mask[y0:y1, x0:x1] = 255
    bgr = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2BGR)
    inpainted = cv2.inpaint(bgr, mask, inpaint_radius, cv2.INPAINT_NS)
    arr[:, :, :3] = cv2.cvtColor(inpainted, cv2.COLOR_BGR2RGB)

    region = arr[y0:y1, x0:x1]
    rgb = region[:, :, :3].astype(int)
    maxc = rgb.max(axis=2)
    minc = rgb.min(axis=2)
    sat = maxc - minc
    alpha = region[:, :, 3]
    resid = (alpha > 20) & (maxc < 245) & (maxc > 50) & (sat < 50)
    lbl, count = ndimage.label(resid)
    clean = np.zeros_like(resid)
    for index in range(1, count + 1):
        ys, xs = np.where(lbl == index)
        if 0 < len(ys) <= 5000:
            clean[ys, xs] = True
    clean = ndimage.binary_dilation(clean, iterations=3)
    ys, xs = np.where(clean)
    for y, x in zip(ys, xs, strict=True):
        yb0, yb1 = max(0, y - 6), min(region.shape[0], y + 7)
        xb0, xb1 = max(0, x - 6), min(region.shape[1], x + 7)
        win = region[yb0:yb1, xb0:xb1]
        sample = win[(~clean[yb0:yb1, xb0:xb1]) & (win[:, :, 3] > 20), :3]
        if len(sample) > 0:
            region[y, x, :3] = np.median(sample, axis=0).astype(np.uint8)
        else:
            region[y, x, 3] = 0
    return len(ys)


def main():
    if len(sys.argv) < 3:
        print("usage: key_portrait.py <src> <out> [white_thresh] [wm_y0 y1 x0 x1] [inpaint_radius]")
        raise SystemExit(1)

    src, out = sys.argv[1], sys.argv[2]
    white_thresh = int(sys.argv[3]) if len(sys.argv) > 3 else 28
    width, height = Image.open(src).size
    if len(sys.argv) >= 8:
        y0, y1, x0, x1 = (
            int(sys.argv[4]),
            int(sys.argv[5]),
            int(sys.argv[6]),
            int(sys.argv[7]),
        )
    else:
        y0, y1, x0, x1 = height - 160, height, width - 260, width
    inpaint_radius = int(sys.argv[8]) if len(sys.argv) > 8 else 7

    image = Image.open(src).convert("RGBA")
    arr = np.array(image)
    key_white_to_transparent(arr, white_thresh)
    cleaned = remove_watermark(arr, y0, y1, x0, x1, inpaint_radius)
    Image.fromarray(arr).save(out)
    transparent = 100.0 * (arr[:, :, 3] < 10).sum() / (width * height)
    print(f"{out}: {width}x{height} transparent={transparent:.1f}% residual_pixels={cleaned}")


if __name__ == "__main__":
    main()
