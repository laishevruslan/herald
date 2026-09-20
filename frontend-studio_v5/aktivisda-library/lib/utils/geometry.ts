
type Point = Array<number>;
type Polygon = Array<Point>;

function degToRadian(deg: number): number {
    return (deg * Math.PI) / 180;
}

// Line 1 defined by s*U + Q, s real
// Line 2 defined by t*V + P, t real
function intersectionPoint(U: Point, Q: Point, V: Point, P: Point): any {
    const den = V[0] * U[1] - V[1] * U[0];
    if (Math.abs(den) < 0.01) {
        return undefined;
    }

    const t = (U[0] * (P[1] - Q[1]) - U[1] * (P[0] - Q[0])) / den;
    const s = -(V[0] * (Q[1] - P[1]) - V[1] * (Q[0] - P[0])) / den;
    return { point: [t * V[0] + P[0], t * V[1] + P[1]], t, s };
}

/**
 *
 * Scale polygon inplace by multiplying x-coordinates by scaleX
 * and y-coordinates by scaleY.
 *
 * Should be used on "centered polygon"
 *
 * @param polygon
 * @param scaleX
 * @param scaleY
 */
function scalePolygon(polygon: Polygon, scaleX: number, scaleY: number) {
    for (let k = 0; k < polygon.length; ++k) {
        polygon[k][0] *= scaleX;
        polygon[k][1] *= scaleY;
    }
}

function HalfLineToPolygonIntersection(polygon: Polygon, halfLineVector: Point, halfLineOrigin: Point): Polygon {
    const intersections = [];

    let k1 = polygon.length - 1;
    for (let k2 = 0; k2 < polygon.length; ++k2) {
        const P1 = polygon[k1];
        const P2 = polygon[k2];

        const intersection = intersectionPoint(halfLineVector, halfLineOrigin, [P2[0] - P1[0], P2[1] - P1[1]], P1);
        k1 = k2;
        if (intersection === undefined) continue;
        if (intersection['t'] < 0 || intersection['t'] > 1) continue;
        if (intersection['s'] < 0) continue;
        intersections.push(intersection['point']);
    }
    return intersections;
}

/**
 *
 * Compute and return the bounding box
 *
 * @param polygon
 * @returns { bottom_left: Point, top_right: Point, width: Number, height: Number}
 */
function computeBox(polygon: Polygon) {
    const p = polygon[0];
    const bottom_left = [p[0], p[1]];
    const top_right = [p[0], p[1]];

    for (const p of polygon) {
        bottom_left[0] = Math.min(bottom_left[0], p[0]);
        bottom_left[1] = Math.min(bottom_left[1], p[1]);

        top_right[0] = Math.max(top_right[0], p[0]);
        top_right[1] = Math.max(top_right[1], p[1]);
    }
    const width = top_right[0] - bottom_left[0];
    const height = top_right[1] - bottom_left[1];

    return { bottom_left: bottom_left, top_right: top_right, width: width, height: height };
}

/**
 * Translate a polygon so the center of its bounding box become (0, 0)
 *
 * @param polygon
 */
function centerPolygon(polygon: Polygon) {
    const { bottom_left, top_right } = computeBox(polygon);

    const center = [-(top_right[0] + bottom_left[0]) / 2, -(top_right[1] + bottom_left[1]) / 2];
    translatePolygon(polygon, center);
}


function computeRotatedViewbox(x: number, y: number, width: number, height: number, angle: number) {
    const polygon = [
        [x, y],
        [width, height],
        [x, height],
        [width, y],
    ];
    rotatePolygon(polygon, angle);
    return computeBox(polygon);
}

function rotatePolygon(polygon: Polygon, angle: number) {
    const matrix = [
        [Math.cos(angle), -Math.sin(angle)],
        [Math.sin(angle), Math.cos(angle)],
    ];
    applyMatrix(polygon, matrix);
}

function applyMatrix(polygon: Polygon, matrix: Array<Array<number>>) {
    for (let k = 0; k < polygon.length; ++k) {
        const x = polygon[k][0];
        const y = polygon[k][1];
        polygon[k][0] = matrix[0][0] * x + matrix[0][1] * y;
        polygon[k][1] = matrix[1][0] * x + matrix[1][1] * y;
    }
}

function translatePolygon(polygon: Polygon, translation: Point) {
    for (let k = 0; k < polygon.length; ++k) {
        polygon[k] = [polygon[k][0] + translation[0], polygon[k][1] + translation[1]];
    }
}

