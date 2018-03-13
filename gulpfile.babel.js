/**
 * Bundle Builder
 */

//required modules
import babelify   from "babelify";
import browserify from "browserify";
import source     from "vinyl-source-stream";
import watchify   from "watchify";
import yargs      from "yargs";
//gulp
import gulp  from "gulp";
import gutil from "gulp-util";

//get argument
let environment = yargs.argv.e;
let bundle_arg  = yargs.argv.b;

//check args
environment = (typeof environment != "undefined") ? environment : "production";
bundle_arg = (typeof bundle_arg != "undefined") ? bundle_arg : "cc";

//set consts
const bundle_name =  bundle_arg;
const bundle_src  = "./src/" + bundle_name + ".js";
const bundle_dist = "./dist/js/";

//set environment
process.env.NODE_ENV = environment;

//++ Browserify

// set up the browserify instance on a task basis
const browserify_conf = {
	entries      : [bundle_src],
	cache        : {},
	packageCache : {},
	debug        : !(environment == "production") //true enables source-maps
};

//set browserify object
var webpack = watchify(browserify(Object.assign({}, watchify.args, browserify_conf)))
				//es6 transpiler
				.transform(babelify, {
					presets : ["es2015"],
					ignore  : "./src/plugins/"
				})
				//minify
				.transform({
					global : true
				}, "uglifyify");

//require bundle with expose name
webpack.require([bundle_src], { expose : bundle_name });
//events
webpack.on("update", bundleApp); //on any dep update, runs the bundler
webpack.on("log", gutil.log);    //output build logs to terminal

function bundleApp() {
	//browserify js bundler
	return webpack.bundle()
		.on("error", gutil.log.bind(gutil, "Browserify Bundler Error"))
		.pipe(source(bundle_name + ".bundle.min.js"))
		//prepend contents
		.pipe(gulp.dest(bundle_dist));
}

//++ Tasks

gulp.task("js", bundleApp);
gulp.task("watch", ["js"]);
gulp.task("build", ["js"], () => { process.exit(); });
gulp.task("default", ["watch"]);
