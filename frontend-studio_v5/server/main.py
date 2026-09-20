from flask import Flask, request, send_file, jsonify, make_response
from flask_cors import CORS
import jwt
from images_manipulator import PngFile, SvgFile, JpgFile
from dotenv import load_dotenv
from functools import wraps
import os

load_dotenv()

import tempfile

def create_app():
    app = Flask(__name__)
    app.config.update(SECRET_KEY=os.environ.get('SECRET_KEY'))

    USERS = os.environ.get('USERS').split(',')

    CORS(app)

    # Authentication decorator
    def token_required(f):
        @wraps(f)
        def decorator(*args, **kwargs):
            token = None
            # ensure the jwt-token is passed with the headers
            if 'x-access-token' in request.headers:
                token = request.headers['x-access-token']
            if not token:  # throw error if no token provided
                return make_response(jsonify({"message": "A valid token is missing!"}), 401)
            try:
            # decode the token to obtain user public_id
                data = jwt.decode(
                    token, app.config['SECRET_KEY'], algorithms=['HS256'])
                if not data['aktivisda_user'] in USERS:
                    return make_response(jsonify({"message": "Invalid token!"}), 401)
                app.logger.info(f'Request { f.__name__}  for user { data["aktivisda_user"]}')
            except Exception as e:
                return make_response(jsonify({"message": "Invalid token!"}), 401)
            # Return the user information attached to the token
            return f(*args, **kwargs)
        return decorator

    @app.route('/', methods=['GET'])
    def hello_world():
        return "hello world"


    @app.route("/vectorize", methods=['POST'])
    @token_required
    def vectorize():
        if request.method == 'POST':
            print('53')
            f = request.files['image']
            assert f.filename.endswith('.png')

            tempfilename = tempfile.NamedTemporaryFile(delete=True, suffix='.png').name
            f.save(tempfilename)

            png_file = PngFile(tempfilename)
            png_file._is_temporary_file = True

            nb_colors = int(request.args.get('nb_colors', 1))
            white_is_alpha = request.args.get('white_is_alpha', 'false') == 'true'
            svg_file = png_file.to_svg(nb_colors=nb_colors, white_is_alpha=white_is_alpha)
            svg_file._is_temporary_file = False
            svg_file.format_colors()
            return send_file(svg_file.filepath, mimetype='image/svg+xml')


    @app.route("/canonize", methods=['POST'])
    @token_required
    def canonize():
        if request.method == 'POST':

            f = request.files['image']
            assert f.filename.endswith('.svg')

            tempfilename = tempfile.NamedTemporaryFile(delete=True, suffix='.svg').name
            f.save(tempfilename)

            svg_file = SvgFile(tempfilename)
            svg_file._is_temporary_file = True
            svg_file.canonize()

            return send_file(svg_file.filepath, mimetype='image/svg+xml')


    @app.route("/posterize", methods=['POST'])
    @token_required
    def posterize():
        if request.method == 'POST':

            f = request.files['image']
            assert f.filename.endswith('.png')

            tempfilename = tempfile.NamedTemporaryFile(delete=True, suffix='.png').name
            f.save(tempfilename)

            png_file = PngFile(tempfilename)
            png_file._is_temporary_file = True
            nb_colors = int(request.args.get('nb_colors', 1))
            white_is_alpha = request.args.get('white_is_alpha', 'false') == 'true'
            posterized_file = png_file.posterize(nb_colors=nb_colors, white_is_alpha=white_is_alpha)[0]
            return send_file(posterized_file.filepath, mimetype='image/png')


    @app.route("/hitform", methods=['POST'])
    @token_required
    def hitpath():
        if request.method == 'POST':

            f = request.files['image']
            assert f.filename.endswith('.svg')

            tempfilename = tempfile.NamedTemporaryFile(delete=True, suffix='.svg').name
            f.save(tempfilename)

            svg_file = SvgFile(tempfilename)
            svg_file._is_temporary_file = True
            hitpath = svg_file.compute_hitpath()

            return jsonify(hitpath=hitpath)


    @app.route("/hull", methods=['POST'])
    @token_required
    def hull():
        if request.method == 'POST':

            hull = request.files['image']
            assert hull.filename.endswith('.svg')

            tempfilename = tempfile.NamedTemporaryFile(delete=True, suffix='.svg').name
            hull.save(tempfilename)

            svg_file = SvgFile(tempfilename)
            svg_file.canonize()
            hull = svg_file.compute_hull()

            return jsonify(hull=hull)


    @app.route("/preview", methods=['POST'])
    @token_required
    def preview():

        if request.method == 'POST':
            image = request.files['image']
            extension = os.path.splitext(image.filename)[1]
            tempfilename = tempfile.NamedTemporaryFile(delete=True, suffix=extension).name
            image.save(tempfilename)

            if extension == '.svg':
                svg_file = SvgFile(tempfilename)
                png_file = svg_file.to_png(minimum_size=120)
                png_file.compress()
                return send_file(png_file.filepath, mimetype='image/png')

            elif extension == '.jpg':
                jpg_file = JpgFile(tempfilename)
                jpg_file.resize(120, 120)
                jpg_file.compress()
                return send_file(jpg_file.filepath, mimetype='image/jpg')

            elif extension == '.png':
                png_file = PngFile(tempfilename)
                png_file.resize(120, 120)
                png_file.compress()
                return send_file(png_file.filepath, mimetype='image/png')

            return make_response(jsonify({"message": f"Unknown file extension { extension }"}), 400)


    @app.route("/thumbnail", methods=['POST'])
    @token_required
    def thumbnail():

        if request.method == 'POST':
            image = request.files['image']
            extension = os.path.splitext(image.filename)[1]
            assert extension in ('.png', '.jpg', '.jpeg')

            tempfilename = tempfile.NamedTemporaryFile(delete=True, suffix=extension).name
            image.save(tempfilename)

            if extension == '.png':
                image_file = PngFile(tempfilename)
            elif extension == '.jpg' or extension == '.jpeg':
                image_file = JpgFile(tempfilename)

            webp_file = image_file.to_webp(width=100, height=110)
            # webp_file.compress()
            return send_file(webp_file.filepath, mimetype='image/webp')
    return app

if __name__ == '__main__':
    app = create_app()