from PIL import Image
import sys

def analyze_grid(image_path, rows, cols):
    try:
        img = Image.open(image_path).convert('L')
        w, h = img.size
        print(f"Image: {image_path} ({w}x{h})")
        
        cell_w = w // cols
        cell_h = h // rows
        
        print(f"Assuming Grid: {rows}x{cols} (Cell: {cell_w}x{cell_h})")
        
        for r in range(rows):
            row_str = f"Row {r}: "
            for c in range(cols):
                idx = r * cols + c
                x = c * cell_w
                y = r * cell_h
                # Check center area (avoid borders)
                box = (x + 50, y + 50, x + cell_w - 50, y + cell_h - 50)
                cell = img.crop(box)
                
                # Check variance
                pixels = list(cell.getdata())
                avg = sum(pixels) / len(pixels)
                
                if avg < 10:
                    mark = ".."  # Empty/Black
                else:
                    mark = f"{idx:02}" # Content
                
                row_str += f"[{mark}] "
            print(row_str)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python atlas_grid_scan.py <image_path> <rows> <cols>")
        sys.exit(1)
    analyze_grid(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
