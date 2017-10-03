/**
 * Core Module
 * Required scope vars: {APP}
 * @module Core
 */

export default {

	/**
	 * @property modules
	 * @type {Object}
	 */
	modules : {},

	/**
	 * @property dateFormat - Server Date format
	 * @type {String}
	 */
	dateFormat : "YYYY-MM-DD HH:mm:ss",

	/**
	 * @property timeout - XHR Max Timeout (seconds)
	 * @type {Int}
	 */
	timeout : 30000,

	/**
	 * @property flashAlerts
	 * @type {Array}
	 */
	flashAlerts : [],

	//++ Methods ++

	/**
	* Set modules automatically for require function
	* @method setModules
	* @param {Array} modules - The required modules
	*/
	setModules(modules = []) {

		if (!modules.length)
			return;

		for (let i = 0; i < modules.length; i++) {

			let mod = modules[i];

			if (typeof mod.name != "undefined")
				this.modules[mod.name] = mod;
		}
	},

	/**
	 * Starter, if module has a viewModel binds it to DOM automatically
	 * @method start
	 * @param {Array} - The modules array
	 */
	start(modules = []) {

		console.log("Core -> Starting");

		//Check that App Global scope vars are defined
		if (typeof APP == "undefined")
			throw new Error("Core -> APP global scoped var is not defined!");

		let mod_name, mod, data;

		//1) call inits
		for (mod_name in modules) {

			//check module exists
			if (_.isUndefined(this.modules[mod_name])) {
				console.warn("Core -> Attempting to load an undefined module (" + mod_name + ").");
				continue;
			}

			//get module
			mod  = this.modules[mod_name];
			data = modules[mod_name];

			//check if module has init method & call it
			if (_.isFunction(mod.init))
				mod.init(data);
		}

		//2) load viewModels
		for (mod_name in modules) {

			//check module exists
			if (_.isUndefined(this.modules[mod_name]))
				continue;

			//get module
			mod = this.modules[mod_name];

			//bind model to DOM?
			if (!_.isObject(mod.vm))
				continue;

			if(typeof Vue == "undefined")
				return console.warn("Core -> Vue has not loaded!");

			console.log("Core -> New Vue instance for module: " + mod_name, mod.vm);

			//set new Vue instance (object prop updated)
			mod.vm = new Vue(mod.vm);
		}

		//3) load UI
		this.loadUI();
	},

	/**
	 * Core load UI, called automatically after loading modules.
	 * @method loadUI
	 */
	loadUI() {

		//load fast click for mobile
		if (!_.isNil(APP.UA) && APP.UA.isMobile)
			FastClick.attach(document.body);

		//load UI module
		if (!_.isUndefined(this.modules.ui))
			this.modules.ui.init();

		//look for server flash messages
		this.setFlashAlerts();

		//css async loading
		if(!_.isNil(APP.cssLazy) && APP.cssLazy) {

			console.log("Core -> Loading CSS file (async)", APP.cssLazy);
			loadCSS(APP.cssLazy);
		}
	},

	/**
	* Helper Get BaseUrl
	* @method baseUrl
	* @param  {String} uri - Append URI if defined
	* @return string
	*/
	baseUrl(uri = "") {

		return APP.baseUrl + uri;
	},

	/**
	* Helper Get StaticUrl
	* @method staticUrl
	* @param  {String} uri - Append URI if defined
	* @return string
	*/
	staticUrl(uri = "") {

		return APP.staticUrl + uri;
	},

	/**
	 * Ajax request with response handler.
	 * @method ajaxRequest
	 * @param  {Object} request - Axios request object
	 * @param  {Object} form - The form HTML object
	 * @param  {Object} csrf - Append APP.UA CRSF token key & value
	 * @return {Object} promise
	 */
	ajaxRequest(request = null, form = null, csrf = true) {

		//validation, request is required
		if (_.isNull(request))
			throw new Error("Core -> ajaxRequest: invalid input request object");

		//define payload
		let payload    = {},
			submit_btn = null;

		//check form element has a form data-invalid attribute
		if (!_.isNull(form)) {

			//check for a non jquery object
			if (form instanceof jQuery === false)
				form = $(form);

			//form data to object
			$.each(form.serializeArray(), function() { payload[this.name] = this.value; });
			//disable submit button
			submit_btn = form.find('button[type="submit"]');

			if (submit_btn.length)
				submit_btn.prop("disabled", true);
		}

		//append CSRF token?
		if (csrf && request.method == "POST" && !_.isNil(APP.UA.tokenKey))
			payload[APP.UA.tokenKey] = APP.UA.token;

		//set options
		let options = _.assign({
			method   : "GET",
			timeout  : this.timeout,
			dataType : "json",
		}, request);

		//set payload
		options.data = _.assign(payload, request.data);

		if(!_.isNil(options.uri))
			options.url = this.baseUrl(options.uri);

		let s = this;

		console.log("Core -> new xhr request", options);

		return $.ajax(options)
			.done(function(data) {

				//handle ajax response (error handling)
				let r = s.handleAjaxResponse(data);
				if (r || r.error)
					return r;

				return !_.isNil(data.payload) ? data.payload : data;
			})
			.fail(function(xhr, textStatus) {

				console.warn("Core -> xhr request failed", xhr);
				return s.getAjaxError(xhr, textStatus);
			}).
			always(function() {

				//re-enable button?
				if (submit_btn)
					submit_btn.prop("disabled", false);
			});
	},

	/**
	 * Ajax Response Handler, checks if response has errors.
	 * Also can set event-callback function in case the response is an error.
	 * @method handleAjaxResponse
	 * @param  {Object} data - The response data object
	 */
	handleAjaxResponse(data) {

		console.log("Core -> handling xhr response: ", data);

		if (!_.isObject(data))
			return false;

		//check for response error
		if (data.status == "error")
			return this.getAjaxError(data.code, data.error);

		//redirection?
		if (!_.isNil(data.redirect)) {
			location.href = this.baseUrl(data.redirect);
			return true;
		}

		return false;
	},

	/**
	 * Ajax Error Response Handler
	 * @method getAjaxError
	 * @param  {Object} xhr - The response object
	 * @param  {String} err - The error string
	 */
	getAjaxError(xhr, err = "") {

		let msg  = false, log = "";
		let code = _.isObject(xhr) ? xhr.status : xhr;
		let text = _.isObject(xhr) ? xhr.responseText : xhr;

		//sever parse error
		if (err == "parsererror") {
			msg = APP.TRANS.ALERTS.INTERNAL_ERROR;
			log = "Core -> server parse error: " + text;
		}
		//timeout
		else if (err == "timeout" || code == 408) {
			msg = APP.TRANS.ALERTS.SERVER_TIMEOUT;
			log = "Core -> server timeout";
		}
		//400 bad request
		else if (code == 400) {
			msg = APP.TRANS.ALERTS.BAD_REQUEST;
			log = "Core -> server bad request: " + code;
		}
		//403 access forbidden
		else if (code == 403) {
			msg = APP.TRANS.ALERTS.ACCESS_FORBIDDEN;
			log = "Core -> server access forbidden: " + code;
		}
		//404 not found
		else if (code == 404) {
			msg = APP.TRANS.ALERTS.NOT_FOUND;
			log = "Core -> server request not found: " + code;
		}
		//method now allowed (invalid GET or POST method)
		else if (code == 405) {
			msg = APP.TRANS.ALERTS.NOT_FOUND;
			log = "Core -> server method now allowed: " + code;
		}
		//invalid CSRF token
		else if (code == 498) {
			msg = APP.TRANS.ALERTS.CSRF;
			log = "Core -> invalid CSRF server token: " + code;
		}
		else {
			msg = text;
			log = "Core -> server response error: " + text;
		}

		console.warn(log);

		return { code : code, error : msg };
	},

	/**
	 * Get URI parameter by name
	 * @method getQueryString
	 * @param {String} name - The parameter name
	 * @param {Boolean} url - Get from window URL by default
	 * @return {String}
	 */
	getQueryString(name, url = false) {

		if (!url)
			url = window.location.href;

		let regex   = new RegExp("[?&]" + name.replace(/[\[\]]/g, "\\$&") + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);

		if (!results)
			return null;

		if (!results[2])
			return "";

		return decodeURIComponent(results[2].replace(/\+/g, " "));
	},

	/**
	 * Get resized image path .
	 * @method resizedImagePath
	 * Example: `./media/dj/IMAGE1.jpg?v=5`
	 *          `./media/dj/IMAGE1_TH.jpg?v=5`
	 * @param  {String} url - An image URL
	 * @param  {String} key - The suffix key to append
	 * @return {String}
	 */
	resizedImagePath(url = "", key = "TN") {

		let regex   = /\.([0-9a-z]+)(?:[\?#]|$)/i,
			new_url = url.replace(regex, "_" + key + ".$1?");

		//remove single question marks
		if(new_url[new_url.length - 1] == "?")
			new_url = new_url.substring(0, new_url.length - 1);

		return new_url;
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

		let objects = [];

		//preload images
		for (let i = 0; i < indexes; i++) {
			//create new image object
			objects[i] = new Image();
			//if object has a '$' symbol replace with index
			objects[i].src = image_path.replace("$", (i+1));
		}

		return objects;
	},

	/**
	 * jQuery Ajax Handler for loading state
	 * @method newAjaxLoadingHandler
	 * @param  {ctx} ctx - The instance context for loading state
	 */
	setAjaxLoadingHandler(ctx) {

		let ajax_timer;
		//ajax handler, show loading if ajax takes more than a X secs, only for POST request
		let handler = (opts, set_loading) => {

			if (set_loading) {
				//clear timer
				clearTimeout(ajax_timer);
				//waiting time to show loading box
				ajax_timer = setTimeout(() => { ctx.isLoading = true; }, 1000);
				return;
			}
			//otherwise clear timer and hide loading
			clearTimeout(ajax_timer);
			ctx.isLoading = false;
		};

		//ajax events
		$(document)
		 .ajaxSend((e, xhr, opts)     => { handler(opts, true);  })
		 .ajaxError((e, xhr, opts)    => { handler(opts, false); })
		 .ajaxComplete((e, xhr, opts) => { handler(opts, false); });
	},

	/**
	 * Sets pending server flash messages (stored in session), loaded automatically.
	 * @method setFlashAlerts
	 */
	setFlashAlerts() {

		let messages = $("#app-flash");

		if (!messages.length)
			return;

		let s = this;
		messages.children("div").each(function() {

			s.flashAlerts.push({ content : $(this).html(), type : $(this).attr("class") });
		});
	}
};
