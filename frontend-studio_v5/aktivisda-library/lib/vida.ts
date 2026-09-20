'use strict';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

import { DocumentParams, DocumentOptions, MimeType, Template, ComponentOptions, Dimensions, Uuid, ImageGallery } from './typing.ts';

import compressImage from './compress';
import { stringifyQuery, jsonToURI, generateId, assignValues, cleanUndefined } from './utils/utils.ts';

import LZString from 'lz-string';

import AbstractVidaComponent from './components/abstractvidacomponent.ts';
import BackgroundVidaComponent from './components/backgroundvidacomponent.ts';
import TextVidaComponent from './components/textvidacomponent.ts';
import ImageVidaComponent from './components/imagevidacomponent.ts';

import InvalidDataError from './invaliddataerror.js';
import { computeRelativePosition, pxToPt } from './utils/positionutils.ts';

import Konva from 'konva';
import { toPdfDataUrl } from './utils/pdf.ts';

import packageFile from '../package.json';
import ShapeVidaComponent from './components/shapevidacomponent.ts';

import { Mutex } from 'async-mutex';

// @ts-ignore
import migrate from './migration/migrater.mjs';
import { Margins } from 'pdfmake/interfaces';

export default class Vida {
    document: DocumentParams;
    components: Array<AbstractVidaComponent>;
    background: BackgroundVidaComponent;
    documentSize: Dimensions;
    version: string | undefined;

    _selectedComponent: string | undefined;
    gallery: ImageGallery | undefined;

    layer: Konva.Layer;
    stage: Konva.Stage;

    _exportingLayerMutex: Mutex;

    constructor(canvasId: string) {
        const canvas = <HTMLCanvasElement>document.getElementById(canvasId);
        if (canvas === null) throw new InvalidDataError(`Please provid a valid HTML canvas. No element found with id: ${canvasId}`);
        const { width, height } = this.stageDimension(canvas);
        this.layer = new Konva.Layer({ draggable: true });

        this._exportingLayerMutex = new Mutex();

        // this.layer.toggleHitCanvas();
        this.stage = new Konva.Stage({
            container: canvasId,
            width: width,
            height: height,
        });
        const self = this;
        this.layer.on('pointerclick', function () {
            const pointerPos = self.layer.getRelativePointerPosition();
            if (pointerPos == null) return;
            const { x, y } = computeRelativePosition({ x: pointerPos.x, y: pointerPos.y }, self.documentSize);
            self.onClick(x, y);
        });

        this.stage.add(this.layer);
        this.layer.draw();

        const id = generateId();
        this.background = new BackgroundVidaComponent(this, id);
        this.document = {
            width: undefined,
            height: undefined,
            id: id,
            i18n: {
                defaultLocale: 'fr',
                displayedLocale: undefined,
                editingLocale: undefined,
            },
        };
        this.components = [];

        this._selectedComponent = undefined;
        this.version = packageFile.version;

        this.documentSize = { width: 1, height: 1 };
    }

    setGallery(gallery: ImageGallery) {
        this.gallery = gallery;
    }

    stageDimension(canvas: HTMLCanvasElement): Dimensions {
        const canvasParent = canvas.parentElement;
        if (canvasParent === null || canvasParent.nodeName === 'BODY' || canvasParent.clientWidth === 0 || canvasParent.clientHeight === 0) {
            return { width: canvas.width, height: canvas.height };
        }
        return {
            width: canvasParent.clientWidth,
            height: canvasParent.clientHeight,
        };
    }

    selectedComponent() {
        return this._selectedComponent;
    }

    selectComponent(componentId: Uuid) {
        if (this._selectedComponent && componentId === this._selectedComponent) return;
        if (this._selectedComponent && this._selectedComponent !== this.document.id) {
            this._findComponent(this._selectedComponent)!.unselect();
        }

        this._selectedComponent = componentId;
        this.onSelect(componentId);
        if (!componentId || componentId === this.document.id) return;
        this._findComponent(componentId)!.select();
    }

    isSelected(componentId: Uuid) {
        return this._selectedComponent && componentId === this._selectedComponent;
    }

    documentParams(): DocumentParams {
        return this.document;
    }

    componentsKeys(): Uuid[] {
        return this.components.map((component) => component.id());
    }

    componentExists(componentId: Uuid): boolean {
        if (componentId === this.document.id) return true;
        return this._findComponent(componentId) !== undefined;
    }

    componentParams(componentId: Uuid): ComponentOptions | DocumentParams {
        if (componentId === this.document.id) return this.documentParams();
        return this._findComponent(componentId)!.toJson();
    }

