/**
 * Core UI Module
 * Required scope vars: {APP}
 * @module CoreUI
 */

const UI_DEFAULTS = {
    //selectors
    sel_app            : "#app",
    sel_header         : "#app-header",
    sel_footer         : "#app-footer",
    sel_content        : "#app-content",
    sel_loading_box    : "#app-loading",
    sel_flash_messages : "#app-flash",
    sel_alert_box      : "div.app-alert",
    sel_tooltips       : '[data-toggle="tooltip"]',
    //setting vars
    alert              : { position : "fixed", top : "5%", top_small : "0", live_time : 8000 },
    loading            : { position : "fixed", top : "25%", top_small : "25%" },
    pixel_ratio        : _.isUndefined(window.devicePixelRatio) ? 1 : window.devicePixelRatio,
    show_flash_alerts  : true
};

export default {

    /**
     * Initializer
     * @method init
     */
    init() {
        
        // set app UI data for selectors
        APP.UI = UI_DEFAULTS;
        
        // append conf
        if(!_.isNil(core.modules.ui) && _.isFunction(core.modules.ui.conf))
            _.assign(APP.UI, core.modules.ui.conf());

        //load UI module
        if (!_.isUndefined(core.modules.ui))
            core.modules.ui.init();

        //ajax setup
        this.setAjaxLoadingHandler();
        //load images, apply retina & fallback
        this.loadImages();
        this.retinaImages();
        this.fallbackImages();
        //check server flash messages
        this.showFlashAlerts();

        //tooltips
        if(core.framework == "bootstrap")
            this.loadTooltips();
    },

    /**
     * jQuery Ajax Handler, loaded automatically.
     * @method setAjaxLoadingHandler
     */
    setAjaxLoadingHandler() {

        //this vars must be declared outside ajaxHandler function
        var ajax_timer;
        var app_loading = this.showLoading(null, true); //hide by default

        //ajax handler, show loading if ajax takes more than a X secs, only for POST request
        var handler = function(opts, show_loading) {

            //only for POST request
            if (opts.type.toUpperCase() != "POST")
                return;

            //show loading?
            if (show_loading) {
                //clear timer
                clearTimeout(ajax_timer);
                //waiting time to show loading box
                ajax_timer = setTimeout(function() { app_loading.show("fast"); }, 1000);
                return;
            }
            //otherwise clear timer and hide loading
            clearTimeout(ajax_timer);
            app_loading.fadeOut("fast");
        };

        //ajax events
        $(document)
         .ajaxError(function(e, xhr, opts)    { handler(opts, false); })
         .ajaxSend(function(e, xhr, opts)     { handler(opts, true);  })
         .ajaxComplete(function(e, xhr, opts) { handler(opts, false); });
    },

    /**
     * App post-action message alerts.
     * @method showAlert
     * @param  {String} payload - The payload content
     * @param  {String} type - The Message type [success, warning, info, alert]
     * @param  {Function} on_close - The onClose callback function (optional).
     * @param  {Function} on_click - The onClick callback function (optional).
     * @param  {Boolean} autohide - Autohides the alert after 8 seconds (optional).
     */
    showAlert(payload = "", type = "info", on_close, on_click, autohide = true) {

        //set alert types
        var types = ["success", "warning", "info", "alert", "secondary"];

        if (_.indexOf(types, type) === -1)
            type = "info";

        let wrapper_class = APP.UI.sel_alert_box.replace("div.", "");
        let id_class      = _.uniqueId(wrapper_class); //unique ID

        //create elements and set classes
        var div_alert    = $("<div data-alert>").addClass(wrapper_class + " " + id_class + " alert-box " + type);
        var div_holder   = $("<div>").addClass("holder");
        var div_content  = $("<div>").addClass("content");
        var anchor_close = $("<a>").attr("href", "javascript:void(0)").addClass("close").html("&times");
        var span_text    = $("<span>").addClass("text").html(payload);
        var span_icon    = $("<span>").addClass("icon-wrapper").html("<i class='icon-"+type+"'></i>");
         //append elements
        div_alert.append(div_holder);
        div_holder
            .append(div_content)
            .append(anchor_close);
        div_content
            .append(span_icon)
            .append(span_text);
        //css style
        div_alert.css("z-index", 99999);
        //set block property
        div_alert.alive = true;

        //SHOW alert appending to body
        $("body").append(div_alert);

        var s = this;
        //center object after appended to body, special case for mobile
        var center_object = function() {

            //special case for mobile
            if (s.checkWindowSize("small")) {

                div_alert.addClass("small-screen").center(APP.UI.alert.position, APP.UI.alert.top_small);
                return;
            }

            //normal screens
            var top_value = APP.UI.alert.top;
            //special cases
            if (top_value == "belowHeader") {

                var header = $(APP.UI.sel_header);
                top_value  = header.length ? header.position().top + header.outerHeight() : "0";
            }

            //set CSS position x,y
            div_alert.center(APP.UI.alert.position, top_value);
        };
        //call method
        center_object();
        //set center event on window resize
        $(window).resize(function() { center_object(); });
        //remove presents alerts
        $(APP.UI.sel_alert_box).not("div." + id_class).fadeOut("fast");

        var hide_alert = function() {

            if(!div_alert.alive)
                return;

            // bind onClose function if defined
            if (_.isFunction(on_close))
                on_close();

            if (!autohide)
                return;

            div_alert.alive = false;
            div_alert.fadeOut("fast", function() { $(this).remove(); });
        };

        //set anchor close click event
        anchor_close.click(hide_alert);

        // bind onClick function if defined
        if (_.isFunction(on_click)) {

            // add click-able cursor & oneclick event
            div_alert
                .css("cursor", "pointer")
                .one("click", function() {
                    //callback function & hide alert
                    on_click();
                    hide_alert();
                });
        }

        //autoclose after x seconds
        _.delay(() => { hide_alert(); }, APP.UI.alert.live_time);

        return true;
    },

    /**
     * Prints pending server flash messages (stored in session), loaded automatically.
     * @method showFlashAlerts
     */
    showFlashAlerts() {

        //check for a flash message pending
        if (!APP.UI.show_flash_alerts || !$(APP.UI.sel_flash_messages).length)
            return;

        var messages = $(APP.UI.sel_flash_messages).children("div");

        if (!messages.length)
            return;

        var s = this;
        messages.each(function() {
            //set a delay to show once at a time
            var html = $(this).html();
            var type = $(this).attr("class");
            //show message
            if (html.length)
                s.showAlert(html, type);
        });

        return true;
    },

    /**
     * Display a loading alert message.
     * @method showLoading
     * @param  {String} Text - Optional text.
     * @param  {Boolean} hidden - Forces the loading element to be hidden.
     * @return {Object} A jQuery object element
     */
    showLoading(text = null, hidden = false) {

        //set loading object selector
        var loading_obj = $(APP.UI.sel_loading_box);

        //create loading object?
        if (!loading_obj.length) {

            //create object and append to body
            let div_loading = $("<div>").attr("id", APP.UI.sel_loading_box.replace("#",""));

            //append to body
            $("body").append(div_loading);
            //re-asign  var
            loading_obj = $(APP.UI.sel_loading_box);
        }

        //add special behavior for small screen
        if (this.checkWindowSize("small"))
            loading_obj.addClass("small-screen");

		//set content
        let content = _.isNull(text) ? APP.TRANS.ALERTS.LOADING : text;
        loading_obj.html(content);

        let top = this.checkWindowSize("small") ? APP.UI.loading.top_small : APP.UI.loading.top;

        if (!_.isUndefined(APP.UI.loading.center) && APP.UI.loading.center)
            loading_obj.center(APP.UI.loading.position, top);

        //dont show for hidden flag (debug only)
        if (!hidden)
            loading_obj.show("fast");

        return loading_obj;
    },

    /**
     * Hides loading message
     * @method hideLoading
     */
    hideLoading() {

        //set loading object selector
        $(APP.UI.sel_loading_box).fadeOut("fast");
    },

    /**
     * Creates a new modal object
     * @method newModal
     * @param {Object} element - The jQuery element object
     * @param {Object} options - Widget options
     */
    newModal(element, options = {}) {

        //new foundation modal
        if (core.framework == "foundation") {

            element.foundation("open");
        }
        //new bootstrap modal
        else if (core.framework == "bootstrap") {

            element.modal(options);
        }
    },

    /**
     * Hides a crated modal
     * @method hideModal
     * @param  {object} element - The jquery element
     */
    hideModal(element) {

        //new foundation modal
        if (core.framework == "foundation") {

            element.foundation("close");
        }
        //new bootstrap modal
        else if (core.framework == "bootstrap") {

            element.modal("hide");
        }
    },

    /**
     * Creates a new dialog object
     * @method newDialog
     * @param {Object} element - The jQuery element object
     * @param {Object} options - Widget options
     */
    newDialog(options) {

        $.ccdialog(options);
    },

    /**
     * Creates a new layer object
     * @method newLayer
     * @param {Object} element - The jQuery element object
     * @param {Object} options - Widget options
     */
    newLayer(element, options) {

        element.cclayer(options);
    },

    /**
     * Closes cclayer dialog
     * @method isOverlayVisible
     */
    isOverlayVisible() {

        return $.cclayer.isVisible();
    },

    /**
     * Hides cclayer
     * @method hideLayer
     */
    hideLayer() {

        $.cclayer.close();
    },

    /**
     * Hides cclayer dialog
     * @method hideDialog
     */
    hideDialog() {

        this.hideLayer();
    },

    /**
     * Validates screen size is equal to given size.
     * @TODO: check screen size with Bootstrap
     * @method checkWindowSize
     * @param  {String} size - The Screen size: small, medium, large.
     * @return {Boolean}
     */
    checkWindowSize(size) {

        //foundation
        if (core.framework == "foundation") {
            return size == Foundation.MediaQuery.current;
        }
        //bootstrap
        else if (core.framework == "bootstrap") {

            var envs = ["xs", "sm", "md", "lg"];
            var env = "";

            var $el = $("<div>");
            $el.appendTo($("body"));

            for (var i = envs.length - 1; i >= 0; i--) {
                env = envs[i];
                $el.addClass("hidden-" + env + "-up");

                if ($el.is(":hidden"))
                    break;
            }
            $el.remove();

            return size == env;
        }
        //listener on core modules ui [onCheckWindowSize]
        else if(!_.isNil(core.modules.ui) && _.isFunction(core.modules.ui.onCheckWindowSize)) {

            return core.modules.ui.onCheckWindowSize(size);
        }

        return false;
    },

    /**
     * Async loding image
     * @method loadImages
     * @param  {Object} context - A jQuery element context (optional)
     */
    loadImages(context = false) {

        var objects = !context ? $("img[data-loader]", context) : $("img[data-loader]");

        objects.each(function() {

            var obj = $(this);
            var img = new Image();

            img.onload = function() {

                //set dimensions
                if(obj[0].hasAttribute("data-width"))
                    obj.attr("width", obj.attr("data-width"));

                if(obj[0].hasAttribute("data-height"))
                    obj.attr("height", obj.attr("data-height"));

                //set new src
                obj[0].src = this.src;

                console.log("Core UI -> image loaded (async):", this.src);
            };

            //trigger download
            img.src = obj.attr("data-loader");
        });
    },

    /**
     * Image preloader, returns an array with image paths [token replaced: "$"]
     * @method preloadImages
     * @param  {String} image_path - The source path
     * @param  {Int} indexes - The indexes, example: image1.png, image2.png, ...
     * @return {Array} The image object array
     */
    preloadImages(image_path, indexes) {

        if (_.isUndefined(indexes) || indexes === 0)
            indexes = 1;

        var objects = [];

        //preload images
        for (var i = 0; i < indexes; i++) {
            //create new image object
            objects[i] = new Image();
            //if object has a '$' symbol replace with index
            objects[i].src = image_path.replace("$", (i+1));
        }

        return objects;
    },

    /**
     * Toggle Retina Images for supported platforms.
     * @method retinaImages
     * @param  {Object} context - A jQuery element context (optional)
     */
    retinaImages(context = false) {

        if (!this.isRetina()) return;

        //get elements
        var elements = !context ? $("img[data-retina]", context) : $("img[data-retina]");

        var s = this;
        //for each image with attr data-retina
        elements.each(function() {

            var obj     = $(this);
            var new_src = s.retinaImagePath(obj.attr("src"), true);

            obj.removeAttr("data-retina")
               .attr("src", new_src);
        });
    },

    /**
     * checks if display is retina
     * @method isRetina
     * @return {Boolean}
     */
    isRetina() {

        let media_query = "(-webkit-min-device-pixel-ratio: 1.5), (min--moz-device-pixel-ratio: 1.5), (-o-min-device-pixel-ratio: 3/2), (min-resolution: 1.5dppx)";

        if (window.devicePixelRatio > 1)
            return true;

        if (window.matchMedia && window.matchMedia(media_query).matches)
            return true;

        return false;
    },

    /**
     * Fallback for images that failed loading.
     * @method fallbackImages
     * @param  {Object} context - A jQuery element context (optional)
     */
    fallbackImages(context = false) {

        var objects = !context ? $("img[data-fallback]", context) : $("img[data-fallback]");

        objects.on("error", function() {

            console.log("Core UI -> failed loading image:", $(this).attr("src"));

            $(this).attr("src", core.staticUrl(APP.UI.img_fallback));
        });
    },

	/**
	 * Return retina image path for URLs
	 * @method retinaImagePath
	 */
	retinaImagePath(url = "", force = false) {

        if(!force && !this.isRetina())
            return url;

        var ext = url.slice(-4);

        //check extension
        if(!force && ext != ".png" && ext != ".jpg")
            return url;

        return url.replace(ext, "@2x"+ext);
	},

    /**
     * Get resized image path.
     * @method resizedImagePath
     * Example: ./media/dj/IMAGE1.jpg?v=5
     *          ./media/dj/IMAGE1_TH.jpg?v=5
     * @param  {string} url - An image URL
     * @param  {string} key - The suffix key to append
     * @return string
     */
    resizedImagePath(url = "", key = "TN") {

        var regex   = /\.([0-9a-z]+)(?:[\?#]|$)/i;
        var new_url = url.replace(regex, "_" + key + ".$1?");

        //remove single question marks
        if(new_url[new_url.length - 1] == "?")
            new_url = new_url.substring(0, new_url.length - 1);

        return new_url;
    },

    /**
     * Load Bootstrap tooltips
     * @method loadTooltips
     */
    loadTooltips() {

        if(APP.UI.sel_tooltips.length)
            $(APP.UI.sel_tooltips).tooltip();
    }
};
