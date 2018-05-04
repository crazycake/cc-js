/**
 * Main Bundler
 * ES6 required (babel)
 */

//load main libraries
import "fastclick"
import "lodash"
import "jquery"
import "fg-loadcss"

//modules
import core from "./core.js"

//export core property
module.exports.core = core
window.core = core
