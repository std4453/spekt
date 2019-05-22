import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, DotScreenEffect } from 'postprocessing';
import Matter from 'matter-js';
import * as ROT from 'rot-js';

const generateMap = (seed) => {
    const width = 100, height = 100;

    ROT.RNG.setSeed(seed);
    const map = new ROT.Map.Digger(width, height);
    map.create();

    const grid = new Array(width * height).fill(0);
    const tiles = [];
    for (const room of map.getRooms()) {
        const { _x1: x1, _x2: x2, _y1: y1, _y2: y2 } = room;
        tiles.push([x1, y1, x2 + 1, y2 + 1]);
        room.getDoors((dx, dy) => {
            grid[dy * width + dx] = 1,
                tiles.push([dx, dy, dx + 1, dy + 1]);
        });
        for (let x = x1; x <= x2; ++x) for (let y = y1; y <= y2; ++y) grid[y * width + x] = 1;
    }
    for (const { _startX: _sx, _startY: _sy, _endX: _ex, _endY: _ey } of map.getCorridors()) {
        const sx = Math.min(_sx, _ex), ex = Math.max(_sx, _ex);
        const sy = Math.min(_sy, _ey), ey = Math.max(_sy, _ey);
        tiles.push([sx, sy, ex + 1, ey + 1]);
        for (let x = sx; x <= ex; ++x) for (let y = sy; y <= ey; ++y) grid[y * width + x] = 1;
    }

    const get = (x, y) => (x < 0 || x >= width || y < 0 || y >= height ? 0 : grid[y * width + x]);
    for (let x = 0; x < width; ++x) for (let y = 0; y < height; ++y) {
        if (get(x, y) !== 0) continue;
        if ([[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
            .some(([dx, dy]) => get(x + dx, y + dy) === 1))
            grid[y * width + x] = 2;
    }

    const walls = [];

    for (let y = 0; y < height; ++y) {
        let begin = -1;
        for (let x = 0; x <= width; ++x) {
            switch (get(x, y)) {
                case 0: case 1:
                    if (begin >= 0) {
                        walls.push([begin, y, x, y + 1]);
                        for (let xx = begin; xx < x; ++xx) grid[y * width + xx] = 0;
                        begin = -1;
                    }
                    break;
                case 2:
                    if (begin < 0) begin = x;
                    break;
            }
        }
    }

    for (let x = 0; x < width; ++x) {
        let begin = -1;
        for (let y = 0; y <= height; ++y) {
            switch (get(x, y)) {
                case 0: case 1:
                    if (begin >= 0) {
                        walls.push([x, begin, x + 1, y]);
                        begin = -1;
                    }
                    break;
                case 2:
                    if (begin < 0) begin = y;
                    break;
            }
        }
    }

    const { _x1: sx1, _x2: sx2, _y1: sy1, _y2: sy2 } =
        map.getRooms()[~~(Math.random() * map.getRooms().length)];
    return {
        width, height, tiles, walls,
        sx: (sx1 + sx2 + 1) / 2, sy: (sy1 + sy2 + 1) / 2,
    };
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
    // const { sx, sy, walls, tiles } = buildMap(gameMap);
    const { sx, sy, walls, tiles } = generateMap(1234);
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
    camera.position.z = 10;
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

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const pixelPass = new EffectPass(camera, new DotScreenEffect({
        scale: 0.5,
    }));
    pixelPass.renderToScreen = true;
    composer.addPass(pixelPass);

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

    const clock = new THREE.Clock();
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

        // const ratio = window.innerHeight / (Math.tan(70 / 2 / 180 * Math.PI) * 20 * 2);
        // camera.setViewOffset(
        //     window.innerWidth, window.innerHeight,
        //     -ratio * (px - sx), ratio * (py - sy),
        //     window.innerWidth, window.innerHeight);
        // renderer.setViewport((px - sx) * 30, (py - sy) * 30, window.innerWidth, window.innerHeight);
        // renderer.render(scene, camera);
        composer.render(clock.getDelta());
        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
})();
