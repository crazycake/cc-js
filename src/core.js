/**
 * Core Module
 * Required scope vars: {APP}
 */

export default {

	/**
	 * @property modules
	 */
	modules: {},

	/**
	 * @property timeout - XHR Max Timeout (seconds)
	 */
	timeout: 44000,

	/**
	 * @property flashAlerts
	 */
	flashAlerts: [],

	//++ Methods ++

	/**
	* Set modules
	* @param {Array} modules - The required modules
	*/
	setModules(modules = []) {

		for (let mod of modules) {

			if (mod.name)
				this.modules[mod.name] = mod
		}
	},

	/**
	 * Starter, if module has a viewModel binds it to DOM automatically
	 * @param {Array} - The modules array
	 */
	start(modules = []) {

		// check that App Global scope vars are defined
		if (APP == undefined) throw new Error("Core -> APP global scoped var is not defined!")

		// call initializers
		for (let name in modules) {

			// check module exists
			if (!this.modules[name]) {

				console.warn(`Core -> attempting to load an undefined module: ${name}.`)
				continue
			}

			// check if module has init method & call it
			if (_.isFunction(this.modules[name].init))
				this.modules[name].init(modules[name])
		}

		this.loadUI()
	},

	/**
	 * Core load UI, called automatically after loading modules.
	 */
	loadUI() {

		// load fast click for mobile
		if (APP.UA && APP.UA.isMobile && FastClick)
			FastClick.attach(document.body)

		// look for server flash messages
		this.setFlashAlerts()
	},

	/**
	* Helper Get BaseUrl
	* @param  {String} uri - Append URI if defined
	* @return String
	*/
	baseUrl(uri = "") {

		return APP.baseUrl + uri
	},

	/**
	* Helper Get StaticUrl
	* @param  {String} uri - Append URI if defined
	* @return String
	*/
	staticUrl(uri = "") {

		return APP.staticUrl + uri
	},

	/**
	 * Ajax request with response handler.
	 * @param  {Object} request - Axios request object
	 * @param  {Object} ctx - The html context (prevent bubble clicking)
	 * @param  {Object} csrf - Append APP.UA CRSF token key & value
	 * @return {Object} promise
	 */
	ajaxRequest(request = null, ctx = null, csrf = true) {

		if (!request) throw new Error("Core -> ajaxRequest: invalid request object")

		let payload = {},
			button  = null

		// check form element has a form data-invalid attribute
		if (ctx) {

			// check for a non jquery object
			ctx = ctx instanceof jQuery === false ? $(ctx) : ctx

			// disable submit button
			button = ctx.find("button")

			if (button.length) button.prop("disabled", true)
		}

		// append CSRF token?
		if (request.method == "POST" && csrf && !_.isNil(APP.UA.csrfKey))
			payload[APP.UA.csrfKey] = APP.UA.csrfValue

		// set options
		let options = _.assign({ method: "GET", dataType: "json", timeout: this.timeout }, request)

		// payload
		options.data = _.assign(request.data || {}, payload)

		if (options.uri)
			options.url = this.baseUrl(options.uri)

		console.log("Core -> new XHR request", options)

		return $.ajax(options)
			.then((data) => {

				console.log(`Core -> parsing ajax response [${data.status || 0}]`, data)

				// check for response error
				if (data.status == "error") return this.parseAjaxError(data)

				// success
				return data.redirect ? location.href = data.redirect : (data.payload || {})
			})
			.fail((xhr, textStatus) => {

				console.warn(`Core -> ajax request failed [${options.url}]`, textStatus, xhr.responseText || "none")
			})
			.always(() => button ? button.prop("disabled", false) : true)
	},

	/**
	 * Ajax Error Response Handler
	 * @param  {Object} data - The response data
	 * @return {Object}
	 */
	parseAjaxError(data) {

		let code    = data.code || 400,
			error   = data.error || "unknown",
			message = data.message || null

		const errors = {
			'401': APP.TRANS.ALERTS.ACCESS_FORBIDDEN,
			'408': APP.TRANS.ALERTS.SERVER_TIMEOUT,
			'404': APP.TRANS.ALERTS.NOT_FOUND,
			'498': APP.TRANS.ALERTS.CSRF,
			'500': APP.TRANS.ALERTS.SERVER_ERROR
		}

		// sever error
		if (error == "parsererror") message = errors['500']

		// timeout
		else if (error == "timeout") message = errors['408']

		// defined message
		else if (errors[code]) message = errors[code]

		return { code, error, message }
	},

	/**
	 * Get URI parameter by name
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
	 * Get resized image path
	 * Example: `./media/dj/IMAGE1.jpg?v=5`
	 *          `./media/dj/IMAGE1_TH.jpg?v=5`
	 * @param  {String} url - An image URL
	 * @param  {String} key - The suffix key to append
	 * @return {String}
	 */
	resizedImagePath(url = "", key = "TN") {

		url = url.replace(/\.([0-9a-z]+)(?:[\?#]|$)/i, "_" + key + ".$1?")

		// remove single question mark?
		if (url[url.length - 1] == "?")
			url = url.substring(0, url.length - 1)

		return url
	},

	/**
	 * Image preloader
	 * @param  {Array} images - The source paths
	 * @return {Array} An image object array
	 */
	preloadImages(images = []) {

		let objects = []

		for (let img of images) {

			let o = new Image()
			o.src = img

			objects.push(o)
		}

		return objects
	},

	/**
	 * jQuery Ajax Handler for loading state
	 * @param  {Object} ctx - The instance context for loading state
	 * @param  {Int} seconds - Interval time in seconds
	 */
	setAjaxLoadingHandler(ctx, seconds = 1500) {

		let timer

		let handler = (opts, activate) => {

			// optional parameter to skip loading handler
			if (opts.loading === false)
				return

			if (activate) {

				clearTimeout(timer)

				timer = setTimeout(() => ctx.loading.active = true, seconds)
				return
			}

			// otherwise clear timer and hide loading
			clearTimeout(timer), ctx.loading.active = false
		}

		// xhr events
		$(document)
		 .ajaxSend((e, xhr, opts)     => handler(opts, true))
		 .ajaxError((e, xhr, opts)    => handler(opts, false))
		 .ajaxComplete((e, xhr, opts) => handler(opts, false))
	},

	/**
	 * Sets pending server flash messages (stored in session)
	 */
	setFlashAlerts() {

		let messages = $("#app-flash")

		if (!messages.length)
			return

		let s = this
		messages.children("div").each(function() {

			s.flashAlerts.push({ content: $(this).html(), type: $(this).attr("class") })
		})
	}
}
