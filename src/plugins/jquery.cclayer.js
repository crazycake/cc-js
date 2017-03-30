/**
 * cclayer jQuery plugin v 1.1
 * Requires jQuery 1.7.x or superior
 * Supports mayor browsers including IE9
 * @author Nicolas Pulido M.
 * Usage:
 * $(element).cclayer({
		fixed        : (boolean) present a fixed element?
		overlay      : (boolean) set an overlay?
		overlayColor : (string) overlay bg color
		top          : (int) css top value set as percentage
		bottom       : (int) css bottom value set as percentage (optional)
		left         : (int) css left value set as percentage
		right        : (int) css right value set as percentage (optional)
		onShow       : (function) event onShow
		onClose      : (function) event onClose
		onShowAnim   : (function) event onShowAnim, custom Show animation
		onCloseAnim  : (function) event onCloseAnim, custom Close animation
		zindex       : (int) css z-index value, default value is 100.
		escape 		 : (boolean) Allows user to escape the modal with ESC key or a Click outside the element. Defaults is true.
	});
 */

(function($) {

	/** ------------------------------------------------------------------------------------------------
		cclayer public methods
	------------------------------------------------------------------------------------------------ **/
	$.cclayer = function() {};

	/**
	 * Closes cclayer
	 */
	$.cclayer.close = function() {

		if (!$("div.cclayer-overlay").length)
			return;

		$("div.cclayer-overlay").trigger("click");
		return;
	};

	/**
	 * Returns boolean if cclayer is active or not
	 */
	$.cclayer.isVisible = function() {
		return $("div.cclayer-overlay").length ? true : false;
	};

	/** ------------------------------------------------------------------------------------------------
		cclayer element
	------------------------------------------------------------------------------------------------ **/
	$.fn.cclayer = function(options) {
		//get context
		var self = $(this);
		return $.fn.cclayer.core.init(options, self);
	};

	//DEFAULT VALUES
	$.fn.cclayer.defaults = {
		fixed        : false,
		overlay      : true,
		overlayColor : "rgba(0, 0, 0, 0.9)",
		top          : 50,
		left         : 50,
		bottom       : null,
		right        : null,
		onShow       : null,
		onClose      : null,
		onShowAnim   : null,
		onCloseAnim  : null,
		zindex       : 9999,
		escape       : true
	};

	//CORE
	$.fn.cclayer.core = {

		init: function(options, el) {
			//extend options
			this.opts = $.extend({}, $.fn.cclayer.defaults, options);
			//check if cclayer was already invoked
			if ($("div.cclayer-overlay").length || el.is(":visible"))
				return;

			//make and show
			this.make(this.opts, el);
			this.show(this.opts, el);

			return this;
		},
		make: function(options, el) {

			var self = this;
			//drop any overlay created before
			self.drop();

			//overlay div
			var div_overlay = $("<div>").addClass("cclayer-overlay");

			//check if object is present in DOM (auto-append)
			if(!el.length)
				el.appendTo("body");

			//OVERLAY CSS
			if (options.overlay) {

				var doc_height = $(document).height();

				if (doc_height < $(window).height())
					doc_height = "100%";
				else
					doc_height += "px";

				div_overlay.css({
					"display"    : "none",
					"position"   : "fixed",
					"top"        : "0",
					"left"       : "0",
					"width"      : "100%",
					"height"     : doc_height,
					"background" : options.overlayColor,
					"z-index"    : options.zindex
				});
			}

			//positioning element to display
			var css_pos  	 = "absolute";
			var css_x 	 	 = "0";
			var css_y 	     = "0";
			var css_margin_x = 0;
			var css_margin_y = 0;

			var x     = options.left;
			var xRule = "left";

			if (options.right !== null) {
				x     = options.right;
				xRule = "right";
			}

			var y     = options.top;
			var yRule = "top";

			if (options.bottom !== null) {
				y     = options.bottom;
				yRule = "bottom";
			}

			//get element width & height
			var elem_width  = el.width();
			var elem_height = el.height();

			//FIXED position
			if (options.fixed) {
				css_pos = "fixed";
				//set css position props
				css_x = x + "%";
				css_y = y + "%";

				css_margin_x = -(elem_width / (100/x)) + "px";
				css_margin_y = -(elem_height / (100/y)) + "px";
			}
			//ABSOLUTE position
			else {
				//set css position props
				css_x = (Math.max($(window).width() - elem_width, 0)/(100/x)) + $(window).scrollLeft();
				css_y = (Math.max($(window).height() - elem_height, 0)/(100/y)) + $(window).scrollTop();
			}

			//set css props
			el.css({
				"position" : css_pos,
				"z-index"  : (options.zindex + 1)
			})
			//dynamic props
			.css(xRule, css_x)
			.css(yRule, css_y)
			.css("margin-"+xRule, css_margin_x)
			.css("margin-"+yRule, css_margin_y);

			/** -- EVENTS -- **/
			//force escape?
			if (options.escape) {
				//onClick event
				div_overlay.one("click", function() {
					//close action
					self.close(options, el);
				});

				//onKeyUp event for ESC key
				$(document).one("keyup", function(e) {
					//prevent any binding action
					e.preventDefault();
					e.stopPropagation();

					//ENTER or ESC key
					if (e.keyCode == 27) {
						self.close(options, el);
					}
				});
			}
			else {
				div_overlay.off("click");
			}

			//add "destroyed" event handler for "onClose" param
			if (typeof options.onClose == "function")
				div_overlay.on("destroyed", options.onClose);

			//finally append to body
			div_overlay.appendTo("body");
		},
		drop: function() {
			//removes an existing dialog
			if ($("div.cclayer-overlay").length)
				$("div.cclayer-overlay").remove();
		},
		show: function(options, el) {

			//if fixed, disable html,body scroll
			if (options.fixed) {
				$("html").css("overflow","hidden");
				$("body").css("position","relative");
			}

			//show overlay and element
			$("div.cclayer-overlay").fadeIn("fast");

			//blur focus on anchors, inputs & buttons
			$("a").blur();
			$("input").blur();
			$("button").blur();

			//show with defined animation?
			if (typeof options.onShowAnim == "function")
				options.onShowAnim();
			else
				el.fadeIn("fast");

			//call onShow function if set
			if (typeof options.onShow == "function")
				options.onShow();
		},
		close: function(options, el) {

			//close with defined animation?
			if (typeof options.onCloseAnim == "function")
				options.onCloseAnim();
			else
				el.hide();

			//modal close
			$("div.cclayer-overlay").fadeOut();

			//enable back scroll
			if (options.fixed) {
				$("html").css("overflow", "visible");
				$("body").css("position", "static");
			}

			//delete the overlay
			this.drop();
		}
	};
	/** ------------------------------------------------------------------------------------------------
		jQuery setup
	------------------------------------------------------------------------------------------------ **/
	//creating an event "destroyed"
	jQuery.event.special.destroyed = {
		remove: function(o) {

			if (o.handler)
				o.handler();
		}
	};

})(jQuery);
