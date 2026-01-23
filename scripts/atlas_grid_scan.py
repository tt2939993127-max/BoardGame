import argparse
import json
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("缺少 Pillow 依赖，请先执行: python -m pip install Pillow") from exc


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="图集网格扫描（方案A）：输出行/列起点与尺寸参数",
    )
    parser.add_argument("image", help="图集路径")
    parser.add_argument("--rows", type=int, required=True, help="行数")
    parser.add_argument("--cols", type=int, required=True, help="列数")
    parser.add_argument("--threshold", type=int, default=35, help="像素亮度阈值（0-255）")
    parser.add_argument("--alpha-threshold", type=int, default=0, help="透明度阈值（0-255）")
    parser.add_argument("--row-ratio", type=float, default=0.2, help="行带识别阈值比例（0-1）")
    parser.add_argument("--col-ratio", type=float, default=0.2, help="列带识别阈值比例（0-1）")
    parser.add_argument("--row-min-count", type=int, default=None, help="行带最小像素数（覆盖 row-ratio）")
    parser.add_argument("--col-min-count", type=int, default=None, help="列带最小像素数（覆盖 col-ratio）")
    parser.add_argument("--row-gap", type=int, default=6, help="行带合并容忍间隔（像素）")
    parser.add_argument("--col-gap", type=int, default=6, help="列带合并容忍间隔（像素）")
    parser.add_argument("--scan-x-start", type=int, default=0, help="扫描 x 起点（默认 0）")
    parser.add_argument("--scan-x-end", type=int, default=None, help="扫描 x 终点（默认图片宽度）")
    parser.add_argument("--scan-y-start", type=int, default=0, help="扫描 y 起点（默认 0）")
    parser.add_argument("--scan-y-end", type=int, default=None, help="扫描 y 终点（默认图片高度）")
    parser.add_argument("--step", type=int, default=1, help="横向/纵向采样步长（默认 1）")
    parser.add_argument("--output", type=str, default=None, help="输出 JSON 路径（默认输出到图集同目录）")
    parser.add_argument("--pretty", action="store_true", help="美化 JSON 输出")
    return parser.parse_args()


def is_active_pixel(pixel: tuple[int, int, int, int], threshold: int, alpha_threshold: int) -> bool:
    r, g, b, a = pixel
    if a <= alpha_threshold:
        return False
    return max(r, g, b) > threshold


def merge_segments(segments: list[tuple[int, int]], max_gap: int) -> list[tuple[int, int]]:
    if not segments:
        return []
    merged = [segments[0]]
    for start, end in segments[1:]:
        prev_start, prev_end = merged[-1]
        gap = start - prev_end - 1
        if gap <= max_gap:
            merged[-1] = (prev_start, end)
        else:
            merged.append((start, end))
    return merged


def pick_segments(segments: list[tuple[int, int]], expected: int, label: str) -> list[tuple[int, int]]:
    if len(segments) == expected:
        return segments
    if len(segments) > expected:
        print(f"[{label}] 识别到 {len(segments)} 段，保留长度最大的 {expected} 段。")
        segments = sorted(segments, key=lambda item: item[1] - item[0], reverse=True)[:expected]
        segments = sorted(segments, key=lambda item: item[0])
        return segments
    print(f"[{label}] 仅识别到 {len(segments)} 段，低于预期 {expected} 段。")
    return segments


def scan_rows(pixels, width: int, height: int, args: argparse.Namespace) -> list[tuple[int, int]]:
    y_start = max(0, args.scan_y_start)
    y_end = min(height, args.scan_y_end or height)
    x_start = max(0, args.scan_x_start)
    x_end = min(width, args.scan_x_end or width)

    counts = []
    for y in range(y_start, y_end):
        count = 0
        for x in range(x_start, x_end, args.step):
            if is_active_pixel(pixels[x, y], args.threshold, args.alpha_threshold):
                count += 1
        counts.append(count)

    max_count = max(counts) if counts else 0
    min_count = args.row_min_count if args.row_min_count is not None else int(max_count * args.row_ratio)
    segments = []
    in_band = False
    start = 0
    for idx, count in enumerate(counts):
        if count >= min_count:
            if not in_band:
                in_band = True
                start = idx
        else:
            if in_band:
                segments.append((start, idx - 1))
                in_band = False
    if in_band:
        segments.append((start, len(counts) - 1))

    merged = merge_segments(segments, args.row_gap)
    merged = pick_segments(merged, args.rows, "row")
    return [(seg[0] + y_start, seg[1] + y_start) for seg in merged]


