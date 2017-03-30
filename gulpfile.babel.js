/**
 * Bundle Builder
 */

//required modules
import babelify   from "babelify";
import browserify from "browserify";
import assign     from "lodash.assign";
import source     from "vinyl-source-stream";
import watchify   from "watchify";
import yargs      from "yargs";
//gulp
import gulp  from "gulp";
import gutil from "gulp-util";

//get argument
let environment = yargs.argv.e;
let webpack_arg = yargs.argv.w;

//check args
environment = (typeof environment != "undefined") ? environment : "production";
webpack_arg = (typeof webpack_arg != "undefined") ? webpack_arg : "core";

//set consts
const webpack_name =  webpack_arg;
const webpack_src  = "./src/" + webpack_name + ".js";
const webpack_dist = "./dist/js/";

//set environment
process.env.NODE_ENV = environment;

//++ Browserify

// set up the browserify instance on a task basis
const browserify_conf = {
    entries      : [webpack_src],
    cache        : {},
    packageCache : {},
    debug        : !(environment == "production") //true enables source-maps
};

//set browserify object
var webpack = watchify(browserify(assign({}, watchify.args, browserify_conf)))
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
webpack.require([webpack_src], { expose : webpack_name });
//events
webpack.on("update", bundleApp); //on any dep update, runs the bundler
webpack.on("log", gutil.log);    //output build logs to terminal

function bundleApp() {
    //browserify js bundler
    return webpack.bundle()
        .on("error", gutil.log.bind(gutil, "Browserify Bundle Error"))
        .pipe(source(webpack_name + ".bundle.min.js"))
        //prepend contents
        .pipe(gulp.dest(webpack_dist));
}

//++ Tasks

gulp.task("js", bundleApp);
gulp.task("watch", ["js"]);
gulp.task("build", ["js"], () => { process.exit(); });
gulp.task("default", ["watch"]);
