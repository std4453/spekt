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
                    edges.push([begin, height - y, x, height - y]);
                    begin = -1;
                }
            }
        }
        if (begin >= 0) edges.push([begin, height - y, width, height - y]);
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
                    edges.push([x, height - begin, x, height - y]);
                    begin = -1;
                }
            }
        }
        if (begin >= 0) edges.push([x, height - begin, x, height - height]);
    }

    const tiles = [], queue = [[sx, sy]], visited = new Array(height);
    for (let i = 0; i < height; ++i) visited[i] = new Array(width);
    while (queue.length > 0) {
        const [x, y] = queue.splice(0, 1)[0];
        tiles.push([x, height - 1 - y, x + 1, height - y]);
        visited[y][x] = true;

        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
            if (visited[ny][nx]) return;
            if (lines[ny][nx] !== '-') return;
            queue.push([nx, ny]);
        });
    }

    return { width, height, sx, sy: height - sy, edges, tiles };
}

(() => {
    const scene = new THREE.Scene();
    const engine = Matter.Engine.create();
    engine.world.gravity.y = 0;

    const wallMat = new THREE.MeshBasicMaterial({
        color: 0x777777,
        blending: THREE.CustomBlending,
        blendEquation: THREE.MinEquation,
        transparent: true,
    });
    const { sx, sy, edges, tiles } = buildMap(gameMap);
    for (const [x1, y1, x2, y2] of edges) {
        const dx = Math.abs(x1 - x2) + 0.1;
        const dy = Math.abs(y1 - y2) + 0.1;
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        const geometry = new THREE.BoxGeometry(dx, dy, 20);
        const cube = new THREE.Mesh(geometry, wallMat);
        cube.position.x = cx;
        cube.position.y = cy;
        cube.position.z = 10;
        scene.add(cube);

        const box = Matter.Bodies.rectangle(
            cx * 1000, -cy * 1000,
            dx * 1000, dy * 1000, { isStatic: true });
        Matter.World.add(engine.world, box);
    }

    const tileMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    for (const [x1, y1, x2, y2] of tiles) {
        const geometry = new THREE.PlaneGeometry(x2 - x1, y2 - y1);
        const tile = new THREE.Mesh(geometry, tileMat);
        tile.position.x = (x1 + x2) / 2;
        tile.position.y = (y1 + y2) / 2;
        scene.add(tile);
    }

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.z = 20;
    camera.position.x = sx;
    camera.position.y = sy;

    const playerMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); 
    const playerGeometry = new THREE.CircleGeometry(0.2, 64);
    const player = new THREE.Mesh(playerGeometry, playerMat);
    player.position.x = sx;
    player.position.y = sy;
    player.position.z = 0.1;
    scene.add(player);

    const playerBody = Matter.Bodies.circle(
        sx * 1000, -sy * 1000, 0.2 * 1000,
        { mass: 1, frictionAir: 0.2 });
    Matter.World.add(engine.world, playerBody);

    const renderer = new THREE.WebGLRenderer();
    // renderer.setClearColor(new THREE.Color(0xffffff), 1.0);
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

    const a = 0.1;
    let last = 0;
    const animate = (now) => {
        if (!last) last = now;
        // const elapsed = now - last;
        last = now;
        
        Matter.Body.applyForce(playerBody, playerBody.position,
            {
                x: (leftDown ? -a : 0) + (rightDown ? a : 0),
                y: (downDown ? a : 0) + (upDown ? -a : 0),
            });

        Matter.Engine.update(engine, 1000 / 60);
        camera.position.x = playerBody.position.x / 1000;
        camera.position.y = -playerBody.position.y / 1000;
        player.position.x = playerBody.position.x / 1000;
        player.position.y = -playerBody.position.y / 1000;

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
})();
