"""Color-only master derivatives. Standard-library PNG IO; no image generation."""
from pathlib import Path
import colorsys
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts/private-label-console/public"
MASTER = OUT / "qxlayer-logo.png"


def read_png(path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos, compressed = 8, bytearray()
    while pos < len(data):
        n = struct.unpack(">I", data[pos:pos + 4])[0]
        kind, payload = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + n]
        if kind == b"IHDR":
            w, h, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", payload)
            assert (depth, color, interlace) == (8, 2, 0)
        elif kind == b"IDAT":
            compressed.extend(payload)
        pos += n + 12
    raw, stride, rows = zlib.decompress(compressed), w * 3, []
    previous = bytearray(stride)
    for y in range(h):
        offset = y * (stride + 1)
        filt, row = raw[offset], bytearray(raw[offset + 1:offset + stride + 1])
        for x in range(stride):
            a = row[x - 3] if x >= 3 else 0
            b, c = previous[x], previous[x - 3] if x >= 3 else 0
            if filt == 1:
                predictor = a
            elif filt == 2:
                predictor = b
            elif filt == 3:
                predictor = (a + b) // 2
            elif filt == 4:
                p = a + b - c
                distances = (abs(p - a), abs(p - b), abs(p - c))
                predictor = (a, b, c)[distances.index(min(distances))]
            elif filt == 0:
                predictor = 0
            else:
                raise ValueError(f"Unsupported PNG filter {filt}")
            row[x] = (row[x] + predictor) & 255
        rows.append(row)
        previous = row
    return w, h, rows


def write_png(path, w, h, rows):
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xffffffff)
    payload = b"".join(b"\0" + bytes(row) for row in rows)
    path.write_bytes(b"\x89PNG\r\n\x1a\n"
                     + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                     + chunk(b"IDAT", zlib.compress(payload, 9)) + chunk(b"IEND", b""))


def resize_icon(rows, side, size):
    """Area-average premultiplied pixels, avoiding dark fringes on tiny icons."""
    output = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            x0, x1 = x * side // size, (x + 1) * side // size
            y0, y1 = y * side // size, (y + 1) * side // size
            total, alpha, rgb = 0, 0, [0, 0, 0]
            for sy in range(y0, y1):
                for sx in range(x0, x1):
                    pixel = rows[sy][sx * 4:sx * 4 + 4]
                    total += 1
                    alpha += pixel[3]
                    for c in range(3):
                        rgb[c] += pixel[c] * pixel[3]
            row.extend([round(v / alpha) if alpha else 0 for v in rgb] + [round(alpha / total)])
        output.append(row)
    return output


def recolor(rgb, light, icon=False):
    r, g, b = (v / 255 for v in rgb)
    hue, saturation, value = colorsys.rgb_to_hsv(r, g, b)
    # The upload's nominally black canvas contains tiny RGB compression noise.
    # Ignore that background noise instead of tinting it into visible speckles.
    if value <= 8 / 255:
        return (0, 0, 0, 0)
    colored = saturation > .20
    if icon and not colored:
        return (0, 0, 0, 0)
    if colored:
        # Remap only hue/saturation; keep the source shading and pixel coordinates.
        # Cyan highlights -> blue -> violet -> purple, matching the UI palette.
        degrees = hue * 360
        new_hue = (180 + max(0, min(1, (degrees - 185) / 75)) * 95) / 360
        new_saturation = saturation * (.82 if light else .72)
        nr, ng, nb = colorsys.hsv_to_rgb(new_hue, new_saturation, value)
        alpha = min(1, value / .12)
    else:
        # The same luminance mask preserves QX-over-Layer lettering and bevels.
        ink = (35, 28, 66) if light else (238, 241, 250)
        nr, ng, nb = (v / 255 for v in ink)
        alpha = value
    return tuple(round(v * 255) for v in (nr, ng, nb, alpha))


def main():
    w, h, rows = read_png(MASTER)
    bounds = []
    for light, name in ((False, "dark"), (True, "light")):
        output = []
        for y, row in enumerate(rows):
            target = bytearray()
            for x in range(w):
                rgb = row[x * 3:x * 3 + 3]
                target.extend(recolor(rgb, light))
                if not light:
                    _, sat, value = colorsys.rgb_to_hsv(*(v / 255 for v in rgb))
                    if sat > .20 and value > .12:
                        bounds.append((x, y))
            output.append(target)
        write_png(OUT / f"qxlayer-logo-{name}.png", w, h, output)
    minx, maxx = min(x for x, _ in bounds), max(x for x, _ in bounds)
    miny, maxy = min(y for _, y in bounds), max(y for _, y in bounds)
    side = max(maxx - minx + 1, maxy - miny + 1) + 32
    left, top = (minx + maxx + 1 - side) // 2, (miny + maxy + 1 - side) // 2
    for light, name in ((False, "dark"), (True, "light")):
        icon_rows = []
        for y in range(top, top + side):
            row = bytearray()
            for x in range(left, left + side):
                rgb = rows[y][x * 3:x * 3 + 3] if 0 <= x < w and 0 <= y < h else (0, 0, 0)
                row.extend(recolor(rgb, light, icon=True))
            icon_rows.append(row)
        write_png(OUT / f"qxlayer-icon-{name}.png", side, side, icon_rows)
        for size in (32, 180):
            write_png(OUT / f"qxlayer-icon-{name}-{size}.png", size, size, resize_icon(icon_rows, side, size))
    print(f"Created full-canvas {w}x{h} light/dark logos and {side}x{side} isolated-symbol icons; master untouched.")


if __name__ == "__main__":
    main()