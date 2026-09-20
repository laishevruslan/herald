import { expect, test, beforeEach, onTestFailed, afterEach, beforeAll, describe } from 'vitest';

import { centerPolygon, computeBox, computeRandomDistortedSquare, degToRadian, scalePolygon } from '../lib/utils/geometry.ts';

test('degToRadian', () => {
    expect(degToRadian(0)).toBe(0);
    expect(degToRadian(90)).toBe(Math.PI/2);
    expect(degToRadian(180)).toBe(Math.PI);
    expect(degToRadian(45)).toBe(Math.PI/4);
    expect(degToRadian(360)).toBe(2*Math.PI);
});

test('scalePolygon', () => {
    let polygon = [[0, 0], [0, 1], [1, 1], [1, 0]];
    scalePolygon(polygon, 10, 5);
    expect(polygon).toStrictEqual([[0, 0], [0, 5], [10, 5], [10, 0]])
});

test('computeBox', () => {
    let polygon = [[10, -5], [-2, 17], [29, 4]]
    expect(computeBox(polygon)).toStrictEqual({
        bottom_left: [-2, -5],
        top_right: [29, 17],
        width: 31,
        height: 22
    });
});


test('centerPolygon', () => {
    let polygon = [[10, -5], [-2, 17], [28, 4]];
    centerPolygon(polygon);
    expect(polygon).toStrictEqual([[-3, -11], [-15, 11], [15, -2]])
    let bb = computeBox(polygon);
    expect(bb.bottom_left[0] == -bb.top_right[0])
    expect(bb.bottom_left[1] == -bb.top_right[1])
})

test('center random polygon', () => {
    const randomPolygon:Array<Array<number>> = [];
    for (let k=1; k<10; ++k) {
        randomPolygon.push([15*(Math.random() - 0.5), 15*(Math.random() - 0.5)])
    }
    centerPolygon(randomPolygon);
    let bb = computeBox(randomPolygon);
    expect(bb.bottom_left[0] == -bb.top_right[0])
    expect(bb.bottom_left[1] == -bb.top_right[1])
})

test('computeRandomDistortedSquare', () => {
    // No distortion
    let square = computeRandomDistortedSquare(0);
    expect(square[0][0]).toBeCloseTo(-1, 5);
    expect(square[0][1]).toBeCloseTo(1, 5);
    expect(square[1][0]).toBeCloseTo(1, 5);
    expect(square[1][1]).toBeCloseTo(1, 5);
    expect(square[2][0]).toBeCloseTo(1, 5);
    expect(square[2][1]).toBeCloseTo(-1, 5);
    expect(square[3][0]).toBeCloseTo(-1, 5);
    expect(square[3][1]).toBeCloseTo(-1, 5);
})

test('computeRandomDistortedSquare', () => {
    for (let angleParam=0;angleParam<40; angleParam+= 0.2) {
        const square = computeRandomDistortedSquare(angleParam);
        expect(square.length).toBe(4);
    }
});