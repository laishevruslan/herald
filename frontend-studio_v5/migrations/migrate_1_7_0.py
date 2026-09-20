# Release 1.0.26
# Add tags to colors.json and add version into it

import sys
import os
import json
import shutil
from dotenv import load_dotenv

if __name__ == '__main__':

    if len(sys.argv) != 2:
        print('Usage: python3 migrate_1_7_0.py <path_to_local>')
        sys.exit(1)

    path_to_local = sys.argv[1]

    # .env.backtivisda
    load_dotenv('.env.backtivisda')

    os.remove('.env.backtivisda')
    os.remove('.env.aktivisda')

    # Config.json
    os.rename(os.path.join(path_to_local, 'local', 'localconfig.json'), os.path.join(path_to_local, 'local', 'config.json'))
    with open(os.path.join(path_to_local, 'local', 'config.json'), 'r') as f:
        config = json.load(f)

    config["gitlab"] = {
        "projectId": os.environ.get("VUE_APP_GITLAB_PROJECT_ID"),
        "url": os.environ.get("VUE_APP_GITLAB_URL"),
        "repo": os.environ.get("VUE_APP_GITLAB_REPO_URL"),
        "branch": "main"
    }

    config["backtivisda"] = {
        "server": os.environ.get("VUE_APP_SERVER_URL")
    }

    with open(os.path.join(path_to_local, 'local', 'config.json'), 'w') as f:
        new_config = {
            "version": "1.7.0",
            "config": config,
        }
        json.dump(new_config, f, indent=2, ensure_ascii=False)

    with open(os.path.join(path_to_local, 'local', 'data', 'formats.json'), 'r') as f:
        formats = json.load(f)
        print(formats)

    # i18n files
    translations = {}
    langs = os.listdir(os.path.join(path_to_local, 'local', 'i18n'))
    for lang in langs:
        with open(os.path.join(path_to_local, 'local', 'i18n', lang), 'r') as f:
            lang_code = lang.split('.')[0]
            messages = json.load(f)
            if 'formats' in messages:
                for k in messages['formats']:
                    if k not in translations: translations[k] = {}
                    translations[k][lang_code] = messages['formats'][k]

    print(translations)
    for k, f in enumerate(formats):
        key = f['id']
        if key in translations:
            formats[k]['label'] = translations[key.lower()]
        else:
            formats[k]['label'] = {}

    with open(os.path.join(path_to_local, 'local', 'data', 'formats.json'), 'w') as f:
        json.dump(formats, f, indent=2, ensure_ascii=False)

    shutil.rmtree(os.path.join(path_to_local, 'local', 'i18n'))

    with open(os.path.join(path_to_local,  'package.json'), 'r') as f:
        package = json.load(f)

    with open(os.path.join(path_to_local, 'package.json'), 'w') as f:
        package["scripts"]["ansible:server"] = "pwd=$(pwd);cd aktivisda-core/ansible-playbooks;ansible-playbook create-server.yml -e @$(echo $pwd)/_ansible/vars.yml -i $(echo $pwd)/_ansible/hosts"
        json.dump(package, f, indent=2, ensure_ascii=False)


