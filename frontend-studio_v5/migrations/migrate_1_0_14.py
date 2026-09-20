# Release 1.0.13
# backgrounds.json had been updated and now prints .svg
import sys
import json

def update_data_json(json_filename, data_type):
    old_json = json.load(open(json_filename, "r"))

    data = {
        'version': '1.0.14',
        data_type: old_json
    }

    for k, _ in enumerate(data[data_type]):
        data[data_type][k]['type'] = 'internalsvg'

    json.dump(data, open(json_filename, 'w'), indent=2)
    

if __name__ == '__main__':


    if len(sys.argv) != 3:
        print('Usage: python3 migrate_1_0_14.py <old_json_filename> symbols/backgrounds')
        sys.exit(1)


    old_json_filename = sys.argv[1]
    data_type = sys.argv[2]

    update_data_json(old_json_filename, data_type)