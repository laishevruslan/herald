'use strict';
import { Uuid, DocumentParams, ComponentOptions, Rule } from '../typing.ts';
import { assignValues, cleanUndefined, extractBestTranslation } from '../utils/utils.ts';

import AbstractVidaComponent from './abstractvidacomponent.ts';
import { computeAbsolutePosition, pxToPt } from '../utils/positionutils.ts';
import { scalePolygon, translatePolygon, computeRandomDistortedSquare, computeRotatedViewbox, degToRadian, computeBox, rotatePolygon } from '../utils/geometry.js';


import Konva from 'konva';
import Vida from '../vida.ts'
import { overrideValues, pSBC, encodeTextSvg } from '../utils/utils.ts';
import _get from 'lodash.get'
import _set from 'lodash.set'
import InvalidDataError from '../invaliddataerror.ts';

const DEFAULT_DISTORTION = [[-1, 1], [1, 1], [1, -1], [-1, -1]]

export default class TextVidaComponent extends AbstractVidaComponent {
    type: 'emoji' | 'text' | 'textchoice';
    backgroundDistortion: Array<Array<number>> | undefined;
    backgroundDistortionAngle: number | undefined;
    backgroundPadding: number;
    backgroundMode: string;
    draw: boolean;
    text: string | undefined;
    textChoices: object = {};

    // We don't use directly konvaElementText.shadowX() because these
    // values are incorrect if angle != 0
    shadowX: number = 0;
    shadowY: number = 0;

    _recomputePosition: boolean;
    _inPromise: boolean;

    declare konvaElement: Konva.Group | undefined;
    declare konvaElementText: Konva.Text | undefined;
    declare konvaElementBackground: Konva.Shape | undefined;

    constructor(vida: Vida, componentId: Uuid, type: 'text' | 'emoji' | 'textchoice') {
        super(vida, componentId);
        assignValues(this.options, TextVidaComponent.internalDefaultOptions(), undefined);
        this.type = type;
        this.backgroundDistortionAngle = undefined;
        this.backgroundDistortion = undefined;
        this.backgroundPadding = 0;
        this.backgroundMode = 'disabled';
        this._recomputePosition = false;
        this._inPromise = false;
        this.draw = false;
    }

    /**
     *
     * Many text attributes should be randomnized directly from the
     * calling lib.
     *
     * @param {'text' | 'emoji'} type
     * @returns {ComponentOptions}
     * @example
     *
     * await componentId = vida.createRandomComponent('text');
     * const randomText = 'blabla'; // randomly generated ;)
     * await vida.updateComponent(componentId, { text: randomText })
     */
    randomOptions(type: 'text' | 'emoji' | 'textchoice'): ComponentOptions {
        const options: ComponentOptions = {
            type: type,
            angle: 0,
            size: Math.floor(20 + Math.random() * 180),
            position: { x: 0.5, y: 0.5 },
        };
        switch (type) {
            case 'textchoice':
            case 'text': {
                const angleDistortion = Math.floor(Math.random() * 40);
                // TODO remandommess here
                options['color'] = '#ffffff';
                const shadowColor = pSBC(0.4, options['color'], undefined, undefined); // x% darker
                (options['justification'] = 'left'),
                    (options['background'] = {
                        color: '#000000',
                        padding: 5,
                        // @ts-ignore
                        mode: ['normal', 'distorted', 'rounded', 'disabled'][Math.floor(Math.random() * 4)],
                        angleDistortion,
                        distortion: computeRandomDistortedSquare(angleDistortion),
                        radius: 30,
                    });
                options['shadow'] = {
                    enabled: Math.random() > 0.9,
                    color: shadowColor!,
                    offsetX: 5,
                    offsetY: 5,
                };
                options['font'] = 'Arial';
                options['text'] = 'Aktivisda';
                options['angle'] = 0;
                break;
            }
            case 'emoji': {
                options['angle'] = 15 * (Math.random() - 0.5);
                // TODO: use a random emoji list
                options['text'] = '🐘';
                break;
            }
            default:
                throw new InvalidDataError(`Type ${type} is not yet supported by randomoptions`);
        }
        return options;
    }

