(function (window, document) {
    'use strict';

    window.MateryEffects.define('canvasNest', function (options) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        var requestId = null;
        var running = false;
        var listening = false;
        var lastFrame = 0;
        var frameInterval = 1000 / (options.fps || 30);
        var width = 0;
        var height = 0;
        var points = [];
        var pointer = {x: null, y: null, max: 20000};
        var count = Number(options.count) || 99;
        var color = options.color || '0,0,0';

        canvas.className = 'canvas-nest-effect';
        canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:' + (options.zIndex == null ? -1 : options.zIndex) + ';opacity:' + (options.opacity == null ? 0.5 : options.opacity) + ';pointer-events:none';

        function resize() {
            width = canvas.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            height = canvas.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        }

        function createPoints() {
            points = [];
            for (var i = 0; i < count; i++) {
                points.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    xa: 2 * Math.random() - 1,
                    ya: 2 * Math.random() - 1,
                    max: 6000
                });
            }
        }

        function draw(timestamp) {
            if (!running) return;
            requestId = window.requestAnimationFrame(draw);
            if (timestamp - lastFrame < frameInterval) return;
            var step = lastFrame ? Math.min((timestamp - lastFrame) / (1000 / 60), 2) : 1;
            lastFrame = timestamp;
            context.clearRect(0, 0, width, height);
            var candidates = [pointer].concat(points);

            points.forEach(function (point) {
                point.x += point.xa * step;
                point.y += point.ya * step;
                if (point.x > width || point.x < 0) point.xa *= -1;
                if (point.y > height || point.y < 0) point.ya *= -1;
                context.fillRect(point.x - 0.5, point.y - 0.5, 1, 1);

                for (var i = 0; i < candidates.length; i++) {
                    var target = candidates[i];
                    if (point === target || target.x === null || target.y === null) continue;
                    var dx = point.x - target.x;
                    var dy = point.y - target.y;
                    var distance = dx * dx + dy * dy;
                    if (distance >= target.max) continue;
                    if (target === pointer && distance >= target.max / 2) {
                        point.x -= 0.03 * dx * step;
                        point.y -= 0.03 * dy * step;
                    }
                    var opacity = (target.max - distance) / target.max;
                    context.beginPath();
                    context.lineWidth = opacity / 2;
                    context.strokeStyle = 'rgba(' + color + ',' + (opacity + 0.2) + ')';
                    context.moveTo(point.x, point.y);
                    context.lineTo(target.x, target.y);
                    context.stroke();
                }
                candidates.splice(candidates.indexOf(point), 1);
            });
        }

        function onPointerMove(event) {
            pointer.x = event.clientX;
            pointer.y = event.clientY;
        }

        function clearPointer() {
            pointer.x = null;
            pointer.y = null;
        }

        function addListeners() {
            if (listening) return;
            listening = true;
            window.addEventListener('resize', resize);
            window.addEventListener('pointermove', onPointerMove, {passive: true});
            document.addEventListener('pointerleave', clearPointer);
        }

        function start() {
            if (!canvas.parentNode) {
                document.body.appendChild(canvas);
                resize();
                createPoints();
            }
            addListeners();
            if (running) return;
            running = true;
            lastFrame = 0;
            requestId = window.requestAnimationFrame(draw);
        }

        function pause() {
            running = false;
            if (requestId !== null) {
                window.cancelAnimationFrame(requestId);
                requestId = null;
            }
        }

        function destroy() {
            pause();
            if (listening) {
                window.removeEventListener('resize', resize);
                window.removeEventListener('pointermove', onPointerMove);
                document.removeEventListener('pointerleave', clearPointer);
                listening = false;
            }
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            points = [];
        }

        return {
            start: start,
            pause: pause,
            resume: start,
            destroy: destroy
        };
    });
})(window, document);
