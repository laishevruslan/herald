[aktivisda-library](aktivisda-libraryREADME.md) / Exports

# aktivisda-library

## Table of contents

### Classes

- [QrcodeVidaSubComponent](aktivisda-libraryclasses/QrcodeVidaSubComponent.md)
- [Vida](aktivisda-libraryclasses/Vida.md)

### Functions

- [colorSvgString](aktivisda-librarymodules.md#colorsvgstring)
- [compressImage](aktivisda-librarymodules.md#compressimage)
- [computeCoverSize](aktivisda-librarymodules.md#computecoversize)
- [computeRandomDistortedSquare](aktivisda-librarymodules.md#computerandomdistortedsquare)
- [extractBestTranslation](aktivisda-librarymodules.md#extractbesttranslation)
- [extractColors](aktivisda-librarymodules.md#extractcolors)
- [extractDimensions](aktivisda-librarymodules.md#extractdimensions)
- [generateId](aktivisda-librarymodules.md#generateid)
- [jsonToURI](aktivisda-librarymodules.md#jsontouri)
- [loadSvg](aktivisda-librarymodules.md#loadsvg)
- [overrideValues](aktivisda-librarymodules.md#overridevalues)
- [pSBC](aktivisda-librarymodules.md#psbc)
- [prepareColors](aktivisda-librarymodules.md#preparecolors)
- [stringifyQuery](aktivisda-librarymodules.md#stringifyquery)
- [svgToDom](aktivisda-librarymodules.md#svgtodom)

## Functions

### colorSvgString

▸ **colorSvgString**(`preparedSvgString`, `colors`): `Object`

prepareSvgString is the output of 'prepareColors'

#### Parameters

| Name | Type |
| :------ | :------ |
| `preparedSvgString` | `string` |
| `colors` | `ColorsDict` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `string` | `string` |
| `url` | `string` |

#### Defined in

utils/svgutils.ts:31

___

### compressImage

▸ **compressImage**(`dataURI`, `mimeType`, `quality`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dataURI` | `string` |
| `mimeType` | `MimeType` |
| `quality` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

compress/index.ts:72

___

### computeCoverSize

▸ **computeCoverSize**(`imageWidth`, `imageHeight`, `documentWidth`, `documentHeight`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `imageWidth` | `number` |
| `imageHeight` | `number` |
| `documentWidth` | `number` |
| `documentHeight` | `number` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `height` | `number` |
| `width` | `number` |

#### Defined in

utils/svgutils.ts:136

___

### computeRandomDistortedSquare

▸ **computeRandomDistortedSquare**(`angleParam`): `Polygon`

Call computeDistoredSquare on random angles between -angleParam and +angleParam
Works well if angle < 40

#### Parameters

| Name | Type |
| :------ | :------ |
| `angleParam` | `number` |

#### Returns

`Polygon`

#### Defined in

utils/geometry.ts:153

___

### extractBestTranslation

▸ **extractBestTranslation**(`translations`, `locale`, `defaultLocale`): `undefined` \| `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `translations` | `I18nDict` |
| `locale` | `string` |
| `defaultLocale` | `string` |

#### Returns

`undefined` \| `string`

#### Defined in

utils/utils.ts:182

___

### extractColors

▸ **extractColors**(`svgString`): `Set`\<`String`\>

Parse an svg string and find all html colors (except for page/border color)
and retun the set of this colors.
Used by backtivisda when a new svn is uploaded.
Works with a regex

#### Parameters

| Name | Type |
| :------ | :------ |
| `svgString` | `string` |

#### Returns

`Set`\<`String`\>

#### Defined in

utils/svgutils.ts:75

___

### extractDimensions

▸ **extractDimensions**(`svgString`): `Dimensions`

#### Parameters

| Name | Type |
| :------ | :------ |
| `svgString` | `string` |

#### Returns

`Dimensions`

#### Defined in

utils/svgutils.ts:82

___

### generateId

▸ **generateId**(): `Uuid`

#### Returns

`Uuid`

#### Defined in

utils/utils.ts:5

___

### jsonToURI

▸ **jsonToURI**(`json`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `json` | `any` |

#### Returns

`string`

#### Defined in

utils/utils.ts:9

___

### loadSvg

▸ **loadSvg**(`svgUrl`, `options`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `svgUrl` | `string` |
| `options` | `any` |

#### Returns

`Promise`\<`string`\>

#### Defined in

utils/svgutils.ts:98

___

### overrideValues

▸ **overrideValues**(`target`, `source`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `target` | `any` |
| `source` | `any` |

#### Returns

`void`

#### Defined in

utils/utils.ts:113

___

### pSBC

▸ **pSBC**(`p`, `c0`, `c1`, `l`): ``null`` \| `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `p` | `number` |
| `c0` | `string` |
| `c1` | `any` |
| `l` | `any` |

#### Returns

``null`` \| `string`

#### Defined in

utils/utils.ts:130

___

### prepareColors

▸ **prepareColors**(`svgString`): `string`

Prepare a svg string for color replacement.
Replace all html colors #03ef39 to CC03ef39
Only works for 6-chars HTML colors

#### Parameters

| Name | Type |
| :------ | :------ |
| `svgString` | `string` |

#### Returns

`string`

string

#### Defined in

utils/svgutils.ts:57

___

### stringifyQuery

▸ **stringifyQuery**(`obj`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `obj` | `any` |

#### Returns

`string`

#### Defined in

utils/utils.ts:33

___

### svgToDom

▸ **svgToDom**(`svgString`): `Document`

#### Parameters

| Name | Type |
| :------ | :------ |
| `svgString` | `string` |

#### Returns

`Document`

#### Defined in

utils/svgutils.ts:129
