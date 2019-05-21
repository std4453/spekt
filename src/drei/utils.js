const loadShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(shader));
    return shader;
};

const loadProgram = (gl, vsSource, fsSource) => {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(shaderProgram));

    return shaderProgram;
};

// TODO: unfinished
const attribTypes = {
    'FLOAT': {
        array: Float32Array,
        size: 1,
        element: 0x1406, // FLOAT
        defaults: [0],
    },
    'FLOAT_VEC2': {
        array: Float32Array,
        size: 2,
        element: 0x1406, // FLOAT
        defaults: [0, 0],
    },
    'FLOAT_VEC3': {
        array: Float32Array,
        size: 3,
        element: 0x1406, // FLOAT
        defaults: [0, 0, 0],
    },
    'FLOAT_VEC4': {
        array: Float32Array,
        size: 4,
        element: 0x1406, // FLOAT
        defaults: [0, 0, 0, 1],
    },
};

const uniformTypes = {
    'FLOAT': {
        setter: 'uniform1fv',
        size: 1,
        defaults: [0],
        params: [],
    },
    'FLOAT_VEC2': {
        setter: 'uniform2fv',
        size: 2,
        defaults: [0, 0],
        params: [],
    },
    'FLOAT_VEC3': {
        setter: 'uniform3fv',
        size: 3,
        defaults: [0, 0, 0],
        params: [],
    },
    'FLOAT_VEC4': {
        setter: 'uniform4fv',
        size: 4,
        defaults: [0, 0, 0, 1],
        params: [],
    },
    'FLOAT_MAT2': {
        setter: 'uniformMatrix2fv',
        size: 4,
        defaults: [0, 0, 0, 0],
        params: [false],
    },
    'FLOAT_MAT3': {
        setter: 'uniformMatrix3fv',
        size: 9,
        defaults: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        params: [false],
    },
    'FLOAT_MAT4': {
        setter: 'uniformMatrix4fv',
        size: 16,
        defaults: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        params: [false],
    },
};

export { loadProgram, attribTypes, uniformTypes };
