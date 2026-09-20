
export type Uuid = string;

export interface DocumentParams {
    width: number | undefined;
    height: number | undefined;
    id: Uuid;
    // i18n: I18nDocumentParams | undefined;
    [key: string]: any
}

export interface I18nDocumentParams {
    defaultLocale: string;
    editingLocale: string | null;
    displayedLocale: string | undefined;
}

export type DocumentOptions = Partial<DocumentParams>;

export type ComponentType = "text" | "internalsvg" | "qrcode" | "image" | "emoji" | "shape" | "textchoice";

export type ImageComponentType = 'internalsvg' | 'internalphoto' | 'qrcode' | 'urlphoto';

export interface QrcodeSymbolOptions {
    backgroundHull: string;
    id: Uuid;
    colors: ColorsDict;
}

export interface ImageOptions {
    id: Uuid;
    type: ImageComponentType;

    // For svg
    colors: ColorsDict;

    // For qrcode
    backgroundColor: string;
    symbol: Partial<QrcodeSymbolOptions>;
    color: string;
    url: string;
}

export interface TextBackgroundOptions {
    mode: 'disabled' | 'rounded' | 'distorted' | 'normal';
    color: string | undefined;
    padding: number | undefined;
    distortion: Array<Array<number> > | undefined;
    angleDistortion: number | undefined;
    radius: number | undefined;
}

export interface TextShadowOptions {
    enabled: boolean | undefined;
    color: string | undefined;
    offsetX: number | undefined;
    offsetY: number | undefined;
}

export interface ShapeArgsOptions {
    radius: number;
}

export interface ShapeOptions {
    type: 'circle';
    options: Partial<ShapeArgsOptions>;
}

export interface FillArgsOptions {
    size: number;
}

export interface FillOptions {
    type: 'blur';
    options: Partial<FillArgsOptions>;
}

export interface ComponentParams {
    type: ComponentType;
    id: Uuid;
    zIndex: number;
    url: string;
    scale: number;
    image: Partial<ImageOptions>;
    text: string;
    position: Point;
    font: string;
    size: number;
    color: string;
    justification: string;
    angle: number;
    // WARNING
    background: TextBackgroundOptions;
    shadow: TextShadowOptions;
    width: number;
    height: number;
    shape: Partial<ShapeOptions>;
    fill: Partial<FillOptions>;
    i18n: I18nOverride;
    rules: Rules;
    textChoices: DictLabel;
}

export interface DictLabel {
    [key: string]: I18nDict
}


export interface Rules {
    angle: Rule,
    position: Rule,
    x: Rule,
    text: Rule
}

export type Rule = Partial<RuleOptions>;
export interface RuleOptions {
    fixed: Boolean,
    properties: Rules,
    min: number,
    max: number
}

export type ComponentOptions = Partial<ComponentParams>;

export interface Template {
    version: string;
    document: DocumentParams;
    components: Array<ComponentOptions>;
}

export interface Dimensions {
    width: number;
    height: number;
}

export interface Point {
    x: number;
    y: number;
}

export type MimeType = "image/jpeg" | "image/png" | "image/svg+xml";

export interface ColorsDict {
    [key: string]: string
}

export interface I18nDict {
    [key: string]: string
}

export interface I18nOverride {
    [key: string]: object
}

export interface PdfFormat {
    content: Array<any>;
    status: string;
}

export interface ImageGallery {
    elementById(elementId: Uuid): GalleryInternalPhoto | GalleryInternalSvg;
    fileUrl(elementId: Uuid): Promise<string>;

    randomInternalPhoto(): GalleryInternalPhoto;
    randomInternalSvg():  GalleryInternalSvg;
}

export type IsoDate = string;

export interface GalleryInternalSvg {
    id: Uuid;
    type: 'internalsvg';
    creation_date: IsoDate;
    filename: string;
    preview: string;
    thumbnail: string;
    tags: string;
    width: number;
    height: number;
    colors: ColorsDict;
    label: I18nDict;
    backgroundHull: string;
    hitform: string;
}

export interface GalleryInternalPhoto {
    id: Uuid;
    type: 'internalphoto';
    creation_date: IsoDate;
    filename: string;
    preview: string;
    thumbnail: string;
    tags: string;
    width: number;
    height: number;
    label: I18nDict;
}

export interface VersionObject {
    version: string,
    [x: string]: unknown;
}