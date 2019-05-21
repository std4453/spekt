import * as THREE from 'three';
import Matter from 'matter-js';

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

const buildMap = (m) => {
    const [header, ...lines] = m.split('\n');
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
        if (begin >= 0) edges.push([begin, y], [width, y]);
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
        if (begin >= 0) edges.push([x, begin], [x, height]);
    }
    return { width, height, sx, sy, edges };
}

(() => {
    const scene = new THREE.Scene();
    const engine = Matter.Engine.create();

    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const { sx, sy, edges } = buildMap(gameMap);
    for (let i = 0; i < edges.length; i += 2) {
        const [x1, y1] = edges[i], [x2, y2] = edges[i + 1];
        const dx = Math.abs(x1 - x2) + 0.1;
        const dy = Math.abs(y1 - y2) + 0.1;
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        const geometry = new THREE.BoxGeometry(dx, dy, 20);
        const cube = new THREE.Mesh(geometry, material);
        cube.position.x = cx;
        cube.position.y = cy;
        cube.position.z = 10;
        scene.add(cube);

        const box = Matter.Bodies.rectangle(cx - dx / 2, cy - dy / 2, dx, dy, { isStatic: true });
        Matter.World.add(engine.world, box);
    }

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.z = 20;
    camera.position.x = sx;
    camera.position.y = sy;

    const playerGeometry = new THREE.CircleGeometry(0.2, 64);
    const player = new THREE.Mesh(playerGeometry, material);
    player.position.x = sx;
    player.position.y = sy;
    player.position.z = 0;
    scene.add(player);

    const playerBody = Matter.Bodies.circle(sx, sy, 0.2);
    Matter.Body.setMass(playerBody, 1);
    Matter.World.add(engine.world, playerBody);

    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0xffffff), 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

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

    // let vx = 0, vy = 0;
    const a = 1, v = 40, miu = 4;
    let last = 0;
    const animate = (now) => {
        if (!last) last = now;
        const elapsed = now - last;
        last = now;
        
        let ax = (leftDown ? -a : 0) + (rightDown ? a : 0);
        let ay = (downDown ? -a : 0) + (upDown ? a : 0);
        // ax -= vx * miu;
        // ay -= vy * miu;
        // Matter.Body.applyForce(playerBody, playerBody.position, { x: ax, y: ay });

        Matter.Engine.update(engine, elapsed);
        // vx += elapsed * ax;
        // vy += elapsed * ay;
        // vx = Math.min(Math.max(vx, -v), v);
        // vy = Math.min(Math.max(vy, -v), v);
        // camera.position.x = playerBody.position.x;
        // camera.position.y = playerBody.position.y;
        console.log(playerBody.position);
        // camera.position.x += vx * elapsed;
        // camera.position.y += vy * elapsed;
        // player.position.x += vx * elapsed;
        // player.position.y += vy * elapsed;

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
})();
