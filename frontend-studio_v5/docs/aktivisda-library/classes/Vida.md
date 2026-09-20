[aktivisda-library](aktivisda-libraryREADME.md) / [Exports](aktivisda-librarymodules.md) / Vida

# Class: Vida

## Table of contents

### Constructors

- [constructor](aktivisda-libraryclasses/Vida.md#constructor)

### Properties

- [\_exportingLayerMutex](aktivisda-libraryclasses/Vida.md#_exportinglayermutex)
- [\_selectedComponent](aktivisda-libraryclasses/Vida.md#_selectedcomponent)
- [background](aktivisda-libraryclasses/Vida.md#background)
- [components](aktivisda-libraryclasses/Vida.md#components)
- [document](aktivisda-libraryclasses/Vida.md#document)
- [documentSize](aktivisda-libraryclasses/Vida.md#documentsize)
- [gallery](aktivisda-libraryclasses/Vida.md#gallery)
- [layer](aktivisda-libraryclasses/Vida.md#layer)
- [stage](aktivisda-libraryclasses/Vida.md#stage)
- [version](aktivisda-libraryclasses/Vida.md#version)

### Methods

- [\_findComponent](aktivisda-libraryclasses/Vida.md#_findcomponent)
- [\_toPdfDescription](aktivisda-libraryclasses/Vida.md#_topdfdescription)
- [canRedo](aktivisda-libraryclasses/Vida.md#canredo)
- [canUndo](aktivisda-libraryclasses/Vida.md#canundo)
- [componentAllowedActions](aktivisda-libraryclasses/Vida.md#componentallowedactions)
- [componentExists](aktivisda-libraryclasses/Vida.md#componentexists)
- [componentParams](aktivisda-libraryclasses/Vida.md#componentparams)
- [componentsKeys](aktivisda-libraryclasses/Vida.md#componentskeys)
- [computeAvailableLocales](aktivisda-libraryclasses/Vida.md#computeavailablelocales)
- [createComponent](aktivisda-libraryclasses/Vida.md#createcomponent)
- [createRandomComponent](aktivisda-libraryclasses/Vida.md#createrandomcomponent)
- [destroy](aktivisda-libraryclasses/Vida.md#destroy)
- [documentParams](aktivisda-libraryclasses/Vida.md#documentparams)
- [draw](aktivisda-libraryclasses/Vida.md#draw)
- [handleResize](aktivisda-libraryclasses/Vida.md#handleresize)
- [isSelected](aktivisda-libraryclasses/Vida.md#isselected)
- [loadJson](aktivisda-libraryclasses/Vida.md#loadjson)
- [nbComponents](aktivisda-libraryclasses/Vida.md#nbcomponents)
- [onClick](aktivisda-libraryclasses/Vida.md#onclick)
- [onComponentUpdated](aktivisda-libraryclasses/Vida.md#oncomponentupdated)
- [onSelect](aktivisda-libraryclasses/Vida.md#onselect)
- [randomInit](aktivisda-libraryclasses/Vida.md#randominit)
- [rearrangeZIndices](aktivisda-libraryclasses/Vida.md#rearrangezindices)
- [redoComponent](aktivisda-libraryclasses/Vida.md#redocomponent)
- [registerComponent](aktivisda-libraryclasses/Vida.md#registercomponent)
- [registerTransformer](aktivisda-libraryclasses/Vida.md#registertransformer)
- [removeComponent](aktivisda-libraryclasses/Vida.md#removecomponent)
- [selectComponent](aktivisda-libraryclasses/Vida.md#selectcomponent)
- [selectedComponent](aktivisda-libraryclasses/Vida.md#selectedcomponent)
- [setGallery](aktivisda-libraryclasses/Vida.md#setgallery)
- [setupComponent](aktivisda-libraryclasses/Vida.md#setupcomponent)
- [stageDimension](aktivisda-libraryclasses/Vida.md#stagedimension)
- [toImage](aktivisda-libraryclasses/Vida.md#toimage)
- [toJson](aktivisda-libraryclasses/Vida.md#tojson)
- [toLink](aktivisda-libraryclasses/Vida.md#tolink)
- [toPdf](aktivisda-libraryclasses/Vida.md#topdf)
- [undoComponent](aktivisda-libraryclasses/Vida.md#undocomponent)
- [updateComponent](aktivisda-libraryclasses/Vida.md#updatecomponent)
- [updateDocument](aktivisda-libraryclasses/Vida.md#updatedocument)
- [zoom](aktivisda-libraryclasses/Vida.md#zoom)

## Constructors

### constructor

• **new Vida**(`canvasId`): [`Vida`](aktivisda-libraryclasses/Vida.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `canvasId` | `string` |

#### Returns

[`Vida`](aktivisda-libraryclasses/Vida.md)

#### Defined in

vida.ts:46

## Properties

### \_exportingLayerMutex

• **\_exportingLayerMutex**: `Mutex`

#### Defined in

vida.ts:44

___

### \_selectedComponent

• **\_selectedComponent**: `undefined` \| `string`

#### Defined in

vida.ts:38

___

### background

• **background**: `default`

#### Defined in

vida.ts:34

___

### components

• **components**: `default`[]

#### Defined in

vida.ts:33

___

### document

• **document**: `DocumentParams`

#### Defined in

vida.ts:32

___

### documentSize

• **documentSize**: `Dimensions`

#### Defined in

vida.ts:35

___

### gallery

• **gallery**: `undefined` \| `ImageGallery`

#### Defined in

vida.ts:39

___

### layer

• **layer**: `Layer`

#### Defined in

vida.ts:41

___

### stage

• **stage**: `Stage`

#### Defined in

vida.ts:42

___

### version

• **version**: `undefined` \| `string`

#### Defined in

vida.ts:36

## Methods

### \_findComponent

▸ **_findComponent**(`componentId`): `undefined` \| `default`

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`undefined` \| `default`

#### Defined in

vida.ts:607

___

### \_toPdfDescription

▸ **_toPdfDescription**(): `Promise`\<\{ `description`: `TDocumentDefinitions` ; `status`: `string` = status }\>

Create a representation of the current vida that can be
used by pdfmake to create a pdf representation of the
vida.
Should be used through toPdfDataUrl in utils/pdf.ts

#### Returns

`Promise`\<\{ `description`: `TDocumentDefinitions` ; `status`: `string` = status }\>

a pdf representation

#### Defined in

vida.ts:166

___

### canRedo

▸ **canRedo**(`componentId`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`boolean`

#### Defined in

vida.ts:452

___

### canUndo

▸ **canUndo**(`componentId`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`boolean`

#### Defined in

vida.ts:446

___

### componentAllowedActions

▸ **componentAllowedActions**(`componentId`): `Set`\<`unknown`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`Set`\<`unknown`\>

#### Defined in

vida.ts:144

___

### componentExists

▸ **componentExists**(`componentId`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`boolean`

#### Defined in

vida.ts:134

___

### componentParams

▸ **componentParams**(`componentId`): `DocumentParams` \| `Partial`\<`ComponentParams`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`DocumentParams` \| `Partial`\<`ComponentParams`\>

#### Defined in

vida.ts:139

___

### componentsKeys

▸ **componentsKeys**(): `string`[]

#### Returns

`string`[]

#### Defined in

vida.ts:130

___

### computeAvailableLocales

▸ **computeAvailableLocales**(): `Set`\<`any`\>

#### Returns

`Set`\<`any`\>

#### Defined in

vida.ts:554

___

### createComponent

▸ **createComponent**(`options`): `Promise`\<`boolean` \| `void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Partial`\<`ComponentParams`\> |

#### Returns

`Promise`\<`boolean` \| `void`\>

#### Defined in

vida.ts:479

___

### createRandomComponent

▸ **createRandomComponent**(`type`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | ``"text"`` \| ``"internalsvg"`` \| ``"qrcode"`` \| ``"emoji"`` \| ``"textchoice"`` \| ``"internalphoto"`` |

#### Returns

`Promise`\<`string`\>

#### Defined in

vida.ts:493

___

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Defined in

vida.ts:589

___

### documentParams

▸ **documentParams**(): `DocumentParams`

#### Returns

`DocumentParams`

#### Defined in

vida.ts:126

___

### draw

▸ **draw**(): `void`

#### Returns

`void`

#### Defined in

vida.ts:584

___

### handleResize

▸ **handleResize**(): `void`

#### Returns

`void`

#### Defined in

vida.ts:372

___

### isSelected

▸ **isSelected**(`componentId`): `undefined` \| `boolean` \| ``""``

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`undefined` \| `boolean` \| ``""``

#### Defined in

vida.ts:122

___

### loadJson

▸ **loadJson**(`template`): `Promise`\<`void`\>

Initialize vida with all the data from template.
Reset everything.

#### Parameters

| Name | Type |
| :------ | :------ |
| `template` | `Template` |

#### Returns

`Promise`\<`void`\>

Promise<void>. Resolved once everything is setup

**`Method`**

**`Name`**

Vida.Vida#loadJson

**`Example`**

```ts
const template = JSON.parse(...); // Load the template representation
const vida = new Vida(canvasId);
await vida.loadJson(); // or use vida.loadJson().then(() => ...);
```

#### Defined in

vida.ts:313

___

### nbComponents

▸ **nbComponents**(): `number`

#### Returns

`number`

#### Defined in

vida.ts:550

___

### onClick

▸ **onClick**(`_x`, `_y`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_x` | `number` |
| `_y` | `number` |

#### Returns

`void`

#### Defined in

vida.ts:603

___

### onComponentUpdated

▸ **onComponentUpdated**(`_componentId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_componentId` | `string` |

#### Returns

`void`

#### Defined in

vida.ts:595

___

### onSelect

▸ **onSelect**(`_componentId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_componentId` | `string` |

#### Returns

`void`

#### Defined in

vida.ts:599

___

### randomInit

▸ **randomInit**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

vida.ts:291

___

### rearrangeZIndices

▸ **rearrangeZIndices**(): `void`

#### Returns

`void`

#### Defined in

vida.ts:573

___

### redoComponent

▸ **redoComponent**(`componentId`): `undefined` \| `Promise`\<`unknown`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`undefined` \| `Promise`\<`unknown`\>

#### Defined in

vida.ts:464

___

### registerComponent

▸ **registerComponent**(`konvaElement`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `konvaElement` | `Group` \| `Image` |

#### Returns

`void`

#### Defined in

vida.ts:564

___

### registerTransformer

▸ **registerTransformer**(`konvaElement`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `konvaElement` | `Group` \| `Image` |

#### Returns

`void`

#### Defined in

vida.ts:569

___

### removeComponent

▸ **removeComponent**(`componentId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`void`

#### Defined in

vida.ts:470

___

### selectComponent

▸ **selectComponent**(`componentId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`void`

#### Defined in

vida.ts:110

___

### selectedComponent

▸ **selectedComponent**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

vida.ts:106

___

### setGallery

▸ **setGallery**(`gallery`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `gallery` | `ImageGallery` |

#### Returns

`void`

#### Defined in

vida.ts:91

___

### setupComponent

▸ **setupComponent**(`componentParams`): `Promise`\<`boolean` \| `void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentParams` | `Partial`\<`ComponentParams`\> |

#### Returns

`Promise`\<`boolean` \| `void`\>

#### Defined in

vida.ts:523

___

### stageDimension

▸ **stageDimension**(`canvas`): `Dimensions`

#### Parameters

| Name | Type |
| :------ | :------ |
| `canvas` | `HTMLCanvasElement` |

#### Returns

`Dimensions`

#### Defined in

vida.ts:95

___

### toImage

▸ **toImage**(`mimeType`): `Promise`\<`string`\>

Export the vida image to a dataUrl image in the given
MimeType (currently only support image/png and image/jpeg)

Image is also compressed locally using JpegOptim or Oxipng.
Uncompressed image is returned in case of error.

This is done internaly by creating a new Html5CanvasElement

#### Parameters

| Name | Type |
| :------ | :------ |
| `mimeType` | `MimeType` |

#### Returns

`Promise`\<`string`\>

#### Defined in

vida.ts:232

___

### toJson

▸ **toJson**(): `Template`

#### Returns

`Template`

#### Defined in

vida.ts:148

___

### toLink

▸ **toLink**(): `string`

#### Returns

`string`

#### Defined in

vida.ts:278

___

### toPdf

▸ **toPdf**(`fonts`): `Promise`\<`string`\>

Export the vida image to a dataUrl pdf
using pdfmake.

#### Parameters

| Name | Type |
| :------ | :------ |
| `fonts` | `any` |

#### Returns

`Promise`\<`string`\>

#### Defined in

vida.ts:207

___

### undoComponent

▸ **undoComponent**(`componentId`): `undefined` \| `Promise`\<`unknown`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |

#### Returns

`undefined` \| `Promise`\<`unknown`\>

#### Defined in

vida.ts:458

___

### updateComponent

▸ **updateComponent**(`componentId`, `options`): `undefined` \| `Promise`\<`boolean` \| `void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `componentId` | `string` |
| `options` | `Partial`\<`ComponentParams`\> |

#### Returns

`undefined` \| `Promise`\<`boolean` \| `void`\>

#### Defined in

vida.ts:426

___

### updateDocument

▸ **updateDocument**(`documentParams`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `documentParams` | `Partial`\<`DocumentParams`\> |

#### Returns

`Promise`\<`void`\>

#### Defined in

vida.ts:384

___

### zoom

▸ **zoom**(`factor?`): `number`

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `factor` | ``null`` \| `number` | `null` |

#### Returns

`number`

#### Defined in

vida.ts:355
