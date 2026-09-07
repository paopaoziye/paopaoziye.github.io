(function (window, document) {
  'use strict';

  window.MateryEffects.define('cursor', function (options) {
    var colors = ['#D61C59', '#E7D84B', '#1B8798'];
    var maxParticles = options.maxParticles || 80;
    var particles = [];
    var frameId = null;
    var listening = false;

    function Particle(x, y, color) {
      this.lifeSpan = 120;
      this.position = {x: x - 10, y: y - 20};
      this.velocity = {
        x: (Math.random() < 0.5 ? -1 : 1) * (Math.random() / 2),
        y: 1
      };
      this.element = document.createElement('span');
      this.element.textContent = '*';
      Object.assign(this.element.style, {
        position: 'fixed',
        top: '0',
        display: 'block',
        pointerEvents: 'none',
        zIndex: '10000000',
        fontSize: '20px',
        willChange: 'transform',
        color: color
      });
      document.body.appendChild(this.element);
    }

    Particle.prototype.update = function () {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.lifeSpan--;
      this.element.style.transform = 'translate3d(' + this.position.x + 'px,' + this.position.y + 'px,0) scale(' + (this.lifeSpan / 120) + ')';
    };

    Particle.prototype.remove = function () {
      if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
    };

    function updateParticles() {
      frameId = null;
      for (var i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].lifeSpan < 0) {
          particles[i].remove();
          particles.splice(i, 1);
        }
      }
      if (particles.length) frameId = window.requestAnimationFrame(updateParticles);
    }

    function addParticle(x, y) {
      if (particles.length >= maxParticles) return;
      var color = colors[Math.floor(Math.random() * colors.length)];
      particles.push(new Particle(x, y, color));
      if (frameId === null) frameId = window.requestAnimationFrame(updateParticles);
    }

    function onPointerMove(event) {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      addParticle(event.clientX, event.clientY);
    }

    function start() {
      if (listening) return;
      listening = true;
      document.addEventListener('pointermove', onPointerMove, {passive: true});
    }

    function clearParticles() {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      particles.forEach(function (particle) {
        particle.remove();
      });
      particles = [];
    }

    function pause() {
      clearParticles();
    }

    function destroy() {
      if (listening) {
        document.removeEventListener('pointermove', onPointerMove);
        listening = false;
      }
      clearParticles();
    }

    return {
      start: start,
      pause: pause,
      resume: start,
      destroy: destroy
    };
  });
})(window, document);
