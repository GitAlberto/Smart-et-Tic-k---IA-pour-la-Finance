import json
import sys

def extract_notebook(path, out_path):
    with open(path, 'r', encoding='utf-8') as f:
        nb = json.load(f)
    with open(out_path, 'w', encoding='utf-8') as fout:
        for cell in nb.get('cells', []):
            if cell.get('cell_type') == 'code':
                source = ''.join(cell.get('source', []))
                if source.strip():
                    fout.write("------- CELL -------\n")
                    fout.write(source + "\n")

if __name__ == '__main__':
    extract_notebook(sys.argv[1], sys.argv[2])
