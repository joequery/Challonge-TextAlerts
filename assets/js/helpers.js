// ===============================================================
// Global constants
// ===============================================================
var STORAGE = chrome.storage.sync;
var OPTS_PREFIX = 'opts:';
var JOEQUERY_TWILIO_URL = 'http://twilio.joequery.me/sms';
var ENTER_KEYCODE = 13;
var TOURNEY_NAME = (function(){
    // Only applicable on challonge pages
    if(document.URL.search('challonge') == -1 )
        return '';
    else
        return document.querySelector('#title').textContent.trim();
})();
var NAMESPACE = TOURNEY_NAME + ':'
var DEFAULT_MESSAGE_TEMPLATE_OPTIONS = [
    {
        'label': 'Match starting now',
        'template': "{{player1}} vs {{player2}} is starting now."
    },
    {
        'label': 'Match up next',
        'template': "{{player1}} vs {{player2}} is next. Head to your station"
    },
    {
        'label': 'Match delayed',
        'template': "{{player1}} vs {{player2}} has been delayed."
    }
];
var MODAL_DIV_SELECTOR = '.tournament-bracket-modal div';

// ===============================================================
// JS Utilities
// ===============================================================
var arrays_are_equal = function(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

var endswith = function(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

var normalize_url = function(url){
    var url_copy = url; // document.URL is mutable when passed in
    if(endswith(url_copy, '#'))
        url_copy = url_copy.substr(0, url_copy.length-1);

    if(!endswith(url_copy, '/'))
        url_copy += '/';

    return url_copy;
};

// ===============================================================
// DOM helper functions
// ===============================================================
var each_$ = function($elements, handler){
    Array.prototype.forEach.call($elements, handler);
};

var add_listener = function($elements, the_event, handler){
    each_$($elements, function($el, i){
        $el.addEventListener(the_event, handler);
    });

};

var find_children = function($elements, child_selector){
    var children = [];
    each_$($elements, function($el, i){
        var this_els_children = $el.querySelectorAll(child_selector);
        for(var i=0; i<this_els_children.length; i++)
            children.push(this_els_children[i]);
    });
    return children;
};

var get_parent = function($el, n){
    var $the_parent = $el;
    for(var i=0; i<n; i++){
        $the_parent = $the_parent.parentNode;
    }
    return $the_parent;
};

/*
 * handler takes the matched element as an argument. child_selector is a string.
 */
var dynamic_child_bind = function($the_parent, child_selector, the_event, handler){
    $the_parent.addEventListener(the_event, function(e){
        var $child_objs = $the_parent.querySelectorAll(child_selector);
        if(!$child_objs.length)
            return;

        var child_objs_arr = Array.prototype.slice.call($child_objs);
        if(child_objs_arr.indexOf(e.target) != -1){
            handler(e.target, e);
        }
    }, true);
};

/*
 * Only use this when dynamic_child_bind is not sufficient.
 */
var dynamic_global_bind = function($the_parent, selector, the_event, handler){
    var $body = document.querySelector('body');
    $body.addEventListener(the_event, function(e){
        var $child_objs = $the_parent.querySelectorAll(selector);
        if(!$child_objs.length)
            return;

        var child_objs_arr = Array.prototype.slice.call($child_objs);
        if(child_objs_arr.indexOf(e.target) != -1){
            handler(e.target, e);
        }
    }, true);
};

// ===============================================================
// Modal helpers
// ===============================================================

/*
 * This is idempodent, feel free to call multiple times.
 */
var init_modal_structure = function(){
    var $inner_wrap = document.querySelector('.inner-wrap');
    var modal_exists = !!$inner_wrap.querySelector('.modal');
    if(!modal_exists){
        var modal_html = ghetto_render_template('modal');
        $inner_wrap.insertAdjacentHTML('afterbegin', modal_html);
    }

    // Since we can't access the javascript to call the modal, we will rely on
    // the fact that bootstrap activates the modal when an element with
    // attribute data-toggle="modal" is clicked.
    var modal_trigger_exists = !!$inner_wrap.querySelector('#show_modal');
    if(!modal_trigger_exists){
        var span_html = "<a id='show_modal' data-toggle='modal' href='' data-hide-loading='1'></a>";
        $inner_wrap.insertAdjacentHTML('afterbegin', span_html);
    }
};

var display_modal = function(modal_html){
    init_modal_structure();
    var $inner_wrap = document.querySelector('.inner-wrap');
    var $trigger = $inner_wrap.querySelector('#show_modal');
    var $modal_div = document.querySelector(MODAL_DIV_SELECTOR);
    $trigger.click();
    $modal_div.innerHTML = modal_html;
};

var close_modal = function(){
    var $close_button = document.querySelector("a[data-dismiss=modal]");
    if($close_button){
        $close_button.click();
    }
};

// ===============================================================
// AJAX helper functions
// ===============================================================
/*
 * This is syncronous to avoid callback hell.
 */
var get_request = function(url){
    var request = new XMLHttpRequest();
    request.open('GET', url, false);
    request.onload = function(){
        if (request.status == 200){
            return request;
        }
        else{
            return null;
        }
    };
    request.send();
    return request.onload();
};

// ===============================================================
// Template helper functions
// ===============================================================
var get_template = function(template_name){
    var template_path = "templates/partials/" + template_name + ".html"
    var template_url = chrome.extension.getURL(template_path);
    var resp = get_request(template_url);
    var raw_template = resp.responseText;
    return raw_template;
};

/*
 * Don't include the template/ path with the template_name or the extension.
 * Returns the html string
 */
var render_template = function(template_name, context){
    context = arguments.length == 2 ? context : {};
    var raw_template = get_template(template_name);
    var template_html = Mustache.to_html(raw_template, context);
    return template_html;
};

/*
 * Avoid using Mustache when possible since it seems to be slow. It's useful for
 * complex templates still. Only plain variables allowed in the template here.
 */
var ghetto_mustache = function(template, context){
    for (var c in context) {
        if (context.hasOwnProperty(c)) {
            // How to replace all in javascript
            template = template.split("{{" + c + "}}").join(context[c]);
        }
    }
    return template;
};

var ghetto_render_template = function(template_name, context){
    context = arguments.length == 2 ? context : {};
    var raw_template = get_template(template_name);
    var template_html = ghetto_mustache(raw_template, context);
    return template_html;
};

// ==================================================================
// Storage helpers
// ==================================================================
var set_storage = function(key, value, callback){
    var no_callback_provided = arguments.count == 2;
    if(no_callback_provided){
        callback = function(){};
    }

    // Only way to get variable names as an object key in js
    var q  = {};
    q[key] = value;
    STORAGE.set(q, callback);
};

/*
 * Provide a prefix so that the same username can be used in multiple
 * tournaments without assuming they are the same person.
 */
var namespaced_name = function(player){
    return NAMESPACE + player;
};

/*
 * You can delete the phone entry by passing the empty string to the phone.
 */
var set_player_phone = function(player_name, phone, callback){
    player_name = namespaced_name(player_name);

    var no_callback_provided = arguments.count == 2;
    if(no_callback_provided){
        callback = function(){};
    }

    var should_delete_entry = phone === '';
    if(should_delete_entry){
        STORAGE.remove(player_name, callback);
    }
    else{
        set_storage(player_name, phone, callback);
    }

};

var with_player_phones = function(player_names, callback){
    var namespaced_names = [];
    for(var i=0; i<player_names.length; i++){
        namespaced_names.push(namespaced_name(player_names[i]));
    }

    STORAGE.get(namespaced_names, function(data){
        // Don't force the user of this helper function to deal with the
        // namespacing.
        var normal_names = {};
        var name;

        for (var d in data) {
            if (data.hasOwnProperty(d)) {
                name = d.substr(NAMESPACE.length);
                normal_names[name] = data[d];
            }
        }
        callback(normal_names);
    });
};

// ==================================================================
// Text message helpers
// ==================================================================
var send_text_message = function(to_nums, msg_body, callback){
    var no_callback_provided = arguments.count == 2;
    if(no_callback_provided){
        callback = function(request){};
    }

    STORAGE.get(['ACCESS_TOKEN', 'GATEWAY_URL'], function(data){
        var access_token = data['ACCESS_TOKEN'];
        var gateway_url = data['GATEWAY_URL'] || JOEQUERY_TWILIO_URL;
        msg_body = TOURNEY_NAME + ': ' + msg_body;
        post_data = {
            'to': to_nums,
            'body': msg_body,
            'access_token': access_token
        }
        var request = new XMLHttpRequest();
        request.open('POST', gateway_url, true);
        request.onload = function(){
            callback(request);
        }
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send(JSON.stringify(post_data));
    });
}

// ==================================================================
// Message template helpers
// ==================================================================
var with_custom_message_templates = function(callback){
    STORAGE.get(['MESSAGE_TEMPLATES'], function(data){
        var msg_templates_json = data['MESSAGE_TEMPLATES'] || '[]';
        var msg_templates_obj = JSON.parse(msg_templates_json);
        callback(msg_templates_obj);
    });
};

var with_message_templates = function(callback){
    with_custom_message_templates(function(templates){
        var the_templates;
        if(templates.length)
            the_templates = templates;
        else
            the_templates = DEFAULT_MESSAGE_TEMPLATE_OPTIONS;
        callback(the_templates);
    });
};


// ==================================================================
// Debug helpers
// ==================================================================
var storage_dump = function(){
    STORAGE.get(null, function(data){
        console.log(data);
        STORAGE.getBytesInUse(null, function(bytes){
            console.log("Bytes in use: " + bytes);
        });
    });
};
