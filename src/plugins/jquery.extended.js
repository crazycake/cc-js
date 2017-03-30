/**
 * jQuery extended
 * Useful jQuery extensions
 * @author Nicolas Pulido <nicolas.pulido@crazycake.cl>
 * @version 1.0.0
 */

/**
 * Centers an element with CSS position property
 * @param  string position CSS position property: [fixed, absolute, static]
 * @param  int top CSS top value
 * @param  int left CSS left value
 * @return object
 */
jQuery.fn.center = function(position, top, left) {

	//set CSS position (fixed, absolute, static)
	if (typeof position == "undefined")
		this.css("position", "absolute");
	else
		this.css("position", position);

	var px_value = 0;

	//set x position
	if (typeof left == "undefined") {

		px_value = Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) + $(window).scrollLeft());
		this.css("left", px_value + "px");
	}
	else {
		this.css("left", left);
	}

	//set y position
	if (typeof top == "undefined") {

		px_value = Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) + $(window).scrollTop());
		this.css("top", px_value + "px");
	}
	else {
		this.css("top", top);
	}

	return this;
};

/**
 * Gets the padding value of an element.
 * @param  string direction The padding CSS property: [top, bottom, left, right]. Defaults to left.
 * @return int
 */
jQuery.fn.padding = function(direction) {

	if (typeof direction == "undefined")
		direction = "left";

	//returns int value
	return parseInt(this.css('padding-' + direction));
};

/**
 * Check if a jquery object (selector) exists in DOM
 * @return {boolean}
 */
jQuery.fn.exists = function() {

	return this.length > 0;
};
