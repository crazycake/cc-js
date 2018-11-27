/**
 * Core Module
 * Required scope vars: {APP}
 */

import axios from "axios"

export default {

	/**
	 * @property modules
	 */
	modules: {},

	/**
	 * @property timeout - request timeout (seconds)
	 */
	timeout: 44000,

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
	 * Starter
	 * @param {Array} - The modules array
	 */
	start(modules = []) {

		// check that App Global scope vars are defined
		if (!window.APP) throw new Error("Core -> APP global scoped var is not defined!")

		// call initializers
		for (let name in modules) {

			// check module exists
			if (!this.modules[name]) {

				console.warn(`Core -> attempting to load an undefined module: ${name}.`)
				continue
			}

			// check if module has init method & call it
			if (typeof this.modules[name].init == "function")
				this.modules[name].init(modules[name])
		}
	},

	/**
	* Helper Get BaseUrl
	* @param {String} uri - Append URI if defined
	* @return String
	*/
	baseUrl(uri = "") {

		return APP.baseUrl + uri
	},

	/**
	* Helper Get StaticUrl
	* @param {String} uri - Append URI if defined
	* @return String
	*/
	staticUrl(uri = "") {

		return APP.staticUrl + uri
	},

	/**
	 * Ajax request with response handler.
	 * @param {Object} request - Axios request object
	 * @param {Object} ctx - The html context (prevent bubble clicking)
	 * @param {Object} csrf - Append UA CRSF token key & value
	 * @return {Object} promise
	 */
	ajaxRequest(request = null, ctx = null, csrf = true) {

		if (!request) throw new Error("Core -> ajaxRequest: invalid request object")

		let payload = {},
			button  = null

		// check form element has a form data-invalid attribute
		if (ctx) {

			// disable submit button
			button = ctx.querySelector("button")

			if (button) button.setAttribute("disabled", "true")
		}

		// append CSRF token?
		if (request.method == "POST" && csrf && APP.UA.csrfKey)
			payload[APP.UA.csrfKey] = APP.UA.csrfValue

		// set options
		let options = Object.assign({ method: "GET", timeout: this.timeout }, request)

		// self url?
		if (options.uri) options.url = this.baseUrl(options.uri)

		// payload
		options.data = Object.assign(request.data || {}, payload)

		console.log("Core -> new XHR request", options)

		return axios(options)
			// success
			.then(res => {

				if (button) button.removeAttribute("disabled")

				console.log(`Core -> parsing ajax response [${res.data.status || 200}]`, res.data)

				// check for response error
				if (res.data.status == "error") return this.parseAjaxError(res.data)

				// success
				return res.data.redirect ? location.href = res.data.redirect : Promise.resolve(res.data.payload || {})
			})
			// error
			.catch(e => {

				if (button) button.removeAttribute("disabled")

				console.warn(`Core -> ajax request failed [${options.url}]`, e)
				return Promise.reject(e)
			})
	},

	/**
	 * Ajax Error Response Handler
	 * @param {Object} data - The response data
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
	 * Ajax Handler for loading state
	 * @param {Object} ctx - The instance context for loading state
	 * @param {Int} seconds - Interval time in seconds
	 */
	setAjaxLoadingHandler(ctx, seconds = 1500) {

		let timer

		let handler = (settings, activate) => {

			// optional parameter to skip loading handler
			if (settings.loading === false) return

			if (activate) {

				clearTimeout(timer)

				timer = setTimeout(() => ctx.loading.active = true, seconds)
				return
			}

			// otherwise clear timer and hide loading
			clearTimeout(timer), ctx.loading.active = false
		}

		// request interceptor
		axios.interceptors.request.use(config => { handler(config, true); return config }, e => { handler(e.config, false); return Promise.reject(e) })

		// response interceptor
		axios.interceptors.response.use(config => { handler(config, false); return config }, e => { handler(e.config, false); return Promise.reject(e) })
	},

	/**
	 * Get URI parameter by name
	 * @param {String} name - The parameter name
	 * @param {Boolean} url - Get from window URL by default
	 * @return {String}
	 */
	getQueryString(name, url = false) {

		if (!url) url = window.location.href

		let regex   = new RegExp("[?&]" + name.replace(/[\[\]]/g, "\\$&") + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url)

		if (!results)
			return null

		return results[2] ? decodeURIComponent(results[2].replace(/\+/g, " ")) : ""
	},

	/**
	 * Get resized image path
	 * Example: `./path/IMAGE1.jpg?v=5` => `./path/IMAGE1_TH.jpg?v=5`
	 * @param {String} url - An image URL
	 * @param {String} key - The suffix key to append
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
	 * @param {Array} images - The source paths
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
	}
}
