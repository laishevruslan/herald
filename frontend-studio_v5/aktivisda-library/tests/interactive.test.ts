// Test the interactive methods of aktivisda-library
// Namely: adjustPosition, adjustSizeAndPosition, etc.

import { expect, test, beforeEach, afterEach } from 'vitest';
import {
    asset,
    checkStep
} from './utils.ts';
import fs from 'node:fs';

import Vida from '../lib/vida.js';
import JsonGallery from '../lib/jsongallery.js';
import TextVidaComponent from '../lib/components/textvidacomponent.ts';
import ImageVidaComponent from '../lib/components/imagevidacomponent.ts';
import { computeAbsolutePosition } from '../lib/utils/positionutils.ts';

let canvas: any;

beforeEach(() => {
    canvas = document.createElement('div');
    canvas.id = 'canvascontainer'
    document.body.append(canvas)
    canvas.width = 400;
    canvas.height = 300;
});

afterEach(() => {
    canvas.remove();
})

/**
 * Very basic template, only one text.
 * No rules, no i18n.
 */
test('Testing template10 interactivity', async () => {
    let nbCallsToComponentUpdated = 0;

    // Given
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);

    vida.onComponentUpdated = () => nbCallsToComponentUpdated++;

    vida.setGallery(gallery);

    const template = JSON.parse(fs.readFileSync(asset(`templates/template10.json`), 'utf-8'));
    const uuid = '20bbb392';
    // When
    await vida.loadJson(template);
    vida.zoom(null);
    expect(vida.selectedComponent()).toBe(undefined);

    expect(vida.componentsKeys()).toStrictEqual([uuid]);
    expect(vida.componentExists(uuid)).toBeTruthy();
    vida.selectComponent(uuid);
    expect(vida.selectedComponent()).toBe(uuid);
    expect((await checkStep(vida, 'template10.interactive', 'selectcomponent')).equal).toBeTruthy();
    expect(vida.isSelected(uuid)).toBeTruthy();

    vida.selectComponent('2992256f'); // document
    expect((await checkStep(vida, 'template10.interactive', 'unselectcomponent')).equal).toBeTruthy();
    expect(vida.isSelected(uuid)).toBeFalsy();

    const component = <TextVidaComponent>vida._findComponent(uuid)!;
    expect(component).toBeInstanceOf(TextVidaComponent);

    expect(nbCallsToComponentUpdated).toBe(0);

    expect(component.canUndo()).toBeFalsy();
    // x move to the right
    component.konvaElement?.setAttrs({x: component.konvaElement.x() + 200});
    component.adjustPosition();
    expect(nbCallsToComponentUpdated).toBe(1);
    expect((await checkStep(vida, 'template10.interactive', 'moveright')).equal).toBeTruthy();
    expect(vida.canUndo(uuid)).toBeTruthy();
    expect(vida.componentParams(uuid).position.x).toBe(0.6290920321185918);

    await vida.undoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(2);
    expect((await checkStep(vida, 'template10.interactive', 'unselectcomponent')).equal).toBeTruthy();
    expect(vida.canUndo(uuid)).toBeFalsy();

    expect(vida.canRedo(uuid)).toBeTruthy();
    await vida.redoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(3);
    expect((await checkStep(vida, 'template10.interactive', 'moveright')).equal).toBeTruthy();
    await vida.undoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(4);
    expect((await checkStep(vida, 'template10.interactive', 'unselectcomponent')).equal).toBeTruthy();
    expect(vida.componentParams(uuid).position.x).toBe(0.5055589870290302);

    component.konvaElement?.setAttrs({ y: component.konvaElement.y() - 500 });
    component.adjustPosition();
    expect(nbCallsToComponentUpdated).toBe(5);
    expect((await checkStep(vida, 'template10.interactive', 'movetop')).equal).toBeTruthy();
    expect(vida.componentParams(uuid).position.y).toBe(0.020370370370370372);
    await vida.undoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(6);

    component.konvaElement?.setAttrs({
        x: component.konvaElement.x() - 150,
        y: component.konvaElement.y() + 400 });
    component.adjustPosition();
    expect(nbCallsToComponentUpdated).toBe(7);
    expect((await checkStep(vida, 'template10.interactive', 'bottomleft')).equal).toBeTruthy();
    await vida.undoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(8);
    expect((await checkStep(vida, 'template10.interactive', 'unselectcomponent')).equal).toBeTruthy();

    component.konvaElement?.rotation(90);
    component.adjustSizeAndAngle();
    expect(nbCallsToComponentUpdated).toBe(9);
    expect((await checkStep(vida, 'template10.interactive', 'rotation')).equal).toBeTruthy();
    expect(vida.canUndo(uuid)).toBeTruthy();

    await vida.undoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(10);
    expect((await checkStep(vida, 'template10.interactive', 'unselectcomponent')).equal).toBeTruthy();
    expect(vida.canUndo(uuid)).toBeFalsy();
    expect(vida.canRedo(uuid)).toBeTruthy();
    await vida.redoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(11);
    expect((await checkStep(vida, 'template10.interactive', 'rotation')).equal).toBeTruthy();
    await vida.undoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(12);

    component.konvaElement?.scaleX(1.3);
    component.konvaElement?.scaleY(1.3);
    component.adjustSizeAndAngle();
    expect(nbCallsToComponentUpdated).toBe(13);
    expect((await checkStep(vida, 'template10.interactive', 'grower')).equal).toBeTruthy();
    expect(vida.componentParams(uuid).size).toBe(1.3*263);

    await vida.undoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(14);
    expect((await checkStep(vida, 'template10.interactive', 'unselectcomponent')).equal).toBeTruthy();

    vida.selectComponent(uuid);
    expect(vida.isSelected(uuid)).toBeTruthy();
    vida.removeComponent(uuid);
    expect((await checkStep(vida, 'template10.interactive', 'removed')).equal).toBeTruthy();
    expect(vida.componentExists(uuid)).toBeFalsy();
    expect(vida.nbComponents()).toBe(0);
})

