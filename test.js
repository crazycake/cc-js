/**
 * Test Module
 */

import cc from "./core.js"

// expose
window.cc = cc

// module example
let Test = {

	name: "test",

	loading : { active: false },

	init(data) {

		console.log("Test -> initialized", data)

		cc.setAjaxLoadingHandler(this)
	},

	fetchTest() {

		let url = "https://httpbin.org/get"

		let ctx = document.getElementById('app')

		console.log("Test (fetch) -> Axios request", url, ctx)

		return cc.ajaxRequest({ method: "GET", url, loading: false }, ctx)
			.then(payload => {

				if (payload.error)
					return console.warn("Test (fetch) -> Payload Error", payload.message)

				console.log("Test (fetch) -> completed!")
			})
			.catch(e => console.warn("Test (fetch) -> Axios failed:", e))
	}
}

// set example module
cc.setModules([ Test ])
