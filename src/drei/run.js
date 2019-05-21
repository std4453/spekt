const run = (gl, scene, camera, update, options = {}) => {
    camera.updateMatrix();
    let frameCount = 0;
    let last = 0;
    const frame = (now) => {
        // console.log(gl.getError());
        if (!last) last = now;
        const elapsed = (now - last) / 1000;
        last = now;
        ++frameCount;
        const ctx = { ...options, scene, frameCount, elapsed };
        scene.render(ctx, camera);
        update(ctx);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
};

export default run;
