'use strict';
import { Uuid, ComponentOptions, DocumentParams, ImageComponentType, ComponentType, PdfFormat, Rule } from '../typing.ts';
import { assignValues } from '../utils/utils.ts';

import { computeAbsolutePosition, pxToPt } from '../utils/positionutils.js';

import Vida from '../vida.ts'
import AbstractVidaComponent from './abstractvidacomponent.js';
import InternalSvgVidaSubComponent from './internalsvgsubcomponent.ts';
import QrcodeVidaSubComponent from './qrcodesubcomponent.ts';
import PhotoVidaSubComponent from './photosubcomponent.ts';
import ImageVidaSubComponent from './imagevidasubcomponent.ts';

import _get from 'lodash.get'

import Konva from 'konva';
import InvalidDataError from '../invaliddataerror.ts';

import { svgToDom } from '../utils/svgutils.ts';
import { computeRotatedViewbox, degToRadian } from '../utils/geometry.ts';

export default class ImageVidaComponent extends AbstractVidaComponent {

    selected: boolean;
    image: undefined | ImageVidaSubComponent
    type: ComponentType

    inPromise: boolean;

    declare konvaElement: Konva.Image | undefined;

    constructor(vida: Vida, componentId: Uuid) {
        super(vida, componentId);
        this.selected = false;
        this.image = undefined;

        this.type = 'image'
        this.options.type = 'image';

        this.inPromise = false;
    }

    randomOptions(imageType: ImageComponentType)
        : ComponentOptions {

        if (this.image !== undefined) {
            if (this.image.type !== imageType)
                delete this.image
        }

        if (this.image === undefined) {
            switch (imageType) {
                case 'internalsvg': {
                    this.image = new InternalSvgVidaSubComponent(this.vida);
                    break;
                }
                case 'qrcode': {
                    this.image = new QrcodeVidaSubComponent(this.vida);
                    break;
                }
                case 'internalphoto': {
                    this.image = new PhotoVidaSubComponent(this.vida, 'internalphoto');
                    break;
                }
                default:
                    throw Error('Not implemented');
            }
        }

        return {
            type: 'image',
            image: this.image.randomOptions(),
            scale: 20,
            position: { x: 0.5, y: 0.5 },
            angle: 0,
        };
    }

    toJson() {
        if (!this.konvaElement) return {};
        // return { ...this.options, image: this.image?.toJson() || undefined }
        const result = {
            id: this.id(),
            type: 'image',
            scale: this.options.scale!,
            image: this.image === undefined ? undefined : this.image.toJson(),
            position: this.options.position,
            angle: this.options.angle!,
            zIndex: this.zIndex(),
            i18n: this.options.i18n,
            rules: this.options.rules !== undefined ? this.options.rules : {},
        };
        return result;
    }

    async toPdf(): Promise<PdfFormat | undefined> {
        if (!this.konvaElement) return undefined;
        const { x, y } = computeAbsolutePosition(this.displayedPosition, this.documentSize!);
        const r = {
            absolutePosition: {
                x: pxToPt(x - this.konvaElement.width() / 2),
                y: pxToPt(y - this.konvaElement.height() / 2),
            },
            width: pxToPt(this.konvaElement.width()),
            height: pxToPt(this.konvaElement.height()),
            svg: ''
        };

        const angle = this.currentAngle()!;
        if (angle != 0) {
            const { width, height } = computeRotatedViewbox(0, 0, this.konvaElement.width(), this.konvaElement.height(), degToRadian(angle));
            r.width = pxToPt(width);
            r.height = pxToPt(height);
            r.absolutePosition.x = pxToPt(x - width / 2);
            r.absolutePosition.y = pxToPt(y - height / 2);
        }

        r.svg = await this.image!.imageToSvg();
        if (angle != 0) {
            const dom = svgToDom(r.svg);
            const svgElement = <SVGSVGElement><any>dom.documentElement;
            const viewBox = svgElement.getAttribute('viewBox')?.split(' ')
                .map((x) => parseInt(x));
            if (viewBox === undefined || viewBox.length !== 4) {
                throw new InvalidDataError('Undefined viewbox while rotating svg inside toPdf')
            }
            const { bottom_left, width, height } = computeRotatedViewbox(
                viewBox[0],
                viewBox[1],
                viewBox[2],
                viewBox[3],
                degToRadian(angle)
            );

            svgElement.setAttribute('width', width.toString())
            svgElement.setAttribute('height', height.toString())
            svgElement.setAttribute('viewBox', `${bottom_left[0]} ${bottom_left[1]} ${width} ${height}`)
            r.svg = `
            <svg width="${width}" height="${height}" viewBox="${bottom_left[0]} ${bottom_left[1]} ${width} ${height}">
                <g transform="rotate(${ angle })">
                    ${ svgElement.innerHTML }
                </g>
                </svg>
                `
        }

        return {
            content: [r],
            status: 'ok',
        }
    }