/**
 *
 * It will generate angles between -param and +param in degrees
 *
 * @param param
 * @param nb_angles
 * @returns
 */
function computeRandomAngles(param: number, nb_angles: number) {
    const angles = [];
    for (let k = 0; k < nb_angles; ++k) {
        angles.push(degToRadian(param / 2 - param * Math.random()));
    }
    return angles;
}

/**
 * Call computeDistoredSquare on random angles between -angleParam and +angleParam
 * Works well if angle < 40
 *
 * @param angleParam
 * @returns
 */
function computeRandomDistortedSquare(angleParam: number): Polygon {
    let [angle0, angle1, angle2, angle3] = computeRandomAngles(angleParam, 4);
    // We want to make "horizontal" with more angle
    angle0 *= 1.2;
    angle2 *= 1.2;
    return computeDistortedSquare(angle0, angle1, angle2, angle3);
}
/**
 * Compute a distorted square.
 *
 * - we build a polygon wnich the is the intes
 *
 * @param angleParam
 * @returns
 */
function computeDistortedSquare(angle0: number, angle1: number, angle2: number, angle3: number): Polygon {

    const x0 = [-1, 1];
    const x1 = [1, 1];
    const x2 = [1, -1];
    const x3 = [-1, -1];

    const d0_vect = [Math.cos(angle0), Math.sin(angle0)];
    const d1_vect = [Math.cos(angle1 + Math.PI / 2), Math.sin(angle1 + Math.PI / 2)];
    const d2_vect = [Math.cos(angle2 + Math.PI), Math.sin(angle2 + Math.PI)];
    const d3_vect = [Math.cos(angle3 + (3 * Math.PI) / 2), Math.sin(angle3 + (3 * Math.PI) / 2)];

    const y1 = intersectionPoint(d0_vect, x0, d1_vect, x1)['point'];
    const y2 = intersectionPoint(d1_vect, x1, d2_vect, x2)['point'];
    const y3 = intersectionPoint(d2_vect, x2, d3_vect, x3)['point'];
    const y0 = intersectionPoint(d3_vect, x3, d0_vect, x0)['point'];
    const polygon = [y0, y1, y2, y3];
    centerPolygon(polygon);
    const { width, height } = computeBox(polygon);
    scalePolygon(polygon, 2 / width, 2 / height);

    const ne_intersections = HalfLineToPolygonIntersection(polygon, [1, 1], [0, 0]);
    const ne_scaleX = 1 / ne_intersections[0][0];
    const ne_scaleY = 1 / ne_intersections[0][1];

    const se_intersections = HalfLineToPolygonIntersection(polygon, [1, -1], [0, 0]);
    const se_scaleX = 1 / se_intersections[0][0];
    const se_scaleY = 1 / se_intersections[0][1];

    const so_intersections = HalfLineToPolygonIntersection(polygon, [-1, -1], [0, 0]);
    const so_scaleX = 1 / so_intersections[0][0];
    const so_scaleY = 1 / so_intersections[0][1];

    const no_intersections = HalfLineToPolygonIntersection(polygon, [-1, 1], [0, 0]);
    const no_scaleX = 1 / no_intersections[0][0];
    const no_scaleY = 1 / no_intersections[0][1];

    const scaleX_max = Math.max(se_scaleX, ne_scaleX, so_scaleX, no_scaleX);
    const scaleX_min = Math.min(se_scaleX, ne_scaleX, so_scaleX, no_scaleX);

    const scaleY_max = Math.max(se_scaleY, ne_scaleY, so_scaleY, no_scaleY);
    const scaleY_min = Math.min(se_scaleY, ne_scaleY, so_scaleY, no_scaleY);

    // const polygon = centered_polygon;
    for (let k = 0; k < polygon.length; ++k) {
        if (polygon[k][0] > 0) {
            polygon[k][0] *= scaleX_max;
        } else {
            polygon[k][0] *= -scaleX_min;
        }

        if (polygon[k][1] > 0) {
            polygon[k][1] *= scaleY_max;
        } else {
            polygon[k][1] *= -scaleY_min;
        }
    }
    centerPolygon(polygon);
    return polygon;
}

export { computeDistortedSquare, computeRandomDistortedSquare, scalePolygon, computeBox, centerPolygon, translatePolygon, computeRotatedViewbox, degToRadian, rotatePolygon };
