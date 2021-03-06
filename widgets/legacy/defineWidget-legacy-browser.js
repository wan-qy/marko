'use strict';
/* jshint newcap:false */

 var BaseState;
 var BaseWidget;
 var inherit;


module.exports = function defineWidget(def, renderer) {
    def = def.Widget || def;

    if (def.$__isWidget) {
        return def;
    }

    var WidgetClass = function() {};
    var proto;

    if (typeof def === 'function') {
        proto = def.prototype;
        proto.init = def;
    } else if (typeof def === 'object') {
        proto = def;
    } else {
        throw TypeError();
    }

    WidgetClass.prototype = proto;

    // We don't use the constructor provided by the user
    // since we don't invoke their constructor until
    // we have had a chance to do our own initialization.
    // Instead, we store their constructor in the "initWidget"
    // property and that method gets called later inside
    // init-widgets-browser.js
    function Widget(id, doc) {
        BaseWidget.call(this, id, doc);
    }

    if (!proto.$__isWidget) {
        // Inherit from Widget if they didn't already
        inherit(WidgetClass, BaseWidget);
    }

    // The same prototype will be used by our constructor after
    // we he have set up the prototype chain using the inherit function
    proto = Widget.prototype = WidgetClass.prototype;

    proto.constructor = def.constructor = Widget;

    // get legacy methods
    var init = proto.init;
    var onRender = proto.onRender;
    var onBeforeUpdate = proto.onBeforeUpdate;
    var onUpdate = proto.onUpdate;
    var onBeforeDestroy = proto.onBeforeDestroy;
    var onDestroy = proto.onDestroy;

    // delete legacy methods
    delete proto.init;
    delete proto.onRender;
    delete proto.onBeforeUpdate;
    delete proto.onUpdate;
    delete proto.onBeforeDestroy;
    delete proto.onDestroy;

    // convert legacy to modern

    if (init || onRender) {
        proto.onMount = function() {
            var self = this;
            var config = this.$c;
            if (init) init.call(this, config);
            if (onRender) {
                onRender.call(this, { firstRender:true });
                this.on('$__legacyRender', function() {
                    self.$__didUpdate = true;
                });
            }
        };
    }

    if (onBeforeUpdate || onUpdate) {
        proto.onUpdate = function() {
            if (onBeforeUpdate) onBeforeUpdate.call(this);
            if (onUpdate) onUpdate.call(this);
            if (onRender && this.$__didUpdate) {
                this.$__didUpdate = false;
                onRender.call(this, {});
            }
        };
    }

    if (onBeforeDestroy || onDestroy) {
        proto.onDestroy = function() {
            if (onBeforeDestroy) onBeforeDestroy.call(this);
            if (onDestroy) onDestroy.call(this);
        };
    }


    // Set a flag on the constructor function to make it clear this is
    // a widget so that we can short-circuit this work later
    Widget.$__isWidget = true;

    function State() { BaseState.apply(this, arguments); }
    inherit(State, BaseState);
    proto.$__State = State;


    if (!renderer) {
        renderer = WidgetClass.renderer || WidgetClass.prototype.renderer;
        if (renderer) {
            // Legacy support
            var createOut = renderer.createOut;
            if (typeof renderer !== 'function') {
                var rendererObject = renderer;
                renderer = function(input, out) {
                    var rendererFunc = rendererObject.renderer || rendererObject.render;
                    rendererFunc(input, out);
                };
                renderer.createOut = createOut;
            }

            renderer.render = function(input) {
                var out = createOut();
                renderer(input, out);
                return out.end();
            };
        }
    }


    if (renderer) {
        // Add the rendering related methods as statics on the
        // new widget constructor function
        Widget.renderer = proto.renderer = renderer;
        Widget.render = renderer.render;
        Widget.renderSync = renderer.renderSync;
    }

    return Widget;
};

BaseState = require('../State');
BaseWidget = require('../Widget');
inherit = require('raptor-util/inherit');