def scan_cols(pixels, width: int, height: int, args: argparse.Namespace, row_segments: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if row_segments:
        y_start = min(start for start, _ in row_segments)
        y_end = max(end for _, end in row_segments) + 1
    else:
        y_start = max(0, args.scan_y_start)
        y_end = min(height, args.scan_y_end or height)

    x_start = max(0, args.scan_x_start)
    x_end = min(width, args.scan_x_end or width)

    counts = []
    for x in range(x_start, x_end):
        count = 0
        for y in range(y_start, y_end, args.step):
            if is_active_pixel(pixels[x, y], args.threshold, args.alpha_threshold):
                count += 1
        counts.append(count)

    max_count = max(counts) if counts else 0
    min_count = args.col_min_count if args.col_min_count is not None else int(max_count * args.col_ratio)
    segments = []
    in_band = False
    start = 0
    for idx, count in enumerate(counts):
        if count >= min_count:
            if not in_band:
                in_band = True
                start = idx
        else:
            if in_band:
                segments.append((start, idx - 1))
                in_band = False
    if in_band:
        segments.append((start, len(counts) - 1))

    merged = merge_segments(segments, args.col_gap)
    merged = pick_segments(merged, args.cols, "col")
    return [(seg[0] + x_start, seg[1] + x_start) for seg in merged]


def build_output(width: int, height: int, rows: list[tuple[int, int]], cols: list[tuple[int, int]], args: argparse.Namespace) -> dict:
    row_starts = [start for start, _ in rows]
    row_heights = [end - start + 1 for start, end in rows]
    col_starts = [start for start, _ in cols]
    col_widths = [end - start + 1 for start, end in cols]

    deck_x = col_starts[0] if col_starts else 0
    deck_y = row_starts[0] if row_starts else 0
    deck_w = (col_starts[-1] + col_widths[-1] - deck_x) if col_starts else 0
    deck_h = (row_starts[-1] + row_heights[-1] - deck_y) if row_starts else 0

    return {
        "imageW": width,
        "imageH": height,
        "rows": args.rows,
        "cols": args.cols,
        "deckX": deck_x,
        "deckY": deck_y,
        "deckW": deck_w,
        "deckH": deck_h,
        "rowStarts": row_starts,
        "rowHeights": row_heights,
        "colStarts": col_starts,
        "colWidths": col_widths,
        "scan": {
            "threshold": args.threshold,
            "alphaThreshold": args.alpha_threshold,
            "rowRatio": args.row_ratio,
            "colRatio": args.col_ratio,
            "rowMinCount": args.row_min_count,
            "colMinCount": args.col_min_count,
            "rowGap": args.row_gap,
            "colGap": args.col_gap,
            "scanXStart": args.scan_x_start,
            "scanXEnd": args.scan_x_end,
            "scanYStart": args.scan_y_start,
            "scanYEnd": args.scan_y_end,
            "step": args.step,
        },
    }


def main() -> None:
    args = parse_args()
    image_path = Path(args.image).resolve()
    if not image_path.exists():
        raise SystemExit(f"文件不存在: {image_path}")

    with Image.open(image_path) as img:
        rgba = img.convert("RGBA")
        width, height = rgba.size
        pixels = rgba.load()

        row_segments = scan_rows(pixels, width, height, args)
        col_segments = scan_cols(pixels, width, height, args, row_segments)

    output = build_output(width, height, row_segments, col_segments, args)
    json_text = json.dumps(output, ensure_ascii=False, indent=2 if args.pretty else None)

    output_path = Path(args.output).resolve() if args.output else image_path.with_suffix(".atlas.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json_text, encoding="utf-8")
    print(f"已输出: {output_path}")


if __name__ == "__main__":
    main()
