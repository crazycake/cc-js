/**
 * Test Module
 */

import cc from "./core.js"

// expose
window.cc = cc

// module example
const Test = {

	name: "test",

	loading: { active: false },

	init() {

		console.log("Test -> initialized")

		cc.setAjaxLoadingHandler(this)

		cc.logs = false
	},

	fetchTest() {

		const url = "https://httpbin.org/get"

		const ctx = document.getElementById('app')

		console.log("Test (fetch) -> Axios request", url, ctx)

		cc.ajaxRequest({ method: "GET", url, loading: false }, ctx)
		.then(payload => {

			console.log("Test (fetch) -> Ok, parsed response:", payload)
		})
		.catch(e => console.warn("Test (fetch) -> Exception, axios failed", e))
	}
}

// set example app
cc.app = Test
