# Release 1.0.26
# Add tags to colors.json and add version into it

import sys
import os
import json


if __name__ == '__main__':

    if len(sys.argv) != 2:
        print('Usage: python3 migrate_1_0_26.py <path_to_local>')
        sys.exit(1)

    path_to_local = sys.argv[1]

    with open(os.path.join(path_to_local, 'data', 'colors.json'), 'r') as f:
        colors = [ { 'tags': [], 'html': x['html'] } for x in json.load(f)]


    with open(os.path.join(path_to_local, 'data', 'colors.json'), 'w') as f:
        json.dump({ 'version': '1.0.26', 'colors': colors}, f, indent=2, ensure_ascii=False)
