/**
 * Facebook View Model - SDK wrapper
 * Required scope vars: `{APP, UA}`.
 * @class Facebook
 */

export default new function() {

	//++ Module
	var self  = this;
    self.name = "facebook";

    //Check that facebook conf is set
    if (_.isUndefined(APP.facebookAppID) || _.isUndefined(UA)) {
        return false;
	}

	/**
     * @property sdkLangs
     * @type {Array}
     */
	self.sdk_langs = {
		es : "es_LA",
		en : "en_US"
	};

    /**
     * @attribute config
     * @type {Object}
     */
	self.config = {
        api_version           : "v2.5",                              // openGraph version
        lang                  : self.sdk_langs[UA.lang],             // set SDK lang (self property)
        dom_class             : "app-btn-fb",                        // jQuery selector
        graph_url             : UA.protocol + "graph.facebook.com/", // openGraph URL
        id                    : APP.facebookAppID,                   // from global app var
        scope                 : APP.facebookAppScope,                // facebook app permissions
        login_url             : APP.facebookLoginURL,                // facebook app default login URL
        share_url             : null,                                // facebook dynamic share og URL (set above)
        has_loaded            : false,                               // flag that sets if sdk has loaded
        disable_js_sdk        : false,                               // disables javascript SDK
        login_fn              : null,                                // callback function when user is already logged in
        login_failed_fn       : null,                                // callback function when user didnt logged in
        deauthorize_fn        : null,                                // callback function when app is deleted (set in app model)
        before_redirection_fn : null,                                // callback for before redirection event (for php redirection)
        loaded_text_attr      : "data-fb-loaded"                     // loaded button text for facebook js SDK button
	};
	//set share URL
	self.config.share_url = "https://www.facebook.com/dialog/share?app_id="+self.config.id+"&display=popup&href=<url>&redirect_uri="+window.location.href;

	//++ Methods

	/**
	 * Init facebook SDK with configurations
	 * @method init
	 */
	self.init = function() {

        //set default login by facebook action
        if (_.isNull(self.config.login_fn))
            self.config.login_fn = self.loginUserByFacebook;

		//append the "fb-root" div required by facebook
		$("body").append('<div id="fb-root"></div>');

		//set facebook jquery elements
		var fb_buttons = $("." + self.config.dom_class);

		//check if buttons exists
		if (!fb_buttons.length)
			return console.log("Facebook -> No buttons found with class " + self.config.dom_class);

		//disable js sdk only for mobile
		if (!core.modules.facebook.config.disable_js_sdk)
			self.config.disable_js_sdk = UA.isMobile;

		//For mobile use redirections pages, get library request
		if (!self.config.disable_js_sdk)
			return self.getLibraryScript(fb_buttons);

		//click event for redirection strategy
		fb_buttons.click(function() {

			//get action attribute
			var action = $(this).attr("data-action");
			var url    = self.config.login_url;

			//share actions
			if (action == "share-url")
				url = self.config.share_url.replace("<url>", $(this).attr("data-url"));

			//validates url
			if (!url.length)
				return console.log("mod_facebook.js -> Invalid redirection URL.");

			//facebook before redirection event
			if (_.isFunction(self.config.before_redirection_fn))
				self.config.before_redirection_fn(url);

			//console.log("mod_facebook.js -> redirecting to: ", url);return;
			top.location.href = url;
		});

		//enable buttons
		fb_buttons.prop("disabled", false);
		//toogle loading texts if set
		self.toggleButtonText(fb_buttons);
		//mark as loaded
		self.config.has_loaded = true;
	};

    /**
     * Get the SDK facebook library, async load.
     * @method getLibraryScript
     * @async
     * @param {Object} fb_buttons - The jQuery buttons elements
     */
    self.getLibraryScript = function(fb_buttons) {

        //Load Facebook javascript SDK
		$.getScript("//connect.facebook.net/" + self.config.lang + "/all.js", () => {

			console.log("Facebook -> SDK loaded!");

			//Init facebook SDK
			FB.init({
                appId   : self.config.id,          //Facebook app ID
                version : self.config.api_version, //API version
                status  : true,                    //Check Facebook Login status
                cookie  : true,                    //Use client cookie session?
                xfbml   : true                     //Look for social plugins on the page
			});

			//Get Login Status
			FB.getLoginStatus(() => {
				//click event
				fb_buttons.click(function() {

					//get action attribute
					var action = $(this).attr("data-action");

					//share actions
					if (action == "share-url")
						return self.shareUrl($(this).attr("data-url"));

					//login actions
					self.login(self.handleUserData, action);
				});

				//enable button
				fb_buttons.prop("disabled", false);
				//toogle loading texts if set
				self.toggleButtonText(fb_buttons);
				//mark as loaded
				self.config.has_loaded = true;
			});
		});
    };

	/**
	 * Facebook login through js SDK
	 * @method login
	 * @param  {Function} fn_callback - The callback function
	 * @param  {String} action - The action type: `login`, `share-url`.
	 */
	self.login = function(fn_callback, action) {

		//fb buttons
		var fb_buttons = $("." + self.config.dom_class);
		//disable button
		fb_buttons.prop("disabled", true);

		//login event
		FB.login((response) => {

			//enable button
			fb_buttons.prop("disabled", false);

			//check auth response, if fail call fallback for login
			if (response.authResponse)
				fn_callback(response, action);
			else
				self.loginFailed(response);
		},
		{ 	//app default permissions
			scope : self.config.scope
		});
	};

	/**
	 * Facebook login fallback when app auth fails
	 * Response.status values
	 * + __not_authorized__: the user is logged in to Facebook, but has not authenticated your app, or posible error
	 * 	is the app is in sandbox mode (facebook app config). If error continues maybe app has
	 * 	country restrictions or age restrictions (facebook app config).
	 * + __unknown__: user havent login to facebook or 3rd party cookies are blocked.
	 * @method loginFailed
	 * @param  {Object} response - The response object
	 * @param  {Function} fn_pending - The pending function
	 */
	self.loginFailed = function(response, fn_pending) {

		//check response
		if (_.isUndefined(response.status))
			return;

		//call failed function
		if (_.isFunction(self.config.login_failed_fn))
			self.config.login_failed_fn(response.status, fn_pending);
	};

    /**
     * Request Login user Form Handler with Facebook JS SDK
     * @method loginUserByFacebook
     * @param  {Object} fb_payload - The facebook SDK payload
     */
    self.loginUserByFacebook = function(fb_payload) {

        //request with promise
        core.ajaxRequest({ method : "POST", uri :  "facebook/login" }, null, fb_payload);
    };

	/**
	 * Force session logout from facebook
	 * @method logout
	 * @param  {Function} fn_callback - The callback function
	 */
	self.logout = function(fn_callback) {

		//1st check login status
		FB.getLoginStatus((response) => {
			//check response
			if (!response.authResponse)
				return;

			//logout call
			FB.logout(() => {
				//callback fn is a function?
				if (_.isFunction(fn_callback))
					fn_callback();
			});
		});
	};

    /**
	 * Deletes app from user facebook account
	 * @method delete
	 * @param  {Function} fn_callback - The callback function
	 */
	self.delete = function(fn_callback) {

		FB.api("/me/permissions", "DELETE", fn_callback);
	};

	/**
	 * Get user facebook profile data
	 * @method getPublicUserData
	 * @param  {Int} user_id - The user ID
	 * @param  {Function} fn_callback - The callback function
	 */
	self.getPublicUserData = function(user_id, fn_callback) {

		//get request to server (jsonp)
		$.ajax({
            type     : "GET",
            url      : self.config.graph_url + user_id,
            dataType : "jsonp",
            success  : fn_callback,
            error    : (e) => {
				var response = {};
				response.error = e.status;
				//call callback
				fn_callback(response);
			}
		});
	};

	/**
	 * Handles facebook user data response
	 * @method handleUserData
	 * @param  {object} response - The response object
	 * @param  {string} action - The action type: ```login, share-url```
	 */
	self.handleUserData = function(response, action) {

		//check response
		if (!response.authResponse)
			return;

		var data = { "signed_request" : response.authResponse.signedRequest };

		//login / register action
		if (action == "login") {
			//call logged in function
			self.config.login_fn(data);
		}
		//delete account action
		else if (action == "deauthorize" && _.isFunction(self.config.deauthorize_fn)) {
			//delete fb app
			self.config.deauthorize_fn(data);
		}
	};

	/**
	 * Get user fb picture URL
	 * @method getUserPictureUrl
	 * @param  {Int} user_id - The facebook user id
	 * @param  {String} type - The image type, example: ```square, large```
	 * @return {String} The url
	 */
	self.getUserPictureUrl = function(user_id, type) {

		//default type
		if (!_.isString(type))
			type = "square";

		return self.config.graph_url + user_id + "/picture?type=" + type;
	};

	/**
	 * Facebook share action
	 * @method shareUrl
	 * @param  {string} url - The URL to share
	 */
	self.shareUrl = function(url) {

		if (!url.length)
			return;
		//console.log(url);

		//call API UI
		FB.ui({
			method : "share",
			href   : url
		});
	};

	/**
	 * Toogle loading text in a button. Button must have ```loaded_text_attr``` attribute.
	 * @method toggleButtonText
	 * @param  {Object} buttons - The jQuery object button elements
	 */
	self.toggleButtonText = function(buttons) {

		// jquery for each button...
		buttons.each(function() {

			//check if button has attribute
            var attr = $(this).attr(self.config.loaded_text_attr);

            if (typeof attr == "undefined" || attr === false)
                return;

			//update text button (search for a one level span)
			var text_element = $(this).children("span").length ? $(this).children("span") : $(this);
			//toogle texts
			text_element.text(attr);
		});
	};
};
