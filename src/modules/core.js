/**
 * Core: main app module.
 * Required scope vars: `{APP, UA}`.
 * Frontend Framework supported: `Foundation 6`, `Bootstrap 4`
 * @class Core
 */

import ui from "./core.ui.js";

export default new function() {

    //Check that App Global scope vars are defined
    if (typeof APP == "undefined" || typeof UA == "undefined")
        throw new Error("Core -> Error: APP or UA global vars are not defined!");

    //self context
    var self = this;

    //++ Properties

    /**
     * @property debug
     * @type {boolean}
     */
    self.debug = false;

    /**
     * @property ui
     * @type {object}
     */
    self.ui = ui;

    /**
     * @property modules
     * @type {Boolean}
     */
    self.modules = {};

    /**
     * @property framework ```foundation, bootstrap, pure```
     * @type {string}
     */
    self.framework = "pure";

    /**
     * Server Date format
     * @type {string}
     */
    self.dateFormat =  "YYYY-MM-DD HH:mm:ss";

	/**
     * XHR Max Timeout (seconds)
     * @type {int}
     */
	self.timeout = 30000;

    /**
     * @property window.core
     * @type {object}
     */
    window.core = self;

    //++ jQuery setup

    $.ajaxSetup({
        cache : true  //improvement for third-party libs like Facebook.
    });

    //++ Methods ++

    /**
     * Helper Get BaseUrl
     * @method baseUrl
     * @param  {String} uri - Append URI if defined
     * @return string
     */
     self.baseUrl = function(uri = "") {

        return APP.baseUrl + uri;
     };

     /**
      * Helper Get StaticUrl
      * @method staticUrl
      * @param  {String} uri - Append URI if defined
      * @return string
      */
      self.staticUrl = function(uri = "") {

         return APP.staticUrl + uri;
      };

      /**
       * Set modules automatically for require function
       * @method setModules
       * @param {Array} modules - The required modules
       */
      self.setModules = function(modules = []) {

          if (!modules.length)
              return;

          for (var i = 0; i < modules.length; i++) {

              var mod = modules[i];

              if (typeof mod.name != "undefined")
                  self.modules[mod.name] = mod;
          }
      };

      /**
      * Initializer, if module has a viewModel binds it to DOM automatically
      * @method start
      * @param {Array} modules
      */
      self.start = function(modules = []) {

          var mod_name, mod, data;

          //1) call inits
          for (mod_name in modules) {

              //check module exists
              if (_.isUndefined(self.modules[mod_name])) {
                  console.warn("Core -> Attempting to load an undefined module (" + mod_name + ").");
                  continue;
              }

              //get module
              mod  = self.modules[mod_name];
              data = modules[mod_name];

              //check if module has init method & call it
              if (_.isFunction(mod.init))
                mod.init(data);
          }

          //2) load viewModels
          for (mod_name in modules) {

              //check module exists
              if (_.isUndefined(self.modules[mod_name]))
                continue;

              //get module
              mod = self.modules[mod_name];

              //bind model to DOM?
              if (!_.isObject(mod.vm))
                continue;

              if(_.isUndefined(mod.vm.el))
                mod.vm.el = "#vue-" + mod_name;

              if(typeof Vue == "undefined")
                return console.warn("Core -> Vue has not loaded!");

              console.log("Core -> New Vue instance for module " + mod_name, mod.vm);

              //set new Vue instance (object prop updated)
              mod.vm = new Vue(mod.vm);
          }

          //3) load UI
          self.loadUI();

          console.debug("Core -> Started.");
      };

      /**
       * Core load UI, called automatically after loading modules.
       * @method loadUI
       */
      self.loadUI = function() {

          //load fast click for mobile
          if (UA.isMobile && typeof FastClick != "undefined")
              FastClick.attach(document.body);

          //load Foundation framework
          if (typeof Foundation != "undefined")
              self.initFoundation();
          //load Bootstrap framework
          else if (typeof $().emulateTransitionEnd == "function")
              self.initBootstrap();

          //load forms module
          if (!_.isUndefined(self.modules.forms))
              self.modules.forms.load();

          //load UI module
          self.ui.init();

          //css async loading
          if(!_.isUndefined(APP.cssLazy) && APP.cssLazy) {

              console.log("Core -> loading CSS file (async)", APP.cssLazy);
              loadCSS(APP.cssLazy);
          }
      };

    /**
     * Foundation Initializer, loaded automatically.
     * Call this function if an element has loaded dynamically and uses foundation js plugins.
     * @method initFoundation
     * @param {Object} element - The jQuery element, default is document object.
     */
    self.initFoundation = function(element) {

        console.log("Core -> Initializing Foundation...");

        //check default element
        if (typeof element == "undefined")
            element = $(document);
        else if (element instanceof jQuery === false)
            element = $(element);

        //set framework
        self.framework = "foundation";
        //init foundation
        element.foundation();
    };

    /**
     * Bootstrap Initializer, loaded automatically.
     * @method initBootstrap
     */
    self.initBootstrap = function() {

        console.log("Core -> Initializing Bootstrap...");

        //set framework
        self.framework = "bootstrap";
    };

    /**
     * Ajax request with form validation.
     * Validates a form, if valid, sends a promise request with Q lib.
     * @link https://github.com/kriskowal/q
     * @method ajaxRequest
     * @param  {Object} request - A simple request object
     * @param  {Object} form - The form HTML object
     * @param  {Object} extended_data - An object to be extended as sending data (optional)
     * @param  {Object} events - Alert Event handlers object
     * @return {Object} promise
     */
    self.ajaxRequest = function(request = null, form = null, extended_data = null, events = null) {

        //validation, request is required
        if (_.isNull(request))
            throw new Error("Core -> ajaxRequest: invalid request input object");

        //define payload
        var payload = {};
        var submit_btn;

        //check for a non jquery object
        if (!_.isNull(form) && form instanceof jQuery === false)
            form = $(form);

        //check form element has a Foundation data-invalid attribute
        if (!_.isNull(form)) {

            //validate abide form
            if (!self.modules.forms.isValid(form))
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
        if (request.method == "POST") {

            //check if element is null
            if (_.isNull(form))
                payload[UA.tokenKey] = UA.token; //object style
            else
                payload.push({ name : UA.tokenKey, value : UA.token }); //serialized object struct
        }

        //set url
        let url = !_.isNil(request.url) ? request.url : self.baseUrl(request.uri);
        //set options
        var options = {
            url      : url,
            type     : request.method,
            data     : payload,
            dataType : "json",
            timeout  : self.timeout
        };

        console.log("Core -> new promise request ["+url+"] payload:", payload);

        //make ajax request with promises
        return P.resolve(
            $.ajax(options)
            //handle fail event for jQuery ajax request
            .fail(self.handleAjaxError)
        )
        //handle response
        .then((data) => {

            //handle ajax response
            if (!self.handleAjaxResponse(data, events))
                return false;

            var payload = data.response.payload;

            //set true value if payload is null
            return !_.isNull(payload) ? payload : true;
        })
        .catch((e) => {

            console.warn("Core -> Promise exception", e);
            //throw e;
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
    };

    /**
     * Ajax Response Handler, validates if response data has no errors.
     * Also can set event-callback function in case the response is an error.
     * @method handleAjaxResponse
     * @param  {Object} data - The JSON response object
     * @param  {Object} events - Alert Events Handler
     */
    self.handleAjaxResponse = function(data = null, events = null) {

        //undefined data?
        if (_.isNull(data))
            return false;

        console.log("Core -> handleAjaxResponse: ", data);

        //check for error
        var response = data.response;

        var onErrorResponse = function() {

            var onCloseFn = null;
            var onClickFn = null;

            //set the callback function if set in error events functions
            if (_.isString(response.namespace) && _.isObject(events)) {

                if (_.isObject(events.onClose) && !_.isUndefined(events.onClose[response.namespace]))
                    onCloseFn = _.isFunction(events.onClose[response.namespace]) ? events.onClose[response.namespace] : null;

                if (_.isObject(events.onClick) && !_.isUndefined(events.onClick[response.namespace]))
                    onClickFn = _.isFunction(events.onClick[response.namespace]) ? events.onClick[response.namespace] : null;
             }

            //call the alert message
            self.ui.showAlert(response.payload, response.type, onCloseFn, onClickFn);
        };

        //check for ajax error
        if (response.status == "error") {

            self.handleAjaxError(response.code, response.error);
            return false;
        }
        //app errors
        else if (typeof response.type != "undefined") {

            onErrorResponse();
            return false;
        }
        //redirection
        else if (!_.isUndefined(response.redirect)) {

            self.redirectTo(response.redirect);
            return true;
        }
        //no errors, return true
        else {
            return true;
        }
    };

    /**
     * Ajax Error Response Handler
     * @method handleAjaxError
     * @param  {Object} x - The jQuery Response object
     * @param  {String} error - The jQuery error object
     */
    self.handleAjaxError = function(x, error) {

        //set message null as default
        var message = null;
        var log     = "";
        var code    = _.isObject(x) ? x.status : x;
        var text    = _.isObject(x) ? x.responseText : code;

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

        console.warn(log);
        //show the alert message
        self.ui.showAlert(message, "warning");
    };

    /**
     * Redirect router method
     * TODO: detect protocol schema.
     * @method redirectTo
     * @param  {String} uri - The webapp URI
     */
    self.redirectTo = function(uri = "") {

        //self-reload
        if(uri === true) {

            location.reload();
            return;
        }

        var uri_map = {
           notFound : "error/notFound"
        };

        //check if has a uri map
        if (!_.isUndefined(uri_map[uri]))
            uri = uri_map[uri];

        //redirect to contact
        location.href = APP.baseUrl + uri;
    };

    /**
     * Check if given URL is a resource URL
     * @method isResourceUrl
     * @return {Boolean}
     */
    self.isResourceUrl = function(url = "") {

        let types = /(\.jpg|\.png|\.svg|\.gif)/i;

        return self.isUrl(url) && types.test(url);
    };

    /**
     * Check if given URL starts with http
     * @method isUrl
     * @return {Boolean}
     */
    self.isUrl = function(url = "") {

        return url.substring(0, 4) == "http";
    };

	/**
	 * Get URI parameter by name
	 */
	self.getQueryString = function(name, url = false) {

		if (!url)
			url = window.location.href;

		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),

		results = regex.exec(url);

		if (!results) return null;
		if (!results[2]) return '';

		return decodeURIComponent(results[2].replace(/\+/g, " "));
	};

    /**
     * App test methods
     * @method test
     * @param  {String} option - The option string [ajax_timeout, ajax_loading, dom_events]
     * @param  {Object} object - A jQuery or HTML object element
     */
    self.test = function(option, object) {

        var assert = true;

        //timeout simulator
        if (option == "timeout") {
            self.ajaxRequest({ method : "GET", url : "http://250.21.0.180:8081/fake/path/" });
        }
        //get dom events associated to a given object
        else if (option == "events") {
            var obj = _.isObject(object) ? object[0] : $(object)[0];
            return $._data(obj, "events");
        }
        else {
            assert = false;
        }

        //default return
        return "Core -> Assert ("+assert+")";
    };
};
