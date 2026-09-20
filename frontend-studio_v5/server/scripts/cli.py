# for testing
from images_manipulator import PngFile, SvgFile

def canonize(filename):
    svg_file = SvgFile(filename)
    svg_file.canonize()

