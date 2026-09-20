'use strict';
import { Uuid, Point, DocumentParams, ComponentOptions, Dimensions } from '../typing.ts';

import AbstractVidaComponent from './abstractvidacomponent.js';
import { computeAbsolutePosition, computeRelativePosition } from '../utils/positionutils.js';
// import { makeHitformFunction } from '../utils/svgutils.ts';

import Konva from 'konva';
import Vida from '../vida.ts'

// @ts-ignore
if (import.meta.env.MODE === 'headless') {
    var Image = (await import('canvas')).Image;
}
import { BlurFilter } from '../utils/blurfilters.ts';
export default class ShapeVidaComponent extends AbstractVidaComponent {
    position: Point;
    color: string;
    fillImage: undefined | Konva.Image;
    konvaShape: Konva.Shape | undefined;

    _recomputePosition: boolean;
    _recomputeImage: boolean;
    _inPromise: boolean;
    draw: boolean;

    documentSize: Dimensions;

    shapeType: 'circle' | undefined;
    shapeOptions: any;

    fillType: 'blur' | undefined;
    fillOptions: any;
    // TODO
    photo: any;

    declare konvaElement: Konva.Group | undefined;

    constructor(vida: Vida, componentId: Uuid) {
        super(vida, componentId);
        this.position = { x: 0, y: 0 };
        this.color = '';

        this.documentSize = { width: 0, height: 0 };
        this._recomputePosition = false;
        this._recomputeImage = false;
        this.draw = false;
        this._inPromise = false;

        this.shapeType = undefined;
        this.shapeOptions = {};

        this.fillType = undefined;
        this.fillOptions = {};
    }

    static randomOptions() {
        console.error('BROKEN, todo: reactive me');
    }

    toJson(): any {
        return {
            id: this.id(),
            type: 'shape',
            zIndex: this.zIndex(),
            position: this.position,

            shape: {
                type: this.shapeType,
                options: this.shapeOptions,
            },

            fill: {
                type: this.fillType,
                options: this.fillOptions,
            },

            i18n: this.options.i18n,
            rules: this.options.rules,
        };
    }

    async toPdf(): Promise<any> {}

    // TODO: use same code everywhere?
    select() {
        if (!this.konvaElement) return;
        if (!this.konvaTransformer) {
            this.konvaTransformer = new Konva.Transformer({
                resizeEnabled: true,
                rotateEnabled: true,
                enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
                boundBoxFunc: function (_oldBox, newBox) {
                    newBox.width = Math.max(1, newBox.width);
                    return newBox;
                },
                keepRatio: true,
            });
        }
        this.konvaTransformer.nodes([this.konvaElement]);
        this.vida.registerTransformer(this.konvaTransformer);
        this.konvaElement.setDraggable(true);
        this.vida.draw();
    }

    unselect() {
        if (this.konvaTransformer) this.konvaTransformer.detach();
    }

    destroy() {
        if (!this.konvaElement) return;
        this.konvaElement.destroy();
    }

    // TODO scale
    internalUpdate(options: ComponentOptions, document: Partial<DocumentParams>): Promise<void> {
        console.assert(options.type === undefined || options.type === 'shape');

        return new Promise<void>((resolve) => {
            if (this._inPromise) {
                resolve();
                return;
            }
            this._inPromise = true;

            if (!this.konvaElement) {
                this.konvaElement = new Konva.Group();

                this.konvaElement.on('pointerclick', (evt: any) => {
                    evt.cancelBubble = true;
                    if (this.vida.isSelected(this.id())) return;
                    this.vida.selectComponent(this.id());
                });

                this.konvaElement.on('dragend', (evt: any) => {
                    evt.cancelBubble = true;
                    this.vida.stage.listening(false);
                    this.vida.layer.listening(false);
                    this.adjustPosition().then(() => {
                        this.konvaElement!.on('pointermove', () => {});
                        this.vida.stage.listening(true);
                        this.vida.layer.listening(true);
                    });
                });

                // Manipulations are too heavy to be done on real time
                this.konvaElement.on('transformend', (evt: any) => {
                    evt.cancelBubble = true;
                    this.vida.stage.listening(false);
                    this.vida.layer.listening(false);

                    this.adjustSizeAndAngle().then(() => {
                        this.vida.stage.listening(true);
                        this.vida.layer.listening(true);
                    });
                    evt.cancelBubble = true;
                });

                this.konvaShape = new Konva.Shape();
                this.konvaElement.add(this.konvaShape);
                this.vida.registerComponent(this.konvaElement);
            }
            this.konvaElement.listening(false);
            // Very ugly
            const konvaShapeChanged =
                (options.shape !== undefined && options.shape.type !== undefined && options.shape.type !== this.shapeType) ||
                (options.shape !== undefined && this.shapeType === 'circle' && options.shape.options?.radius !== this.shapeOptions.radius);

            if (konvaShapeChanged) {
                if (options.shape?.type) this.shapeType = options.shape.type;
                if (options.shape?.options?.radius) this.shapeOptions.radius = options.shape.options.radius;

                let radius = this.shapeOptions.radius;

                this.konvaShape!.setAttrs({
                    sceneFunc: (ctx: any, shape: any) => {
                        ctx.beginPath();
                        ctx.ellipse(
                            shape.getAttr('width') / 2,
                            shape.getAttr('height') / 2,
                            shape.getAttr('width') / 2,
                            shape.getAttr('height') / 2,
                            Math.PI / 4,
                            0,
                            2 * Math.PI,
                        );
                        ctx.closePath();
                    },
                    width: 2 * radius,
                    height: 2 * radius,
                    x: -radius,
                    y: -radius,
                });
                this.konvaElement.scale({ x: 1, y: 1 });
                this.konvaShape!.cache();
                this._recomputeImage = true;
            }

            const documentDimensionChanged =
                document &&
                ((document.width !== undefined && this.documentSize.width !== document.width) ||
                    (document.height !== undefined && this.documentSize.height !== document.height));

            const positionChanged =
                this.position === undefined ||
                (options.position !== undefined &&
                    ((options.position.x !== undefined && this.position.x !== options.position.x) ||
                        (options.position.y !== undefined && this.position.y !== options.position.y)));

            if (this._recomputePosition || positionChanged || documentDimensionChanged) {
                this._recomputePosition = false;
                if (document && document.width) this.documentSize.width = document.width;
                if (document && document.height) this.documentSize.height = document.height;

                if (options.position) {
                    if (options.position.x) this.position.x = options.position.x;
                    if (options.position.y) this.position.y = options.position.y;
                }
                const { x, y } = computeAbsolutePosition(this.position, this.documentSize);

                this.konvaElement.setAttrs({
                    x: x,
                    y: y,
                });
                this._recomputeImage = true;
            }

            if (this.konvaTransformer !== undefined) {
                this.konvaTransformer.forceUpdate();
            }

            if (this.zIndex() !== this.konvaElement.zIndex()) {
                this.konvaElement.zIndex(this.zIndex());
                this.draw = true;
            }

            if (options.fill !== undefined && options.fill.type !== undefined && options.fill.type !== this.fillType) {
                this.fillType = options.fill.type;
                this._recomputeImage = true;
            }

            if (options.fill !== undefined && options.fill.options !== undefined && options.fill.options.size !== this.fillOptions.size) {
                this.fillOptions.size = options.fill.options.size;
                this._recomputeImage = true;
            }

            if (this._recomputeImage) {
                console.assert(this.fillType === 'blur');
                this._recomputeImage = false;
                this.recomputeImage().then(() => {
                    this.internalUpdate(options, this.documentSize).then(() => resolve());
                });
                return;
            }

            this.vida.layer.listening(true);
            this.konvaElement.listening(true);
            if (this.draw) {
                this.draw = false;
                this._inPromise = false;
                resolve();

                this.vida.draw();
            } else {
                this._inPromise = false;
                resolve();
            }
        });
    }

