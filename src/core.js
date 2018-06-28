/**
 * Core Module
 * Required scope vars: {APP}
 */

export default {

	/**
	 * @property modules
	 * @type {Object}
	 */
	modules : {},

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
			return

		for (let mod of modules) {

			if (mod.name)
				this.modules[mod.name] = mod
		}
	},

	/**
	 * Starter, if module has a viewModel binds it to DOM automatically
	 * @method start
	 * @param {Array} - The modules array
	 */
	start(modules = []) {

		console.log("Core -> Starting")

		//Check that App Global scope vars are defined
		if (APP == undefined) throw new Error("Core -> APP global scoped var is not defined!")

		let mod_name, mod, data

		// call inits
		for (mod_name in modules) {

			//check module exists
			if (!this.modules[mod_name]) {

				console.warn("Core -> Attempting to load an undefined module (" + mod_name + ").")
				continue
			}

			//get module
			mod  = this.modules[mod_name]
			data = modules[mod_name]

			//check if module has init method & call it
			if (_.isFunction(mod.init))
				mod.init(data)
		}

		//3) load UI
		this.loadUI()
	},

	/**
	 * Core load UI, called automatically after loading modules.
	 * @method loadUI
	 */
	loadUI() {

		//load fast click for mobile
		if (APP.UA && APP.UA.isMobile)
			FastClick.attach(document.body)

		//look for server flash messages
		this.setFlashAlerts()

		//css async loading
		if (APP.cssLazy) {

			console.log("Core -> Loading CSS file (async)", APP.cssLazy)
			loadCSS(APP.cssLazy)
		}
	},

	/**
	* Helper Get BaseUrl
	* @method baseUrl
	* @param  {String} uri - Append URI if defined
	* @return String
	*/
	baseUrl(uri = "") {

		return APP.baseUrl + uri
	},

	/**
	* Helper Get StaticUrl
	* @method staticUrl
	* @param  {String} uri - Append URI if defined
	* @return String
	*/
	staticUrl(uri = "") {

		return APP.staticUrl + uri
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
		if (!request) throw new Error("Core -> ajaxRequest: invalid input request object")

		//define payload
		let payload    = {},
			submit_btn = null

		//check form element has a form data-invalid attribute
		if (form) {

			//check for a non jquery object
			if (form instanceof jQuery === false)
				form = $(form)

			//form data to object
			$.each(form.serializeArray(), function() { payload[this.name] = this.value })
			//disable submit button
			submit_btn = form.find("button")

			if (submit_btn.length)
				submit_btn.prop("disabled", true)
		}

		//append CSRF token?
		if (csrf && request.method == "POST" && !_.isNil(APP.UA.tokenKey))
			payload[APP.UA.tokenKey] = APP.UA.token

		//set options
		let options = _.assign({
			method   : "GET",
			timeout  : this.timeout,
			dataType : "json",
		}, request)

		//set payload
		options.data = _.assign(payload, request.data)

		if (options.uri)
			options.url = this.baseUrl(options.uri)

		let s = this

		console.log("Core -> new xhr request", options)

		return $.ajax(options)
			.then((data) => {

				//check response
				console.log("Core -> parsing ajax response [" + (data.status || 0) + "]", data)

				//check for response error
				if (data.status == "error")
					return s.parseAjaxError(data.code || 400,
											data.error || "not defined",
											data.message || data.msg || null)
				//redirection?
				if (data.redirect)
					return location.href = data.redirect

				//success
				return data.payload || {}
			})
			.fail((xhr, textStatus) => {

				console.warn("Core -> ajax request failed [" + options.url + "]", textStatus, xhr.responseText || "none")
			}).
			always(() => {

				//re-enable button?
				if (submit_btn)
					submit_btn.prop("disabled", false)
			})
	},

	/**
	 * Ajax Error Response Handler
	 * @method parseAjaxError
	 * @param  {Int} code - The code error
	 * @param  {String} error - The error string
	 * @param  {String} message - The message string
	 * @return {Object}
	 */
	parseAjaxError(code, error, message = '') {

		const errors = {
			'401' : APP.TRANS.ALERTS.ACCESS_FORBIDDEN,
			'408' : APP.TRANS.ALERTS.SERVER_TIMEOUT,
			'404' : APP.TRANS.ALERTS.NOT_FOUND,
			'498' : APP.TRANS.ALERTS.CSRF,
			'500' : APP.TRANS.ALERTS.SERVER_ERROR
		}

		// sever error
		if (error == "parsererror") message = errors['500']

		// timeout
		else if (error == "timeout") message = errors['408']

		// default
		else if (errors[error]) message = errors[error]

		return { code : code, error : error, message : message }
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
			url = window.location.href

		let regex   = new RegExp("[?&]" + name.replace(/[\[\]]/g, "\\$&") + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url)

		if (!results)
			return null

		if (!results[2])
			return ""

		return decodeURIComponent(results[2].replace(/\+/g, " "))
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
			new_url = url.replace(regex, "_" + key + ".$1?")

		//remove single question marks
		if (new_url[new_url.length - 1] == "?")
			new_url = new_url.substring(0, new_url.length - 1)

		return new_url
	},

	/**
	 * Image preloader
	 * @method preloadImages
	 * @param  {Array} images - The source paths
	 * @return {Array} An image object array
	 */
	preloadImages(images = []) {

		let objects = []

		//preload images
		for (let img of images) {

			let o = new Image()
			o.src = img

			objects.push(o)
		}

		return objects
	},

	/**
	 * jQuery Ajax Handler for loading state
	 * @method newAjaxLoadingHandler
	 * @param  {Object} ctx - The instance context for loading state
	 * @param  {Int} seconds - Interval time in seconds
	 */
	setAjaxLoadingHandler(ctx, seconds = 1000) {

		let ajax_timer
		//ajax handler, show loading if ajax takes more than a X secs
		let handler = function(opts, set_loading) {

			if (set_loading) {
				//clear timer
				clearTimeout(ajax_timer)
				//waiting time to show loading box
				ajax_timer = setTimeout(() => { ctx.loading.active = true }, seconds)
				return
			}

			//otherwise clear timer and hide loading
			clearTimeout(ajax_timer)
			ctx.loading.active = false
		}

		//ajax events
		$(document)
		 .ajaxSend((e, xhr, opts)     => { handler(opts, true)  })
		 .ajaxError((e, xhr, opts)    => { handler(opts, false) })
		 .ajaxComplete((e, xhr, opts) => { handler(opts, false) })
	},

	/**
	 * Sets pending server flash messages (stored in session), loaded automatically.
	 * @method setFlashAlerts
	 */
	setFlashAlerts() {

		let messages = $("#app-flash")

		if (!messages.length)
			return

		let s = this
		messages.children("div").each(function() {

			s.flashAlerts.push({ content : $(this).html(), type : $(this).attr("class") })
		})
	}
}
