import { computeAbsolutePosition, computeRelativePosition } from '../lib/utils/positionutils';
import { expect, test } from 'vitest';


const dimensions = { width: 100, height: 100 };
const paramsToLocation = [
    [{ x: 0.5, y: 0.5 }, { x: 50, y: 50}],
    [{ x: 0, y: 1 }, { x: 0, y: 100}],
    [{ x: 0.2, y: 0.7 }, { x: 20, y: 70}],
];

test.each(paramsToLocation)('computeAbsolutePosition %s', (params, target) => {
    const result = computeAbsolutePosition(params, dimensions);

    expect(result.x).toBe(target.x);
    expect(result.y).toBe(target.y);
});

test.each(paramsToLocation)('computeRelativePosition %s', (target, position) => {
    const result = computeRelativePosition(position, dimensions);

    expect(result.x).toBe(target.x);
    expect(result.y).toBe(target.y);
});