    select() {
        if (_get(this.options.rules, 'self.fixed') === true) {
            return;
        }

        if (!this.konvaElement) return;
        this.selected = true;
        if (!this.konvaTransformer) {
            this.konvaTransformer = new Konva.Transformer({
                resizeEnabled: true,
                rotateEnabled: true,
                enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
                keepRatio: true,
            });
        }
        this.konvaTransformer.nodes([this.konvaElement]);
        this.vida.registerTransformer(this.konvaTransformer);

        this.konvaTransformer.resizeEnabled(_get(this.options.rules, 'size.fixed') !== true)
        this.konvaTransformer.rotateEnabled(_get(this.options.rules, 'angle.fixed') !== true)
        this.konvaElement.setDraggable(_get(this.options.rules, 'position.fixed') !== true
            && (_get(this.options.rules, 'position.properties.x.fixed') !== true || _get(this.options.rules, 'position.properties.y.fixed') !== true));

        this.vida.draw();
    }

    unselect() {
        this.selected = false;
        if (this.konvaElement) this.konvaElement.setDraggable(false);
        if (this.konvaTransformer) this.konvaTransformer.detach();
    }

    destroy() {
        if (this.konvaElement) this.konvaElement.destroy();
    }

    internalUpdate(options: ComponentOptions, document: Partial<DocumentParams>)
        :Promise<boolean> {
        // if (options.image && !options.image.type) options.image.type = 'internalsvg'
        return new Promise((resolve, reject) => {
            if (this.inPromise) {
                resolve(false);
                return;
            }

            if (!options) {
                resolve(false);
                return;
            }

            // Pas bon
            console.assert(this.image || (options.image && options.image.type));
            if (!this.image || (options.image && options.image.type && this.image.type !== options.image.type)) {
                if (options.image === undefined) {
                    throw new Error(`options.image should be defined in the first run of update`)
                }

                if (this.image) {
                    delete this.image;
                    this.image = undefined;
                }
                if (options.image.type === 'internalsvg') {
                    this.image = new InternalSvgVidaSubComponent(this.vida);
                } else if (options.image.type === 'qrcode') {
                    this.image = new QrcodeVidaSubComponent(this.vida);
                    // TODO do not recreate image if options changed from internalphoto to urlphoto
                } else if (options.image.type === 'urlphoto') {
                    this.image = new PhotoVidaSubComponent(this.vida, 'urlphoto');
                } else if (options.image.type === 'internalphoto') {
                    this.image = new PhotoVidaSubComponent(this.vida, 'internalphoto');
                } else {
                    // TODO invalidatedateerror
                    throw new Error(`Unknown option ${options.image.type}`);
                }
            }

            this.inPromise = true;
            this.image!
                .update(options.image)
                .then(() => {
                    const documentDimensionChanged =
                        !this.documentSize ||
                        (document && (
                            this.documentSize.width !== document.width && document.width !== undefined
                            ||
                            this.documentSize.height !== document.height && document.height !== undefined));

                    if (
                        documentDimensionChanged ||
                        this.image!.recomputeImage ||
                        options.scale !== undefined && Math.abs(options.scale - this.currentScale()) > 0.05
                    ) {
                        this.image!.recomputePosition = true;

                        if (this.documentSize === undefined) {
                            if (document.width === undefined || document.height === undefined) {
                                if (document.width === undefined) document.width = 0;
                                if (document.height === undefined) document.height = 0;
                                console.warn(`Please provide valid document dimensions for while documentisize is not setup`);
                            }
                            this.documentSize = { width: document.width!, height: document.height! };
                        }

                        if (document && document.width) this.documentSize!.width = document.width;
                        if (document && document.height) this.documentSize!.height = document.height;

                        const ratioWidth = this.documentSize!.width / this.image!.originalSize.width;
                        const ratioHeight = this.documentSize!.height / this.image!.originalSize.height;

                        const ratio = (this.optionsScale() / 100) * Math.max(ratioWidth, ratioHeight);
                        this.image!.recomputeImage = false;

                        const imageWidth = ratio * this.image!.originalSize.width;
                        const imageHeight = ratio * this.image!.originalSize.height;
                        this.inPromise = true;

                        this.image!.makeImage(imageWidth, imageHeight).then(() => {
                            const previousAngle = this.currentAngle();
                            if (this.konvaElement) this.konvaElement.destroy();
                            this.konvaElement = new Konva.Image({ draggable: false, image: this.image!.image() });

                            this.konvaElement.on('pointerclick', (evt: any) => {
                                if (this.vida.isSelected(this.id())) return;
                                evt.cancelBubble = true;
                                this.vida.selectComponent(this.id());
                            });
                            this.konvaElement.on('dragend', () => {
                                this.adjustPosition();
                            });
                            this.konvaElement.on('transformend', () => {
                                this.adjustSizeAndAngle();
                            });

                            this.vida.registerComponent(this.konvaElement);
                            if (this.selected) {
                                this.unselect();
                                this.select();
                            }

                            this.konvaElement.setAttrs({
                                width: imageWidth,
                                height: imageHeight,
                                scaleX: 1,
                                scaleY: 1,
                                zIndex: this.zIndex(),
                                hitFunc: this.image!.makeHitformFunction(ratio),
                                rotation: options.angle !== undefined ? options.angle : previousAngle
                            });

                            this.inPromise = false;
                            const copyOptions: ComponentOptions = {};
                            // We don't want to edit template inplace
                            assignValues(copyOptions, options, undefined);
                            if (copyOptions.scale !== undefined) delete copyOptions.scale;
                            this.internalUpdate(copyOptions, document)
                                .then(() => resolve(true))
                                .catch((err) => reject(err));
                        });
                        return;
                    }

                    if ((document !== null && document.i18n !== undefined && document.i18n.editingLocale !== undefined) || options.rules !== undefined) {
                        if (this.konvaTransformer) {
                            this.konvaTransformer.resizeEnabled(_get(this.options.rules, 'size.fixed') !== true);
                            this.konvaTransformer.rotateEnabled(_get(this.options.rules, 'angle.fixed') !== true);
                            this.konvaElement!.setDraggable(_get(this.options.rules, 'position.fixed') !== true
                                && (_get(this.options.rules, 'position.properties.x.fixed') !== true || _get(this.options.rules, 'position.properties.y.fixed') !== true));
                        }
                    }

                    if (options.angle !== undefined && options.angle !== this.currentAngle()) {
                        this.konvaElement!.rotation(options.angle!);
                    }

                    const positionChanged =
                        this.displayedPosition === undefined ||
                        (options.position !== undefined &&
                            ((options.position.x !== undefined && this.displayedPosition.x !== options.position.x) ||
                                (options.position.y !== undefined && this.displayedPosition.y !== options.position.y)));

                    if (!this.displayedPosition && !options.position) {
                        this.displayedPosition = { x: 0, y: 0 };
                    }

                    if (this.image!.recomputePosition || positionChanged || documentDimensionChanged) {
                        this.image!.recomputePosition = false;
                        if (document && document.width) this.documentSize!.width = document.width;
                        if (document && document.height) this.documentSize!.height = document.height;
                        if (options.position) {
                            if (options.position.x) this.displayedPosition.x = options.position.x;
                            if (options.position.y) this.displayedPosition.y = options.position.y;
                        }

                        const { x, y } = computeAbsolutePosition(this.displayedPosition, this.documentSize!);
                        this.konvaElement!.setAttrs({
                            x,
                            y,
                            offsetX: this.konvaElement!.width() / 2,
                            offsetY: this.konvaElement!.height() / 2,
                            zIndex: this.zIndex(),
                        });
                        this.vida.draw();
                    }

                    if (this.zIndex() !== this.konvaElement!.zIndex()) {
                        // https://konvajs.org/docs/groups_and_layers/zIndex.html#page-title
                        this.konvaElement!.zIndex(this.zIndex());
                        this.vida.draw();
                    }
                    this.inPromise = false;
                    resolve(false);
                })
                .catch((err: any) => reject(err));
        });
    }