    componentAllowedActions(componentId: Uuid) {
        return this._findComponent(componentId)!.allowedActions();
    }

    toJson(): Template {
        const template = {
            version: this.version!,
            document: this.document,
            components: this.components.map((component) => component.toJson()),
        };
        cleanUndefined(template);
        return template;
    }

    /**
     * Create a representation of the current vida that can be
     * used by pdfmake to create a pdf representation of the
     * vida.
     * Should be used through toPdfDataUrl in utils/pdf.ts
     *
     * @returns a pdf representation
     */
    async _toPdfDescription() {
        let status = 'ok';


        const content = [];
        const bgPdf = await this.background.toPdf();
        console.assert(bgPdf !== undefined);
        content.push({ zIndex: -1, content: bgPdf!.content });
        if (bgPdf!.status === 'unsupported_option') status = 'unsupported_option';
        const result = await this.components.map(async (component) => {
            const componentPdf = await component.toPdf();
            if (componentPdf === undefined) return;
            for (const c of componentPdf.content) {
                content.push({ zIndex: component.zIndex(), content: c });
                if (c.status === 'unsupported_option') status = 'unsupported_option';
            }
            return undefined;
        });
        await Promise.all(result);

        content.sort((a, b) => a.zIndex - b.zIndex);
        const description: TDocumentDefinitions = {
            compress: false,
            pageSize: {
                width: pxToPt(this.document.width!),
                height: pxToPt(this.document.height!),
            },
            pageMargins: <Margins>[0, 0, 0, 0],
            // sort components by zindex ??
            content: content.map((a) => a.content),
        }
        return {
            description,
            status: status,
        };
    }

    /**
     * Export the vida image to a dataUrl pdf
     * using pdfmake.
     */
    toPdf(fonts: any): Promise<string> {
        return new Promise((resolve, reject) => {
            this._toPdfDescription().then((desc) => {
                if (desc.status !== 'ok') {
                    reject();
                }
                toPdfDataUrl(desc.description, fonts)
                    .then((r) => {
                        resolve(r);
                    })
                    .catch((err) => reject(err));
            });
        });
    }

    /**
     * Export the vida image to a dataUrl image in the given
     * MimeType (currently only support image/png and image/jpeg)
     *
     * Image is also compressed locally using JpegOptim or Oxipng.
     * Uncompressed image is returned in case of error.
     *
     * This is done internaly by creating a new Html5CanvasElement
     *
     */
    toImage(mimeType: MimeType): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let { width, height } = this.documentParams();
            const canvas = document.createElement('canvas');
            canvas.id = 'temporary-canvas';
            canvas.width = width!;
            canvas.height = height!;
            document.body.appendChild(canvas);
            const exportedVida = new Vida('temporary-canvas');

            if (this.gallery !== undefined) exportedVida.setGallery(this.gallery);

