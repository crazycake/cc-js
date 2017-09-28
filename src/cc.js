/**
 * Main Bundler
 * ES6 required (babel)
 */

//load main libraries
import "html5shiv";
import "fastclick";
import "lodash";
import "bluebird";
import "jquery";
import "fg-loadcss";

//modules
import core from "./core.js";

//export core property
module.exports.core = core;
window.core = core;
