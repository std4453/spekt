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

    const walls = [];
    for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
        if (lines[y][x] === 'X') walls.push([x, height - 1 - y, x + 1, height - y]);
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

    return { width, height, sx, sy: height - sy, walls, tiles };
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
    const { sx, sy, walls, tiles } = buildMap(gameMap);
    for (const [x1, y1, x2, y2] of walls) {
        const geometry = new THREE.BoxGeometry(x2 - x1, y2 - y1, 20);
        const cube = new THREE.Mesh(geometry, wallMat);
        cube.position.x = (x1 + x2) / 2;
        cube.position.y = (y1 + y2) / 2;
        cube.position.z = 10;
        scene.add(cube);

        const box = Matter.Bodies.rectangle(
            (x1 + x2) / 2 * 1000, -(y1 + y2) / 2 * 1000,
            (x2 - x1) * 1000, -(y2 - y1) * 1000, { isStatic: true });
        Matter.World.add(engine.world, box);
    }

    const tileMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const [x1, y1, x2, y2] of tiles) {
        const geometry = new THREE.PlaneGeometry(x2 - x1, y2 - y1);
        const tile = new THREE.Mesh(geometry, tileMat);
        tile.position.x = (x1 + x2) / 2;
        tile.position.y = (y1 + y2) / 2;
        scene.add(tile);
    }

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.z = 5;
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
    renderer.setPixelRatio(window.devicePixelRatio);
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
        const px = playerBody.position.x / 1000, py = -playerBody.position.y / 1000;
        camera.position.x = px;
        camera.position.y = py;
        player.position.x = px;
        player.position.y = py;

        const ratio = window.innerHeight / (Math.tan(70 / 2 / 180 * Math.PI) * 20 * 2);
        // console.log(ratio);
        // camera.setViewOffset(
        //     window.innerWidth, window.innerHeight,
        //     -ratio * (px - sx), ratio * (py - sy),
        //     window.innerWidth, window.innerHeight);
        // renderer.setViewport((px - sx) * 30, (py - sy) * 30, window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
})();
