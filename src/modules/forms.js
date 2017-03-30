/**
 * Forms View Model - Handle Form Validation & Actions
 * Dependencies: ```formValidation jQuery plugin```, ```google reCaptcha JS SDK```
 * @class Forms
 */
 /* global grecaptcha */
 /* eslint no-undef: "error" */

export default new function() {

    //++ Module
    var self  = this;
    self.name = "forms";

    //++ UI Selectors
	_.assign(APP.UI, {
        sel_recaptcha : "#app-recaptcha"
	});

    //++ Methods

    /**
     * Autoloads validation for `form[data-validate]` selector
     * @method load
     * @param {Object} context - The jQuery object element context (optional)
     */
    self.load = function(context) {

        var forms = (typeof context == "undefined") ? $("form[data-validate]") : $("form[data-validate]", context);

        if (!forms.length) return;

        //loop through each form
        forms.each(function() {
            //object reference
            var form = $(this);
            //get required inputs
            var elements = form.find("[data-fv-required]");
            var options  = {
                fields : {}
            };

            //loop through each element form
            elements.each(function() {
                //object reference
                var name = $(this).attr("name");

                //skip undefined names
                if (typeof name == "undefined") return;

                //set validators
                options.fields[name] = {
                    validators : { notEmpty : {} }
                };

                //append required props
                self.setFieldPattern($(this), options.fields[name].validators);
            });

            //new Form Validation instance
            self.newValidator(form, options);
        });
    };

    /**
     * Creates a New Form Validation. (private use)
     * Ref: [http://formvalidation.io/api/]
     * TODO: set bootstrap icon classes (glyphs)
     * @method newValidator
     * @param  {Object} form - A form jQuery object or native element
     * @param  {Object} options - Extended Options
     */
    self.newValidator = function(form = null, options) {

        //default selector
        if (_.isNull(form))
            throw new Error("Forms -> newValidator: A Form object is required!");

        if (form instanceof jQuery === false)
            form = $(form);

        //special case bootstrap 4
        let framework = core.framework;

        //NOTE: hardcoded, drop support for bootstrap3
        if(framework == "bootstrap")
            framework += "4";

         //set settings
         let opts = {
            framework : framework,
            err       : { clazz : "form-error" },
            /*icon : {
                valid      : "fa fa-check",
                invalid    : "fa fa-times",
                validating : "fa fa-refresh"
            }*/
            //on success
            onSuccess: function(e) {
                //prevent default submit
                e.preventDefault();
           }
        };

        //extend options
        _.assign(opts, options);

        //init plugin
        if (core.debug) { console.log("Forms -> loading form with options:", opts); }
        //instance
        form.formValidation(opts);
    };

    /**
     * Check if a Form is valid [formValidator]
     * @method isValid
     * @param  {Object} form - A form jQuery object or native element
     * @return {Boolean}
     */
    self.isValid = function(form) {

        if (form instanceof jQuery === false)
            form = $(form);

		//no form validation instance
        if (typeof form.data == "undefined" || typeof form.data("formValidation") == "undefined")
            return true;

        //check for input hidden fields that are required
        var inputs_hidden = form.find("input[type='hidden'][data-fv-excluded='false']");

        if (inputs_hidden.length) {

            if (core.debug) { console.log("Forms -> Revalidating hidden inputs..."); }
            //loop
            inputs_hidden.each(function() {
                //revalidate field
                form.data("formValidation").revalidateField($(this));
            });
        }

        //force validation first (API call)
        $(form).data("formValidation").validate();
        //check result
        var is_valid = form.data("formValidation").isValid();

        if (!is_valid && core.debug) {

            console.log("Forms -> Some form element(s) are not valid:");

            form.data("formValidation").getInvalidFields().each(function() {
                console.log($(this).attr("name"), $(this));
            });
        }

        return is_valid;
    };

    /**
     * Revalidates a field in form.
     * @method revalidateField
     * @param  {String} field - The field name
     * @param  {Object} form - A form jQuery object or native element context (optional)
     */
    self.revalidateField = function(field, form = null) {

        if(_.isNull(form)) {
            form = $("form[data-validate]");
        }
        else if (form instanceof jQuery === false) {
            form = $(form);
        }

        //get instance
        var fv = form.data("formValidation");

        //single field
        if(field != "all") {
            fv.updateStatus(field, "NOT_VALIDATED");
            return;
        }

        //update all fields
        form.find("[data-fv-required]").each(function(){
            fv.updateStatus($(this).attr("name"), "NOT_VALIDATED");
        });
    };

    /**
     * Enable or Disable form submit buttons
     * @method enableSubmitButtons
     * @param  {Object} form - A form jQuery object or native element
     * @param  {Boolean} flag - The enable/disable flag, defaults to tue
     */
    self.enableSubmitButtons = function(form, flag = true) {

        if (form instanceof jQuery === false)
            form = $(form);

        var fv = form.data("formValidation");
        fv.disableSubmitButtons(!flag);
    };

    /**
     * Cleans a form and reset validation
     * @method clean
     * @param  {Object} form - A form jQuery object or native element
     * @param  {Boolean} force - Selector clean up.
     */
    self.clean = function(form, force = false) {

        if (form instanceof jQuery === false)
            form = $(form);

        //clean form validations
        form.data("formValidation").resetForm(true);

        //force cleanup
        if(force) {
            //form cleaner
            $("input:checkbox, input:radio", form).prop("checked", false);
            $("input", form).not("input:radio").val("");
            $("textarea", form).val("");
            $("select", form).prop("selectedIndex", 0);
        }
    };

    /**
     * Update hidden validators in given context
     * @method updateHiddenValidators
     * @param  {Object} form - A form jQuery object or native element
     */
    self.updateHiddenValidators = function(form) {

        if (form instanceof jQuery === false)
            form = $(form);

        $('input[data-fv-validator="true"]', form).val("1");
    };

    /**
     * Add a dynamic field to form
     * @method addField
     * @param  {String} field_name - The field name
     * @param  {Object} context - A jQuery object or native element
     * @param  {Object} validators_obj - Validators Object (formValidation)
     */
    self.addField = function(field_name, context, validators_obj) {

        if (context instanceof jQuery === false)
            context = $(context);

        //field target
        var field;
        //set object
        if (field_name instanceof jQuery === true)
            field = field_name;
        else
            field = $("[name='"+field_name+"']", context);

        //default validator
        var v = {validators : { notEmpty : {} }};

        if (typeof validators_obj == "object")
            v = {validators : validators_obj};

        //append required props
        self.setFieldPattern(field, v.validators);

        var form = field.closest("form");

        if (typeof form == "undefined")
            return console.warn("Forms -> addField: Cant find closest element form for field.", field);
        else if (typeof form.data("formValidation") == "undefined")
            return;

        var fv = form.data("formValidation");
        //formValidation API
        fv.addField(field_name, v);
    };

    /**
     * Set validator field pattern in data attribute
     * @method setFieldPattern
     * @param  {object} field - The jQuery field object
     * @param  {object} validators - The validators object
     */
    self.setFieldPattern = function(field, validators) {

        try {

            var pattern = field.attr("data-fv-required");

            if (!pattern.length)
                return;

            var obj = eval("({" + pattern + "})");
            //append required props
            _.assign(validators, obj);
        }
        catch (e) {
            console.warn("Form pattern error:", e);
        }
    };

    /**
     * Strips HTML from a given string
     * @method stripHtml
     * @param  {string} string - An input string
     * @return {string}
     */
    self.stripHtml = function(string = null) {

        if(_.isNull(string))
            return "";

        return string.replace(/<\/?[^>]+(>|$)/g, "");
    };

    /**
    * App Google reCaptcha onLoad Callback.
    * Function name is defined in script loader.
    * @method recaptchaOnLoad
    * @property {Object} grecaptcha is global and is defined by reCaptcha SDK.
    */
    self.recaptchaOnLoad = function() {

        if (core.debug) { console.log("Forms -> reCaptcha loaded! Main Selector: " + APP.UI.sel_recaptcha); }

        var selector = $(APP.UI.sel_recaptcha);

        //calback function when user entered valid data
        let callback_fn = function() {

            if (core.debug) { console.log("Forms -> reCaptcha validation OK!"); }

            //set valid option on sibling input hidden
            $(APP.UI.sel_recaptcha).siblings("input:hidden").eq(0).val("1");
            //reset form field
            self.revalidateField("reCaptchaValue");
        };

        //widget size
        let size  = typeof selector.attr("data-size") != "undefined" ? selector.attr("data-size") : "normal";
        let theme = typeof selector.attr("data-theme") != "undefined" ? selector.attr("data-theme") : "light";

        //render reCaptcha through API call
        grecaptcha.render(APP.UI.sel_recaptcha.replace("#", ""), {
            "sitekey"  : APP.googleReCaptchaID,
            "size"     : size,
            "theme"    : theme,
            "callback" : callback_fn
        });

        //hide after x secs
        setTimeout(function() {
            //clean any previous error
            selector.siblings("small").eq(0).empty();
        }, 1500);
    };

    /**
     * Reloads a reCaptcha element.
     * @method recaptchaReload
     */
    self.recaptchaReload = function() {

        if (core.debug) { console.log("Forms -> reloading reCaptcha..."); }

        //reset reCaptcha
        if (typeof grecaptcha != "undefined")
            grecaptcha.reset();

        //clean hidden input for validation
        $(APP.UI.sel_recaptcha).siblings("input:hidden").eq(0).val("");
    };
};