    adjustPosition() {
        if (!this.konvaElement) return;
        this._backupCurrentState({});
        this._adjustPosition();
        if (this._cleanUndoHistory()) return;
        this.vida.onComponentUpdated(this.id());
    }

    adjustSizeAndAngle() {
        if (!this.konvaElement) return;
        this._backupCurrentState({});

        // TODO: adjust angle and size ?
        this._adjustAngle();

        let newScale = this.currentScale();

        const rule = _get(this.options.rules, 'scale', <Rule>{});
        let recomputeScale = false;
        if (rule.fixed !== undefined && rule.fixed) {
            newScale = this.optionsScale();
            recomputeScale = true;
        } else {
            if (rule.min !== undefined && newScale < rule.min) {
                newScale = rule.min;
                recomputeScale = true;
            }
            if (rule.max !== undefined && newScale > rule.max) {
                newScale = rule.max;
                recomputeScale = true;
            }
        }
        if (recomputeScale) {

            this.konvaElement.setAttrs({
                scaleX: newScale*this.konvaElement.scaleX()/this.currentScale(),
                scaleY: newScale*this.konvaElement.scaleY()/this.currentScale()
            })
        }

        if (Math.abs(newScale - this.optionsScale()) > 0.1) {
            if (this.editingLocale !== null) {
                this._appendToCurrentBackup({ i18n: { [this.editingLocale]: { scale: newScale } } });
                assignValues(this.options.i18n, { [this.editingLocale]: { scale: newScale } }, undefined);
            } else {
                this._appendToCurrentBackup({ scale: newScale });
                this.options.scale = this.currentScale();

            }
            if (newScale > this.optionsScale())
                this.internalUpdate({ scale: this.currentScale() }, this.documentSize);
        }
        // TODO: adjust position also backup position update
        // but it would be better for the user to have
        // only one state in undohistory for both scale and position
        // Otherwise undo behavior is a little bit strange
        this._adjustPosition();
        if (this._cleanUndoHistory()) return;
        this.vida.onComponentUpdated(this.id());
    }

    currentScale() {
        if (!this.konvaElement) return 0;
        const imageWidth = this.konvaElement.getWidth()*this.konvaElement.scaleX();
        const ratio = imageWidth / this.image!.originalSize.width;

        const ratioWidth = this.documentSize!.width / this.image!.originalSize.width;
        const ratioHeight = this.documentSize!.height / this.image!.originalSize.height;

        return 100*ratio/Math.max(ratioWidth, ratioHeight);
    }

    optionsScale(): number {
        if (this.editingLocale !== null && _get(this.options.i18n, `${this.editingLocale}.scale`) !== undefined)
            return <number>(<unknown>_get(this.options.i18n, `${this.editingLocale}.scale`));
        return this.options.scale!;
    }
}
