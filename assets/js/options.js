var $wrap = document.querySelector('.main-container');

var $twilio_form = $wrap.querySelector('#twilio');
var $twilio_api_input = $wrap.querySelector('#twilio_api');
var $twilio_url_input = $wrap.querySelector('#twilio_url');
var $key_visibility_btn = $wrap.querySelector('#api_key_visibility');
var $save_gateway_info = $wrap.querySelector('#save_gateway');
var $status_text = $wrap.querySelector('#status');
var $clear_phones_btn = $wrap.querySelector('#clear_phones');
var $storage = $wrap.querySelector('#storage_usage');
var $current_message_templates = $wrap.querySelector('#current_message_templates');

var api_visible = false;

// ===================================================================
// Message template helpers
// ===================================================================
var save_message_templates = function(templates, callback){
    var no_callback_provided = arguments.count == 1;
    if(no_callback_provided){
        callback = function(){};
    }

    var templates_json = JSON.stringify(templates);
    STORAGE.set({'MESSAGE_TEMPLATES': templates_json}, callback);
};

var add_message_template = function(label, template, callback){
    var no_callback_provided = arguments.count == 1;
    if(no_callback_provided){
        callback = function(){};
    }

    with_custom_message_templates(function(templates){
        templates.push({
            'label': label,
            'template': template
        });
        save_message_templates(templates, callback);
    });
};

var display_current_message_templates = function(){
    with_custom_message_templates(function(templates){
        var update_message_template_template = get_template('update_message_template');
        var current_templates_html = "";
        for(var i=0; i<templates.length; i++){
            current_templates_html += ghetto_mustache(update_message_template_template,{
                'label': templates[i].label,
                'template': templates[i].template,
            });
        }
        if(current_templates_html){
            $current_message_templates.innerHTML = current_templates_html;
        }
        else{
            $current_message_templates.innerHTML = '<p>None: using built in defaults</p>';
        }

    });
};

var update_message_template = function(index, new_label, new_template, callback){
    var no_callback_provided = arguments.count == 3;
    if(no_callback_provided){
        callback = function(){};
    }
    with_custom_message_templates(function(templates){
        templates[index] = {
            'label': new_label,
            'template': new_template
        }
        save_message_templates(templates, callback);
    });
};

var delete_message_template = function(index, callback){
    var no_callback_provided = arguments.count == 1;
    if(no_callback_provided){
        callback = function(){};
    }
    with_custom_message_templates(function(templates){
        templates.splice(index, 1);
        save_message_templates(templates, callback);
    });
};

// ===================================================================
// Storage helpers
// ===================================================================
var clear_phone_storage = function(){
    var twilio_api = $twilio_api_input.value || '';
    var twilio_url = $twilio_url_input.value || '';
    var options_to_keep = [
        'ACCESS_TOKEN',
        'GATEWAY_URL',
        'MESSAGE_TEMPLATES'

    ];
    STORAGE.get(options_to_keep, function(data){
        var options = {};
        for (var d in data) {
            if (data.hasOwnProperty(d)) {
                if(data[d])
                    options[d] = data[d];
            }
        }
        STORAGE.clear(function(){
            var option_keys = Object.keys(options);
            if(!option_keys.length)
                return;

            for(var i=0; i<option_keys.length-1; i++){
                var k = option_keys[i];
                var q = {};
                q[k] = options[k];
                STORAGE.set(q);
            }
            var k = option_keys[option_keys.length-1];
            var q = {};
            q[k] = options[k];
            STORAGE.set(q, function(){
                $status_text.textContent = 'Phone numbers cleared';
                display_storage_usage();
            });
        });

    });
};

var display_storage_usage = function (){
    STORAGE.getBytesInUse(null, function(bytes){
        var percentage = bytes / STORAGE.QUOTA_BYTES;
        percentage = Math.round(percentage * 100) / 100;
        var info = '(' + bytes + ' / ' + STORAGE.QUOTA_BYTES + '): ' + percentage + '%';
        $storage.textContent = info;
    });
};

// ===================================================================
// Event handlers
// ===================================================================
$key_visibility_btn.addEventListener('click', function(evt){
    evt.preventDefault();
    if(api_visible){
        this.textContent = '(show)';
        $twilio_api_input.setAttribute('type', 'password');
        api_visible = false;
    }
    else{
        this.textContent = '(hide)';
        $twilio_api_input.setAttribute('type', 'text');
        api_visible = true;
    }
});

$save_gateway_info.addEventListener('click', function(evt){
    evt.preventDefault();
    STORAGE.set({'ACCESS_TOKEN': $twilio_api_input.value}, function(){
        $status_text.textContent = 'Access token saved. ';
        STORAGE.set({'GATEWAY_URL': $twilio_url_input.value}, function(){
            $status_text.textContent += 'Gateway url saved';
        });
    });
});

$clear_phones_btn.addEventListener('click', function(){
    clear_phone_storage();
});

dynamic_child_bind($wrap, "#add_message_template", "click", function($e, evt){
    evt.preventDefault();
    var $template_label = $wrap.querySelector('#new_message_template_label');
    var $template = $wrap.querySelector('#new_message_template');
    var label = $template_label.value;
    var template = $template.value;
    if(!template || !label)
        return;

    add_message_template(label, template, function(){
        $status_text.textContent = 'Message template created';
        display_current_message_templates();
    });
});

dynamic_child_bind($wrap, ".update_message_template", "click", function($e, evt){
    evt.preventDefault();
    var $form = get_parent($e, 1);
    var label = $form.querySelector('.message_template_label').value;
    var template = $form.querySelector('.message_template').value;
    if(!template || !label)
        return;

    var $all_update_forms = $wrap.querySelectorAll('.update_template_form');
    $all_update_forms = Array.prototype.slice.call($all_update_forms);
    var form_index = $all_update_forms.indexOf($form);

    update_message_template(form_index, label, template, function(){
        $status_text.textContent = 'Message template updated';
        display_current_message_templates();
    });
});

dynamic_child_bind($wrap, ".delete_message_template", "click", function($e, evt){
    evt.preventDefault();
    var $form = get_parent($e, 1);

    var $all_update_forms = $wrap.querySelectorAll('.update_template_form');
    $all_update_forms = Array.prototype.slice.call($all_update_forms);
    var form_index = $all_update_forms.indexOf($form);

    delete_message_template(form_index, function(){
        $status_text.textContent = 'Message template deleted';
        display_current_message_templates();
    });
});
// ===================================================================
// Onload
// ===================================================================

// Provide the inital twilio settings if available
STORAGE.get(['ACCESS_TOKEN', 'GATEWAY_URL'], function(data){
    var twilio_api = data['ACCESS_TOKEN'] || '';
    var twilio_url = data['GATEWAY_URL'] || '';
    $twilio_api_input.value = twilio_api;
    $twilio_url_input.value = twilio_url;
});

display_storage_usage();
display_current_message_templates();
/*/
STORAGE.remove('MESSAGE_TEMPLATES');
/**/
