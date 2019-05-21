import { Node, Group, Visible, Mesh, Camera, Material } from './classes';
import { HUDCamera, OrthogonalCamera, PerspectiveCamera } from './camera';
import Tessellator from './tessellator';
import Scene from './scene';
import run from './run';

const wrap = (...bound) => (Clazz) => {
    class Wrapped extends Clazz {
        constructor(...params) {
            super(...bound, ...params);
        }
    }
    return Wrapped;
};

const wrapAll = (obj, params) => {
    const wrapFn = wrap(...params);
    const wrapped = {};
    for (const key in obj) {
        wrapped[key] = wrapFn(obj[key]);
    }
    return wrapped;
};

const makeDrei = (gl, moreClasses) => wrapAll({
    Node, Group, Visible, Mesh, Camera, Material,
    HUDCamera, OrthogonalCamera, PerspectiveCamera,
    Tessellator,
    Scene,
    ...moreClasses,
}, [gl]);

export { makeDrei, run };
