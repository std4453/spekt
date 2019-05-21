import { mat4 } from 'gl-matrix';
import { loadProgram, attribTypes, uniformTypes } from './utils';

class Node {
    constructor(gl) {
        this.gl = gl;
        this.matrix = mat4.create();
        this.children = [];
    }

    addChild(child) {
        this.children.push(child);
        child.parent = this;
    }

    removeChild(child) {
        const index = this.children.findIndex(el => el === child);
        if (index === -1) return;
        this.children.splice(index, 1);
        child.parent = null;
    }

    getModelMatrix() {
        const world = this.parent ? this.parent.getModelMatrix() : mat4.create();
        const result = mat4.create();
        mat4.multiply(result, world, this.matrix);
        return result;
    }

    render(ctx) {
        const { matrix } = ctx;
        const newMat = mat4.create();
        mat4.multiply(newMat, matrix, this.matrix);
        const newContext = { ...ctx, matrix: newMat };

        this.renderSelf(newContext);
        for (const child of this.children) child.render(newContext);
    }

    renderSelf() { }
}

class Group extends Node {
    constructor(gl) {
        super(gl);
    }
}

class Camera extends Node {
    constructor(gl) {
        super(gl);
        this.projectionMatrix = mat4.create();
    }

    updateMatrix() { }

    getCameraMatrix() {
        const model = this.getModelMatrix();
        const result = mat4.create();
        mat4.invert(result, model);
        mat4.multiply(result, this.projectionMatrix, result);
        return result;
    }

    renderTree(ctx, root) {
        const matrix = this.getCameraMatrix();
        const newContenxt = { ...ctx, matrix };
        root.render(newContenxt);
    }
}

class Material {
    constructor(gl, vsSource, fsSource) {
        this.gl = gl;
        this.program = loadProgram(gl, vsSource, fsSource);

        this.attribCount = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);
        this.attribs = {};
        for (let i = 0; i < this.attribCount; ++i) {
            const { name, type, ...rest } = this.gl.getActiveAttrib(this.program, i);
            const typeName = Object.keys(attribTypes).find(key => gl[key] === type);
            this.attribs[name] = { type: typeName, ...rest };
        }

        this.uniformCount = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
        this.uniforms = {};
        for (let i = 0; i < this.uniformCount; ++i) {
            const { name, type, ...rest } = this.gl.getActiveUniform(this.program, i);
            const typeName = Object.keys(uniformTypes).find(key => gl[key] === type);
            this.uniforms[name] = { type: typeName, ...rest };
        }
    }
    
    enableAttribs() {
        for (const name in this.attribs) {
            this.gl.enableVertexAttribArray(this.attrib(name));
        }
    }

    disableAttribs() {
        for (const name in this.attribs) {
            this.gl.disableVertexAttribArray(this.attrib(name));
        }
    }

    createBuffers() {
        const buffers = {};
        for (const name in this.attribs) {
            buffers[name] = this.gl.createBuffer();
        }
        return buffers;
    }

    attrib(name) {
        this.use();
        return this.gl.getAttribLocation(this.program, name);
    }

    uniform(name) {
        this.use();
        return this.gl.getUniformLocation(this.program, name);
    }

    use() {
        this.gl.useProgram(this.program);
    }
}

class Visible extends Node {
    constructor(gl, material) {
        super(gl);
        this.material = material;
    }

    renderSelf(ctx) {
        this.material.use();
        this.material.enableAttribs();
        this.draw(ctx);
        this.material.disableAttribs();
    }

    draw() { }
}

class Mesh extends Visible {
    constructor(gl, material, type) {
        super(gl, material);
        this.buffers = this.material.createBuffers();
        this.type = type;
        this.count = 0;
        this.uniforms = {};
    }

    draw({ matrix }) {
        this.uniforms.modelViewProjectionMatrix = matrix;

        // set uniforms
        for (const name in this.uniforms) {
            if (!(name in this.material.uniforms)) {
                console.warn(`Uniform '${name}' undefined!`);
                continue;
            }
            const { type } = this.material.uniforms[name];
            const { setter, defaults, params } = uniformTypes[type];
            const value = defaults.map((d, i) => 
                this.uniforms[name].length > i ? this.uniforms[name][i] : d);
            this.gl[setter](this.material.uniform(name), ...params, value);
        }

        // bind buffers
        for (const name in this.buffers) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers[name]);
            const { type } = this.material.attribs[name];
            const { element, size } = attribTypes[type];
            this.gl.vertexAttribPointer(this.material.attrib(name), size, element, false, 0, 0);
        }

        this.gl.drawArrays(this.type, 0, this.count);
    }
}

export { Node, Group, Camera, Material, Visible, Mesh };