    async toPdf(): Promise<any> {
        if (!this.konvaElement || !this.konvaElementText || !this.konvaElementBackground) return undefined;
        // TODO support emoji.type === emoji
        let status = 'ok';
        const { x, y } = computeAbsolutePosition(this.displayedPosition, this.documentSize);
        const offset = Math.max(this.konvaElementText.fontSize(), this.konvaElement.height() * 0.1);

        const content = [];

        const textViewbox = computeRotatedViewbox(
            0,
            0,
            this.konvaElement.width() + 2 * offset,
            this.konvaElement.height() + 2 * offset,
            degToRadian(this.konvaElement.rotation()),
        );

        if (this.backgroundMode !== 'disabled') {
            const padding = Math.ceil((this.konvaElementText.fontSize() * this.backgroundPadding) / 100);

            const color = this.konvaElementBackground.fill();
            const boxHeight = this.konvaElementText.height() + 2 * padding;
            const boxWidth = this.konvaElementText.width() + 2 * padding;

            // WARNING copy
            const distortion =
                this.backgroundMode === 'distorted'
                    ? this.backgroundDistortion!
                    : [
                          [-1, 1],
                          [1, 1],
                          [1, -1],
                          [-1, -1],
                      ];
            scalePolygon(distortion, boxWidth / 2, boxHeight / 2);
            rotatePolygon(distortion, degToRadian(this.konvaElement.rotation()));

            let svgString = '';

            const { bottom_left, width, height } = computeBox(distortion);

            if (this.backgroundMode === 'rounded') {
                const radius = _get(this.options, 'background.radius') || 0;
                svgString = `<svg width="${width}" height="${height}"
                viewBox="${bottom_left[0]} ${bottom_left[1]} ${width} ${height}">
                    <rect transform="rotate(${this.konvaElement.rotation()})"
                        x="${-boxWidth / 2}" y="${-boxHeight / 2}"
                        width="${boxWidth}" height="${boxHeight}" rx="${radius}" ry="${radius}" fill="${color}"/>
                </svg>`;
            } else {
                const svgPath = `M${distortion[0][0]}, ${distortion[0][1]} \
                L${distortion[1][0]}, ${distortion[1][1]}\
                ${distortion[2][0]}, ${distortion[2][1]}\
                ${distortion[3][0]}, ${distortion[3][1]}\
                ${distortion[0][0]}, ${distortion[0][1]}Z`;

                svgString = `<svg width="${width}" height="${height}"
                viewBox="${bottom_left[0]} ${bottom_left[1]} ${width} ${height}">
                    <path fill="${color}" d="${svgPath}"/>
                </svg>`;
            }

            content.push({
                svg: svgString,
                absolutePosition: {
                    x: pxToPt(x + bottom_left[0]),
                    y: pxToPt(y + bottom_left[1]),
                },
                width: pxToPt(width),
                height: pxToPt(height),
            });
        }

        const lines = this.konvaElementText.text().split('\n');

        const dy = this.konvaElementText.fontSize() * this.konvaElementText.lineHeight();

        const textY = offset + dy / 2 + this.konvaElementText.y();

        let computeTextX = (line: string, alignment: string) => {
            if (!this.konvaElementText) return 0;

            if (alignment === 'left') return this.konvaElementText.x();

            let context = this.vida.layer.getCanvas().getContext();

            let backupFont = context.font;

            context.font = this.konvaElementText._getContextFont();
            let lineMetrics = context.measureText(line);
            context.font = backupFont;

            if (alignment === 'right') {
                return this.konvaElementText.width() - lineMetrics.width + this.konvaElementText.x();
            } else if (alignment === 'center') {
                return this.konvaElementText.x() + (this.konvaElementText.width() - lineMetrics.width) / 2;
            }
        };

        const konvaAlignment = this.konvaElementText.align()!;

        let ascentRatio = 0.355;
        // if (this.konvaElementText.fontFamily() === 'Roboto Medium')
        //     ascentRatio = 1536/2048.;
        // else
        if (this.konvaElementText.fontFamily() === 'Raleway Thin') ascentRatio = 0.355;
        else if (this.konvaElementText.fontFamily() === 'Roboto Medium') ascentRatio = 0.34;

        // const centerAndBaselineLines = `
        // <line x1="0" y1="${textY}" x2="${pxToPt(width)}" y2="${textY}" stroke="red" stroke-width="10"/>
        // <line x1="0" y1="${textY +ascentRatio*dy}" x2="${pxToPt(width)}" y2="${textY + ascentRatio*dy}" stroke="black" />
        // `;

        let shadowText = '';
        if (this.konvaElementText.hasShadow()) {
            shadowText = `
                <text
                    transform="rotate(${this.konvaElement.rotation()})"
                    font-size="${this.konvaElementText.fontSize()}"
                    fill="${this.konvaElementText.shadowColor()}"
                    style="font-family: ${this.konvaElementText.fontFamily()};fill-opacity:0.5"
                    alignment-baseline="alphabetic"
                    y="${textY + this.shadowY}">
                    ${lines
                        .map(
                            (line: string, index: number) =>
                                `<tspan x="${offset + this.shadowX + computeTextX(line, konvaAlignment)!}"
                                dy="${index == 0 ? +ascentRatio * dy : dy}">${encodeTextSvg(line)}</tspan>`,
                        )
                        .join('')}
                </text>`;
        }

        const textSvgString = `
        <svg width="${textViewbox.width}" height="${textViewbox.height}" viewBox="${textViewbox.bottom_left[0]} ${textViewbox.bottom_left[1]} ${textViewbox.width} ${textViewbox.height}">
        ${shadowText}
        <text
            transform="rotate(${this.konvaElement.rotation()})"
            font-size="${this.konvaElementText.fontSize()}"
            fill="${this.konvaElementText.fill()}"
            style="font-family: ${this.konvaElementText.fontFamily()}"
            alignment-baseline="alphabetic"
            y="${textY}">
            ${lines
                .map(
                    (line: string, index: number) =>
                        `<tspan x="${offset + computeTextX(line, konvaAlignment)!}" dy="${index == 0 ? +ascentRatio * dy : dy}">${encodeTextSvg(line)}</tspan>`,
                )
                .join('')}
        </text>
         </svg>`;

        content.push({
            svg: textSvgString,
            absolutePosition: {
                x: pxToPt(x - textViewbox.width / 2),
                y: pxToPt(y - textViewbox.height / 2),
            },
            width: pxToPt(textViewbox.width),
            height: pxToPt(textViewbox.height),
        });

        return { content, status };
    }

