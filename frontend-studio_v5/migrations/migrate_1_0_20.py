# Release 1.0.20
# templates.json had been updated to support tags and versions
import sys
import json
import os
import subprocess
import shutil

def update_templates_json(json_filename):
    json_dir = os.path.dirname(json_filename)
    print(json_dir)
    old_json = json.load(open(json_filename, "r"))

    data = {
        'version': '1.0.20',
        'templates': old_json
    }

    for k, _ in enumerate(data['templates']):
        data['templates'][k]['tags'] = ''
        data['templates'][k]['label'] = { }
        if 'description' in data['templates'][k]:
            data['templates'][k]['label'] = {
                'fr': data['templates'][k]['description']
            }
            del data['templates'][k]['description']

        template_filename = os.path.join(json_dir, '..', 'templates', data['templates'][k]['filename'])
        template_json = json.load(open(template_filename, "r"))
        data['templates'][k]['width'] = template_json['document']['width']
        data['templates'][k]['height'] = template_json['document']['height']

    json.dump(data, open(json_filename, 'w'), indent=2, ensure_ascii=False)
    
def create_templates_thumbnails(path_to_previews_ancester):
    path_to_previews = os.path.join(path_to_previews_ancester, 'previews')
    path_to_thumbnails = os.path.join(path_to_previews_ancester, 'thumbnails')

    shutil.rmtree(path_to_thumbnails)
    os.mkdir(path_to_thumbnails)
    for preview in os.listdir(path_to_previews):
        if not preview.endswith('.jpg') and not preview.endswith('.png'):
            print('unsupported preview', preview)
            return
        preview_path = os.path.join(path_to_previews, preview)
        thumbnail_path = os.path.join(path_to_thumbnails, preview)
        command = f'convert { preview_path} -density 72x72 -resize 110x100 { thumbnail_path }'
        subprocess.call(command, shell=True)

        if thumbnail_path.endswith('jpg'):
            command = f'jpegoptim  { thumbnail_path }'
            subprocess.call(command, shell=True, stdout=subprocess.DEVNULL)

        thumbnail_webppath = thumbnail_path[:-3] + 'webp'
        command = f'cwebp -q 100 { thumbnail_path } -o { thumbnail_webppath }'
        subprocess.call(command, shell=True, stdout=subprocess.DEVNULL)
        os.remove(thumbnail_path)

if __name__ == '__main__':


    if len(sys.argv) != 2:
        print('Usage: python3 migrate_1_0_20.py <old_json_template filename>')
        sys.exit(1)


    old_json_filename = sys.argv[1]
    json_dir = os.path.dirname(old_json_filename)

    update_templates_json(old_json_filename)
    create_templates_thumbnails(os.path.join(json_dir, '..', '..', 'static', 'templates'))
    create_templates_thumbnails(os.path.join(json_dir, '..', '..', 'static', 'backgrounds'))
    create_templates_thumbnails(os.path.join(json_dir, '..', '..', 'static', 'symbols'))