/**
 * Very basic template, only one image.
 * No rules, no i18n
 */
test('Testing template 8 interactivity', async () => {
    let nbCallsToComponentUpdated = 0;

    // Given
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);

    vida.onComponentUpdated = () => nbCallsToComponentUpdated++;

    vida.setGallery(gallery);

    const template = JSON.parse(fs.readFileSync(asset(`templates/template8.json`), 'utf-8'));
    const uuid = 'a800894a';
    // When
    await vida.loadJson(template);
    vida.zoom(null);
    expect(vida.selectedComponent()).toBe(undefined);

    vida.selectComponent(uuid);
    expect(vida.isSelected(uuid));
    expect((await checkStep(vida, 'template8.interactive', 'selected')).equal).toBeTruthy();

    expect(vida.componentsKeys()).toStrictEqual([uuid]);
    const component = <ImageVidaComponent>vida._findComponent(uuid)!;
    expect(component).toBeInstanceOf(ImageVidaComponent);

    expect(nbCallsToComponentUpdated).toBe(0);
    component.konvaElement!.rotation(45);
    expect((await checkStep(vida, 'template8.interactive', 'rotation')).equal).toBeTruthy();
    component.adjustSizeAndAngle();
    expect(nbCallsToComponentUpdated).toBe(1);
    expect(vida.componentParams(uuid).angle).toBe(45);
    expect(vida.canUndo(uuid)).toBeTruthy();
    expect(vida.canRedo(uuid)).toBeFalsy();

    await vida.undoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(2);
    expect((await checkStep(vida, 'template8.interactive', 'selected')).equal).toBeTruthy();
    expect(vida.canUndo(uuid)).toBeFalsy();
    expect(vida.canRedo(uuid)).toBeTruthy();

    await vida.redoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(3);
    expect((await checkStep(vida, 'template8.interactive', 'rotation')).equal).toBeTruthy();
    expect(vida.canUndo(uuid)).toBeTruthy();
    expect(vida.canRedo(uuid)).toBeFalsy();

    await vida.undoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(4);
    expect((await checkStep(vida, 'template8.interactive', 'selected')).equal).toBeTruthy();
    expect(vida.canUndo(uuid)).toBeFalsy();
    expect(vida.canRedo(uuid)).toBeTruthy();

    component.konvaElement?.setAttrs({ x: component.konvaElement.x() + 100});
    component.adjustPosition();
    expect(nbCallsToComponentUpdated).toBe(5);
    expect((await checkStep(vida, 'template8.interactive', 'moveright')).equal).toBeTruthy();
    await vida.undoComponent(uuid);
    expect(nbCallsToComponentUpdated).toBe(6);
    expect(vida.canUndo(uuid)).toBeFalsy();
    expect(vida.canRedo(uuid)).toBeTruthy();
    expect((await checkStep(vida, 'template8.interactive', 'selected')).equal).toBeTruthy();

    component.konvaElement?.setAttrs({ y: component.konvaElement.y() + 100});
    component.adjustPosition();
    expect(vida.componentParams(uuid).position.y).toBe(0.572761781155707);
    expect(nbCallsToComponentUpdated).toBe(7);
    expect((await checkStep(vida, 'template8.interactive', 'movebottom')).equal).toBeTruthy();

    component.konvaElement?.setAttrs({ scaleX: 0.7, scaleY: 0.7});
    component.adjustSizeAndAngle();
    expect(nbCallsToComponentUpdated).toBe(8);
    component.adjustSizeAndAngle(); // Nothing done
    expect(nbCallsToComponentUpdated).toBe(8);
    expect((await checkStep(vida, 'template8.interactive', 'bottomandscale')).equal).toBeTruthy();
    expect(vida.componentParams(uuid).position.y).toBe(0.572761781155707);
    expect(vida.componentParams(uuid).scale).toBe(55*0.7);

    component.konvaElement?.setAttrs({ scaleX: 2, scaleY: 2});
    component.adjustSizeAndAngle();
    expect(nbCallsToComponentUpdated).toBe(9);
    expect((await checkStep(vida, 'template8.interactive', 'bottomandscalebis')).equal).toBeTruthy();
    expect(vida.componentParams(uuid).position.y).toBe(0.572761781155707);
    expect(vida.componentParams(uuid).scale).toBeCloseTo(55*2, 0);

    expect(vida.canUndo(uuid)).toBeTruthy();
    await vida.undoComponent(uuid);
    expect(vida.canUndo(uuid)).toBeTruthy();
    await vida.undoComponent(uuid);
    expect(vida.canRedo(uuid)).toBeTruthy();
    await vida.undoComponent(uuid);
    expect(vida.canRedo(uuid)).toBeTruthy();
    await vida.redoComponent(uuid);
    expect(vida.canRedo(uuid)).toBeTruthy();
    await vida.redoComponent(uuid);
    expect(vida.canRedo(uuid)).toBeTruthy();
    await vida.redoComponent(uuid);
    expect((await checkStep(vida, 'template8.interactive', 'bottomandscalebis')).equal).toBeTruthy();

    vida.removeComponent(uuid);
    expect(vida.nbComponents()).toBe(0);
    expect(vida.componentExists(uuid)).toBeFalsy();
});

