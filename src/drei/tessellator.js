import { Mesh } from './classes';
import { attribTypes } from './utils';

class Tessellator {
    constructor(gl, material) {
        this.gl = gl;
        this.material = material;
        this.arrays = {};
        this.indices = {};
        this.length = 0;

        for (const name in this.material.attribs) this.setupAttrib(name);
    }

    setupAttrib(name) {
        this.arrays[name] = [];
        this.indices[name] = 0;

        this[name] = (...data) => {
            this.sychronize(this.indices[name]);
            ++this.indices[name];
            this.length = Math.max(this.length, this.indices[name]);
            this.tessellate(name, data);
            return this;
        };
    }

    tessellate(name, data) {
        const { type } = this.material.attribs[name];
        const { size, defaults } = attribTypes[type];

        for (let i = 0; i < size; ++i) {
            const el = data.length > i ? data[i] : defaults[i];
            this.arrays[name].push(el);
        }
    }

    sychronize(index) {
        for (const name in this.indices) {
            while (this.indices[name] < index) {
                this.tessellate(name, []); // fill with default values
                ++this.indices[name];
            }
        }
    }

    build(type) {
        const mesh = new Mesh(this.gl, this.material, type);
        for (const name in mesh.buffers) {
            const { type } = this.material.attribs[name];
            const { array: ActualArray } = attribTypes[type];

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.buffers[name]);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new ActualArray(this.arrays[name]), this.gl.STATIC_DRAW);
        }
        mesh.count = this.length;
        return mesh;
    }
}

export default Tessellator;
