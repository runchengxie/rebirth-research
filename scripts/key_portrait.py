#!/usr/bin/env python
# key_portrait.py — 把 AI 生成的 VN 立绘（白底）抠成透明，并去除右下角「图片」水印。
# 用法：
#   python scripts/key_portrait.py <src.png> <out.png> [white_thresh] [wm_y0 wm_y1 wm_x0 wm_x1] [inpaint_radius]
# 例：
#   python scripts/key_portrait.py raw.png zhao-neutral.png 28
#   python scripts/key_portrait.py raw.png zhao-relief.png 28 880 1216 580 832 7
# 依赖：Pillow / numpy / scipy / opencv-python（项目 .venv 内）。
import sys
import numpy as np
from PIL import Image
import cv2
from scipy import ndimage


def key_white_to_transparent(arr, white_thresh):
    H, W, _ = arr.shape
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
    # 填补被身体包围的白色孔洞（如抬手后露出的闭合白底）
    alpha = arr[:, :, 3]
    mask = alpha > 10
    closed = ndimage.binary_closing(mask, iterations=2)
    filled = ndimage.binary_fill_holes(closed)
    holes = filled & ~mask
    arr[holes, 3] = 0


def remove_watermark(arr, y0, y1, x0, x1, inpaint_radius):
    H, W, _ = arr.shape
    y0, y1 = (max(0, y0), min(H, y1))
    x0, x1 = (max(0, x0), min(W, x1))
    mask = np.zeros((H, W), dtype=np.uint8)
    mask[y0:y1, x0:x1] = 255
    bgr = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2BGR)
    inpainted = cv2.inpaint(bgr, mask, inpaint_radius, cv2.INPAINT_NS)
    arr[:, :, :3] = cv2.cvtColor(inpainted, cv2.COLOR_BGR2RGB)

    # 残留在裤腿上的浅灰字：低饱和、中亮度、在实色区域里，逐像素用邻域中位数回填
    region = arr[y0:y1, x0:x1]
    rgb = region[:, :, :3].astype(int)
    maxc = rgb.max(axis=2)
    minc = rgb.min(axis=2)
    sat = maxc - minc
    alpha = region[:, :, 3]
    resid = (alpha > 20) & (maxc < 245) & (maxc > 50) & (sat < 50)
    lbl, n = ndimage.label(resid)
    clean = np.zeros_like(resid)
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if 0 < len(ys) <= 5000:
            clean[ys, xs] = True
    clean = ndimage.binary_dilation(clean, iterations=3)
    ys, xs = np.where(clean)
    for y, x in zip(ys, xs):
        yb0, yb1 = max(0, y - 6), min(region.shape[0], y + 7)
        xb0, xb1 = max(0, x - 6), min(region.shape[1], x + 7)
        win = region[yb0:yb1, xb0:xb1]
        samp = win[(~clean[yb0:yb1, xb0:xb1]) & (win[:, :, 3] > 20), :3]
        if len(samp) > 0:
            region[y, x, :3] = np.median(samp, axis=0).astype(np.uint8)
        else:
            region[y, x, 3] = 0
    return len(ys)


def main():
    if len(sys.argv) < 3:
        print("usage: key_portrait.py <src> <out> [white_thresh] [wm_y0 y1 x0 x1] [inpaint_radius]")
        sys.exit(1)
    src, out = sys.argv[1], sys.argv[2]
    white_thresh = int(sys.argv[3]) if len(sys.argv) > 3 else 28
    H, W = Image.open(src).convert("RGBA").size
    if len(sys.argv) >= 8:
        y0, y1, x0, x1 = (int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]), int(sys.argv[7]))
    else:
        y0, y1, x0, x1 = H - 160, H, W - 260, W
    inpaint_radius = int(sys.argv[8]) if len(sys.argv) > 8 else 7

    im = Image.open(src).convert("RGBA")
    arr = np.array(im)
    key_white_to_transparent(arr, white_thresh)
    cleaned = remove_watermark(arr, y0, y1, x0, x1, inpaint_radius)
    Image.fromarray(arr).save(out)
    transp = 100.0 * (arr[:, :, 3] < 10).sum() / (W * H)
    print(f"{out}: {W}x{H} transparent={transp:.1f}% residual_pixels={cleaned}")


if __name__ == "__main__":
    main()