/**
 * Template with rules and texts
 */
test('Testing rules and interactivity, template23', async () => {
    let nbCallsToComponentUpdated = 0;

    // Given
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);

    vida.onComponentUpdated = () => nbCallsToComponentUpdated++;

    vida.setGallery(gallery);

    const template = JSON.parse(fs.readFileSync(asset(`templates/template23.json`), 'utf-8'));
    await vida.loadJson(template);
    vida.zoom(null);

    vida.selectComponent('selffixed');
    expect(vida.isSelected('selffixed')).toBeTruthy();
    expect((await checkStep(vida, 'template23.interactive', 'base')).equal).toBeTruthy();

    await vida.updateComponent('selffixed', { color: '#bb1122' });
    let selffixedComp = <TextVidaComponent>vida._findComponent('selffixed')!;
    selffixedComp.konvaElement!.setAttrs({
        x: selffixedComp.konvaElement!.x() + 200,
        y: selffixedComp.konvaElement!.y() + 200,
    });
    expect((await checkStep(vida, 'template23.interactive', 'selffixed.moved')).equal).toBeTruthy();
    selffixedComp.adjustPosition();
    expect(nbCallsToComponentUpdated).toBe(0);
    await vida.undoComponent('selffixed'); // undo the color change
    expect(nbCallsToComponentUpdated).toBe(1);
    expect(vida.canUndo('selffixed')).toBeFalsy();
    expect((await checkStep(vida, 'template23.interactive', 'base')).equal).toBeTruthy();
    // We don't check adjustSizeAndAngle because it will not work
    // self.fixed and other are not implemented
    // because I preferred to deactivate these moves
    await vida.updateComponent('selffixed', { rules: {
        self: { fixed: false },
    }});
    expect((await checkStep(vida, 'template23.interactive', 'selffixed.free')).equal).toBeTruthy();
    await vida.updateComponent('selffixed', { rules: {
        size: { fixed: true }
    }});
    expect((await checkStep(vida, 'template23.interactive', 'selffixed.sizefixed')).equal).toBeTruthy();
    await vida.updateComponent('selffixed', { rules: {
        angle: { fixed: true }
    }});
    expect((await checkStep(vida, 'template23.interactive', 'selffixed.sizeandanglefixed')).equal).toBeTruthy();
    expect(selffixedComp._undoHistory.length).toBe(4);
    // Undo currently does not work well because we don't setup default values.
    // Undoing last step should be "angle: {fixed: false }" but we don't
    // have a way to say it.
    // See #149

    vida.selectComponent('xfixedyfree');
    expect(vida.isSelected('xfixedyfree')).toBeTruthy();
    let xfixedyfreeComp = <TextVidaComponent>vida._findComponent('xfixedyfree')!;
    xfixedyfreeComp.konvaElement!.setAttrs({
        x: xfixedyfreeComp.konvaElement!.x() + 200,
        y: xfixedyfreeComp.konvaElement!.y() + 200,
    });
    expect((await checkStep(vida, 'template23.interactive', 'xfixedyfree.moved')).equal).toBeTruthy();
    xfixedyfreeComp.adjustPosition();
    expect((await checkStep(vida, 'template23.interactive', 'xfiedyfree.adjusted')).equal).toBeTruthy();
    vida.selectComponent('2992256f'); // document
    await vida.undoComponent('xfixedyfree');
    expect((await checkStep(vida, 'template23.interactive', 'base')).equal).toBeTruthy();

    vida.selectComponent('xminymax');
    let xminymaxComp = <TextVidaComponent>vida._findComponent('xminymax')!;
    xminymaxComp.konvaElement!.setAttrs({
        x: xminymaxComp.konvaElement!.x() - 1000,
        y: xminymaxComp.konvaElement!.y() + 700,
    });
    expect((await checkStep(vida, 'template23.interactive', 'xminymax.moved')).equal).toBeTruthy();
    xminymaxComp.adjustPosition();
    expect((await checkStep(vida, 'template23.interactive', 'xminymax.adjusted')).equal).toBeTruthy();
    xminymaxComp.konvaElement!.setAttrs({
        x: xminymaxComp.konvaElement!.x() - 1000,
        y: xminymaxComp.konvaElement!.y() + 700,
    });
    xminymaxComp.adjustPosition();
    expect(vida.componentParams('xminymax').position.x).toBe(0.5);
    expect(vida.componentParams('xminymax').position.y).toBe(0.5);
    expect((await checkStep(vida, 'template23.interactive', 'xminymax.adjusted')).equal).toBeTruthy();
    expect(xminymaxComp._undoHistory.length).toBe(2); // Nothing changed in previous pos
    expect(vida.componentParams('xminymax').position.x).toBe(0.5);
    expect(vida.componentParams('xminymax').position.y).toBe(0.5);
    await vida.undoComponent('xminymax');
    vida.selectComponent('2992256f'); // document
    expect((await checkStep(vida, 'template23.interactive', 'base')).equal).toBeTruthy();

    vida.selectComponent('sizeminmax');
    let sizeminmaxComp = <TextVidaComponent>vida._findComponent('sizeminmax')!;
    sizeminmaxComp.konvaElement!.setAttrs({
        scaleX: 2,
        scaleY: 2,
    });
    expect((await checkStep(vida, 'template23.interactive', 'sizeminmax.bigger')).equal).toBeTruthy();
    sizeminmaxComp.adjustSizeAndAngle();
    expect(vida.componentParams('sizeminmax').size).toBe(100);
    expect((await checkStep(vida, 'template23.interactive', 'sizeminmax.adjusted')).equal).toBeTruthy();
    sizeminmaxComp.konvaElement!.setAttrs({
        scaleX: 0.3,
        scaleY: 0.3,
    });
    expect((await checkStep(vida, 'template23.interactive', 'sizeminmax.smaller')).equal).toBeTruthy();
    sizeminmaxComp.adjustSizeAndAngle();
    expect(vida.componentParams('sizeminmax').size).toBe(70);
    await vida.undoComponent('sizeminmax');
    await vida.undoComponent('sizeminmax');
    expect(vida.canUndo('sizeminmax')).toBeFalsy();
    vida.selectComponent('2992256f'); // document
    expect((await checkStep(vida, 'template23.interactive', 'base')).equal).toBeTruthy();

    vida.selectComponent('sizefixed');
    let sizefixed = <TextVidaComponent>vida._findComponent('sizefixed')!;
    sizefixed.konvaElement!.setAttrs({
        scaleX: 2,
        scaleY: 2,
    });
    // We can see in the screenshots that "scale" option is deactivated
    expect((await checkStep(vida, 'template23.interactive', 'sizefixed.bigger')).equal).toBeTruthy();
    vida.selectComponent('2992256f'); // document
    sizefixed.adjustSizeAndAngle();
    expect(vida.componentParams('sizefixed').size).toBe(80);
    vida.selectComponent('2992256f'); // document
    expect((await checkStep(vida, 'template23.interactive', 'base')).equal).toBeTruthy();

    vida.selectComponent('anglefixed');
    let anglefixed = <TextVidaComponent>vida._findComponent('anglefixed')!;
    expect(vida.componentParams('anglefixed').angle).toBe(-10);
    anglefixed.konvaElement!.rotation(30);
    // We can see in the screenshots that "angle" option is deactivated
    expect((await checkStep(vida, 'template23.interactive', 'anglefixed.changed')).equal).toBeTruthy();
    vida.selectComponent('2992256f'); // document
    anglefixed.adjustSizeAndAngle();
    expect(vida.componentParams('anglefixed').angle).toBe(-10);
    expect((await checkStep(vida, 'template23.interactive', 'base')).equal).toBeTruthy();
    // Because nothing changed
    expect(vida.canUndo('anglefixed')).toBeFalsy();

    vida.selectComponent('angleminmax');
    let angleminmax = <TextVidaComponent>vida._findComponent('angleminmax')!;
    angleminmax.konvaElement!.rotation(40);
    angleminmax.adjustSizeAndAngle();
    expect((await checkStep(vida, 'template23.interactive', 'angleminmax.adjustedmin')).equal).toBeTruthy();
    expect(vida.componentParams('angleminmax').angle).toBe(340);
    angleminmax.konvaElement!.rotation(358);
    angleminmax.adjustSizeAndAngle();
    expect(vida.componentParams('angleminmax').angle).toBe(350);
    vida.selectComponent('2992256f'); // document
    expect((await checkStep(vida, 'template23.interactive', 'base')).equal).toBeTruthy();
});

