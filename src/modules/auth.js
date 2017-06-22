/**
 * Auth Module - Handles Auth actions
 * @module Auth
 */

//++ UI selectors
const SEL_ACCOUNT_MODAL = "#app-modal-account-activation";

export default {
	name : "auth",
	vm : {
		el : "#vue-auth",
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
						ACCOUNT_PENDING : this.openActivationForm
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
					core.ui.hideModal($(SEL_ACCOUNT_MODAL));
					//show succes message
					core.ui.showAlert(payload, "success");

				});
			},
			// Opens a modal for send activation mail action
			openActivationForm() {

				//reset recaptcha
				core.modules.forms.recaptchaReload();

				//new modal
				core.ui.newModal($(SEL_ACCOUNT_MODAL));
			}
		}
	}
};
