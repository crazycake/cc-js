/**
 * Facebook Module - SDK wrapper.
 * @module Facebook
 */

export default {

	name : "facebook",

	//defaults
	config : {
		api_version           : "v2.10",                 // openGraph version
		lang                  : "en",             		 // set SDK lang (self property)
		dom_class             : "app-btn-fb",            // jQuery selector
		graph_url             : "//graph.facebook.com/", // openGraph URL
		id                    : "",                      // facebook app id
		scope                 : "",                	  	 // facebook app scope perms
		login_url             : "",                	  	 // facebook app default login URL
		share_url             : null,                    // facebook dynamic share og URL (set above)
		has_loaded            : false,                   // flag that sets if sdk has loaded
		disable_js_sdk        : false,                   // disables javascript SDK
		login_fn              : null,                    // callback function when user is already logged in
		login_failed_fn       : null,                    // callback function when user didnt logged in
		deauthorize_fn        : null,                    // callback function when app is deleted (set in app model)
		before_redirection_fn : null,                    // callback for before redirection event (for php redirection)
		loaded_text_attr      : "data-fb-loaded"         // loaded button text for facebook js SDK button
	},

	sdk_langs : {
		es : "es_LA",
		en : "en_US"
	},

	/**
	 * Init facebook SDK with configurations
	 * @method init
	 */
	init() {

		// check that facebook conf is set
		if (_.isUndefined(APP.facebookAppID)) {

			console.warn("Facebook -> APP.facebookAppID is not defined!");
			return false;
		}

		// set SDK lang
		let lang = !_.isNil(APP.UA.lang) ? APP.UA.lang : "en";

		// extend props
		this.config.lang 	  = this.sdk_langs[lang];
		this.config.id        = APP.facebookAppID;
		this.config.scope     = APP.facebookAppScope;
		this.config.login_url = APP.facebookLoginURL;
		this.config.share_url = "https://www.facebook.com/dialog/share?app_id=" + APP.facebookAppID +
								"&display=popup&href=<url>&redirect_uri=" + window.location.href;

		//set default login by facebook action
		if (_.isNull(this.config.login_fn))
			this.config.login_fn = this.loginUserByFacebook;

		//append the "fb-root" div required by facebook
		$("body").append('<div id="fb-root"></div>');

		//set facebook jquery elements
		var fb_buttons = $("." + this.config.dom_class);

		//check if buttons exists
		if (!fb_buttons.length) {
			console.warn("Facebook -> No buttons found with class " + this.config.dom_class);
			return;
		}

		//disable js sdk only for mobile
		if (!core.modules.facebook.config.disable_js_sdk)
			this.config.disable_js_sdk = APP.UA.isMobile;

		//For mobile use redirections pages, get library request
		if (!this.config.disable_js_sdk)
			return this.getLibraryScript(fb_buttons);

		var s = this;
		//click event for redirection strategy
		fb_buttons.click(function() {

			//get action attribute
			var action = $(this).attr("data-action");
			var url    = s.config.login_url;

			//share actions
			if (action == "share-url")
				url = s.config.share_url.replace("<url>", $(this).attr("data-url"));

			//validates url
			if (!url.length) {
				console.warn("Facebook -> Invalid redirection URL.");
				return;
			}

			//facebook before redirection event
			if (_.isFunction(s.config.before_redirection_fn))
				s.config.before_redirection_fn(url);

			top.location.href = url;
		});

		//enable buttons
		fb_buttons.prop("disabled", false);
		//toogle loading texts if set
		this.toggleButtonText(fb_buttons);
		//mark as loaded
		this.config.has_loaded = true;
	},

	/**
	 * Get the SDK facebook library, async load.
	 * @method getLibraryScript
	 * @async
	 * @param {Object} fb_buttons - The jQuery buttons elements
	 */
	getLibraryScript(fb_buttons) {

		var s = this;
		//Load Facebook javascript SDK
		$.getScript("//connect.facebook.net/" + this.config.lang + "/all.js", () => {

			//Init facebook SDK
			FB.init({
				appId   : s.config.id,          //Facebook app ID
				version : s.config.api_version, //API version
				status  : true,                 //Check Facebook Login status
				cookie  : true,                 //Use client cookie session?
				xfbml   : true                  //Look for social plugins on the page
			});

			//Get Login Status
			FB.getLoginStatus(() => {
				//click event
				fb_buttons.click(function() {

					//get action attribute
					var action = $(this).attr("data-action");

					//share actions
					if (action == "share-url")
						return s.shareUrl($(this).attr("data-url"));

					//login actions
					s.login((response, action) => {

						//check response
						if (!response.authResponse)
							return;

						let data = { "signed_request" : response.authResponse.signedRequest };

						//login / register action
						if (action == "login") {
							//call logged in function
							s.config.login_fn(data);
						}
						//delete account action
						else if (action == "deauthorize" && _.isFunction(s.config.deauthorize_fn)) {
							//delete fb app
							s.config.deauthorize_fn(data);
						}

					}, action);
				});

				//enable button
				fb_buttons.prop("disabled", false);
				//toogle loading texts if set
				s.toggleButtonText(fb_buttons);
				//mark as loaded
				s.config.has_loaded = true;
			});

			console.log("Facebook -> Ready!");
		});
	},

	/**
	 * Facebook login through js SDK
	 * @method login
	 * @param {Function} fn_callback - The callback function
	 * @param {String} action - The action type: `login`, `share-url`.
	 */
	login(fn_callback, action) {

		var s = core.modules.facebook;

		//fb buttons
		var fb_buttons = $("." + s.config.dom_class);
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
				s.loginFailed(response);
		},
		{ 	//app default permissions
			scope : s.config.scope
		});
	},

	/**
	 * Facebook login fallback when app auth fails
	 * Response.status values
	 * + __not_authorized__: the user is logged in to Facebook, but has not authenticated your app, or posible error
	 * 	is the app is in sandbox mode (facebook app config). If error continues maybe app has
	 * 	country restrictions or age restrictions (facebook app config).
	 * + __unknown__: user havent login to facebook or 3rd party cookies are blocked.
	 * @method loginFailed
	 * @param {Object} response - The response object
	 * @param {Function} fn_pending - The pending function
	 */
	loginFailed(response, fn_pending) {

		var s = core.modules.facebook;

		//check response
		if (_.isUndefined(response.status))
			return;

		//call failed function
		if (_.isFunction(s.config.login_failed_fn))
			s.config.login_failed_fn(response.status, fn_pending);
	},

	/**
	 * Request Login user Form Handler with Facebook JS SDK
	 * @method loginUserByFacebook
	 * @param {Object} fb_payload - The facebook SDK payload
	 */
	loginUserByFacebook(fb_payload) {

		//request with promise
		core.ajaxRequest({ method : "POST", uri :  "facebook/login" }, null, fb_payload);
	},

	/**
	 * Force session logout from facebook
	 * @method logout
	 * @param {Function} fn_callback - The callback function
	 */
	logout(fn_callback) {

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
	},

	/**
	 * Deletes app from user facebook account
	 * @method delete
	 * @param {Function} fn_callback - The callback function
	 */
	delete(fn_callback) {

		FB.api("/me/permissions", "DELETE", fn_callback);
	},

	/**
	 * Get user facebook profile data
	 * @method getPublicUserData
	 * @param {Int} user_id - The user ID
	 * @param {Function} fn_callback - The callback function
	 */
	getPublicUserData(user_id, fn_callback) {

		//get request to server (jsonp)
		$.ajax({
			type     : "GET",
			url      : this.config.graph_url + user_id,
			dataType : "jsonp",
			success  : fn_callback,
			error    : function(e) {
				var response = {};
				response.error = e.status;
				//call callback
				fn_callback(response);
			}
		});
	},

	/**
	 * Get user fb picture URL
	 * @method getUserPictureUrl
	 * @param  {Int} user_id - The facebook user id
	 * @param  {String} type - The image type, example: ```square, large```
	 * @return {String} The url
	 */
	getUserPictureUrl(user_id, type) {

		//default type
		if (!_.isString(type))
			type = "square";

		return this.config.graph_url + user_id + "/picture?type=" + type;
	},

	/**
	 * Facebook share action
	 * @method shareUrl
	 * @param {String} url - The URL to share
	 */
	shareUrl(url) {

		if (!url.length)
			return;

		//call API UI
		FB.ui({
			method : "share",
			href   : url
		});
	},

	/**
	 * Toogle loading text in a button. Button must have ```loaded_text_attr``` attribute.
	 * @method toggleButtonText
	 * @param {Object} buttons - The jQuery object button elements
	 */
	toggleButtonText(buttons) {

		var s = this;
		// jquery for each button...
		buttons.each(function() {

			//check if button has attribute
			var attr = $(this).attr(s.config.loaded_text_attr);

			if (typeof attr == "undefined" || attr === false)
				return;

			//update text button (search for a one level span)
			var text_element = $(this).children("span").length ? $(this).children("span") : $(this);
			//toogle texts
			text_element.text(attr);
		});
	}
};
