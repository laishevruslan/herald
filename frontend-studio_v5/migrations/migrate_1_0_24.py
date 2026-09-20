# Release 1.0.24
# Create a tag file with i18n included

import sys
import os
import json


def load_i18n(filepath):

    with open(filepath, 'r') as f:
        i18n_data = json.load(f)

        return i18n_data

def save_i18n(filepath, i18n_data):
    with open(filepath, 'w') as f:
        json.dump(i18n_data, f, indent=2, ensure_ascii=False)


if __name__ == '__main__':

    if len(sys.argv) != 2:
        print('Usage: python3 migrate_1_0_24.py <path_to_local>')
        sys.exit(1)

    path_to_local = sys.argv[1]

    json_files = os.listdir(os.path.join(path_to_local, 'i18n'))

    all_tags = {}
    for lang in json_files:
        i18n_code = lang[:-5]
        i18n_data = load_i18n(os.path.join(path_to_local, 'i18n', lang))
        if not 'tags' in i18n_data:
            continue
        all_tags[i18n_code] = i18n_data['tags']
        del i18n_data['tags']
        save_i18n(os.path.join(path_to_local, 'i18n', lang), i18n_data)


    tags_dict = {}
    for i18n_code, tags in all_tags.items():
        for tag, translation in tags.items():
            print(tag, translation)
            if not tag in tags_dict: tags_dict[tag] = {}
            tags_dict[tag][i18n_code] = translation

    with open(os.path.join(path_to_local, 'data', 'tags.json'), 'w') as f:
        json.dump({ 'version': '1.0.23', 'tags': tags_dict}, f, indent=2, ensure_ascii=False)
