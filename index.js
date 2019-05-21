import { mat4 } from 'gl-matrix';
import { makeDrei, run } from './drei';
import { Material } from './drei/classes';

// import gameMap from './1.map';
import vert from './shader.vert';
import frag from './shader.frag';

const gameMap = `20 15 7 5
----XXXXXXXX--------
----X------X--------
XXXXX------X---XXXXX
X---X------X---X---X
X---X------XXXXX---X
X---X--------------X
X---X------XXXXX---X
X----------X---X---X
XXXXX------X---XXXXX
----XXX-XXXX--------
----X----X----------
--XXX----X----------
--X------X----------
--X------X----------
--XXXXXXXX----------`;

class SimpleMaterial extends Material {
    constructor(gl) {
        super(gl, vert, frag);
    }
}

const buildMap = (m) => {
    const [header, ...lines] = m.split('\n');
    console.log(lines);
    const [width, height, sx, sy] = header.split(' ').map(s => parseInt(s));
    const edges = [];
    for (let y = 0; y <= height; ++y) {
        let begin = -1;
        for (let x = 0; x < width; ++x) {
            const above = y > 0 && lines[y - 1][x] === 'X';
            const under = y < height && lines[y][x] === 'X';
            if (above ^ under) {
                if (begin < 0) begin = x;
            } else {
                if (begin >= 0) {
                    edges.push([begin, y], [x, y]);
                    begin = -1;
                }
            }
        }
    }
    for (let x = 0; x <= width; ++x) {
        let begin = -1;
        for (let y = 0; y < height; ++y) {
            const left = x > 0 && lines[y][x - 1] === 'X';
            const right = x < width && lines[y][x] === 'X';
            if (left ^ right) {
                if (begin < 0) begin = y;
            } else {
                if (begin >= 0) {
                    edges.push([x, begin], [x, y]);
                    begin = -1;
                }
            }
        }
    }console.log(edges);
    return { width, height, sx, sy, edges };
}

const buildBox = (t, color) => {
    [
        [[-1, -1, -1], [-1, -1,  1], [-1,  1,  1], [-1,  1, -1]],
        [[ 1, -1, -1], [ 1, -1,  1], [ 1,  1,  1], [ 1,  1, -1]],
        [[-1, -1, -1], [-1, -1,  1], [ 1, -1,  1], [ 1, -1, -1]],
        [[-1,  1, -1], [-1,  1,  1], [ 1,  1,  1], [ 1,  1, -1]],
        [[-1, -1, -1], [-1,  1, -1], [ 1,  1, -1], [ 1, -1, -1]],
        [[-1, -1,  1], [-1,  1,  1], [ 1,  1,  1], [ 1, -1,  1]],
    ].forEach(([v1, v2, v3, v4]) => t
        .v_pos(...v1).v_sRGB(...color)
        .v_pos(...v2).v_sRGB(...color)
        .v_pos(...v3).v_sRGB(...color)
        .v_pos(...v3).v_sRGB(...color)
        .v_pos(...v4).v_sRGB(...color)
        .v_pos(...v1).v_sRGB(...color));
}

const spekt = ({ gl }) => {
    const Drei = makeDrei(gl, { SimpleMaterial });
    const scene = new Drei.Scene({ clearColor: [1.0, 1.0, 1.0, 1.0] });
    
    const { sx, sy, edges } = buildMap(gameMap);
    const material = new Drei.SimpleMaterial();
    for (let i = 0; i < edges.length; i += 2) {
        const [x1, y1] = edges[i], [x2, y2] = edges[i + 1];
        const dx = Math.abs(x1 - x2) + 0.1;
        const dy = Math.abs(y1 - y2) + 0.1;
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        const t = new Drei.Tessellator(material);
        buildBox(t, [0.0, 0.0, 0.0]);
        const box = t.build(gl.TRIANGLES);
        mat4.translate(box.matrix, box.matrix, [cx, cy, 0]);
        mat4.scale(box.matrix, box.matrix, [dx / 2, dy / 2, 10]);
        mat4.translate(box.matrix, box.matrix, [0, 0, 1]);
        scene.root.addChild(box);
    }
    
    const viewer = new Drei.Group();
    mat4.translate(viewer.matrix, viewer.matrix, [sx, sy, 0]);
    scene.root.addChild(viewer);
    
    {
        const t = new Drei.Tessellator(material);
        t
        .v_pos(-1, -1).v_sRGB(0, 0, 0)
        .v_pos( 1, -1).v_sRGB(0, 0, 0)
        .v_pos( 1,  1).v_sRGB(0, 0, 0)
        .v_pos(-1,  1).v_sRGB(0, 0, 0);
        const sprite = t.build(gl.TRIANGLE_FAN);
        mat4.translate(sprite.matrix, sprite.matrix, [0, 0, 0.1]);
        mat4.scale(sprite.matrix, sprite.matrix, [0.3, 0.3, 1]);
        viewer.addChild(sprite);
    }
    
    const camera = new Drei.PerspectiveCamera(70, 0.01, 1000);
    mat4.translate(camera.matrix, camera.matrix, [0, 0, 20]);
    viewer.addChild(camera);
    scene.camera = camera;
    
    let leftDown = false, rightDown = false, upDown = false, downDown = false;
    window.addEventListener('keydown', ({ keyCode }) => {
        switch (keyCode) {
            case 38: // ArrowUp
                upDown = true;
                break;
            case 40: // ArrowDown
                downDown = true;
                break;
            case 37: // ArrowLeft
                leftDown = true;
                break;
            case 39: // ArrowRight
                rightDown = true;
                break;
        }
    });
    window.addEventListener('keyup', ({ keyCode }) => {
        switch (keyCode) {
            case 38: // ArrowUp
                upDown = false;
                break;
            case 40: // ArrowDown
                downDown = false;
                break;
            case 37: // ArrowLeft
                leftDown = false;
                break;
            case 39: // ArrowRight
                rightDown = false;
                break;
        }
    });

    let vx = 0, vy = 0;
    const a = 60, v = 40, miu = 10;
    run(gl, scene, camera, ({ elapsed }) => {
        let ax = (leftDown ? -a : 0) + (rightDown ? a : 0);
        let ay = (downDown ? -a : 0) + (upDown ? a : 0);
        ax -= vx * miu;
        ay -= vy * miu;
        vx += elapsed * ax;
        vy += elapsed * ay;
        vx = Math.min(Math.max(vx, -v), v);
        vy = Math.min(Math.max(vy, -v), v);
        mat4.translate(viewer.matrix, viewer.matrix, [vx * elapsed, vy * elapsed, 0]);
    });
};

(() => {
    const canvas = document.querySelector("#canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const gl = canvas.getContext("webgl");
    spekt({ canvas, gl });
})();
