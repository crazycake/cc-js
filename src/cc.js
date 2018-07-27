/**
 * Core Bundle
 */

// load main libraries
import "fastclick"
import "lodash"
import "jquery"

// modules
import core from "./core.js"

// exports to bundle scope
module.exports.cc = core
// exports to global scope
window.cc = core
