/**
 * Core Module
 * Required scope vars: {APP}
 * @module Core
 */

import ui from "./core.ui.js";

export default {

	/**
	 * @property ui
	 * @type {Object}
	 */
	ui : ui,

	/**
	 * @property modules
	 * @type {Object}
	 */
	modules : {},

	/**
	 * @property framework ```foundation, bootstrap, pure```
	 * @type {String}
	 */
	framework : "pure",

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

	//++ Methods ++

	/**
	* Set modules automatically for require function
	* @method setModules
	* @param {Array} modules - The required modules
	*/
	setModules(modules = []) {

		if (!modules.length)
			return;

		for (var i = 0; i < modules.length; i++) {

			var mod = modules[i];

			if (typeof mod.name != "undefined")
				this.modules[mod.name] = mod;
		}
	},

	/**
	 * Starter, if module has a viewModel binds it to DOM automatically
	 * @method start
	 * @param {Array} modules
	 */
	start(modules = []) {

		console.debug("Core -> Starting");

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

			if(typeof Vue == "undefined") {
				console.warn("Core -> Vue has not loaded!");
				return;
			}

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

		//load UI framework?
		if (typeof Foundation != "undefined")
			this.initFoundation();
		else if (_.isFunction($().emulateTransitionEnd))
			this.initBootstrap();

		//load forms module
		if (!_.isUndefined(this.modules.forms))
			this.modules.forms.load();

		//load UI module
		this.ui.init();

		//css async loading
		if(!_.isUndefined(APP.cssLazy) && APP.cssLazy) {

			console.log("Core -> loading CSS file (async)", APP.cssLazy);
			loadCSS(APP.cssLazy);
		}
	},

	/**
	 * Foundation Initializer, loaded automatically.
	 * @method initFoundation
	 * @param {Object} element - The jQuery element, default is document object.
	 */
	initFoundation(element) {

		console.log("Core -> Initializing Foundation...");

		//check default element
		if (_.isUndefined(element))
			element = $(document);
		else if (element instanceof jQuery === false)
			element = $(element);

		//set framework
		this.framework = "foundation";
		//init foundation
		element.foundation();
	},

	/**
	 * Bootstrap Initializer, loaded automatically.
	 * @method initBootstrap
	 */
	initBootstrap() {

		console.log("Core -> Initializing Bootstrap...");

		//set framework
		this.framework = "bootstrap";
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
	 * Ajax request with auto form validation.
	 * @method ajaxRequest
	 * @param  {Object} request - A simple request object
	 * @param  {Object} form - The form HTML object
	 * @param  {Object} extended_data - An object to be extended as sending data (optional)
	 * @param  {Object} events - Alert Event handlers object
	 * @param  {Object} csrf - Append APP.UA CRSF token key & value
	 * @return {Object} promise
	 */
	ajaxRequest(request = null, form = null, extended_data = null, events = null, csrf = true) {

		//validation, request is required
		if (_.isNull(request))
			throw new Error("Core -> ajaxRequest: invalid request input object");

		//define payload
		var payload = {};
		var submit_btn;

		//check form element has a form data-invalid attribute
		if (!_.isNull(form)) {

			//check for a non jquery object
			if (form instanceof jQuery === false)
				form = $(form);

			//validate form
			if (!this.modules.forms.isValid(form))
				return P.resolve();

			//serialize data to URL encoding
			payload = form.serializeArray();
			//disable submit button
			submit_btn = form.find("button");

			if (submit_btn.length)
				submit_btn.attr("disabled","disabled");
		}

		//extend more data?
		if (_.isObject(extended_data)) {

			//check if element is null
			if (_.isNil(form))
				_.assign(payload, extended_data); //considerar objetos livianos (selectionDirection error)
			else
				payload.push({ name : "payload", value : JSON.stringify(extended_data) });  //serialized object struct
		}

		//append CSRF token
		if (csrf && request.method == "POST") {

			//check if element is null
			if (_.isNull(form))
				payload[APP.UA.tokenKey] = APP.UA.token; //object style
			else
				payload.push({ name : APP.UA.tokenKey, value : APP.UA.token }); //serialized object struct
		}

		//set url
		let url = !_.isNil(request.url) ? request.url : this.baseUrl(request.uri);
		//set options
		var options = {
			url      : url,
			type     : request.method,
			data     : payload,
			dataType : "json",
			timeout  : this.timeout
		};

		//set headers?
		if(!_.isNil(request.headers))
			options.headers = request.headers;

		console.log("Core -> new promise request ["+url+"] payload:", payload);

		var s = this;
		//make ajax request with promises
		return P.resolve(
			$.ajax(options)
			//handle fail event for jQuery ajax request
			.fail(s.handleAjaxError)
		)
		//handle response
		.then((data) => {

			//handle ajax response
			if (!s.handleAjaxResponse(data, events))
				return false;

			//set true value if payload is null
			return !_.isNull(data.payload) ? data.payload : true;
		})
		.catch((e) => {
			console.warn("Core -> Promise exception", e);
		})
		//promise finisher
		.finally(() => {

			if (_.isUndefined(submit_btn) || !submit_btn.length)
				return true;

			//re-enable button
			submit_btn
				.removeAttr("disabled")
				.removeClass("disabled");

			return true;
		});
	},

	/**
	 * Ajax Response Handler, checks if response has errors.
	 * Also can set event-callback function in case the response is an error.
	 * @method handleAjaxResponse
	 * @param  {Object} response - The JSON response object
	 * @param  {Object} events - Alert Events Handler
	 */
	handleAjaxResponse(res = null, events = null) {

		//undefined res?
		if (_.isNull(res))
			return false;

		console.log("Core -> handling xhr response: ", res);

		var s = this;
		var onErrorResponse = function() {

			let onCloseFn = null, onClickFn = null;

			//set the callback function if set in error events functions
			if (_.isString(res.namespace) && _.isObject(events)) {

				if (_.isObject(events.onClose) && !_.isUndefined(events.onClose[res.namespace]))
					onCloseFn = _.isFunction(events.onClose[res.namespace]) ? events.onClose[res.namespace] : null;

				if (_.isObject(events.onClick) && !_.isUndefined(events.onClick[res.namespace]))
					onClickFn = _.isFunction(events.onClick[res.namespace]) ? events.onClick[res.namespace] : null;
			 }

			//call the alert message
			s.ui.showAlert(res.payload, res.type, onCloseFn, onClickFn);
		};

		//check for ajax error
		if (res.status == "error") {

			this.handleAjaxError(res.code, res.error);
			return false;
		}
		//app errors
		else if (!_.isUndefined(res.type)) {

			onErrorResponse();
			return false;
		}
		//redirection
		else if (!_.isUndefined(res.redirect)) {

			this.redirectTo(res.redirect);
			return true;
		}
		//no errors, return true
		else {
			return true;
		}
	},

	/**
	 * Ajax Error Response Handler
	 * @method handleAjaxError
	 * @param  {Object} x - The jQuery Response object
	 * @param  {String} error - The jQuery error object
	 */
	handleAjaxError(x, error) {

		//set message null as default
		let message = null, log = "";

		let code = _.isObject(x) ? x.status : x;
		let text = _.isObject(x) ? x.responseText : code;

		//sever parse error
		if (error == "parsererror") {
			message = APP.TRANS.ALERTS.INTERNAL_ERROR;
			log     = "Core -> parsererror: " + text;
		}
		//timeout
		else if (error == "timeout" || code == 408) {
			message = APP.TRANS.ALERTS.SERVER_TIMEOUT;
			log     = "Core -> timeout: " + x;
		}
		//400 bad request
		else if (code == 400) {
			message = APP.TRANS.ALERTS.BAD_REQUEST;
			log     = "Core -> bad request: " + code;
		}
		//403 access forbidden
		else if (code == 403) {
			message = APP.TRANS.ALERTS.ACCESS_FORBIDDEN;
			log     = "Core -> access forbidden: " + code;
		}
		//404 not found
		else if (code == 404) {
			message = APP.TRANS.ALERTS.NOT_FOUND;
			log     = "Core -> not found: " + code;
		}
		//method now allowed (invalid GET or POST method)
		else if (code == 405) {
			message = APP.TRANS.ALERTS.NOT_FOUND;
			log     = "Core -> method now allowed: " + code;
		}
		//invalid CSRF token
		else if (code == 498) {
			message = APP.TRANS.ALERTS.CSRF;
			log     = "Core -> invalid CSRF token: " + code;
		}
		else {
			message = APP.TRANS.ALERTS.INTERNAL_ERROR;
			log     = "Core -> unknown error: " + text;
		}

		//show the alert message
		console.warn(log);
		core.ui.showAlert(message, "warning");
	},

	/**
	 * Redirect router method
	 * @method redirectTo
	 * @param  {String} uri - The webapp URI
	 */
	redirectTo(uri = "") {

		//page reload
		if(uri === true) {

			location.reload();
			return;
		}

		var uri_map = { notFound : "error/notFound" };

		//check if has a uri map
		if (!_.isUndefined(uri_map[uri]))
			uri = uri_map[uri];

		//redirect to contact
		location.href = APP.baseUrl + uri;
	},

	/**
	 * Check if given URL is a resource URL
	 * @method isResourceUrl
	 * @param {String} url - input URL or URI
	 * @return {Boolean}
	 */
	isResourceUrl(url = "") {

		let types = /(\.jpg|\.png|\.svg|\.gif)/i;

		return this.isUrl(url) && types.test(url);
	},

	/**
	 * Check if given URL starts with http
	 * @method isUrl
	 * @param {String} url - Validates an HTTP url
	 * @return {Boolean}
	 */
	isUrl(url = "") {

		return url.substring(0, 4) == "http";
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

		name = name.replace(/[\[\]]/g, "\\$&");
		let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),

		results = regex.exec(url);

		if (!results)
			return null;

		if (!results[2])
			return "";

		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}
};
