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

		cc.logs = false
	},

	fetchTest() {

		let url = "https://httpbin.org/get"

		let ctx = document.getElementById('app')

		console.log("Test (fetch) -> Axios request", url, ctx)

		cc.ajaxRequest({ method: "GET", url, loading: false }, ctx)
		.then(payload => {

			console.log("Test (fetch) -> Ok, parsed response:", payload)
		})
		.catch(e => console.warn("Test (fetch) -> Exception, axios failed", e))
	}
}

// set example module
cc.setModules([ Test ])
