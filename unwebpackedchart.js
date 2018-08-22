(function() {

	d3.hexbin = function() {
	  var width = 1,
		  height = 1,
		  r,
		  x = d3_hexbinX,
		  y = d3_hexbinY,
		  binCallback,
		  dx,
		  dy;
	
	  function hexbin(points) {
		var binsById = {};
	
		points.forEach(function(point, i) {
		  var py = y.call(hexbin, point, i) / dy, pj = Math.round(py),
			  px = x.call(hexbin, point, i) / dx - (pj & 1 ? .5 : 0), pi = Math.round(px),
			  py1 = py - pj;
	
		  if (Math.abs(py1) * 3 > 1) {
			var px1 = px - pi,
				pi2 = pi + (px < pi ? -1 : 1) / 2,
				pj2 = pj + (py < pj ? -1 : 1),
				px2 = px - pi2,
				py2 = py - pj2;
			if (px1 * px1 + py1 * py1 > px2 * px2 + py2 * py2) pi = pi2 + (pj & 1 ? 1 : -1) / 2, pj = pj2;
		  }
	
		  var id = pi + "-" + pj, bin = binsById[id];
		  if (bin) bin.push(point); else {
			bin = binsById[id] = [point];
			bin.i = pi;
			bin.j = pj;
			bin.x = (pi + (pj & 1 ? 1 / 2 : 0)) * dx;
			bin.y = pj * dy;
		  }
		  if (binCallback) binCallback(point, bin);
		});
	
		return d3.values(binsById);
	  }
	
	  function hexagon(radius) {
		var x0 = 0, y0 = 0;
		return d3_hexbinAngles.map(function(angle) {
		  var x1 = Math.sin(angle) * radius,
			  y1 = -Math.cos(angle) * radius,
			  dx = x1 - x0,
			  dy = y1 - y0;
		  x0 = x1, y0 = y1;
		  return [dx, dy];
		});
	  }
	
	  hexbin.x = function(_) {
		if (!arguments.length) return x;
		x = _;
		return hexbin;
	  };
	
	  hexbin.y = function(_) {
		if (!arguments.length) return y;
		y = _;
		return hexbin;
	  };
		 
	  hexbin.bin = function(_) {
		if (!arguments.length) return binCallback;
		binCallback = _;
		return hexbin;
	  };
		 
	  hexbin.hexagon = function(radius) {
		if (arguments.length < 1) radius = r;
		return "m" + hexagon(radius).join("l") + "z";
	  };
	
	  hexbin.centers = function() {
		var centers = [];
		for (var y = 0, odd = false, j = 0; y < height + r; y += dy, odd = !odd, ++j) {
		  for (var x = odd ? dx / 2 : 0, i = 0; x < width + dx / 2; x += dx, ++i) {
			var center = [x, y];
			center.i = i;
			center.j = j;
			centers.push(center);
		  }
		}
		return centers;
	  };
	
	  hexbin.mesh = function() {
		var fragment = hexagon(r).slice(0, 4).join("l");
		return hexbin.centers().map(function(p) { return "M" + p + "m" + fragment; }).join("");
	  };
	
	  hexbin.size = function(_) {
		if (!arguments.length) return [width, height];
		width = +_[0], height = +_[1];
		return hexbin;
	  };
	
	  hexbin.radius = function(_) {
		if (!arguments.length) return r;
		r = +_;
		dx = r * 2 * Math.sin(Math.PI / 3);
		dy = r * 1.5;
		return hexbin;
	  };
	
	  return hexbin.radius(1);
	};
	
	var d3_hexbinAngles = d3.range(0, 2 * Math.PI, Math.PI / 3),
		d3_hexbinX = function(d) { return d[0]; },
		d3_hexbinY = function(d) { return d[1]; };
	
})();
(function() {
	var assert = function(test, message) {
		if (test) {
			return;
		}
		throw new Error("[d3.chart] " + message);
	};
	var hasOwnProp = Object.hasOwnProperty;

	// extend
	// Borrowed from Underscore.js
	function extend(object) {
		var argsIndex, argsLength, iteratee, key;
		if (!object) {
			return object;
		}
		argsLength = arguments.length;
		for (argsIndex = 1; argsIndex < argsLength; argsIndex++) {
			iteratee = arguments[argsIndex];
			if (iteratee) {
				for (key in iteratee) {
					object[key] = iteratee[key];
				}
			}
		}
		return object;
	}

	/**
	 * Call the {@Chart#initialize} method up the inheritance chain, starting with
	 * the base class and continuing "downward".
	 *
	 * @private
	 */
	var initCascade = function(instance, args) {
		var ctor = this.constructor;
		var sup = ctor.__super__;
		if (sup) {
			initCascade.call(sup, instance, args);
		}

		// Do not invoke the `initialize` method on classes further up the
		// prototype chain (again).
		if (hasOwnProp.call(ctor.prototype, "initialize")) {
			this.initialize.apply(instance, args);
		}
	};

	/**
	 * Call the `transform` method down the inheritance chain, starting with the
	 * instance and continuing "upward". The result of each transformation should
	 * be supplied as input to the next.
	 *
	 * @private
	 */
	var transformCascade = function(instance, data) {
		var ctor = this.constructor;
		var sup = ctor.__super__;

		// Unlike `initialize`, the `transform` method has significance when
		// attached directly to a chart instance. Ensure that this transform takes
		// first but is not invoked on later recursions.
		if (this === instance && hasOwnProp.call(this, "transform")) {
			data = this.transform(data);
		}

		// Do not invoke the `transform` method on classes further up the prototype
		// chain (yet).
		if (hasOwnProp.call(ctor.prototype, "transform")) {
			data = ctor.prototype.transform.call(instance, data);
		}

		if (sup) {
			data = transformCascade.call(sup, instance, data);
		}

		return data;
	};

	/**
	 * Create a d3.chart
	 *
	 * @constructor
	 * @externalExample {runnable} chart
	 *
	 * @param {d3.selection} selection The chart's "base" DOM node. This should
	 *        contain any nodes that the chart generates.
	 * @param {mixed} chartOptions A value for controlling how the chart should be
	 *        created. This value will be forwarded to {@link Chart#initialize}, so
	 *        charts may define additional properties for consumers to modify their
	 *        behavior during initialization. The following attributes will be
	 *        copied onto the chart instance (if present):
	 * @param {Function} [chartOptions.transform] - A data transformation function
	 *        unique to the Chart instance being created. If specified, this
	 *        function will be invoked after all inherited implementations as part
	 *        of the `Chart#draw` operation.
	 * @param {Function} [chartOptions.demux] - A data filtering function for
	 *        attachment charts. If specified, this function will be invoked with
	 *        every {@link Chart#draw|draw} operation and provided with two
	 *        arguments: the attachment name (see {@link Chart#attach}) and the
	 *        data.
	 *
	 * @constructor
	 */
	var Chart = function(selection, chartOptions) {
		this.base = selection;
		this._layers = {};
		this._attached = {};
		this._events = {};

		if (chartOptions && chartOptions.transform) {
			this.transform = chartOptions.transform;
		}

		initCascade.call(this, this, [chartOptions]);
	};

	/**
	 * Set up a chart instance. This method is intended to be overridden by Charts
	 * authored with this library. It will be invoked with a single argument: the
	 * `options` value supplied to the {@link Chart|constructor}.
	 *
	 * For charts that are defined as extensions of other charts using
	 * `Chart.extend`, each chart's `initilize` method will be invoked starting
	 * with the "oldest" ancestor (see the private {@link initCascade} function for
	 * more details).
	 */
	Chart.prototype.initialize = function() {};

	/**
	 * Remove a layer from the chart.
	 *
	 * @externalExample chart-unlayer
	 *
	 * @param {String} name The name of the layer to remove.
	 *
	 * @returns {Layer} The layer removed by this operation.
	 */
	Chart.prototype.unlayer = function(name) {
		var layer = this.layer(name);

		delete this._layers[name];
		delete layer._chart;

		return layer;
	};

	/**
	 * Interact with the chart's {@link Layer|layers}.
	 *
	 * If only a `name` is provided, simply return the layer registered to that
	 * name (if any).
	 *
	 * If a `name` and `selection` are provided, treat the `selection` as a
	 * previously-created layer and attach it to the chart with the specified
	 * `name`.
	 *
	 * If all three arguments are specified, initialize a new {@link Layer} using
	 * the specified `selection` as a base passing along the specified `options`.
	 *
	 * The {@link Layer.draw} method of attached layers will be invoked
	 * whenever this chart's {@link Chart#draw} is invoked and will receive the
	 * data (optionally modified by the chart's {@link Chart#transform} method.
	 *
	 * @externalExample chart-layer
	 *
	 * @param {String} name Name of the layer to attach or retrieve.
	 * @param {d3.selection|Layer} [selection] The layer's base or a
	 *        previously-created {@link Layer}.
	 * @param {Object} [options] Options to be forwarded to {@link Layer|the Layer
	 *        constructor}
	 *
	 * @returns {Layer}
	 */
	Chart.prototype.layer = function(name, selection, options) {
		var layer;

		if (arguments.length === 1) {
			return this._layers[name];
		}

		// we are reattaching a previous layer, which the
		// selection argument is now set to.
		if (arguments.length === 2) {

			if (typeof selection.draw === "function") {
				selection._chart = this;
				this._layers[name] = selection;
				return this._layers[name];

			} else {
				assert(false, "When reattaching a layer, the second argument " +
					"must be a d3.chart layer");
			}
		}

		layer = selection.layer(options);

		this._layers[name] = layer;

		selection._chart = this;

		return layer;
	};

	/**
	 * Register or retrieve an "attachment" Chart. The "attachment" chart's `draw`
	 * method will be invoked whenever the containing chart's `draw` method is
	 * invoked.
	 *
	 * @externalExample chart-attach
	 *
	 * @param {String} attachmentName Name of the attachment
	 * @param {Chart} [chart] d3.chart to register as a mix in of this chart. When
	 *        unspecified, this method will return the attachment previously
	 *        registered with the specified `attachmentName` (if any).
	 *
	 * @returns {Chart} Reference to this chart (chainable).
	 */
	Chart.prototype.attach = function(attachmentName, chart) {
		if (arguments.length === 1) {
			return this._attached[attachmentName];
		}

		this._attached[attachmentName] = chart;
		return chart;
	};

	/**
	 * A "hook" method that you may define to modify input data before it is used
	 * to draw the chart's layers and attachments. This method will be used by all
	 * sub-classes (see {@link transformCascade} for details).
	 *
	 * Note you will most likely never call this method directly, but rather
	 * include it as part of a chart definition, and then rely on d3.chart to
	 * invoke it when you draw the chart with {@link Chart#draw}.
	 *
	 * @externalExample {runnable} chart-transform
	 *
	 * @param {Array} data Input data provided to @link Chart#draw}.
	 *
	 * @returns {mixed} Data to be used in drawing the chart's layers and
	 *                  attachments.
	 */
	Chart.prototype.transform = function(data) {
		return data;
	};

	/**
	 * Update the chart's representation in the DOM, drawing all of its layers and
	 * any "attachment" charts (as attached via {@link Chart#attach}).
	 *
	 * @externalExample chart-draw
	 *
	 * @param {Object} data Data to pass to the {@link Layer#draw|draw method} of
	 *        this cart's {@link Layer|layers} (if any) and the {@link
	 *        Chart#draw|draw method} of this chart's attachments (if any).
	 */
	Chart.prototype.draw = function(data) {

		var layerName, attachmentName, attachmentData;

		data = transformCascade.call(this, this, data);

		for (layerName in this._layers) {
			this._layers[layerName].draw(data);
		}

		for (attachmentName in this._attached) {
			if (this.demux) {
				attachmentData = this.demux(attachmentName, data);
			} else {
				attachmentData = data;
			}
			this._attached[attachmentName].draw(attachmentData);
		}
	};

	/**
	 * Function invoked with the context specified when the handler was bound (via
	 * {@link Chart#on} {@link Chart#once}).
	 *
	 * @callback ChartEventHandler
	 * @param {...*} arguments Invoked with the arguments passed to {@link
	 *         Chart#trigger}
	 */

	/**
	 * Subscribe a callback function to an event triggered on the chart. See {@link
	 * Chart#once} to subscribe a callback function to an event for one occurence.
	 *
	 * @externalExample {runnable} chart-on
	 *
	 * @param {String} name Name of the event
	 * @param {ChartEventHandler} callback Function to be invoked when the event
	 *        occurs
	 * @param {Object} [context] Value to set as `this` when invoking the
	 *        `callback`. Defaults to the chart instance.
	 *
	 * @returns {Chart} A reference to this chart (chainable).
	 */
	Chart.prototype.on = function(name, callback, context) {
		var events = this._events[name] || (this._events[name] = []);
		events.push({
			callback: callback,
			context: context || this,
			_chart: this
		});
		return this;
	};

	/**
	 * Subscribe a callback function to an event triggered on the chart. This
	 * function will be invoked at the next occurance of the event and immediately
	 * unsubscribed. See {@link Chart#on} to subscribe a callback function to an
	 * event indefinitely.
	 *
	 * @externalExample {runnable} chart-once
	 *
	 * @param {String} name Name of the event
	 * @param {ChartEventHandler} callback Function to be invoked when the event
	 *        occurs
	 * @param {Object} [context] Value to set as `this` when invoking the
	 *        `callback`. Defaults to the chart instance
	 *
	 * @returns {Chart} A reference to this chart (chainable)
	 */
	Chart.prototype.once = function(name, callback, context) {
		var self = this;
		var once = function() {
			self.off(name, once);
			callback.apply(this, arguments);
		};
		return this.on(name, once, context);
	};

	/**
	 * Unsubscribe one or more callback functions from an event triggered on the
	 * chart. When no arguments are specified, *all* handlers will be unsubscribed.
	 * When only a `name` is specified, all handlers subscribed to that event will
	 * be unsubscribed. When a `name` and `callback` are specified, only that
	 * function will be unsubscribed from that event. When a `name` and `context`
	 * are specified (but `callback` is omitted), all events bound to the given
	 * event with the given context will be unsubscribed.
	 *
	 * @externalExample {runnable} chart-off
	 *
	 * @param {String} [name] Name of the event to be unsubscribed
	 * @param {ChartEventHandler} [callback] Function to be unsubscribed
	 * @param {Object} [context] Contexts to be unsubscribe
	 *
	 * @returns {Chart} A reference to this chart (chainable).
	 */
	Chart.prototype.off = function(name, callback, context) {
		var names, n, events, event, i, j;

		// remove all events
		if (arguments.length === 0) {
			for (name in this._events) {
				this._events[name].length = 0;
			}
			return this;
		}

		// remove all events for a specific name
		if (arguments.length === 1) {
			events = this._events[name];
			if (events) {
				events.length = 0;
			}
			return this;
		}

		// remove all events that match whatever combination of name, context
		// and callback.
		names = name ? [name] : Object.keys(this._events);
		for (i = 0; i < names.length; i++) {
			n = names[i];
			events = this._events[n];
			j = events.length;
			while (j--) {
				event = events[j];
				if ((callback && callback === event.callback) ||
						(context && context === event.context)) {
					events.splice(j, 1);
				}
			}
		}

		return this;
	};

	/**
	 * Publish an event on this chart with the given `name`.
	 *
	 * @externalExample {runnable} chart-trigger
	 *
	 * @param {String} name Name of the event to publish
	 * @param {...*} arguments Values with which to invoke the registered
	 *        callbacks.
	 *
	 * @returns {Chart} A reference to this chart (chainable).
	 */
	Chart.prototype.trigger = function(name) {
		var args = Array.prototype.slice.call(arguments, 1);
		var events = this._events[name];
		var i, ev;

		if (events !== undefined) {
			for (i = 0; i < events.length; i++) {
				ev = events[i];
				ev.callback.apply(ev.context, args);
			}
		}

		return this;
	};

	/**
	 * Create a new {@link Chart} constructor with the provided options acting as
	 * "overrides" for the default chart instance methods. Allows for basic
	 * inheritance so that new chart constructors may be defined in terms of
	 * existing chart constructors. Based on the `extend` function defined by
	 * [Backbone.js](http://backbonejs.org/).
	 *
	 * @static
	 * @externalExample {runnable} chart-extend
	 *
	 * @param {String} name Identifier for the new Chart constructor.
	 * @param {Object} protoProps Properties to set on the new chart's prototype.
	 * @param {Object} staticProps Properties to set on the chart constructor
	 *        itself.
	 *
	 * @returns {Function} A new Chart constructor
	 */
	Chart.extend = function(name, protoProps, staticProps) {
		var parent = this;
		var child;

		// The constructor function for the new subclass is either defined by
		// you (the "constructor" property in your `extend` definition), or
		// defaulted by us to simply call the parent's constructor.
		if (protoProps && hasOwnProp.call(protoProps, "constructor")) {
			child = protoProps.constructor;
		} else {
			child = function(){ return parent.apply(this, arguments); };
		}

		// Add static properties to the constructor function, if supplied.
		extend(child, parent, staticProps);

		// Set the prototype chain to inherit from `parent`, without calling
		// `parent`'s constructor function.
		var Surrogate = function(){ this.constructor = child; };
		Surrogate.prototype = parent.prototype;
		child.prototype = new Surrogate();

		// Add prototype properties (instance properties) to the subclass, if
		// supplied.
		if (protoProps) { extend(child.prototype, protoProps); }

		// Set a convenience property in case the parent's prototype is needed
		// later.
		child.__super__ = parent.prototype;

		Chart[name] = child;
		return child;
	};


	var lifecycleRe = /^(enter|update|merge|exit)(:transition)?$/;

	/**
	 * Create a layer using the provided `base`. The layer instance is *not*
	 * exposed to d3.chart users. Instead, its instance methods are mixed in to the
	 * `base` selection it describes; users interact with the instance via these
	 * bound methods.
	 *
	 * @private
	 * @constructor
	 * @externalExample {runnable} layer
	 *
	 * @param {d3.selection} base The containing DOM node for the layer.
	 */
	var Layer = function(base) {
		assert(base, "Layers must be initialized with a base.");
		this._base = base;
		this._handlers = {};
	};

	/**
	 * Invoked by {@link Layer#draw} to join data with this layer's DOM nodes. This
	 * implementation is "virtual"--it *must* be overridden by Layer instances.
	 *
	 * @param {Array} data Value passed to {@link Layer#draw}
	 */
	Layer.prototype.dataBind = function() {
		assert(false, "Layers must specify a `dataBind` method.");
	};

	/**
	 * Invoked by {@link Layer#draw} in order to insert new DOM nodes into this
	 * layer's `base`. This implementation is "virtual"--it *must* be overridden by
	 * Layer instances.
	 */
	Layer.prototype.insert = function() {
		assert(false, "Layers must specify an `insert` method.");
	};

	/**
	 * Subscribe a handler to a "lifecycle event". These events (and only these
	 * events) are triggered when {@link Layer#draw} is invoked--see that method
	 * for more details on lifecycle events.
	 *
	 * @externalExample {runnable} layer-on
	 *
	 * @param {String} eventName Identifier for the lifecycle event for which to
	 *        subscribe.
	 * @param {Function} handler Callback function
	 *
	 * @returns {d3.selection} Reference to the layer's base.
	 */
	Layer.prototype.on = function(eventName, handler, options) {
		options = options || {};

		assert(
			lifecycleRe.test(eventName),
			"Unrecognized lifecycle event name specified to `Layer#on`: '" +
			eventName + "'."
		);

		if (!(eventName in this._handlers)) {
			this._handlers[eventName] = [];
		}
		this._handlers[eventName].push({
			callback: handler,
			chart: options.chart || null
		});
		return this._base;
	};

	/**
	 * Unsubscribe the specified handler from the specified event. If no handler is
	 * supplied, remove *all* handlers from the event.
	 *
	 * @externalExample {runnable} layer-off
	 *
	 * @param {String} eventName Identifier for event from which to remove
	 *        unsubscribe
	 * @param {Function} handler Callback to remove from the specified event
	 *
	 * @returns {d3.selection} Reference to the layer's base.
	 */
	Layer.prototype.off = function(eventName, handler) {

		var handlers = this._handlers[eventName];
		var idx;

		assert(
			lifecycleRe.test(eventName),
			"Unrecognized lifecycle event name specified to `Layer#off`: '" +
			eventName + "'."
		);

		if (!handlers) {
			return this._base;
		}

		if (arguments.length === 1) {
			handlers.length = 0;
			return this._base;
		}

		for (idx = handlers.length - 1; idx > -1; --idx) {
			if (handlers[idx].callback === handler) {
				handlers.splice(idx, 1);
			}
		}
		return this._base;
	};

	/**
	 * Render the layer according to the input data: Bind the data to the layer
	 * (according to {@link Layer#dataBind}, insert new elements (according to
	 * {@link Layer#insert}, make lifecycle selections, and invoke all relevant
	 * handlers (as attached via {@link Layer#on}) with the lifecycle selections.
	 *
	 * - update
	 * - update:transition
	 * - enter
	 * - enter:transition
	 * - exit
	 * - exit:transition
	 *
	 * @externalExample {runnable} layer-draw
	 *
	 * @param {Array} data Data to drive the rendering.
	 */
	Layer.prototype.draw = function(data) {
		var bound, entering, events, selection, method, handlers, eventName, idx,
			len;

		bound = this.dataBind.call(this._base, data);

		// Although `bound instanceof d3.selection` is more explicit, it fails
		// in IE8, so we use duck typing to maintain compatability.
		assert(bound && bound.call === d3.selection.prototype.call,
			"Invalid selection defined by `Layer#dataBind` method.");
		assert(bound.enter, "Layer selection not properly bound.");

		entering = bound.enter();
		entering._chart = this._base._chart;

		events = [
			{
				name: "update",
				selection: bound
			},
			{
				name: "enter",
				selection: entering,
				method: this.insert
			},
			{
				name: "merge",
				// Although the `merge` lifecycle event shares its selection object
				// with the `update` lifecycle event, the object's contents will be
				// modified when d3.chart invokes the user-supplied `insert` method
				// when triggering the `enter` event.
				selection: bound
			},
			{
				name: "exit",
				// Although the `exit` lifecycle event shares its selection object
				// with the `update` and `merge` lifecycle events, the object's
				// contents will be modified when d3.chart invokes
				// `d3.selection.exit`.
				selection: bound,
				method: bound.exit
			}
		];

		for (var i = 0, l = events.length; i < l; ++i) {
			eventName = events[i].name;
			selection = events[i].selection;
			method = events[i].method;

			// Some lifecycle selections modify shared state, so they must be
			// deferred until just prior to handler invocation.
			if (typeof method === "function") {
				selection = method.call(selection);
			}

			if (selection.empty()) {
				continue;
			}

			// Although `selection instanceof d3.selection` is more explicit,
			// it fails in IE8, so we use duck typing to maintain
			// compatability.
			assert(selection &&
				selection.call === d3.selection.prototype.call,
				"Invalid selection defined for '" + eventName +
				"' lifecycle event.");

			handlers = this._handlers[eventName];

			if (handlers) {
				for (idx = 0, len = handlers.length; idx < len; ++idx) {
					// Attach a reference to the parent chart so the selection"s
					// `chart` method will function correctly.
					selection._chart = handlers[idx].chart || this._base._chart;
					selection.call(handlers[idx].callback);
				}
			}

			handlers = this._handlers[eventName + ":transition"];

			if (handlers && handlers.length) {
				selection = selection.transition();
				for (idx = 0, len = handlers.length; idx < len; ++idx) {
					selection._chart = handlers[idx].chart || this._base._chart;
					selection.call(handlers[idx].callback);
				}
			}
		}
	};


	/**
	 * Create a new layer on the d3 selection from which it is called.
	 *
	 * @static
	 *
	 * @param {Object} [options] Options to be forwarded to {@link Layer|the Layer
	 *        constructor}
	 * @returns {d3.selection}
	 */
	d3.selection.prototype.layer = function(options) {
		var layer = new Layer(this);
		var eventName;

		// Set layer methods (required)
		layer.dataBind = options.dataBind;
		layer.insert = options.insert;

		// Bind events (optional)
		if ("events" in options) {
			for (eventName in options.events) {
				layer.on(eventName, options.events[eventName]);
			}
		}

		// Mix the public methods into the D3.js selection (bound appropriately)
		this.on = function() { return layer.on.apply(layer, arguments); };
		this.off = function() { return layer.off.apply(layer, arguments); };
		this.draw = function() { return layer.draw.apply(layer, arguments); };

		return this;
	};


	/**
	 * A namespace defined by [the D3.js library](http://d3js.org/). The d3.chart
	 * API is defined within this namespace.
	 * @namespace d3
	 */

	/**
	 * A constructor function defined by [the D3.js library](http://d3js.org/).
	 * @constructor d3.selection
	 * @memberof d3
	 */

	/**
	 * Create a new chart constructor or return a previously-created chart
	 * constructor.
	 *
	 * @static
	 * @memberof d3
	 * @externalExample {runnable} chart
	 *
	 * @param {String} name If no other arguments are specified, return the
	 *        previously-created chart with this name.
	 * @param {Object} protoProps If specified, this value will be forwarded to
	 *        {@link Chart.extend} and used to create a new chart.
	 * @param {Object} staticProps If specified, this value will be forwarded to
	 *        {@link Chart.extend} and used to create a new chart.
	 */
	d3.chart = function(name) {
		if (arguments.length === 0) {
			return Chart;
		} else if (arguments.length === 1) {
			return Chart[name];
		}

		return Chart.extend.apply(Chart, arguments);
	};

	/**
	 * Instantiate a chart or return the chart that the current selection belongs
	 * to.
	 *
	 * @externalExample {runnable} selection-chart
	 *
	 * @param {String} [chartName] The name of the chart to instantiate. If the
	 *        name is unspecified, this method will return the chart that the
	 *        current selection belongs to.
	 * @param {mixed} options The options to use when instantiated the new chart.
	 *        See {@link Chart} for more information.
	 */
	d3.selection.prototype.chart = function(chartName, options) {
		// Without an argument, attempt to resolve the current selection's
		// containing d3.chart.
		if (arguments.length === 0) {
			return this._chart;
		}
		var ChartCtor = Chart[chartName];
		assert(ChartCtor, "No chart registered with name '" + chartName + "'");

		return new ChartCtor(this, options);
	};

	// Implement the zero-argument signature of `d3.selection.prototype.chart`
	// for all selection types.
	d3.selection.enter.prototype.chart = function() {
		return this._chart;
	};
	d3.transition.prototype.chart = d3.selection.enter.prototype.chart;



  // underscore debounce method
  var debounce = function (func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  };

  // initialize defaults in chart prototype
  var initDefaults = function (chartProto, defaults) {
    // Generate setters for default options
    defaults = d3.map(defaults || {});
    defaults.forEach(function (option, value) {
      // set option value
      var optionName = '_' + option; 
      chartProto[optionName] = value;

      // setup helper method to set option
      chartProto[option] = function (_) {
        // return value of option if not setting
        if (!arguments.length) return this[optionName];

        // otherwise set value
        this[optionName] = _;

        // trigger change handler for event
        this.trigger('change:' + option, _);

        // return this to chain
        return this;   
      };
    });      

    // if we have defaults, make sure we override defaults
    if (defaults.size()) {
      // override initialize method to initialize any options
      var oldInit = chartProto.initialize;
      chartProto.initialize = function (options) {
        // set value for any options that are defaults
        for (var optionName in options) {
          if (defaults.get(optionName)) {
            this['_' + optionName] = options[optionName];
          }
        }
        
        // call old initialize method
        oldInit.apply(this, arguments);
      }
    }
  };

  // initializes any associated events with defaults
  var initEvents = function (chartProto, events) {
    events = d3.map(events || {});
    if (events.size() > 0) {
      // create shared handler pool (to deal with debounced methods)
      var values = events.values();
      var handlers = {};
      for (var i = 0, l = values.length; i < l; ++i) {
        var value = values[i];
        var fn = value;
        var debounce = false;
        if (value.match(/^debounce:/i)) {
          fn = value.substr(9);
          debounce = true;
        } 
        handlers[value] = {fn: chartProto[fn], debounce: debounce};
      }

      // override initialize method to bind events
      var oldInit = chartProto.initialize;
      chartProto.initialize = function () {
        // call old initialize method
        oldInit.apply(this, arguments);

        // bind handlers to this
        for (var handler in handlers) {
          var o = handlers[handler];
          var boundFn = o.fn.bind(this);
          o.boundFn = o.debounce ? debounce(boundFn) : boundFn;
        }

        // bind events
        var self = this;
        events.forEach(function (eventNames, handler) {
          var names = eventNames.split(/\s+/); 
          for (var i = 0, l = names.length; i < l; ++i) {
            self.on('change:' + names[i], handlers[handler].boundFn); 
          }
        });
      };
    }
  };

  // define exports
  d3.chart.initializeDefaults = function (chart, defaults, events) {
    chartProto = chart.prototype;
    initDefaults(chartProto, defaults);
    initEvents(chartProto, events);
  };

})();
(function () {

	var clipCounter = 0;
  
	var BasketballShotChart = d3.chart('BasketballShotChart', {
  
	  initialize: function () {
		this.calculateVisibleCourtLength();
  
		var base = this.base
		  .attr('class', 'shot-chart');
  
		// draw base court
		this.drawCourt();
  
		// add title
		this.drawTitle();
  
		// draw legend
		this.drawLegend();
  
		// add data
		this.drawShots();
	  },
	   
	  // helper to create an arc path
	  appendArcPath: function (base, radius, startAngle, endAngle) {
		var points = 30;
  
		var angle = d3.scale.linear()
			.domain([0, points - 1])
			.range([startAngle, endAngle]);
  
		var line = d3.svg.line.radial()
			.interpolate("basis")
			.tension(0)
			.radius(radius)
			.angle(function(d, i) { return angle(i); });
  
		return base.append("path").datum(d3.range(points))
			.attr("d", line);
	  },
  
	  // draw basketball court
	  drawCourt: function () {
		var courtWidth = this._courtWidth,
			visibleCourtLength = this._visibleCourtLength,
			keyWidth = this._keyWidth
			threePointRadius = this._threePointRadius,
			threePointSideRadius = this._threePointSideRadius, 
			threePointCutoffLength = this._threePointCutoffLength,
			freeThrowLineLength = this._freeThrowLineLength,
			freeThrowCircleRadius = this._freeThrowCircleRadius,
			basketProtrusionLength = this._basketProtrusionLength,
			basketDiameter = this._basketDiameter,
			basketWidth = this._basketWidth,
			restrictedCircleRadius = this._restrictedCircleRadius,   
			keyMarkWidth = this._keyMarkWidth;
  
		var base = this.base
		  .attr('width', this._width)
		  .attr('viewBox', "0 0 " + courtWidth + " " + visibleCourtLength)
		  .append('g')
			.attr('class', 'shot-chart-court');
		if (this._height) base.attr('height', this._height);
						 
		// base.append("rect")
		//   .attr('class', 'shot-chart-court-key')
		//   .attr("x", (courtWidth / 2 - keyWidth / 2))
		//   .attr("y", (visibleCourtLength - freeThrowLineLength))
		//   .attr("width", keyWidth)
		//   .attr("height", freeThrowLineLength);
  
		// base.append("line")
		//   .attr('class', 'shot-chart-court-baseline')
		//   .attr("x1", 0)
		//   .attr("y1", visibleCourtLength)
		//   .attr("x2", courtWidth)
		//   .attr("y2", visibleCourtLength);
				
		// var tpAngle = Math.atan(threePointSideRadius / 
		//   (threePointCutoffLength - basketProtrusionLength - basketDiameter/2));
		// this.appendArcPath(base, threePointRadius, -1 * tpAngle, tpAngle)
		//   .attr('class', 'shot-chart-court-3pt-line')
		//   .attr("transform", "translate(" + (courtWidth / 2) + ", " + 
		//     (visibleCourtLength - basketProtrusionLength - basketDiameter / 2) + 
		//     ")");
		   
		// [1, -1].forEach(function (n) {
		//   base.append("line")
		//     .attr('class', 'shot-chart-court-3pt-line')
		//     .attr("x1", courtWidth / 2 + threePointSideRadius * n)
		//     .attr("y1", visibleCourtLength - threePointCutoffLength)
		//     .attr("x2", courtWidth / 2 + threePointSideRadius * n)
		//     .attr("y2", visibleCourtLength);
		// });
		  
		// this.appendArcPath(base, restrictedCircleRadius, -1 * Math.PI/2, Math.PI/2)
		//   .attr('class', 'shot-chart-court-restricted-area')
		//   .attr("transform", "translate(" + (courtWidth / 2) + ", " + 
		//     (visibleCourtLength - basketProtrusionLength - basketDiameter / 2) + ")");
														   
		// this.appendArcPath(base, freeThrowCircleRadius, -1 * Math.PI/2, Math.PI/2)
		//   .attr('class', 'shot-chart-court-ft-circle-top')
		//   .attr("transform", "translate(" + (courtWidth / 2) + ", " + 
		//     (visibleCourtLength - freeThrowLineLength) + ")");
															
		// this.appendArcPath(base, freeThrowCircleRadius, Math.PI/2, 1.5 * Math.PI)
		//   .attr('class', 'shot-chart-court-ft-circle-bottom')
		//   .attr("transform", "translate(" + (courtWidth / 2) + ", " + 
		//     (visibleCourtLength - freeThrowLineLength) + ")");
  
		// [7, 8, 11, 14].forEach(function (mark) {
		//   [1, -1].forEach(function (n) {
		//     base.append("line")
		//       .attr('class', 'shot-chart-court-key-mark')
		//       .attr("x1", courtWidth / 2 + keyWidth / 2 * n + keyMarkWidth * n)
		//       .attr("y1", visibleCourtLength - mark)
		//       .attr("x2", courtWidth / 2 + keyWidth / 2 * n)
		//       .attr("y2", visibleCourtLength - mark)
		//   });
		// });    
  
		// base.append("line")
		//   .attr('class', 'shot-chart-court-backboard')
		//   .attr("x1", courtWidth / 2 - basketWidth / 2)
		//   .attr("y1", visibleCourtLength - basketProtrusionLength)
		//   .attr("x2", courtWidth / 2 + basketWidth / 2)
		//   .attr("y2", visibleCourtLength - basketProtrusionLength)
									   
		// base.append("circle")
		//   .attr('class', 'shot-chart-court-hoop')
		//   .attr("cx", courtWidth / 2)
		//   .attr("cy", visibleCourtLength - basketProtrusionLength - basketDiameter / 2)
		//   .attr("r", basketDiameter / 2)
	  },
  
	  // add title to svg
	  drawTitle: function () {
		this.base.append("text")
		  .classed('shot-chart-title', true)
		  .attr("x", (this._courtWidth / 2))             
		  .attr("y", (this._courtLength / 2 - this._visibleCourtLength) / 3)
		  .attr("text-anchor", "middle")  
		  .text(this._title);
	  },
  
	  // add legends to svg
	  drawLegend: function () {
		var courtWidth = this._courtWidth,
			visibleCourtLength = this._visibleCourtLength,
			heatScale = this._heatScale,
			hexagonRadiusSizes = this._hexagonRadiusSizes,
			hexagonFillValue = this._hexagonFillValue,
			keyWidth = this._keyWidth,
			basketProtrusionLength = this._basketProtrusionLength;
  
		var heatRange = heatScale.range();
		var largestHexagonRadius = hexagonRadiusSizes[hexagonRadiusSizes.length - 1];
		var colorXMid = courtWidth - 
		  (threePointSideRadius - keyWidth / 2) / 2 - 
		  (courtWidth / 2 - threePointSideRadius);
		var colorXStart = colorXMid - (heatRange.length * largestHexagonRadius); 
		var colorYStart = visibleCourtLength - basketProtrusionLength/3;
		var hexbin = d3.hexbin();
		var hexagon = hexbin.hexagon(largestHexagonRadius);
		var colorLegend = this.base.append('g')
		  .classed('legend', true);
		colorLegend.append("text")
		  .classed('legend-title', true)
		  .attr("x", colorXMid)             
		  .attr("y", colorYStart - largestHexagonRadius * 2)
		  .attr("text-anchor", "middle")  
		  .text(this._colorLegendTitle);
		colorLegend.append("text")
		  .attr("x", colorXStart)             
		  .attr("y", colorYStart)
		  .attr("text-anchor", "end")  
		  .text(this._colorLegendStartLabel); 
		colorLegend.append("text")
		  .attr("x", colorXStart + heatRange.length * 2 * largestHexagonRadius)             
		  .attr("y", colorYStart)
		  .attr("text-anchor", "start")  
		  .text(this._colorLegendEndLabel);  
		colorLegend.selectAll('path').data(heatRange)
		  .enter()
			.append('path')
			  .attr('d', hexagon)
			  .attr("transform", function (d, i) {
				return "translate(" + 
				  (colorXStart + ((1 + i*2) *largestHexagonRadius)) + ", " + 
				  (colorYStart) + ")";
			  })
			  .style('fill', function (d, i) { return d; });
  
		
		var sizeRange = hexagonRadiusSizes.slice(-3);
		var sizeLengendWidth = 0;
		for (var i = 0, l = sizeRange.length; i < l; ++i) {
		  sizeLengendWidth += sizeRange[i] * 2;
		}
		var sizeXMid = (threePointSideRadius - keyWidth / 2) / 2 + 
		  (courtWidth / 2 - threePointSideRadius);
		var sizeXStart = sizeXMid - (sizeLengendWidth / 2);
		var sizeYStart = visibleCourtLength - basketProtrusionLength/3;
		var sizeLegend = this.base.append('g')
		  .classed('legend', true);
		sizeLegend.append("text")
		  .classed('legend-title', true)
		  .attr("x", sizeXMid)             
		  .attr("y", sizeYStart - largestHexagonRadius * 2)
		  .attr("text-anchor", "middle")  
		  .text(this._sizeLegendTitle);
		sizeLegend.append("text")
		  .attr("x", sizeXStart)             
		  .attr("y", sizeYStart)
		  .attr("text-anchor", "end")  
		  .text(this._sizeLegendSmallLabel);
		sizeLegend.selectAll('path').data(sizeRange)
		  .enter()
			.append('path')
			  .attr('d', function (d) { return hexbin.hexagon(d); })
			  .attr("transform", function (d, i) {
				sizeXStart += d * 2;
				return "translate(" + 
				  (sizeXStart - d) + ", " + 
				  sizeYStart + ")";
			  })
			  .style('fill', '#999');
		sizeLegend.append("text")
		  .attr("x", sizeXStart)
		  .attr("y", sizeYStart)
		  .attr("text-anchor", "start")  
		  .text(this._sizeLegendLargeLabel); 
	  },
  
	  // draw hexagons on court
	  drawShots: function () {
		var courtWidth = this._courtWidth,
			visibleCourtLength = this._visibleCourtLength,
			hexagonRadius = this._hexagonRadius,
			heatScale = this._heatScale,
			hexagonBinVisibleThreshold = this._hexagonBinVisibleThreshold,
			hexagonRadiusThreshold = this._hexagonRadiusThreshold,
			hexagonRadiusSizes = this._hexagonRadiusSizes,
			hexagonRadiusValue = this._hexagonRadiusValue,
			hexagonFillValue = this._hexagonFillValue,
			radiusScale;
  
		// bin all shots into hexagons 
		var hexbin = d3.hexbin()
		  .size([courtWidth, visibleCourtLength])
		  .radius(hexagonRadius)
		  .x(this._translateX.bind(this))
		  .y(this._translateY.bind(this))
		  .bin(this._hexagonBin);
  
		// create layerBase
		var layerBase = this.base.append('g');
			 
		// append clip to prevent showing data outside range
		clipCounter += 1;
		var clipId = 'bbs-clip-' + clipCounter; 
		layerBase.append('clipPath')
		  .attr('id', clipId)
		  .append("rect")
			.attr("class", "shot-chart-mesh")
			.attr("width", courtWidth)
			.attr("height", visibleCourtLength);
			 
		// add layer
		this.layer('hexagons', layerBase, {
  
		  dataBind: function (data) {
			// subset bins to ones that meet threshold parameters
			var allHexbinPoints = hexbin(data);
			var hexbinPoints = [];
			var hexbinQuantities = [];
			for (var i = 0, l = allHexbinPoints.length; i < l; ++i) {
			  var pts = allHexbinPoints[i];
			  var numPts = 0;
			  for (var j = 0, jl = pts.length; j < jl; ++j) {
				numPts += pts[j].attempts || 1;
			  }
			  if (numPts > hexagonBinVisibleThreshold) hexbinPoints.push(pts);
			  if (numPts > hexagonRadiusThreshold) hexbinQuantities.push(numPts);
			}
  
			// create radius scale
			radiusScale = d3.scale.quantile()
			  .domain(hexbinQuantities)
			  .range(hexagonRadiusSizes)
  
			return this.append('g')
			  .attr('clip-path', 'url(#' + clipId + ')')
			  .selectAll('.hexagon')
				.data(hexbinPoints);
		  },
  
		  insert: function () {
			return this.append('path')
			  .classed('shot-chart-hexagon', true);
		  },
  
		  events: {
  
			enter: function () {
			  this.attr('transform', function(d) { 
				return "translate(" + d.x + "," + d.y + ")"; 
			  });
			},
  
			merge: function () {
			  this
				.attr('d', function(d) { 
				  var val = radiusScale(hexagonRadiusValue(d))
				  if (val > 0) return hexbin.hexagon(val); 
				})
				.style('fill', function(d) { 
				  return heatScale(hexagonFillValue(d)); 
				});
			},
  
			exit: function () {
			  this.remove();
			}
  
		  },
  
		});
			 
	  },
  
	  // redraw chart
	  redraw: function () {
		if (this.data) this.draw(this.data);
	  },
  
	  // on court length change, recalculate length of visible court
	  calculateVisibleCourtLength: function () {
		var halfCourtLength = this._courtLength / 2;
		var threePointLength = this._threePointRadius + 
		  this._basketProtrusionLength;
		this._visibleCourtLength = threePointLength + 
		  (halfCourtLength - threePointLength) / 2;
	  },
   
	});
  
	d3.chart.initializeDefaults(BasketballShotChart, {
	  // basketball hoop diameter (ft)
	  basketDiameter: 1.5,
	  // distance from baseline to backboard (ft)
	  basketProtrusionLength: 4,
	  // backboard width (ft)
	  basketWidth: 6,
	  // title of hexagon color legend
	  colorLegendTitle: 'Efficiency',
	  // label for starting of hexagon color range
	  colorLegendStartLabel: '< avg',
	  // label for ending of hexagon color range
	  colorLegendEndLabel: '> avg',
	  // full length of basketball court (ft)
	  courtLength: 94,
	  // full width of basketball court (ft)
	  courtWidth: 50,
	  // distance from baseline to free throw line (ft)
	  freeThrowLineLength: 19,
	  // radius of free throw line circle (ft)
	  freeThrowCircleRadius: 6,
	  // d3 scale for hexagon colors
	  heatScale: d3.scale.quantize()
		.domain([0, 1])
		.range(['#5458A2', '#6689BB', '#FADC97', '#F08460', '#B02B48']),
	  // height of svg
	  height: undefined,
	  // method of aggregating points into a bin
	  hexagonBin: function (point, bin) {
		var attempts = point.attempts || 1;
		var made = +point.made || 0;
		bin.attempts = (bin.attempts || 0) + attempts;
		bin.made = (bin.made || 0) + made;
	  },
	  // how many points does a bin need to be visualized
	  hexagonBinVisibleThreshold: 1,
	  // method to determine value to be used with specified heatScale
	  hexagonFillValue: function(d) {  return d.made/d.attempts; },
	  // bin size with regards to courth width/height (ft)
	  hexagonRadius: .75,
	  // discrete hexagon size values that radius value is mapped to
	  hexagonRadiusSizes: [0, .4, .6, .75],
	  // how many points in a bin to consider it while building radius scale
	  hexagonRadiusThreshold: 2,
	  // method to determine radius value to be used in radius scale
	  hexagonRadiusValue: function (d) { return d.attempts; },
	  // width of key marks (dashes on side of the paint) (ft)
	  keyMarkWidth: .5,
	  // width the key (paint) (ft)
	  keyWidth: 16,
	  // radius of restricted circle (ft)
	  restrictedCircleRadius: 4,
	  // title of hexagon size legend
	  sizeLegendTitle: 'Frequency',
	  // label of start of hexagon size legend
	  sizeLegendSmallLabel: 'low',
	  // label of end of hexagon size legend
	  sizeLegendLargeLabel: 'high',
	  // distance from baseline where three point line because circular (ft)
	  threePointCutoffLength: 14,
	  // distance of three point line from basket (ft)
	  threePointRadius: 23.75,
	  // distance of corner three point line from basket (ft)
	  threePointSideRadius: 22, 
	  // title of chart
	  title: 'Shot chart',
	  // method to determine x position of a bin on the court
	  translateX: function (d) { return d.x; },
	  // method to determine y position of a bin on the court
	  translateY: function (d) { return this._visibleCourtLength - d.y; },
	  // width of svg
	  width: 500,
	});
  
})()
