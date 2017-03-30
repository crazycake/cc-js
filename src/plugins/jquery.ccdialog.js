/**
 * ccdialog jQuery plugin v 1.0
 * Requires jQuery 1.7.x or superior, and cclayer plugin
 * Support IE9+
 * @author Nicolas Pulido M.
 * Usage:
 * $.ccdialog({
	title       : (string) the dialog title
	content     : (string) The dialog content, can be an HTML input
	width       : (int) width size in pixels or a string with an int + measure unit
	fixed       : (boolean) set if dialog has fixed or absolute position
	buttons     : (array) array of buttons with the following object struct:
					{ label : (string), click : (function) }
	onClose     : (function) event onClose dialog
	escape      : (boolean) Allows user to escape the modal with ESC key or a Click outside the element. Defaults is true.
	zindex      : (int) css z-index value, default value is 100.
	smallScreen : (int) small screen width Threshold, defaults value is 640.
});
 */

(function($) {

	if (typeof $.cclayer != "function")
		throw new Error('ccdialog: cclayer jQuery plugin is required');

	/** ------------------------------------------------------------------------------------------------
		cclayer public methods
	------------------------------------------------------------------------------------------------ **/
	$.ccdialog = function(options) {

		if (typeof options == "undefined")
			options = {};

		//returns the core object
		return $.ccdialog.core.init(options);
	};

	/**
	 * Closes cclayer
	 */
	$.ccdialog.close = function() {
		$.cclayer.close();
	};

	/** ------------------------------------------------------------------------------------------------
		cclayer element
	------------------------------------------------------------------------------------------------ **/

	//DEFAULT VALUES
	$.ccdialog.defaults = {
		title        : "",
		content      : "",
		width        : "60%",
		fixed        : false,
		overlay      : true,
		overlayColor : "rgba(0, 0, 0, 0.9)",
		buttons      : [],
		onClose      : null,
		escape       : true,
		zindex       : 9999,
		smallScreen  : 640
	};

	//CORE
	$.ccdialog.core = {

		init: function(options) {
			//extend options
			this.opts = $.extend({}, $.ccdialog.defaults, options);
			//drop a previously created dialog
			this.drop();
			this.create(this.opts);
			this.show(this.opts);

			return this;
		},
		create: function(options) {

			var self = this;
			//wrappers
			var div_wrapper = $("<div>").addClass("cclayer-dialog").css("display", "none");
			var div_box     = $("<div>").addClass("box");

			//contents
			var div_title  = $("<div>").addClass("header").html(options.title);
			var div_body   = $("<div>").addClass("body").html(options.content);
			var div_footer = $("<div>").addClass("footer");

			//appends
			div_wrapper.appendTo("body");
			div_box.appendTo(div_wrapper);
			div_title.appendTo(div_box);
			div_body.appendTo(div_box);

			//width
			div_wrapper.width(options.width);

			//fix width for small screens
			if ($(window).width() <= options.smallScreen && parseInt(options.width) < 80)
				div_wrapper.width("90%");

			//check if dialog must have buttons
			if (typeof options.buttons != "object")
				return;

			//append buttons?
			var show_footer = false;
			//loop through buttons
			var index = 0;
			for (var key in options.buttons) {

				var btn = options.buttons[key];

				if (typeof btn != "object" || typeof btn.label == "undefined")
					continue;

				var button_element = $("<button>")
										.attr("name", "button-"+index)
										.addClass("button-"+index)
										.html(btn.label);

				if (typeof btn.click == "function")
					button_element.click(btn.click);
				else
					button_element.click(self.close);

				button_element.appendTo(div_footer);

				show_footer = true;
				index++;
			}

			//footer append
			if (show_footer)
				div_footer.appendTo(div_box);
		},
		drop: function() {
			//removes an existing dialog
			if ($("div.cclayer-dialog").length)
				$("div.cclayer-dialog").remove();
		},
		show: function(options) {

			var fn_onclose = null;
			//check onClose function
			if (typeof options.onClose == "function")
				fn_onclose = options.onClose;

			//show modal
			$("div.cclayer-dialog").cclayer({
				fixed        : options.fixed,
				overlay      : options.overlay,
				overlayColor : options.overlayColor,
				escape       : options.escape,
				zindex       : options.zindex,
				onClose      : fn_onclose
			});
		},
		close: function() {
			//simpleModal - close
			$.cclayer.close();
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