    recomputeImage() {
        return new Promise<void>((resolve) => {
            this.vida._exportingLayerMutex.acquire();
            this.vida.layer.setAttrs({
                clipFunc: (ctx: any) => {
                    ctx.beginPath();
                    // @ts-ignore
                    ctx.ellipse(
                        this.konvaElement!.x(),
                        this.konvaElement!.y(),
                        this.konvaShape!.width() / 2,
                        this.konvaShape!.height() / 2,
                        Math.PI / 4,
                        0,
                        2 * Math.PI,
                    );
                    ctx.closePath();
                },
            });
            const absolutePosition = this.konvaElement!.absolutePosition();
            let radius = this.shapeOptions.radius;

            let absoluteSize = 2 * radius * this.vida.stage.scale()!.x;

            const nodes = this.vida.stage.find('.blurred');
            nodes.map((node) => node.hide());

            const dataUrl = this.vida.stage.toDataURL({
                mimeType: 'image/png',
                x: absolutePosition.x - absoluteSize / 2,
                y: absolutePosition.y - absoluteSize / 2,
                width: absoluteSize,
                height: absoluteSize,
            });
            nodes.map((node) => node.show());

            this.vida.layer.setAttrs({ clipFunc: undefined });
            this.vida._exportingLayerMutex.release();

            if (this.fillImage !== undefined) {
                this.fillImage.destroy();
                this.fillImage = undefined;
            }

            // @ts-ignore
            if (import.meta.env.MODE === 'headless') this.photo = new Image();
            else this.photo = document.createElement('img');

            this.photo.onload = () => {
                this.fillImage = new Konva.Image({
                    name: 'blurred',
                    height: 2 * radius,
                    width: 2 * radius,
                    x: -radius,
                    y: -radius,
                    zIndex: 1000,
                    draggable: false,
                    image: this.photo,
                });

                this.konvaElement!.add(this.fillImage);
                this.fillImage.cache();
                const pixelSize = Math.ceil(2 * radius * this.fillOptions.size);
                this.fillImage.filters([BlurFilter(pixelSize)]);

                this.draw = true;
                this._inPromise = false;
                resolve();
            };

            this.photo.src = dataUrl;
        });
    }

    adjustPosition() {
        return new Promise<void>((resolve) => {
            if (!this.konvaElement) {
                resolve();
                return;
            }
            this.update(
                {
                    position: computeRelativePosition({ x: this.konvaElement.x(), y: this.konvaElement.y() }, this.documentSize!),
                },
                this.documentSize,
            ).then(() => resolve());

            // this.position = computeRelativePosition({ x: this.konvaElement.x(), y: this.konvaElement.y() }, this.documentSize!);
            this.vida.onComponentUpdated(this.id());
            return;
        });
    }

    adjustSizeAndAngle() {
        return new Promise<void>((resolve) => {
            if (!this.konvaElement) {
                resolve();
                return;
            }

            console.assert(Math.abs(this.konvaElement.scaleX() - this.konvaElement.scaleY()) < 0.001);

            console.assert(this.shapeType === 'circle');
            this.update(
                {
                    position: computeRelativePosition({ x: this.konvaElement.x(), y: this.konvaElement.y() }, this.documentSize!),
                    shape: { options: { radius: this.shapeOptions.radius * this.konvaElement.scaleX() } },
                },
                this.vida.documentParams(),
            ).then(() => resolve());
            this.vida.onComponentUpdated(this.id());
        });
    }
}