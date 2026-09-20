[aktivisda-library](aktivisda-libraryREADME.md) / [Exports](aktivisda-librarymodules.md) / QrcodeVidaSubComponent

# Class: QrcodeVidaSubComponent

## Hierarchy

- `default`

  ↳ **`QrcodeVidaSubComponent`**

## Table of contents

### Constructors

- [constructor](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#constructor)

### Properties

- [baseQrcodeString](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#baseqrcodestring)
- [canvas](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#canvas)
- [canvgElement](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#canvgelement)
- [hitform](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#hitform)
- [id](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#id)
- [inResize](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#inresize)
- [mimeType](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#mimetype)
- [options](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#options)
- [originalSize](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#originalsize)
- [qrcodeResultDom](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#qrcoderesultdom)
- [recomputeImage](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#recomputeimage)
- [recomputeMergeSvg](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#recomputemergesvg)
- [recomputePosition](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#recomputeposition)
- [symbolColoredString](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#symbolcoloredstring)
- [symbolSvgString](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#symbolsvgstring)
- [type](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#type)
- [vida](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#vida)

### Methods

- [image](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#image)
- [imageToSvg](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#imagetosvg)
- [makeHitformFunction](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#makehitformfunction)
- [makeImage](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#makeimage)
- [mergeSvg](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#mergesvg)
- [randomOptions](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#randomoptions)
- [toJson](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#tojson)
- [toSvg](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#tosvg)
- [update](aktivisda-libraryclasses/QrcodeVidaSubComponent.md#update)

## Constructors

### constructor

• **new QrcodeVidaSubComponent**(`vida`): [`QrcodeVidaSubComponent`](aktivisda-libraryclasses/QrcodeVidaSubComponent.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `vida` | [`Vida`](aktivisda-libraryclasses/Vida.md) |

#### Returns

[`QrcodeVidaSubComponent`](aktivisda-libraryclasses/QrcodeVidaSubComponent.md)

#### Overrides

ImageVidaSubComponent.constructor

#### Defined in

components/qrcodesubcomponent.ts:27

## Properties

### baseQrcodeString

• **baseQrcodeString**: `undefined` \| `string`

#### Defined in

components/qrcodesubcomponent.ts:21

___

### canvas

• **canvas**: `undefined` \| `HTMLCanvasElement`

#### Defined in

components/qrcodesubcomponent.ts:22

___

### canvgElement

• **canvgElement**: `undefined` \| `Canvg`

#### Defined in

components/qrcodesubcomponent.ts:23

___

### hitform

• **hitform**: `undefined` \| `string`

#### Defined in

components/qrcodesubcomponent.ts:24

___

### id

• **id**: `string`

#### Inherited from

ImageVidaSubComponent.id

#### Defined in

components/imagevidasubcomponent.ts:8

___

### inResize

• **inResize**: `boolean`

#### Inherited from

ImageVidaSubComponent.inResize

#### Defined in

components/imagevidasubcomponent.ts:13

___

### mimeType

• **mimeType**: `undefined` \| `MimeType`

#### Inherited from

ImageVidaSubComponent.mimeType

#### Defined in

components/imagevidasubcomponent.ts:9

___

### options

• **options**: `Partial`\<`ImageOptions`\>

#### Defined in

components/qrcodesubcomponent.ts:19

___

### originalSize

• **originalSize**: `Dimensions`

#### Inherited from

ImageVidaSubComponent.originalSize

#### Defined in

components/imagevidasubcomponent.ts:14

___

### qrcodeResultDom

• **qrcodeResultDom**: `undefined` \| `HTMLDivElement`

#### Defined in

components/qrcodesubcomponent.ts:20

___

### recomputeImage

• **recomputeImage**: `boolean`

#### Inherited from

ImageVidaSubComponent.recomputeImage

#### Defined in

components/imagevidasubcomponent.ts:11

___

### recomputeMergeSvg

• **recomputeMergeSvg**: `boolean`

#### Defined in

components/qrcodesubcomponent.ts:16

___

### recomputePosition

• **recomputePosition**: `boolean`

#### Inherited from

ImageVidaSubComponent.recomputePosition

#### Defined in

components/imagevidasubcomponent.ts:12

___

### symbolColoredString

• **symbolColoredString**: `undefined` \| `string`

#### Defined in

components/qrcodesubcomponent.ts:18

___

### symbolSvgString

• **symbolSvgString**: `undefined` \| `string`

#### Defined in

components/qrcodesubcomponent.ts:17

___

### type

• **type**: ``"qrcode"``

#### Overrides

ImageVidaSubComponent.type

#### Defined in

components/qrcodesubcomponent.ts:25

___

### vida

• **vida**: [`Vida`](aktivisda-libraryclasses/Vida.md)

#### Inherited from

ImageVidaSubComponent.vida

#### Defined in

components/imagevidasubcomponent.ts:15

## Methods

### image

▸ **image**(): `undefined` \| `HTMLCanvasElement`

#### Returns

`undefined` \| `HTMLCanvasElement`

#### Overrides

ImageVidaSubComponent.image

#### Defined in

components/qrcodesubcomponent.ts:278

___

### imageToSvg

▸ **imageToSvg**(): `Promise`\<`any`\>

#### Returns

`Promise`\<`any`\>

#### Overrides

ImageVidaSubComponent.imageToSvg

#### Defined in

components/qrcodesubcomponent.ts:69

___

### makeHitformFunction

▸ **makeHitformFunction**(`scale`): `undefined` \| (`ctx`: `any`) => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `scale` | `number` |

#### Returns

`undefined` \| (`ctx`: `any`) => `void`

#### Overrides

ImageVidaSubComponent.makeHitformFunction

#### Defined in

components/qrcodesubcomponent.ts:283

___

### makeImage

▸ **makeImage**(`imageWidth`, `imageHeight`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `imageWidth` | `number` |
| `imageHeight` | `number` |

#### Returns

`Promise`\<`void`\>

#### Overrides

ImageVidaSubComponent.makeImage

#### Defined in

components/qrcodesubcomponent.ts:251

___

### mergeSvg

▸ **mergeSvg**(): `void`

#### Returns

`void`

#### Defined in

components/qrcodesubcomponent.ts:73

___

### randomOptions

▸ **randomOptions**(): `Partial`\<`ImageOptions`\>

#### Returns

`Partial`\<`ImageOptions`\>

#### Overrides

ImageVidaSubComponent.randomOptions

#### Defined in

components/qrcodesubcomponent.ts:36

___

### toJson

▸ **toJson**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `backgroundColor` | `undefined` \| `string` |
| `color` | `undefined` \| `string` |
| `symbol` | \{ `colors`: `undefined` \| `ColorsDict` ; `id`: `string`  } \| \{ `colors?`: `undefined` ; `id?`: `undefined`  } |
| `type` | ``"qrcode"`` |
| `url` | `undefined` \| `string` |

#### Overrides

ImageVidaSubComponent.toJson

#### Defined in

components/qrcodesubcomponent.ts:58

___

### toSvg

▸ **toSvg**(): `string`

#### Returns

`string`

#### Defined in

components/qrcodesubcomponent.ts:245

___

### update

▸ **update**(`options`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Partial`\<`ImageOptions`\> |

#### Returns

`Promise`\<`void`\>

#### Overrides

ImageVidaSubComponent.update

#### Defined in

components/qrcodesubcomponent.ts:156
