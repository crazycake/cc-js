/**
 * Auth Module - Handles Auth actions
 * @module Auth
 */

//++ UI selectors
_.assign(APP.UI, {
    sel_account_modal : "#app-modal-account-activation"
});

export default {
    name : "auth",
    vm : {
        data : {
            email : ""
        },
        methods : {
            // Register user by email
            registerUserByEmail(e) {

                //request with promise
                core.ajaxRequest({ method : "POST", uri : "auth/register" }, e.target);
            },
            // Login user by email
            loginUserByEmail(e) {

                //set callback function for specific error message
                var events = {
                    onClick : {
                        ACCOUNT_PENDING : self.vm.openActivationForm //binded method
                    }
                };

                //request with promise
                core.ajaxRequest({ method : "POST", uri :"auth/login" }, e.target, null, events);
            },
            // Resend activation mail message
            resendActivationMailMessage(e) {

                //request with promise
                core.ajaxRequest({ method : "POST", uri : "auth/resendActivationMailMessage" }, e.target)
                .then(function(payload) {

                    if (!payload) {
                        core.modules.forms.recaptchaReload();
                        return;
                    }

                    //modal closer
                    core.ui.hideModal($(APP.UI.sel_account_modal));
                    //show succes message
                    core.ui.showAlert(payload, "success");

                });
            },
            // Opens a modal for send activation mail action
            openActivationForm() {

                //reset recaptcha
                core.modules.forms.recaptchaReload();

                //new modal
                core.ui.newModal($(APP.UI.sel_account_modal));
            }
        }
    }
};
