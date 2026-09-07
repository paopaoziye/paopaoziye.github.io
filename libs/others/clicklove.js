(function (window, document) {
    'use strict';

    var styleId = 'clicklove-style';
    if (!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = '.heart{width:10px;height:10px;position:fixed;background:#f00;transform:rotate(45deg);pointer-events:none}.heart:after,.heart:before{content:"";width:inherit;height:inherit;background:inherit;border-radius:50%;position:fixed}.heart:after{top:-5px}.heart:before{left:-5px}';
        document.head.appendChild(style);
    }

    window.MateryEffects.define('clicklove', function (options) {
        var maxHearts = options.maxHearts || 32;
        var hearts = [];
        var frameId = null;
        var listening = false;

        function removeHeart(heart) {
            if (heart.element.parentNode) heart.element.parentNode.removeChild(heart.element);
        }

        function update() {
            frameId = null;
            for (var i = hearts.length - 1; i >= 0; i--) {
                var heart = hearts[i];
                heart.y--;
                heart.scale += 0.004;
                heart.alpha -= 0.013;
                if (heart.alpha <= 0) {
                    removeHeart(heart);
                    hearts.splice(i, 1);
                    continue;
                }
                heart.element.style.cssText = 'left:' + heart.x + 'px;top:' + heart.y + 'px;opacity:' + heart.alpha + ';transform:scale(' + heart.scale + ') rotate(45deg);background:' + heart.color + ';z-index:99999;pointer-events:none';
            }
            if (hearts.length) frameId = window.requestAnimationFrame(update);
        }

        function onClick(event) {
            if (hearts.length >= maxHearts) return;
            var element = document.createElement('div');
            element.className = 'heart';
            hearts.push({
                element: element,
                x: event.clientX - 5,
                y: event.clientY - 5,
                scale: 1,
                alpha: 1,
                color: 'rgb(' + Math.floor(255 * Math.random()) + ',' + Math.floor(255 * Math.random()) + ',' + Math.floor(255 * Math.random()) + ')'
            });
            document.body.appendChild(element);
            if (frameId === null) frameId = window.requestAnimationFrame(update);
        }

        function start() {
            if (listening) return;
            listening = true;
            window.addEventListener('click', onClick);
        }

        function clear() {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
                frameId = null;
            }
            hearts.forEach(removeHeart);
            hearts = [];
        }

        function destroy() {
            if (listening) {
                window.removeEventListener('click', onClick);
                listening = false;
            }
            clear();
        }

        return {
            start: start,
            pause: clear,
            resume: start,
            destroy: destroy
        };
    });
})(window, document);
