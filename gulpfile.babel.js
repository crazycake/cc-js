/**
 * Bundle Builder
 */

// required modules
import babelify   from "babelify"
import browserify from "browserify"
import source     from "vinyl-source-stream"
import watchify   from "watchify"
import yargs      from "yargs"
import gulp       from "gulp"
import colors     from "ansi-colors"
import logger     from "fancy-log"

// get arguments / defaults
let environment = yargs.argv.e || "production"
let bundle_arg  = yargs.argv.b || "cc"

// set consts
const bundle_name =  bundle_arg
const bundle_src  = "./src/" + bundle_name + ".js"
const bundle_dist = "./dist/js/"

// set environment
process.env.NODE_ENV = environment

logger(colors.blue("Environment:", environment))
logger(colors.blue("Bundle:", bundle_arg))

//++ Browserify

// set up the browserify instance on a task basis
const browserify_conf = {
	entries     : [bundle_src],
	cache       : {},
	packageCache: {},
	debug       : !(environment == "production") //true enables source-maps
}

// browserify instance
let b = watchify(browserify(browserify_conf))
		//es6 transpiler
		.transform(babelify, {
			presets: ["env"]
		})
		//minify
		.transform({
			global: true
		}, "uglifyify")

// require bundle with expose name, enables require("bundle_name")
b.require([bundle_src], { expose: bundle_name })
// events
b.on("update", bundleApp)  //on any dep update, runs the bundler
b.on("log", logger)        //output build logs to terminal

function bundleApp() {

	return b.bundle()
		.pipe(source(bundle_name + ".bundle.min.js"))
		//prepend contents
		.pipe(gulp.dest(bundle_dist))
}

//++ Tasks

gulp.task("js", bundleApp)
gulp.task("watch", ["js"])
gulp.task("build", ["js"], () => { process.exit() })
gulp.task("default", ["watch"])
