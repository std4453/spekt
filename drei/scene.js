import { Node } from './classes';
import _ from 'lodash';
const { defaults, isArray, isString } = _;

const specialEntries = {
    depthEnabled: (gl, value) => { if (value) gl.enable(gl.DEPTH_TEST); },
};

const defaultSettings = {
    clearColor: [0.0, 0.0, 0.0, 1.0],
    clearDepth: 1.0,
    depthEnabled: true,
    depthFunc: 'LEQUAL',
};

class Scene {
    constructor(gl, settings = {}) {
        this.gl = gl;
        this.root = new Node(gl);
        this.settings = defaults(settings, defaultSettings);
        for (const key in this.settings) {
            const value = this.settings[key];
            if (key in specialEntries) specialEntries[key](this.gl, value);
            else {
                if (isArray(value)) this.gl[key](...value);
                else if (isString(value)) this.gl[key](this.gl[value]);
                else this.gl[key](value);
            }
        }
    }

    render(ctx, camera) {
        let clearBits = this.gl.COLOR_BUFFER_BIT;
        if (this.settings.depthEnabled) clearBits |= this.gl.DEPTH_BUFFER_BIT;
        this.gl.clear(clearBits);

        camera.renderTree({ ...ctx, gl: this.gl }, this.root);
    }
}

export default Scene;
