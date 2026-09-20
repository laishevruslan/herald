# Release 1.0.11
# fonts.json had been updated and now combine fonts.css and fonts.json
import json
import re
import sys
import os

def update_fonts_json(old_json_filename, old_css_filename, new_json_filename):

    def _parse_font(pattern, block):
        match = re.search(pattern, block, re.MULTILINE)
        if not match:
            return None
        element = match.group(1).strip()
        if element.startswith("'") or element.startswith('"'):
            element = element[1:-1]
        return element

    def _parse_font_url(url):
        url = url.strip()
        [url_part, format_part] = url.split(' ')
        url_part = url_part[5:-2]
        format_part = format_part[8:-2]
        return url_part

    def _extract_font_group(url):
        L = url.split('/')
        if L[0] == '.':
            return L[1]
        return L[0]


    old_json = json.load(open(old_json_filename, "r"))
    fonts = []

    with open(old_css_filename, 'r') as f:
        content = f.read()
        regex = r'(@font-face {(((\s*([font\-family|src|font\-weight|font\-style|font\-display|unicode\-range]*):([^;]*));)\s*)+})'
        matches = re.findall(regex, content)
        for match in matches:
            str_block = match[0]
            block = { 'css': {} }

            block['fontName'] = _parse_font(r'font-family:([^;]*);', str_block)
            block['css']['font-style'] = _parse_font(r'font-style:([^;]*);', str_block)
            block['css']['font-weight'] = _parse_font(r'font-weight:([^;]*);', str_block)
            block['css']['font-display'] = _parse_font(r'font-display:([^;]*);', str_block)
            block['css']['unicode-range'] = _parse_font(r'unicode-range:([^;]*);', str_block)
            urls = _parse_font(r'src:([^;]*);', str_block)

            if urls: 
                urls = urls.split(', ')
                block['formats'] = { }

                for url in urls:
                    url_part = _parse_font_url(url)
                    font_format = url_part.split('.')[-1]
                    filename = os.path.basename(url_part)
                    directory = os.path.dirname(url_part)
                    block['formats'][font_format] = filename
                    block['directory'] = directory
            # block['data'] = old_json[block['font-family']]
            # font_group = block['data']['fontGroup']
            # fonts[font_group] = []

            # fonts[font_group].append(block)
            print(block)
            fonts.append(block)

    for old_font in old_json:
        for k, new_font in enumerate(fonts):
            if new_font['fontName'] == old_font['fontName']:
                fonts[k]['name'] = old_font['name']
                fonts[k]['loaded'] = old_font['loaded']
                fonts[k]['italic'] = old_font['italic']
                fonts[k]['bold'] = old_font['bold']
                fonts[k]['alwaysLoaded'] = old_font['alwaysLoaded'] if 'alwaysLoaded' in old_font else True
                fonts[k]['default'] = old_font['default'] if 'default' in old_font else True
                break
        else:
            print(f'Error, found { new_font["fontName"] } not found')

    data = {
        'version': '1.0.11',
        'fonts': fonts
    }

    json.dump(data, open(new_json_filename, 'w'), indent=2)
    print(json.dumps(fonts, indent=4))
    os.remove(old_css_filename)
    

if __name__ == '__main__':


    if len(sys.argv) != 4:
        print('Usage: python3 migrate_1_0_11.py <old_json_filename> <old_css_filename> <new_json_filename>')
        sys.exit(1)


    old_json_filename = sys.argv[1]
    old_css_filename = sys.argv[2]
    new_json_filename = sys.argv[3]

    update_fonts_json(old_json_filename, old_css_filename, new_json_filename)