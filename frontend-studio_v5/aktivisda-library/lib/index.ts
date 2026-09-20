import Vida from './vida.ts';
import QrcodeVidaSubComponent from './components/qrcodesubcomponent.ts';
import { svgToDom, extractColors, extractDimensions, loadSvg, colorSvgString, prepareColors, computeCoverSize } from './utils/svgutils.ts';
import { computeRandomDistortedSquare } from './utils/geometry.ts';
import { jsonToURI, stringifyQuery, generateId, overrideValues, pSBC, extractBestTranslation} from './utils/utils.ts'

import compressImage from './compress'

export { Vida, QrcodeVidaSubComponent, svgToDom, extractColors, extractDimensions, loadSvg, colorSvgString, prepareColors, computeCoverSize, computeRandomDistortedSquare, jsonToURI, generateId, stringifyQuery, compressImage, overrideValues, pSBC, extractBestTranslation};