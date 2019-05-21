import { mat4 } from 'gl-matrix';
import { Camera } from './classes';

class OrthogonalCamera extends Camera {
    constructor(gl, left, right, bottom, top, zNear, zFar) {
        super(gl);
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
        this.zNear = zNear;
        this.zFar = zFar;
    }

    updateMatrix() {
        mat4.identity(this.projectionMatrix);
        mat4.ortho(this.projectionMatrix, this.left, this.right, this.bottom, this.top, this.zNear, this.zFar);
    }
}

class HUDCamera extends Camera {
    constructor(gl, zNear, zFar) {
        super(gl);
        this.zNear = zNear;
        this.zFar = zFar;
    }

    updateMatrix() {
        mat4.identity(this.projectionMatrix);
        const halfWidth = this.gl.canvas.clientWidth / 2;
        const halfHeight = this.gl.canvas.clientHeight / 2;
        mat4.ortho(this.projectionMatrix, -halfWidth, halfWidth, -halfHeight, halfHeight, this.zNear, this.zFar);
    }
}

class PerspectiveCamera extends Camera {
    constructor(gl, fovy, near, far) {
        super(gl);
        this.fovy = fovy;
        this.near = near;
        this.far = far;
    }

    updateMatrix() {
        mat4.identity(this.projectionMatrix);
        const aspect = 1 /this.gl.canvas.clientHeight * this.gl.canvas.clientWidth;
        mat4.perspective(this.projectionMatrix, this.fovy, aspect, this.near, this.far);
    }
}

export { OrthogonalCamera, HUDCamera, PerspectiveCamera };
