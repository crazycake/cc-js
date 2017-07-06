/**
 * jQuery extended
 * Useful jQuery extensions
 * @author Nicolas Pulido <nicolas.pulido@crazycake.cl>
 */

/**
 * Centers an element with CSS position property
 * @method $.fn.center
 * @param {String} position - CSS position property: [fixed, absolute, static]
 * @param {Int} top - CSS top value
 * @param {Int} left - CSS left value
 * @return {Object}
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
 * @method $.fn.padding
 * @param  string direction - The padding CSS property: [top, bottom, left, right]. Defaults to left.
 * @return {Int}
 */
jQuery.fn.padding = function(direction) {

	if (typeof direction == "undefined")
		direction = "left";

	//returns int value
	return parseInt(this.css('padding-' + direction));
};

/**
 * Check if a jquery object (selector) exists in DOM
 * @method $.fn.exists
 * @return {Boolean}
 */
jQuery.fn.exists = function() {

	return this.length > 0;
};
