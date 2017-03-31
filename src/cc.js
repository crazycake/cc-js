/**
 * Core Main Bundler
 * ES6 required (babel)
 * @module Main
 */

//load main libraries
import "html5shiv";
import "fastclick";
import "lodash";
import "bluebird";
import "js-cookie";
import "jquery";
import "fg-loadcss";

//plugins
import "./plugins/jquery.extended.js";
import "./plugins/jquery.cclayer.js";
import "./plugins/jquery.ccdialog.js";
import "./plugins/formValidation.popular.js";
import "./plugins/formValidation.bootstrap4.js";
import "./plugins/formValidation.foundation6.js";
import "./plugins/formValidation.pure.js";

//modules
import core from "./modules/core.js";
import auth from "./modules/auth.js";
import forms from "./modules/forms.js";
import passRecovery from "./modules/passRecovery.js";
import facebook from "./modules/facebook.js";

//export core property
module.exports.core = core;
window.core = core;

//init core
core.init();

//set modules
core.setModules([
    auth,
    forms,
    passRecovery,
    facebook
]);
