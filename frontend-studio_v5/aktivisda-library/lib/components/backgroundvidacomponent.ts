'use strict';

import { Uuid, ComponentOptions, DocumentParams, PdfFormat, ImageOptions, DocumentOptions } from '../typing.ts';

import AbstractVidaComponent from './abstractvidacomponent.ts';
import ImageVidaComponent from './imagevidacomponent.ts';

import Vida from '../vida.ts'
import Konva from 'konva';

// Warning: 100000000 is too big in "headless mode"
const maxInt = 1000000;

export default class BackgroundVidaComponent extends AbstractVidaComponent {
    inPromise: boolean
    backgroundComponent: ImageVidaComponent;

    konvaGroup: Konva.Group | undefined;
    konvaClipper: Konva.Group | undefined;
    konvaClipperRect: Konva.Rect | undefined;

    width: number;
    height: number;

    constructor(vida: Vida, componentId: Uuid) {
        super(vida, componentId);
        this.backgroundComponent = new ImageVidaComponent(vida, componentId);
        this.inPromise = false;

        this.width = 0;
        this.height = 0;
    }

    randomOptions(): DocumentOptions {
        return { background: this.backgroundComponent.randomOptions('internalsvg').image }
    }

    select() {
        // nothing to do
    }

    unselect() {
        // nothing to do
    }

    bringClipperForward() {
        if (!this.konvaClipper || !this.konvaClipper.parent) return;
        this.konvaClipper.setZIndex(this.konvaClipper.parent.children!.length - 1);
    }

    toJson() {
        if (!this.backgroundComponent || !this.backgroundComponent.image) return {};
        return this.backgroundComponent.image.toJson();
    }

    async toPdf(): Promise<PdfFormat | undefined> {
        if (!this.backgroundComponent) return undefined;
        return await this.backgroundComponent.toPdf();
    }

    destroy() {
        if (this.konvaGroup) this.konvaGroup.destroy();
        if (this.konvaClipper) this.konvaClipper.destroy();
    }

    sendBackward() {
        if (!this.backgroundComponent.konvaElement) return;
        if (!this.konvaGroup) return;
        this.backgroundComponent.update({ zIndex: 0 }, {});
        this.konvaGroup.setAttrs({ zIndex: 0 });
        this.vida.draw();
    }

    internalUpdate(options: ComponentOptions, document: DocumentParams): Promise<boolean|void> {

        return new Promise<void>((resolve) => {
            if (this.inPromise) {
                resolve();
                return;
            }
            if (!this.konvaGroup) {
                this.konvaGroup = new Konva.Group();
                this.vida.registerTransformer(this.konvaGroup);
                this.konvaGroup.on('pointerclick', (evt: any) => {
                    if (this.vida.isSelected(this.id()))
                        return;
                    evt.cancelBubble = true;
                    this.vida.selectComponent(this.id());
                });
                this.vida.registerComponent(this.konvaGroup);

            }

            if (!this.konvaClipper) {
                this.konvaClipper = new Konva.Group();
                // A big "gray" rect which is cut using the
                // Clip function defined bellow (in update fonction)
                this.konvaClipperRect = new Konva.Rect({
                    x: -maxInt,
                    y: -maxInt,
                    width: 2 * maxInt,
                    height: 2 * maxInt,
                    fill: '#aeaeae',
                    listening: false,
                    opacity: 0.8,
                });
                this.konvaClipper.add(this.konvaClipperRect);
                this.vida.registerTransformer(this.konvaClipper);
            }

            this.backgroundComponent
            .update(
                    // WARNING HERE!!
                    { id: this.options.id!, zIndex: 0, scale: 100, position: { x: 0.5, y: 0.5 }, image: <ImageOptions><any>options.background! },
                    document,
                )
                .then((konvaElementCreated) => {
                    if (konvaElementCreated) {
                        this.konvaGroup!.add(this.backgroundComponent.konvaElement!);
                    }
                    if (konvaElementCreated ||
                        (options.width && (!this.width || this.width !== options.width)) ||
                        (options.height && (!this.height || this.height !== options.height))
                    ) {
                        if (options.width) this.width = options.width;
                        if (options.height) this.height = options.height;

                        // Do not show the image outside the document zone
                        this.konvaGroup!.setAttrs({
                            clipX: 0,
                            clipY: 0,
                            zIndex: 0,
                            clipWidth: this.width,
                            clipHeight: this.height,
                        });

                        // Do not show the "gray wall" inside the document zone
                        // Warning: cliping will fail in headless mode
                        // if maxint is toobig
                        const { x, y } = this.konvaGroup!.getPosition()
                        this.konvaClipper!.clipFunc(ctx => {
                            // Top
                            ctx.rect(-maxInt, -maxInt, 2 * maxInt, maxInt - y);
                            // Left
                            ctx.rect(-maxInt, -maxInt, maxInt - x, 2*maxInt);

                            // Bottom
                            ctx.rect(x, y + this.height, 2*maxInt, 2*maxInt);

                            // Right
                            ctx.rect(x + this.width, y, 2*maxInt, 2*maxInt);
                        });
                    }

                    this.bringClipperForward();
                    this.vida.draw();
                    resolve();
                });
        });
    }
}
