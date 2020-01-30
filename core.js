/**
 * core.js
 *
 * Global Scope:
 *
 * APP = {
 *   baseUrl: 'https://example.com/',
 *   staticUrl: 'https://cdn.example.com/',
 *   TRANS: {
 *     ALERTS: { ACCESS_FORBIDDEN (401), SERVER_TIMEOUT (408), NOT_FOUND (404), CSRF (498), SERVER_ERROR (500) }
 *   }
 * };
 *
 * Response Struct:
 *
 * success => {
 *  code: "200",
 *  status: "ok",
 *  payload: { ... }
 * }
 *
 * error => {
 *  code: "400",
 *  status: "error,
 *  error: "Bad Request",
 *  message: "Unexpected response"
 * }
 */

import axios from "axios"
import qs    from "query-string"

export default {

	/**
	 * @property timeout - request timeout (seconds)
	 */
	timeout: 44000,

	/**
	 * @property logs - flag for console logs
	 */
	logs: true,

	// ++ Methods

	/**
	* Helper Get BaseUrl
	* @param {String} uri - Append URI if defined
	* @return String
	*/
	baseUrl: (uri = "") => (APP.baseUrl || './') + uri,

	/**
	* Helper Get StaticUrl
	* @param {String} uri - Append URI if defined
	* @return String
	*/
	staticUrl: (uri = "") => (APP.staticUrl || './') + uri,

	/**
	 * Ajax request with response handler.
	 * @param {Object} request - Axios request object
	 * @param {Object} ctx - The html context (auto-disable submit button to prevent bubble clicking)
	 * @return {Object} promise
	 */
	ajaxRequest(request = null, ctx = null) {

		if (!request) throw new Error("Core -> ajaxRequest: invalid request object")

		let payload = {},
			button  = null

		// check form element has a form data-invalid attribute
		if (ctx) {

			// disable submit button
			button = ctx.querySelector("button")

			if (button) button.setAttribute("disabled", "true")
		}

		// send CSRF token?
		if (request.method == "POST" && document.head.querySelector('meta[name="csrf-key"]'))
			payload[document.head.querySelector('meta[name="csrf-key"]').content] = document.head.querySelector('meta[name="csrf-value"]').content

		// set options
		let options = Object.assign({ method: "GET", timeout: this.timeout }, request)

		// self url?
		if (options.uri) options.url = this.baseUrl(options.uri)

		// headers
		let headers = {

			'X-Requested-With': 'XMLHttpRequest',
			'Content-Type'    : 'application/x-www-form-urlencoded; charset=UTF-8'
		}

		options.headers = Object.assign(headers, request.headers || {})

		// payload
		if (request.method == "POST")
			options.data = qs.stringify(Object.assign(payload, request.data || {}))

		this.console('log', "Core -> new XHR request", options)

		return axios(options)
			// success
			.then(res => {

				if (button) button.removeAttribute("disabled")

				this.console('log', `Core -> parsing response [${res.data.status || 0}][${options.url}]`, res.data)

				// check for response error
				if (!res.data.status || res.data.status == "error")
					return this.parseAjaxError(res.data)

				// success
				return res.data.redirect ? window.location.href = res.data.redirect : res.data.payload || {}
			})
			// error
			.catch(e => {

				if (button) button.removeAttribute("disabled")

				return this.parseAjaxError(e)
			})
	},

	/**
	 * Ajax Error Response Handler
	 * @param {Object} data - The response data
	 * @return {Object}
	 */
	parseAjaxError(data) {

		let code    = data.code || 0,
			error   = data.error || "canceled",
			message = data.message || null

		const errors = APP.TRANS ? {

			'401': APP.TRANS.ALERTS.ACCESS_FORBIDDEN,
			'408': APP.TRANS.ALERTS.SERVER_TIMEOUT,
			'404': APP.TRANS.ALERTS.NOT_FOUND,
			'498': APP.TRANS.ALERTS.CSRF,
			'500': APP.TRANS.ALERTS.SERVER_ERROR
		} : {}

		// timeout
		if (code == "ECONNABORTED") message = errors['408'], error = "timeout"

		// defined message
		else if (errors[code]) message = errors[code]

		if (!data.code) this.console('warn', `Core -> parseAjaxError, data:`, data || undefined)

		return { code, error, message }
	},

	/**
	 * Ajax Handler for loading state
	 * @param {Object} ctx - The instance context for loading state
	 * @param {Int} seconds - Interval time in seconds
	 */
	setAjaxLoadingHandler(ctx, seconds = 1500) {

		let timer,
			handler = (settings, activate) => {

			// optional parameter to skip loading handler
			if (settings && settings.loading === false) return

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
		axios.interceptors.response.use(resp => { handler(resp.config, false); return resp }, e => { handler(e.config, false); return Promise.reject(e) })
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
		if (url[url.length - 1] == "?") url = url.substring(0, url.length - 1)

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
	},

	/**
	 * Console Messages
	 * @param {String} type - The console fn
	 * @param {Multiple} - Multiple data params
	 */
	console(type, ...data) { return this.logs ? console[type](...data) : null }
}
