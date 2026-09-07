(function (window, document) {
    'use strict';

    var definitions = {};
    var scriptPromises = {};
    var records = {};
    var config = null;
    var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var finePointer = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
    var activationPromise = null;
    var typedInstance = null;
    var live2dStarted = false;

    function prefersReducedMotion() {
        return reducedMotion ? reducedMotion.matches : false;
    }

    function hasFinePointer() {
        return finePointer ? finePointer.matches : true;
    }

    function isEligible() {
        return true;
    }

    function isActive(policy) {
        return !document.hidden && isEligible(policy);
    }

    function addMediaListener(query, listener) {
        if (!query) return;
        if (query.addEventListener) query.addEventListener('change', listener);
        else if (query.addListener) query.addListener(listener);
    }

    function loadScript(src) {
        if (!src) return Promise.reject(new Error('Missing effect script URL'));
        if (scriptPromises[src]) return scriptPromises[src];

        scriptPromises[src] = new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = function () {
                delete scriptPromises[src];
                reject(new Error('Unable to load ' + src));
            };
            document.head.appendChild(script);
        });
        return scriptPromises[src];
    }

    function define(name, factory) {
        definitions[name] = factory;
    }

    function getRecord(effect) {
        if (!records[effect.name]) {
            records[effect.name] = {
                effect: effect,
                instance: null
            };
        }
        return records[effect.name];
    }

    function destroy(record) {
        if (!record.instance) return;
        if (record.instance.destroy) record.instance.destroy();
        record.instance = null;
    }

    function reconcileRecord(record) {
        var effect = record.effect;
        if (!effect.enabled || !isEligible(effect.policy)) {
            destroy(record);
            return;
        }
        if (document.hidden) {
            if (record.instance && record.instance.pause) record.instance.pause();
            return;
        }
        if (record.instance) {
            if (record.instance.resume) record.instance.resume();
            return;
        }
        if (!definitions[effect.name]) return;

        record.instance = definitions[effect.name](effect.options || {});
        if (record.instance && record.instance.start) record.instance.start();
    }

    function activateEffects() {
        if (!config || activationPromise) return activationPromise;

        activationPromise = (config.effects || []).reduce(function (promise, effect) {
            return promise.then(function () {
                var record = getRecord(effect);
                if (!effect.enabled || !isActive(effect.policy)) {
                    reconcileRecord(record);
                    return null;
                }
                return loadScript(effect.src).then(function () {
                    reconcileRecord(record);
                }).catch(function (error) {
                    console.warn('[effects] ' + effect.name + ': ' + error.message);
                });
            });
        }, Promise.resolve()).then(function () {
            activationPromise = null;
        });
        return activationPromise;
    }

    function restoreSubtitle() {
        if (!config || !config.typed) return;
        var target = document.querySelector(config.typed.target);
        if (target) target.textContent = config.typed.strings[0] || '';
    }

    function destroyTyped() {
        if (typedInstance) {
            typedInstance.destroy();
            typedInstance = null;
        }
        restoreSubtitle();
    }

    function reconcileTyped() {
        if (!config || !config.typed || !config.typed.enabled) return;
        if (!isEligible('motion')) {
            destroyTyped();
            return;
        }
        if (document.hidden) {
            if (typedInstance) typedInstance.stop();
            return;
        }
        if (typedInstance) {
            typedInstance.start();
            return;
        }

        loadScript(config.typed.src).then(function () {
            if (!isActive('motion') || typedInstance || !window.Typed) return;
            var target = document.querySelector(config.typed.target);
            if (!target) return;
            target.textContent = '';
            typedInstance = new window.Typed(config.typed.target, config.typed.options);
        }).catch(function (error) {
            console.warn('[effects] typed: ' + error.message);
            restoreSubtitle();
        });
    }

    function setLive2dVisibility(visible) {
        var container = document.getElementById('live2d-widget');
        if (container) container.style.display = visible ? '' : 'none';
    }

    function reconcileLive2d() {
        if (!config || !config.live2d || !config.live2d.enabled) return;
        if (!isActive('desktop')) {
            setLive2dVisibility(false);
            return;
        }
        if (live2dStarted) {
            setLive2dVisibility(true);
            return;
        }

        loadScript(config.live2d.src).then(function () {
            if (!isActive('desktop') || live2dStarted || !window.L2Dwidget) return;
            live2dStarted = true;
            window.L2Dwidget.init(config.live2d.options);
        }).catch(function (error) {
            console.warn('[effects] live2d: ' + error.message);
        });
    }

    function reconcile() {
        Object.keys(records).forEach(function (name) {
            reconcileRecord(records[name]);
        });
        activateEffects();
        reconcileTyped();
        reconcileLive2d();
    }

    function init(options) {
        if (config) return;
        config = options || {};
        (config.effects || []).forEach(getRecord);
        addMediaListener(reducedMotion, reconcile);
        addMediaListener(finePointer, reconcile);
        document.addEventListener('visibilitychange', reconcile);
        reconcile();
    }

    window.MateryEffects = {
        define: define,
        init: init,
        prefersReducedMotion: prefersReducedMotion,
        hasFinePointer: hasFinePointer
    };
})(window, document);