            exportedVida
                .loadJson(this.toJson())
                .then(() => {
                    // generate the image and download it
                    // const ratio = window.devicePixelRatio || 1; // TODO

                    const initialDataUrl = exportedVida.stage.toDataURL({ mimeType: mimeType, quality: 1 });
                    document.body.removeChild(canvas);
                    canvas.remove();
                    exportedVida.destroy();

                    // @ts-ignore
                    if (import.meta.env.MODE === 'headless') {
                        resolve(initialDataUrl);
                        return;
                    }

                    compressImage(initialDataUrl, mimeType, 75)
                        .then((r: any) => {
                            const compressedImage = r['resultData'];
                            const compressedBlob = new Blob([compressedImage], { type: mimeType });
                            const url = URL.createObjectURL(compressedBlob);
                            resolve(url);
                        })
                        .catch((err: any) => {
                            console.error(`Compressed image failed: ${err}`);
                            // // cleanup temporary elements
                            resolve(initialDataUrl);
                        });
                })
                .catch((error) => reject(error));
        });
    }

    toLink() {
        const query: any = {};
        const originalTemplate = jsonToURI(this.toJson());

        if (originalTemplate.length < 1000) {
            query.template = originalTemplate;
        } else {
            const b64CompressedTemplate = LZString.compressToBase64(originalTemplate);
            query.b64Template = b64CompressedTemplate;
        }
        return stringifyQuery(query);
    }

    randomInit(): Promise<void> {
        this.version = packageFile.version;

        return new Promise((resolve) => {
            this.background
                .randomInit('internalsvg', this.document)
                .then(() => this.updateDocument({ width: 1950, height: 800 }).then(() => resolve()));
        });
    }

    /**
     * Initialize vida with all the data from template.
     * Reset everything.
     * @method
     * @name Vida.Vida#loadJson
     * @param {Template} template
     * @returns Promise<void>. Resolved once everything is setup
     * @example
     * const template = JSON.parse(...); // Load the template representation
     * const vida = new Vida(canvasId);
     * await vida.loadJson(); // or use vida.loadJson().then(() => ...);
     */
    loadJson(template: Template): Promise<void> {
        // Reset
        this.components = [];

        const updatedTemplate: Template = migrate(template);
        // if (!validateTemplate(updatedTemplate))
        //     return new Promise((_, reject) => reject());

        this.version = updatedTemplate.version;

        return new Promise<void>((resolve, reject) => {
            const promises = [];
            console.assert(updatedTemplate.document.width !== undefined && updatedTemplate.document.height !== undefined);

            this.document.width = Math.max(1, updatedTemplate.document.width!);
            this.document.height = Math.max(1, updatedTemplate.document.height!);
            promises.push(this.updateDocument(updatedTemplate.document));

            updatedTemplate.components.sort((a, b) => (a.zIndex! > b.zIndex! ? 1 : -1));

            for (const component of updatedTemplate.components) {
                if (component.type === 'shape' && component.fill!.type === 'blur') continue;
                promises.push(this.setupComponent(component));
            }
            Promise.all(promises)
                .then(() => {
                    const bluredImagePromises = [];
                    for (const component of updatedTemplate.components) {
                        if (component.type !== 'shape' || component.fill!.type !== 'blur') continue;
                        bluredImagePromises.push(this.setupComponent(component));
                    }
                    Promise.all(bluredImagePromises).then(() => {
                        resolve();
                    });
                })
                .catch((error) => {
                    console.error(error);
                    reject(error);
                });
        });
    }

    zoom(factor: number | null = null): number {
        // compute factor to fit screen
        if (factor === null) {
            // set to 100% if content is smaller than screen
            factor = Math.min(this.layer.width() / this.document.width!, this.layer.height() / this.document.height!);
            factor *= 0.95;
        }
        this.stage.scale({ x: factor, y: factor });

        // Center the layer
        this.layer.x((this.layer.width() / factor - this.document.width!) / 2);
        this.layer.y((this.layer.height() / factor - this.document.height!) / 2);

        this.draw();
        return factor;
    }

    handleResize() {
        if (!this.stage) return;
        const canvas = this.stage.container();
        const canvasParent = canvas.parentElement;
        if (canvasParent === null) return;

        const height = canvasParent.clientHeight;
        const width = canvasParent.clientWidth;
        this.stage.setAttrs({ width, height });
        this.zoom();
    }

    updateDocument(documentParams: DocumentOptions): Promise<void> {
        if (documentParams.width !== undefined) documentParams.width = Math.max(1, documentParams.width);
        if (documentParams.height !== undefined) documentParams.height = Math.max(1, documentParams.height);

        return new Promise<void>((resolve) => {
            assignValues(this.document, documentParams, undefined);

            if (documentParams.i18n !== undefined && documentParams.i18n.editingLocale === null) this.document.i18n.editingLocale = null;

            if (documentParams.width) {
                this.documentSize.width = documentParams.width;
            }

            if (documentParams.height) {
                this.documentSize.height = documentParams.height;
            }

            const promises = [];
            const copyDocumentParams = {};
            assignValues(copyDocumentParams, documentParams, undefined);

            promises.push(
                new Promise<void>((resolve2) => {
                    this.background.update(copyDocumentParams, this.document).then(() => {
                        resolve2();
                    });
                }),
            );

            if (
                documentParams.width !== undefined ||
                documentParams.height !== undefined ||
                (documentParams.i18n !== undefined && (documentParams.i18n.editingLocale !== undefined || documentParams.i18n.displayedLocale))
            ) {
                for (const component of this.components) {
                    promises.push(component.update({}, this.document));
                }
            }
            Promise.all<void | boolean>(promises).then(() => resolve());
        });
    }

    updateComponent(componentId: Uuid, options: ComponentOptions) {
        const component = this._findComponent(componentId);
        if (!component) return;
        if (options.zIndex !== undefined) {
            let newZIndex = options.zIndex;
            if (newZIndex < component.zIndex()) {
                newZIndex -= 0.1;
            } else {
                newZIndex += 0.1;
            }
            this.components = this.components.sort((a, b) => {
                return (a.id() == componentId ? newZIndex : a.zIndex()) > (b.id() == componentId ? newZIndex : b.zIndex()) ? 1 : -1;
            });
            this.rearrangeZIndices();
            delete options.zIndex;
        }

        return component.update(options, this.document);
    }

    canUndo(componentId: Uuid): boolean {
        const component = this._findComponent(componentId);
        if (!component) return false;
        return component.canUndo();
    }

    canRedo(componentId: Uuid): boolean {
        const component = this._findComponent(componentId);
        if (!component) return false;
        return component.canRedo();
    }

    undoComponent(componentId: Uuid) {
        const component = this._findComponent(componentId);
        if (!component) return;
        return component.undo();
    }

    redoComponent(componentId: Uuid) {
        const component = this._findComponent(componentId);
        if (!component) return;
        return component.redo();
    }

    removeComponent(componentId: Uuid) {
        const component = this._findComponent(componentId);
        if (!component) return;
        component.remove();
        const indexOf = this.components.indexOf(component);
        this.components.splice(indexOf, 1);
        if (componentId === this._selectedComponent) this._selectedComponent = undefined;
    }

    createComponent(options: ComponentOptions) {
        if (options.id === undefined) {
            options.id = generateId();
        }
        options.zIndex =
            this.components.length === 0
                ? 1
                : Math.max.apply(
                      Math,
                      this.components.map((comp) => comp.toJson().zIndex!),
                  ) + 1;
        return this.setupComponent(options);
    }

    createRandomComponent(type: 'text' | 'internalsvg' | 'qrcode' | 'emoji' | 'internalphoto' | 'textchoice'): Promise<string> {
        return new Promise((resolve) => {
            let component = undefined;
            let randomId = generateId();

            switch (type) {
                case 'text':
                case 'textchoice':
                case 'emoji': {
                    component = new TextVidaComponent(this, randomId, type);
                    this.components.push(component);
                    break;
                }
                case 'qrcode':
                case 'internalsvg':
                case 'internalphoto': {
                    component = new ImageVidaComponent(this, randomId);
                    this.components.push(component);
                    break;
                }
                default:
                    throw Error('Not implemented');
            }

            component.randomInit(type, this.documentSize).then(() => {
                resolve(randomId);
            });
        });
    }

    setupComponent(componentParams: ComponentOptions) {
        if (componentParams.id === undefined) {
            throw new Error('invalid component params (id required)');
        }
        switch (componentParams.type) {
            case 'text':
            case 'textchoice':
            case 'emoji': {
                const textComponent = new TextVidaComponent(this, componentParams.id, componentParams.type);
                this.components.push(textComponent);
                return textComponent.update(componentParams, this.document);
            }
            case 'image': {
                const imageComponent = new ImageVidaComponent(this, componentParams.id);
                this.components.push(imageComponent);
                return imageComponent.update(componentParams, this.document);
            }
            case 'shape': {
                const shapeComponent = new ShapeVidaComponent(this, componentParams.id);
                this.components.push(shapeComponent);
                return shapeComponent.update(componentParams, this.document);
            }
            default:
                throw new InvalidDataError('Unknown componentParams.type');
        }
    }

    nbComponents() {
        return this.components.length;
    }

    computeAvailableLocales() {
        return this.components.reduce(
            (prev, comp) => {
                Object.keys(comp.toJson().i18n!).map((code) => prev.add(code));
                return prev;
            },
            new Set([this.document.i18n.defaultLocale]),
        );
    }

    registerComponent(konvaElement: Konva.Image | Konva.Group) {
        this.components.sort((a, b) => (a.zIndex() > b.zIndex() ? 1 : -1));
        this.layer.add(konvaElement);
    }

    registerTransformer(konvaElement: Konva.Image | Konva.Group) {
        this.layer.add(konvaElement);
    }

    rearrangeZIndices() {
        // TODO use promises ?
        this.background.sendBackward();
        let z = 1;
        for (const component of this.components) {
            component.update({ zIndex: z }, {});
            ++z;
        }
        this.background.bringClipperForward();
    }

    draw() {
        // TODO: do not call many 'draw'
        this.layer.draw();
    }

    destroy() {
        this.background.destroy();
        for (let component of this.components) component.destroy();
        this.components = [];
    }

    onComponentUpdated(_componentId: Uuid) {
        console.assert(false, 'onComponentUpdated should be overriden');
    }

    onSelect(_componentId: Uuid) {
        console.assert(false, 'onSelect should be overriden by the calling code');
    }

    onClick(_x: number, _y: number) {
        console.assert(false, 'onClick should be overriden by the calling code');
    }

    _findComponent(componentId: Uuid): AbstractVidaComponent | undefined {
        return this.components.find((component) => component.id() == componentId);
    }
}
