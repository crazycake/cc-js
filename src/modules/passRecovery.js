/**
 * Password Recovery View Model
 * @class PassRecovery
 */

export default new function() {

    //++ Module
    var self  = this;
    self.name = "passRecovery";

    //++ View Model
    self.vm = {
        methods : {}
    };

    //++ Methods

    /**
     * Send Recovery Instructions
     * @method sendRecoveryInstructions
     * @param  {Object} event - The Event Handler
     */
    self.vm.methods.sendRecoveryInstructions = function(e) {

        //request with promise
        core.ajaxRequest({ method : "POST", uri : "password/sendRecoveryInstructions" }, e.target)
        .then(function(payload) {

            if (!payload) {
                core.modules.forms.recaptchaReload();
                return;
            }
        });
    };

    /**
     * Saves new password from recovery password form
     * @method saveNewPassword
     * @param  {Object} event - The Event Handler
     */
    self.vm.methods.saveNewPassword = function(e) {

        //request with promise
        core.ajaxRequest({ method : "POST", uri : "password/saveNewPassword" }, e.target);
    };
};
