/**
 * Forms Module - Handle Form Validation & Actions
 * Dependencies: ```formValidation jQuery plugin```, ```google reCaptcha JS SDK```
 * @module Forms
 */
 /* global grecaptcha */
 /* eslint no-undef: "error" */

//++ UI Selectors
_.assign(APP.UI, {
    sel_recaptcha : "#app-recaptcha"
});

export default {
    name  : "forms",
    debug : false,
    /**
     * Autoloads validation for `form[data-validate]` selector
     * @method load
     * @param {Object} context - The jQuery object element context (optional)
     */
    load(context) {

        var forms = _.isNil(context) ? $("form[data-validate]") : $("form[data-validate]", context);

        if (!forms.length) return;

        var s = this;
        //loop through each form
        forms.each(function() {

            //get required inputs
            var options  = { fields : {} };

            //loop through each element form
            $(this).find("[data-fv-required]").each(function() {
                //object reference
                var name = $(this).attr("name");

                //skip undefined names
                if (_.isNil(name))
                    return;

                //set validators
                options.fields[name] = {
                    validators : { notEmpty : {} }
                };

                //append required props
                s.setFieldPattern($(this), options.fields[name].validators);
            });

            //new Form Validation instance
            s.newValidator($(this), options);
        });
    },

    /**
     * Creates a New Form Validation. (private use)
     * Ref: [http://formvalidation.io/api/]
     * TODO: set bootstrap icon classes (glyphs)
     * @method newValidator
     * @param  {Object} form - A form jQuery object or native element
     * @param  {Object} options - Extended Options
     */
    newValidator(form = null, options) {

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
            onSuccess : function(e) {
                e.preventDefault();
            }
        };

        //extend options
        _.assign(opts, options);

        //init plugin
        if (this.debug) { console.log("Forms -> loading form with options:", opts); }
        //instance
        form.formValidation(opts);
    },

    /**
     * Check if a Form is valid [formValidator]
     * @method isValid
     * @param  {Object} form - A form jQuery object or native element
     * @return {Boolean}
     */
    isValid(form) {

        if (form instanceof jQuery === false)
            form = $(form);

		//no form validation instance
        if (_.isUndefined(form.data) || _.isUndefined(form.data("formValidation")))
            return true;

        //check for input hidden fields that are required
        var inputs_hidden = form.find("input[type='hidden'][data-fv-excluded='false']");

        if (inputs_hidden.length) {

            if (this.debug) { console.log("Forms -> Revalidating hidden inputs..."); }
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

        if (!is_valid && this.debug) {

            console.log("Forms -> Some form element(s) are not valid:");

            form.data("formValidation").getInvalidFields().each(function() {
                console.log($(this).attr("name"), $(this));
            });
        }

        return is_valid;
    },

    /**
     * Revalidates a field in form.
     * @method revalidateField
     * @param  {String} field - The field name
     * @param  {Object} form - A form jQuery object or native element context (optional)
     */
    revalidateField(field, form = null) {

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
        form.find("[data-fv-required]").each(function() {
            fv.updateStatus($(this).attr("name"), "NOT_VALIDATED");
        });
    },

    /**
     * Enable or Disable form submit buttons
     * @method enableSubmitButtons
     * @param  {Object} form - A form jQuery object or native element
     * @param  {Boolean} flag - The enable/disable flag, defaults to tue
     */
    enableSubmitButtons(form, flag = true) {

        if (form instanceof jQuery === false)
            form = $(form);

        let fv = form.data("formValidation");
        fv.disableSubmitButtons(!flag);
    },

    /**
     * Cleans a form and reset validation
     * @method clean
     * @param  {Object} form - A form jQuery object or native element
     * @param  {Boolean} force - Selector clean up.
     */
    clean(form, force = false) {

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
    },

    /**
     * Update hidden validators in given context
     * @method updateHiddenValidators
     * @param  {Object} form - A form jQuery object or native element
     */
    updateHiddenValidators(form) {

        if (form instanceof jQuery === false)
            form = $(form);

        $('input[data-fv-validator="true"]', form).val("1");
    },

    /**
     * Add a dynamic field to form
     * @method addField
     * @param  {String} field_name - The field name
     * @param  {Object} context - A jQuery object or native element
     * @param  {Object} validators_obj - Validators Object (formValidation)
     */
    addField(field_name, context, validators_obj) {

        if (context instanceof jQuery === false)
            context = $(context);

        //field target
        let field;
        //set object
        if (field_name instanceof jQuery === true)
            field = field_name;
        else
            field = $("[name='"+field_name+"']", context);

        //default validator
        let v = {validators : { notEmpty : {} }};

        if (_.isObject(validators_obj))
            v = { validators : validators_obj };

        //append required props
        this.setFieldPattern(field, v.validators);

        let form = field.closest("form");

        if (_.isUndefined(form)) {
            console.warn("Forms -> addField: Cant find closest element form for field.", field);
            return;
        }

        if (_.isUndefined(form.data("formValidation")))
            return;

        let fv = form.data("formValidation");
        //formValidation API
        fv.addField(field_name, v);
    },

    /**
     * Set validator field pattern in data attribute
     * @method setFieldPattern
     * @param  {object} field - The jQuery field object
     * @param  {object} validators - The validators object
     */
    setFieldPattern(field, validators) {

        try {

            let pattern = field.attr("data-fv-required");

            if (!pattern.length)
                return;

            let obj = eval("({" + pattern + "})");
            //append required props
            _.assign(validators, obj);
        }
        catch (e) {
            console.warn("Form -> setFieldPattern exception:", e);
        }
    },

    /**
     * Strips HTML from a given string
     * @method stripHtml
     * @param  {string} string - An input string
     * @return {string}
     */
    stripHtml(string = null) {

        if(_.isNull(string))
            return "";

        return string.replace(/<\/?[^>]+(>|$)/g, "");
    },

    /**
    * App Google reCaptcha onLoad Callback.
    * Function name is defined in script loader.
    * @method recaptchaOnLoad
    * @property {Object} grecaptcha is global and is defined by reCaptcha SDK.
    */
    recaptchaOnLoad() {

        if (this.debug) { console.log("Forms -> reCaptcha loaded! Main Selector: " + APP.UI.sel_recaptcha); }

        var selector = $(APP.UI.sel_recaptcha);
        var s        = this;

        //calback function when user entered valid data
        let callback_fn = function() {

            if (s.debug) { console.log("Forms -> reCaptcha validation OK!"); }

            //set valid option on sibling input hidden
            $(APP.UI.sel_recaptcha).siblings("input:hidden").eq(0).val("1");
            //reset form field
            s.revalidateField("reCaptchaValue");
        };

        //widget size
        let size  = !_.isUndefined(selector.attr("data-size")) ? selector.attr("data-size") : "normal";
        let theme = !_.isUndefined(selector.attr("data-theme")) ? selector.attr("data-theme") : "light";

        //render reCaptcha through API call
        grecaptcha.render(APP.UI.sel_recaptcha.replace("#", ""), {
            "sitekey"  : APP.googleReCaptchaID,
            "size"     : size,
            "theme"    : theme,
            "callback" : callback_fn
        });

        //hide after x secs, clean any previous error
        _.delay(() => { selector.siblings("small").eq(0).empty(); }, 1500);
    },

    /**
     * Reloads a reCaptcha element.
     * @method recaptchaReload
     */
    recaptchaReload() {

        if (this.debug) { console.log("Forms -> reloading reCaptcha..."); }

        //reset reCaptcha
        if (!_.isUndefined(grecaptcha))
            grecaptcha.reset();

        //clean hidden input for validation
        $(APP.UI.sel_recaptcha).siblings("input:hidden").eq(0).val("");
    }
};