/**
 * Template with rules and images
 */
test('Testing rules and interactivity, template24', async () => {
    let nbCallsToComponentUpdated = 0;

    // Given
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);
    vida.onComponentUpdated = () => nbCallsToComponentUpdated++;
    vida.setGallery(gallery);
    const template = JSON.parse(fs.readFileSync(asset(`templates/template24.json`), 'utf-8'));
    await vida.loadJson(template);
    vida.zoom(null);

    expect((await checkStep(vida, 'template24.interactive', 'base')).equal).toBeTruthy();

    vida.selectComponent('fixed');
    expect(vida.isSelected('fixed')).toBeTruthy();
    // No boundingbox for this item.
    expect((await checkStep(vida, 'template24.interactive', 'base')).equal).toBeTruthy();

    vida.selectComponent('xfixedyminmax');
    const xfixedyminmax = <ImageVidaComponent>vida._findComponent('xfixedyminmax')!;
    xfixedyminmax.konvaElement!.setAttrs(
        computeAbsolutePosition({ x: 0.5, y: 0.12}, vida.documentSize)
    );
    expect((await checkStep(vida, 'template24.interactive', 'xfiedyminmax.moved')).equal).toBeTruthy();
    xfixedyminmax.adjustPosition();
    expect(vida.componentParams('xfixedyminmax').position.x).toBe(0.7);
    expect(vida.componentParams('xfixedyminmax').position.y).toBe(0.15);
    expect((await checkStep(vida, 'template24.interactive', 'xfiedyminmax.adjusted')).equal).toBeTruthy();
    expect(xfixedyminmax._undoHistory.length).toBe(2);
    xfixedyminmax.konvaElement!.setAttrs(computeAbsolutePosition({ x: 0.9, y: 0.9 }, vida.documentSize));
    xfixedyminmax.adjustPosition();
    expect(vida.componentParams('xfixedyminmax').position.x).toBe(0.7);
    expect(vida.componentParams('xfixedyminmax').position.y).toBe(0.20);
    expect(xfixedyminmax._undoHistory.length).toBe(3);
    xfixedyminmax.konvaElement!.setAttrs(computeAbsolutePosition({ x: 0.8, y: 0.6 }, vida.documentSize));
    xfixedyminmax.adjustPosition();
    expect(vida.componentParams('xfixedyminmax').position.x).toBe(0.7);
    expect(vida.componentParams('xfixedyminmax').position.y).toBe(0.20);
    expect(xfixedyminmax._undoHistory.length).toBe(3);
    await vida.undoComponent('xfixedyminmax');
    await vida.undoComponent('xfixedyminmax');
    expect(vida.canUndo('xfixedyminmax')).toBeFalsy();
    vida.selectComponent('2992256f');
    expect((await checkStep(vida, 'template24.interactive', 'base')).equal).toBeTruthy();

    vida.selectComponent('xminmaxyfixed');
    const xminmaxyfixed = <ImageVidaComponent>vida._findComponent('xminmaxyfixed')!;
    xminmaxyfixed.konvaElement!.setAttrs(
        computeAbsolutePosition({ x: 0.84, y: 0.92}, vida.documentSize)
    );
    expect((await checkStep(vida, 'template24.interactive', 'xminmaxyfixed.moved')).equal).toBeTruthy();
    xminmaxyfixed.adjustPosition();
    expect(vida.componentParams('xminmaxyfixed').position.x).toBe(0.7);
    expect(vida.componentParams('xminmaxyfixed').position.y).toBe(0.5);
    expect((await checkStep(vida, 'template24.interactive', 'xminmaxyfixed.adjusted')).equal).toBeTruthy();
    expect(xminmaxyfixed._undoHistory.length).toBe(2);
    xminmaxyfixed.konvaElement!.setAttrs(computeAbsolutePosition({ x: 0.1, y: 0.2 }, vida.documentSize));
    xminmaxyfixed.adjustPosition();
    expect(vida.componentParams('xminmaxyfixed').position.x).toBe(0.2);
    expect(vida.componentParams('xminmaxyfixed').position.y).toBe(0.5);
    expect(xminmaxyfixed._undoHistory.length).toBe(3);
    xminmaxyfixed.konvaElement!.setAttrs(computeAbsolutePosition({ x: 0.35, y: 0.4 }, vida.documentSize));
    xminmaxyfixed.adjustPosition();
    expect(vida.componentParams('xminmaxyfixed').position.x).toBe(0.35);
    expect(vida.componentParams('xminmaxyfixed').position.y).toBe(0.5);
    expect(xminmaxyfixed._undoHistory.length).toBe(4);
    xminmaxyfixed.konvaElement!.setAttrs(computeAbsolutePosition({ x: 0.1, y: 0.1 }, vida.documentSize));
    xminmaxyfixed.adjustPosition();
    expect(vida.componentParams('xminmaxyfixed').position.x).toBe(0.2);
    expect(vida.componentParams('xminmaxyfixed').position.y).toBe(0.5);
    expect(xminmaxyfixed._undoHistory.length).toBe(5);
    xminmaxyfixed.konvaElement!.setAttrs(computeAbsolutePosition({ x: 0.05, y: 0.1 }, vida.documentSize));
    xminmaxyfixed.adjustPosition();
    expect(vida.componentParams('xminmaxyfixed').position.x).toBe(0.2);
    expect(vida.componentParams('xminmaxyfixed').position.y).toBe(0.5);
    expect(xminmaxyfixed._undoHistory.length).toBe(5)
    await vida.undoComponent('xminmaxyfixed');
    await vida.undoComponent('xminmaxyfixed');
    await vida.undoComponent('xminmaxyfixed');
    await vida.undoComponent('xminmaxyfixed');
    expect(vida.canUndo('xminmaxyfixed')).toBeFalsy();
    vida.selectComponent('2992256f');
    expect((await checkStep(vida, 'template24.interactive', 'base')).equal).toBeTruthy();

    vida.selectComponent('anglefixedscaleminmax');
    const anglefixedscaleminmax = <ImageVidaComponent>vida._findComponent('anglefixedscaleminmax')!;
    anglefixedscaleminmax.konvaElement!.setAttrs({
        rotation: 20,
        scaleX: 1.4,
        scaleY: 1.4
    });
    // We dont see the rotation handler : perfect
    expect((await checkStep(vida, 'template24.interactive', 'anglefixedscaleminmax.moved')).equal).toBeTruthy();
    anglefixedscaleminmax.adjustSizeAndAngle();
    expect((await checkStep(vida, 'template24.interactive', 'anglefixedscaleminmax.adjusted')).equal).toBeTruthy();
    expect(vida.componentParams('anglefixedscaleminmax').angle).toBe(300);
    expect(vida.componentParams('anglefixedscaleminmax').scale).toBe(40); // 30x1.4 = 42 > 40
    expect(vida.canUndo('anglefixedscaleminmax')).toBeTruthy();
    await vida.undoComponent('anglefixedscaleminmax');
    expect(vida.canUndo('anglefixedscaleminmax')).toBeFalsy();
    vida.selectComponent('2992256f');
    expect((await checkStep(vida, 'template24.interactive', 'base')).equal).toBeTruthy();
    await vida.updateComponent('anglefixedscaleminmax', { scale: 30 });
    expect(anglefixedscaleminmax.currentScale()).toBeCloseTo(30);
    vida.undoComponent('anglefixedscaleminmax')

    vida.selectComponent('angleminmaxscalefixed');
    const angleminmaxscalefixed = <TextVidaComponent>vida._findComponent('angleminmaxscalefixed')!;
    angleminmaxscalefixed.konvaElement!.setAttrs({
        rotation: 20,
        scaleX: 1.3,
        scaleY: 1.3
    });
    // We dont see the rotation handler : perfect
    expect((await checkStep(vida, 'template24.interactive', 'angleminmaxscalefixed.moved')).equal).toBeTruthy();
    angleminmaxscalefixed.adjustSizeAndAngle();
    expect((await checkStep(vida, 'template24.interactive', 'angleminmaxscalefixed.adjusted')).equal).toBeTruthy();
    expect(vida.componentParams('angleminmaxscalefixed').angle).toBe(20);
    expect(vida.componentParams('angleminmaxscalefixed').scale).toBe(17);
    angleminmaxscalefixed.konvaElement!.rotation(0);
    angleminmaxscalefixed.adjustSizeAndAngle();
    expect(vida.componentParams('angleminmaxscalefixed').angle).toBe(5);
    angleminmaxscalefixed.konvaElement!.rotation(60);
    angleminmaxscalefixed.adjustSizeAndAngle();
    expect(vida.componentParams('angleminmaxscalefixed').angle).toBe(50);
    expect(angleminmaxscalefixed._undoHistory.length).toBe(4);
    angleminmaxscalefixed.konvaElement!.rotation(90);
    angleminmaxscalefixed.adjustSizeAndAngle();
    expect(vida.componentParams('angleminmaxscalefixed').angle).toBe(50);
    expect(angleminmaxscalefixed._undoHistory.length).toBe(4);
    expect(vida.canUndo('angleminmaxscalefixed')).toBeTruthy();
    await vida.undoComponent('angleminmaxscalefixed');
    await vida.undoComponent('angleminmaxscalefixed');
    await vida.undoComponent('angleminmaxscalefixed');
    expect(vida.canUndo('angleminmaxscalefixed')).toBeFalsy();
    vida.selectComponent('2992256f');
    expect((await checkStep(vida, 'template24.interactive', 'base')).equal).toBeTruthy();
})