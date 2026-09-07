(function (window, document) {
    'use strict';

    function random(min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return Math.random() * (max - min) + min;
    }

    function Point(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    Point.prototype.copy = function (point) {
        this.x = point.x || 0;
        this.y = point.y || 0;
        return this;
    };

    Point.prototype.add = function (x, y) {
        this.x += x || 0;
        this.y += y || 0;
        return this;
    };

    Point.prototype.subtract = function (x, y) {
        this.x -= x || 0;
        this.y -= y || 0;
        return this;
    };

    window.MateryEffects.define('ribbonDynamic', function (runtimeOptions) {
        var options = {
            colorSaturation: '60%',
            colorBrightness: '50%',
            colorAlpha: 0.5,
            colorCycleSpeed: 5,
            verticalPosition: 'random',
            horizontalSpeed: 200,
            ribbonCount: 3,
            strokeSize: 0,
            parallaxAmount: -0.2,
            animateSections: true
        };
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        var ribbons = [];
        var width = 0;
        var height = 0;
        var scroll = 0;
        var requestId = null;
        var running = false;
        var listening = false;
        var lastFrame = 0;
        var frameInterval = 1000 / (runtimeOptions.fps || 30);

        canvas.className = 'ribbon-dynamic-effect';
        canvas.style.cssText = 'display:block;position:fixed;margin:0;padding:0;border:0;outline:0;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none';

        function viewport() {
            var root = document.documentElement;
            var body = document.body;
            return {
                width: Math.max(0, window.innerWidth || root.clientWidth || body.clientWidth || 0),
                height: Math.max(0, window.innerHeight || root.clientHeight || body.clientHeight || 0),
                scrollY: Math.max(0, window.pageYOffset || root.scrollTop || body.scrollTop || 0) - (root.clientTop || 0)
            };
        }

        function resize() {
            var size = viewport();
            width = size.width;
            height = size.height;
            canvas.width = width;
            canvas.height = height;
            context.globalAlpha = options.colorAlpha;
        }

        function onScroll() {
            scroll = viewport().scrollY;
        }

        function addRibbon() {
            var direction = Math.round(random(1, 9)) > 5 ? 'right' : 'left';
            var remaining = 1000;
            var boundary = width + 200;
            var startX = direction === 'right' ? -200 : boundary;
            var startY = Math.round(random(0, height));
            var first = new Point(startX, startY);
            var second = new Point(startX, startY);
            var sections = [];
            var color = Math.round(random(0, 360));
            var delay = 0;

            while (remaining-- > 0) {
                var moveX = Math.round((Math.random() - 0.2) * options.horizontalSpeed);
                var moveY = Math.round((Math.random() - 0.5) * (0.25 * height));
                var third = new Point().copy(second);
                if (direction === 'right') {
                    third.add(moveX, moveY);
                    if (second.x >= boundary) break;
                } else {
                    third.subtract(moveX, moveY);
                    if (second.x <= -200) break;
                }
                sections.push({
                    point1: new Point(first.x, first.y),
                    point2: new Point(second.x, second.y),
                    point3: third,
                    color: color,
                    delay: delay,
                    direction: direction,
                    alpha: 0,
                    phase: 0
                });
                first.copy(second);
                second.copy(third);
                delay += 4;
                color += options.colorCycleSpeed;
            }
            ribbons.push(sections);
        }

        function drawSection(section, step) {
            if (section.phase >= 1 && section.alpha <= 0) return true;
            if (section.delay <= 0) {
                section.phase += 0.02 * step;
                section.alpha = Math.max(0, Math.min(1, Math.sin(section.phase)));
                if (options.animateSections) {
                    var movement = 0.1 * Math.sin(1 + section.phase * Math.PI / 2) * step;
                    var direction = section.direction === 'right' ? 1 : -1;
                    section.point1.add(movement * direction, movement);
                    section.point2.add(movement * direction, movement);
                    section.point3.add(movement * direction, movement);
                }
            } else {
                section.delay -= 0.5 * step;
            }

            var color = 'hsla(' + section.color + ', ' + options.colorSaturation + ', ' + options.colorBrightness + ', ' + section.alpha + ')';
            context.save();
            context.translate(0, scroll * options.parallaxAmount);
            context.beginPath();
            context.moveTo(section.point1.x, section.point1.y);
            context.lineTo(section.point2.x, section.point2.y);
            context.lineTo(section.point3.x, section.point3.y);
            context.fillStyle = color;
            context.fill();
            if (options.strokeSize > 0) {
                context.lineWidth = options.strokeSize;
                context.strokeStyle = color;
                context.lineCap = 'round';
                context.stroke();
            }
            context.restore();
            return false;
        }

        function draw(timestamp) {
            if (!running) return;
            requestId = window.requestAnimationFrame(draw);
            if (timestamp - lastFrame < frameInterval) return;
            var step = lastFrame ? Math.min((timestamp - lastFrame) / (1000 / 60), 2) : 1;
            lastFrame = timestamp;
            context.clearRect(0, 0, width, height);

            for (var i = ribbons.length - 1; i >= 0; i--) {
                var complete = 0;
                for (var j = 0; j < ribbons[i].length; j++) {
                    if (drawSection(ribbons[i][j], step)) complete++;
                }
                if (complete >= ribbons[i].length) ribbons.splice(i, 1);
            }
            while (ribbons.length < options.ribbonCount) addRibbon();
        }

        function addListeners() {
            if (listening) return;
            listening = true;
            window.addEventListener('resize', resize);
            window.addEventListener('scroll', onScroll, {passive: true});
        }

        function start() {
            if (!canvas.parentNode) {
                document.body.appendChild(canvas);
                resize();
                onScroll();
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
                window.removeEventListener('scroll', onScroll);
                listening = false;
            }
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            ribbons = [];
        }

        return {
            start: start,
            pause: pause,
            resume: start,
            destroy: destroy
        };
    });
})(window, document);
