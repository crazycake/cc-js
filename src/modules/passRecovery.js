/**
 * Password Recovery Module
 * @module PassRecovery
 */

export default {
    name : "passRecovery",
    vm : {
		el : "#vue-passRecovery",
        methods : {
            // Send Recovery Instructions
            sendRecoveryInstructions(e) {

                core.ajaxRequest({ method : "POST", uri : "password/sendRecoveryInstructions" }, e.target)
                .then(function(payload) {

                    if (!payload) {
                        core.modules.forms.recaptchaReload();
                        return;
                    }
                });
            },
            // Saves new password from recovery password form
            saveNewPassword(e) {

                core.ajaxRequest({ method : "POST", uri : "password/saveNewPassword" }, e.target);
            }
        }
    }
};