    static internalDefaultOptions(): ComponentOptions {
        return {
            textChoices: {},
        };
    }

    select() {
        if (_get(this.options.rules, 'self.fixed') === true) {
            return;
        }

        if (!this.konvaElement) return;
        if (!this.konvaTransformer) {
            this.konvaTransformer = new Konva.Transformer({
                rotateEnabled: true,
                draggable: true,
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

        this.konvaTransformer.resizeEnabled(_get(this.options.rules, 'size.fixed') !== true);
        this.konvaTransformer.rotateEnabled(_get(this.options.rules, 'angle.fixed') !== true);
        this.konvaElement.setDraggable(
            _get(this.options.rules, 'position.fixed') !== true &&
                (_get(this.options.rules, 'position.properties.x.fixed') !== true ||
                    _get(this.options.rules, 'position.properties.y.fixed') !== true),
        );

        this.vida.draw();
    }

    showTextEditor() {
        if (_get(this.options.rules, 'self.fixed') === true) return;
        if (_get(this.options.rules, 'text.fixed') === true) return;
        if (this.type !== 'text') return;
        if (!this.konvaElementText) return;
        this.konvaElementText.hide();
        if (this.konvaTransformer) this.konvaTransformer.hide();

        // at first lets find position of text node relative to the stage:
        const textPosition = this.konvaElementText.absolutePosition();

        const canvaScale = this.vida.stage.scaleX();

        // so position of textarea will be the sum of positions above:
        const areaPosition = {
            x: this.vida.stage.container().offsetLeft + textPosition.x - this.konvaElementText.offsetX() * canvaScale,
            y: this.vida.stage.container().offsetTop + textPosition.y + this.konvaElementText.offsetY() * canvaScale,
        };

        // create textarea and style it
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        const textAreaFontSize = this.konvaElementText.fontSize() * canvaScale;

        // apply many styles to match text on canvas as close as possible
        // remember that text rendering on canvas and on the textarea can be different
        // and sometimes it is hard to make it 100% the same. But we will try...
        textarea.value = this.konvaElementText.text();
        textarea.style.position = 'absolute';
        textarea.style.top = areaPosition.y + 'px';
        textarea.style.left = areaPosition.x + 'px';
        textarea.style.width = (this.konvaElementText.width() - this.konvaElementText.padding() * 2 + 10) * canvaScale + 'px';
        textarea.style.height = (this.konvaElementText.height() - this.konvaElementText.padding() * 2) * canvaScale + 5 + 'px';
        textarea.style.fontSize = textAreaFontSize + 'px';
        textarea.style.border = '1px solid red';
        textarea.style.padding = '0px';
        textarea.style.margin = '0px';
        textarea.style.overflow = 'hidden';
        textarea.style.background = 'none';
        textarea.style.resize = 'none';
        textarea.style.outline = 'none';
        textarea.style.lineHeight = this.konvaElementText.lineHeight().toString();
        textarea.style.fontFamily = this.konvaElementText.fontFamily();
        textarea.style.transformOrigin = 'center';
        textarea.style.textAlign = this.konvaElementText.align();
        textarea.style.color = this.konvaElementText.fill();
        const rotation = this.konvaElementText.rotation();
        let transform = '';
        if (rotation) transform += 'rotateZ(' + rotation + 'deg)';

        let px = 0;
        // also we need to slightly move textarea on firefox
        // because it jumps a bit
        var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        if (isFirefox) px += 2 + Math.round((this.konvaElementText.fontSize() * canvaScale) / 20);
        transform += 'translateY(-' + px + 'px)';

        textarea.style.transform = transform;

        // reset height
        textarea.style.height = 'auto';
        // after browsers resized it we can set actual value
        textarea.style.height = textarea.scrollHeight + 3 + 'px';

        textarea.focus();

        const removeTextarea = () => {
            textarea.parentNode!.removeChild(textarea);
            window.removeEventListener('click', handleOutsideClick);
            this.konvaElementText!.show();
            if (this.konvaTransformer) {
                this.konvaTransformer.show();
                this.konvaTransformer.forceUpdate();
            }
        };

        const setTextareaWidth = (newWidth: number) => {
            // TODO ?
            // if (!newWidth) {
            //     // set width for placeholder
            //     newWidth = this.konvaElementText!.() * this.konvaElementText!.fontSize();
            // }
            // some extra fixes on different browsers
            var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
            if (isSafari || isFirefox) {
                newWidth = Math.ceil(newWidth);
            }

            var isEdge = document.DOCUMENT_NODE || /Edge/.test(navigator.userAgent);
            if (isEdge) {
                newWidth += 1;
            }
            textarea.style.width = newWidth + 'px';
        };

        textarea.addEventListener('keydown', (e) => {
            // hide on enter
            // but don't hide on shift + enter
            if (e.key === 'Enter' && !e.shiftKey) {
                const options = this.editingLocale !== null ? { i18n: { [this.editingLocale]: { text: textarea.value } } } : { text: textarea.value };
                this.update(options, {}).then(() => this.vida.onComponentUpdated(this.id()));
                removeTextarea();
            }
            // on esc do not set value back to node
            if (e.key === 'Esc') {
                removeTextarea();
            }
        });

        textarea.addEventListener('keydown', () => {
            const scale = this.konvaElementText!.getAbsoluteScale().x;
            setTextareaWidth(this.konvaElementText!.width() * scale);
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + this.konvaElementText!.fontSize() + 'px';
        });

        const handleOutsideClick = (e: any) => {
            if (e.target !== textarea) {
                const options = this.editingLocale !== null ? { i18n: { [this.editingLocale]: { text: textarea.value } } } : { text: textarea.value };
                this.update(options, {}).then(() => this.vida.onComponentUpdated(this.id()));
                removeTextarea();
            }
        };
        setTimeout(() => {
            window.addEventListener('click', handleOutsideClick);
        }),
            0;
    }

    unselect() {
        if (this.konvaTransformer) this.konvaTransformer.detach();
    }

    destroy() {
        if (!this.konvaElement) return;
        if (this.konvaElementText) this.konvaElementText.destroy();
        if (this.konvaElementBackground) this.konvaElementBackground.destroy();
        this.konvaElement.destroy();
    }

    textValue(): string {
        switch (this.type) {
            case 'textchoice': {
                if (this.text === undefined) return '';
                // @ts-ignore
                const textOption = this.textChoices[this.text];
                const i18n = this.vida.document.i18n!;
                const locale = i18n.editingLocale ? i18n.editingLocale : i18n.displayedLocale;
                return extractBestTranslation(textOption, locale, this.vida.document.i18n.defaultLocale!) || '';
            }
            case 'text': {
                if (this.text === undefined) return this.konvaElementText!.text()!;
                return this.text;
            }
        }
        return '';
    }

    toJson(): ComponentOptions {
        const result = { ...this.options };
        if (this.type === 'text')
            delete result['textChoices'];
        return result;
    }

    internalUpdate(options: ComponentOptions, document: Partial<DocumentParams>): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this._inPromise) {
                resolve();
                return;
            }
            this._inPromise = true;

            let recomputeTextBackground = false;
            let raiseComponentUpdated = false;

            if (options.textChoices !== undefined && this.textChoices !== options.textChoices) {
                assignValues(this.textChoices, options.textChoices, undefined);
                cleanUndefined(this.textChoices);
            }

            if (options.type !== undefined && this.type !== options.type) {
                if (options.text === undefined) {
                    if (options.type === 'text') {
                        options.text = this.textValue();
                    } else if (options.type === 'textchoice') {
                        // TODO: it is possible to return the "good choice"
                        options.text = Object.keys(this.textChoices)[0] || '';
                    }

                    if (this.editingLocale) {
                        // @ts-ignore
                        _set(this.options.i18n![this.editingLocale], 'text', options.text);
                    } else {
                        _set(this.options, 'text', options.text);
                    }

                    raiseComponentUpdated = true;
                }
                // @ts-ignore
                this.type = options.type;
            }

            if (
                options.background !== undefined &&
                options.background.distortion !== undefined &&
                (!this.backgroundDistortion || this.backgroundDistortion !== options.background.distortion)
            ) {
                this.backgroundDistortion = options.background.distortion;
                this.backgroundDistortionAngle = options.background.angleDistortion;
                recomputeTextBackground = true;
            }

            if (options.text !== undefined && this.text !== options.text) {
                this.text = options.text;
            }

            if ((options.text !== undefined || options.textChoices !== undefined) && this.type === 'textchoice') {
                if (this.textValue() === '') {
                    this.text = Object.keys(this.textChoices)[0];

                    if (this.editingLocale) {
                        // @ts-ignore
                        _set(this.options.i18n![this.editingLocale], 'text', this.text);
                    } else {
                        _set(this.options, 'text', this.text);
                    }

                    raiseComponentUpdated = true;
                }
            }

            if (!this.konvaElement) {
                this.konvaElement = new Konva.Group();

                switch (this.type) {
                    case 'textchoice':
                    case 'text': {
                        this.konvaElementText = new Konva.Text({
                            draggable: false,
                            text: this.textValue(),
                            fill: options.color,
                            align: options.justification,
                            fontSize: options.size,
                            fontFamily: options.font,
                            padding: 0,
                            hasShadow: options.shadow?.enabled,
                            shadowColor: options.shadow?.color,
                            shadowOffsetX: options.shadow?.offsetX,
                            shadowOffsetY: options.shadow?.offsetY,
                            shadowOpacity: 0.5,
                        });
                        break;
                    }
                    case 'emoji': {
                        this.konvaElementText = new Konva.Text({
                            draggable: false,
                            text: options.text,
                            fontSize: 1,
                            padding: 0,
                            verticalAlign: 'top',
                        });

                        this.konvaElement.setAttrs({
                            scaleX: options.scale,
                            scaleY: options.scale,
                        });
                    }
                }

                this.konvaElement.on('pointerclick', (evt: any) => {
                    evt.cancelBubble = true;
                    if (this.vida.isSelected(this.id())) return;
                    this.vida.selectComponent(this.id());
                });

                if (this.supportBackground()) {
                    this.konvaElementText.on('dblclick dbltap', () => {
                        this.showTextEditor();
                    });
                }

                this.konvaElement.on('dragend', () => {
                    this.adjustPosition();
                });
                this.konvaElement.on('transformend', () => {
                    this.adjustSizeAndAngle();
                });

                this.konvaElementBackground = new Konva.Shape();

                // console.assert(options.background !== undefined); // since 0.9.1
                if (options.background !== undefined) {
                    if (options.background.color !== undefined) this.konvaElementBackground.fill(options.background.color);

                    if (options.background.padding !== undefined) {
                        this.backgroundPadding = options.background.padding;
                    }
                }

                this.konvaElement.add(this.konvaElementBackground);
                this.konvaElement.add(this.konvaElementText);

                this._recomputePosition = true;

                this.vida.registerComponent(this.konvaElement);
            }

            if (!this.konvaElementText) throw new InvalidDataError('KonvaElementText does not exist');
            if (!this.konvaElementBackground) throw new InvalidDataError('KonvaElementBackground does not exist');

            // TODO refacto (getLocalizedValue)
            // TODO check if locale or text changed
            // TODO improve me
            if ((document !== null && document.i18n !== undefined && document.i18n.editingLocale !== undefined) || options.rules !== undefined) {
                if (_get(options.rules, 'self.fixed') === false) {
                    this.select();
                }
                if (this.konvaTransformer) {
                    this.konvaTransformer.resizeEnabled(_get(this.options.rules, 'size.fixed') !== true);
                    this.konvaTransformer.rotateEnabled(_get(this.options.rules, 'angle.fixed') !== true);
                    this.konvaElement.setDraggable(
                        _get(this.options.rules, 'position.fixed') !== true &&
                            (_get(this.options.rules, 'position.properties.x.fixed') !== true ||
                                _get(this.options.rules, 'position.properties.y.fixed') !== true),
                    );
                }
            }

            if (this.konvaElementText.text() !== this.textValue()) {
                this.konvaElementText.setText(this.textValue());
                // TODO: maybe not useful to recomputeposition here.
                // It depends on the orientation.
                this._recomputePosition = true;
                if (this.supportBackground()) recomputeTextBackground = true;
            }

            if (options.font !== undefined && this.konvaElementText.fontFamily() !== options.font) {
                this.konvaElementText.fontFamily(options.font);
                this._recomputePosition = true;
                if (this.supportBackground()) recomputeTextBackground = true;
            }

            if (options.size !== undefined && this.konvaElementText.fontSize() * this.konvaElement.scaleX() !== options.size) {
                this.konvaElementText.fontSize(options.size);
                this.konvaElement.scaleX(1);
                this.konvaElement.scaleY(1);
                this._recomputePosition = true;
                if (this.supportBackground()) recomputeTextBackground = true;
            }

            // For emojis
            if (options.scale !== undefined && this.konvaElement.scaleX() !== options.scale) {
                this.konvaElement.scaleX(options.scale);
                this.konvaElement.scaleY(options.scale);
                this._recomputePosition = true;
                if (this.supportBackground()) recomputeTextBackground = true;
            }

            if (options.color !== undefined && this.konvaElementText.fill() !== options.color) {
                this.konvaElementText.fill(options.color);
                this.draw = true;
            }

            if (options.justification !== undefined && this.konvaElementText.align() !== options.justification) {
                this.konvaElementText.align(options.justification);
                this.draw = true;
            }

            let recomputeShadow = false;

            if (options.shadow !== undefined) {
                if (options.shadow.enabled !== undefined && this.konvaElementText.hasShadow() !== options.shadow.enabled) {
                    this.konvaElementText.shadowEnabled(options.shadow.enabled);
                    if (options.shadow.enabled) {
                        this.konvaElementText.shadowColor(options.shadow.color || '#000000');
                        this.konvaElementText.shadowOpacity(0.5);
                        recomputeShadow = true;
                    }
                    this.draw = true;
                }

                if (options.shadow.color !== undefined && this.konvaElementText.shadowColor() !== options.shadow.color) {
                    this.konvaElementText.shadowColor(options.shadow.color);
                    this.draw = true;
                }

                if (options.shadow.offsetX !== undefined && this.shadowX !== options.shadow.offsetX) {
                    this.shadowX = options.shadow.offsetX;
                    recomputeShadow = true;
                }

                if (options.shadow.offsetY !== undefined && this.shadowY !== options.shadow.offsetY) {
                    this.shadowY = options.shadow.offsetY;
                    recomputeShadow = true;
                }
            }

            if (options.background !== undefined) {
                if (options.background.color !== undefined && this.konvaElementBackground.fill() !== options.background.color) {
                    this.konvaElementBackground!.fill(options.background.color);
                    this.draw = true;
                }

                if (
                    options.background.distortion !== undefined &&
                    (!this.backgroundDistortion || this.backgroundDistortion !== options.background.distortion)
                ) {
                    this.backgroundDistortion = options.background.distortion;
                    this.backgroundDistortionAngle = options.background.angleDistortion;
                    recomputeTextBackground = true;
                }

                if (options.background.mode !== undefined && this.backgroundMode !== options.background.mode) {
                    this.backgroundMode = options.background.mode;
                    if (this.backgroundMode === 'disabled') {
                        this.konvaElementBackground.hide();
                    } else {
                        this.konvaElementBackground.show();
                    }
                    recomputeTextBackground = true;
                    this.draw = true;
                }

                if (options.background.radius !== undefined) {
                    recomputeTextBackground = true;
                    this.draw = true;
                }
            }

            if (options.angle !== undefined && options.angle !== this.currentAngle()) {
                this.konvaElement.rotation(options.angle);

                if (this.konvaElementText.hasShadow()) {
                    recomputeShadow = true;
                }

                this._recomputePosition = true;
            }

            if (recomputeShadow) {
                if (this.currentAngle() !== 0) {
                    const offset = [[this.konvaElementText.shadowOffsetX(), this.konvaElementText.shadowOffsetY()]];
                    rotatePolygon(offset, degToRadian(this.currentAngle()!));
                    this.konvaElementText.shadowOffset({ x: offset[0][0], y: offset[0][1] });
                } else {
                    this.konvaElementText.shadowOffsetX(this.shadowX);
                    this.konvaElementText.shadowOffsetY(this.shadowY);
                }
                this.draw = true;
            }

            if (
                options.background !== undefined &&
                options.background.padding !== undefined &&
                options.background.padding !== this.backgroundPadding
            ) {
                this.backgroundPadding = options.background.padding;

                if (this.backgroundMode !== 'disabled') {
                    const padding = options.background.padding;
                    this.konvaElement.setAttrs({
                        offsetX: this.konvaElementText.width() / 2 + padding,
                        offsetY: this.konvaElementText.height() / 2 + padding,
                        width: this.konvaElementText.height() + 2 * padding,
                        height: this.konvaElementText.height() + 2 * padding,
                    });
                    this.konvaElementText.setAttrs({
                        x: padding,
                        y: padding,
                    });
                    recomputeTextBackground = true;
                }
            }

            const documentDimensionChanged =
                !this.documentSize || (document && (this.documentSize.width !== document.width || this.documentSize.height !== document.height));
            const positionChanged =
                options.position !== undefined &&
                ((options.position.x !== undefined && this.displayedPosition.x !== options.position.x) ||
                    (options.position.y !== undefined && this.displayedPosition.y !== options.position.y));

            if (this._recomputePosition || positionChanged || documentDimensionChanged) {
                this._recomputePosition = false;
                if (!this.documentSize) this.documentSize = { width: 0, height: 0 };
                if (document && document.width) this.documentSize.width = document.width;
                if (document && document.height) this.documentSize.height = document.height;

                if (options.position) overrideValues(this.displayedPosition, options.position);

                const { x, y } = computeAbsolutePosition(this.displayedPosition, this.documentSize);

                const padding = this.backgroundMode !== 'disabled' ? Math.ceil((this.konvaElementText.fontSize() * this.backgroundPadding) / 100) : 0;

                this.konvaElement.setAttrs({
                    x: x,
                    y: y,
                    offsetX: this.konvaElementText.width() / 2 + padding,
                    offsetY: this.konvaElementText.height() / 2 + padding,
                    width: this.konvaElementText.width() + 2 * padding,
                    height: this.konvaElementText.height() + 2 * padding,
                });

                this.konvaElementText.setAttrs({
                    x: padding,
                    y: padding,
                });
                this._recomputePosition = true;
                this.draw = true;
            }

            if (recomputeTextBackground) {
                const padding = Math.ceil((this.konvaElementText.fontSize() * this.backgroundPadding) / 100);
                const height = this.konvaElementText.height() + 2 * padding;
                const width = this.konvaElementText.width() + 2 * padding;
                const radius = this.options.background && this.options.background!.radius ? this.options.background!.radius : 0;
                const pi = Math.PI;

                if (this.backgroundMode === 'distorted' || this.backgroundMode === 'normal') {
                    let distortion = [...DEFAULT_DISTORTION];
                    if (this.backgroundMode === 'distorted') {
                        distortion = [...this.backgroundDistortion!];
                    }
                    translatePolygon(distortion, [1, 1]);
                    scalePolygon(distortion, width / 2, height / 2);

                    this.konvaElementBackground.setAttrs({
                        width: this.konvaElementText.width() + 2 * padding,
                        height: this.konvaElementText.height() + 2 * padding,
                        sceneFunc(context: any, shape: any) {
                            context.beginPath();
                            context.moveTo(distortion[0][0], distortion[0][1]); // top-left
                            context.lineTo(distortion[1][0], distortion[1][1]); // top-right
                            context.lineTo(distortion[2][0], distortion[2][1]); // bottom-right
                            context.lineTo(distortion[3][0], distortion[3][1]); // bottom-left
                            context.lineTo(distortion[0][0], distortion[0][1]); // top-left
                            context.closePath();
                            // Konva specific method
                            context.fillStrokeShape(shape);
                        },
                    });
                } else if (this.backgroundMode === 'rounded') {
                    this.konvaElementBackground.setAttrs({
                        width: this.konvaElementText.width() + 2 * padding,
                        height: this.konvaElementText.height() + 2 * padding,
                        sceneFunc(context: any, shape: any) {
                            context.beginPath();
                            // moving clockwise
                            context.moveTo(radius, 0); // top-left after arc
                            context.lineTo(width - radius, 0); // top-right before arc
                            context.arc(width - radius, radius, radius, (3 * pi) / 2, 0); // top right arc
                            context.lineTo(width, height - radius); // bottom right before are
                            context.arc(width - radius, height - radius, radius, 0, pi / 2); // bottom right arc
                            context.lineTo(radius, height); // bottom left before arc
                            context.arc(radius, height - radius, radius, pi / 2, pi); // bottom left arc
                            context.lineTo(0, radius); // top left before are
                            context.arc(radius, radius, radius, pi, (3 * pi) / 2); // top left arc
                            context.lineTo(radius, 0); // top-left after arc
                            context.closePath();
                            context.fillStrokeShape(shape);
                        },
                    });
                }

                this._recomputePosition = true;

                this.draw = true;
            }

            if (this.konvaTransformer !== undefined) {
                this.konvaTransformer.forceUpdate();
            }

            if (this.zIndex() !== this.konvaElement.zIndex()) {
                this.konvaElement.zIndex(this.zIndex());
                this.draw = true;
            }

            if (this.draw) {
                this.draw = false;
                this.vida.draw();
            }
            this._inPromise = false;
            if (raiseComponentUpdated) this.vida.onComponentUpdated(this.id());
            resolve();
        });
    }

    adjustPosition() {
        if (!this.konvaElementText || !this.konvaElementBackground) return;
        this._backupCurrentState({});
        this._adjustPosition();
        if (this._cleanUndoHistory()) return;
        this.vida.onComponentUpdated(this.id());
    }

    adjustSizeAndAngle() {
        this._backupCurrentState({});
        this._adjustAngle();
        this._adjustPosition();

        let currentFontSize = this.konvaElementText!.fontSize() * this.konvaElement!.scaleX();

        let recomputeSize = false;
        const rule = _get(this.options.rules, 'size', <Rule>{});
        if (rule.fixed !== undefined && rule.fixed) {
            currentFontSize = this.optionsFontSize();
            recomputeSize = true;
        } else {
            if (rule.min !== undefined && currentFontSize < rule.min) {
                currentFontSize = rule.min;
                recomputeSize = true;
            }
            if (rule.max !== undefined && currentFontSize > rule.max) {
                currentFontSize = rule.max;
                recomputeSize = true;
            }
        }

        if (recomputeSize) {
            const scale = currentFontSize / this.konvaElementText!.fontSize();
            this.konvaElement?.setAttrs({
                scaleX: scale,
                scaleY: scale,
            });
        }

        if (Math.abs(currentFontSize - this.optionsFontSize()) > 0.1) {
            if (this.editingLocale !== null) {
                this._appendToCurrentBackup({ i18n: { [this.editingLocale]: { size: currentFontSize } } });
                assignValues(this.options.i18n, { [this.editingLocale]: { size: currentFontSize } }, undefined);
            } else {
                this._appendToCurrentBackup({ size: currentFontSize });
                this.options.size = currentFontSize;
            }
        }
        if (this._cleanUndoHistory()) return;
        this.vida.onComponentUpdated(this.id());
    }

    optionsFontSize(): number {
        return this.optionsValue('size');
    }

    supportBackground(): boolean {
        return this.type === 'text' || this.type === 'textchoice';
    }
};
