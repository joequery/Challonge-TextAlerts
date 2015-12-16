(function(){

var $wrapper_div = document.querySelector('#participant-management');
var phone_icon_url = chrome.extension.getURL('assets/img/phone_icon.png');
var phone_img_src = '<img class="phoneicon" src="' + phone_icon_url + '" alt="Edit phone number">';

// =======================================================================
// DOM helper functions
// =======================================================================
var reload_phone_icons = function(){
    var $player_lis = $wrapper_div.querySelectorAll('.participant-model');
    each_$($player_lis, function($e){
        var has_phone_icon = !!$e.querySelector('.phoneicon');
        if(!has_phone_icon){
            var $pencil_icon = $e.querySelector('.icon-pencil');
            console.log('$pencil_icon ',$pencil_icon );
            $pencil_icon.insertAdjacentHTML('beforebegin', phone_img_src);
        }
    });
};

var remove_phone_form = function(){
    var $phone_input_form = $wrapper_div.querySelector('#phone_submit');
    if($phone_input_form)
        $phone_input_form.parentElement.removeChild($phone_input_form);
};

var close_edit_form = function(){
    var $edit_form = $wrapper_div.querySelector('form[style$="block;"]');
    if($edit_form)
        $edit_form.style.display = 'none';
};

var display_phone_alert = function(template, context){
    var $alert_info = document.querySelector('.alert');
    if($alert_info)
        $alert_info.parentElement.removeChild($alert_info);
    var phone_alert_html = ghetto_render_template(template, context);
    $wrapper_div.insertAdjacentHTML('beforeBegin', phone_alert_html);
};

// =======================================================================
// Event handlers
// =======================================================================
dynamic_child_bind($wrapper_div, '.phoneicon', 'click', function($e){
    close_edit_form();

    var $parent_li = get_parent($e, 3);
    var player_name = $parent_li.firstElementChild.getAttribute('title');
    var $phone_input_form = $wrapper_div.querySelector('#phone_submit');
    if($phone_input_form){
        var forms_player_name = $phone_input_form.children[1].getAttribute('value');
        remove_phone_form();

        var should_toggle_and_stop = player_name == forms_player_name;
        if(should_toggle_and_stop)
            return;
    }

    with_player_phones([player_name], function(data){
        var $btn_controls = $parent_li.querySelector('.participant-controls');
        var phone_form_html = ghetto_render_template('save_phone', {
            'player': player_name,
            'phone': data[player_name] || ''
        });

        $btn_controls.insertAdjacentHTML('afterend', phone_form_html);
    });
});

// Having the normal edit form and the phone edit form open at the same time
// seems to cause data loss.
dynamic_child_bind($wrapper_div, '.icon-pencil', 'click', function($e){
    remove_phone_form();
});

// Account for player names changing. Phone numbers should still match up.
dynamic_global_bind($wrapper_div, 'li form', 'submit', function($e){
    var $player_li = get_parent($e, 1);
    var $player_name_input = $player_li.querySelector('.inline-participant_name');
    var old_player_name = $player_li.firstElementChild.getAttribute('title');
    var new_player_name = $player_name_input.value;

    if(new_player_name == old_player_name)
        return;

    // This is a contest to see how many race conditions I can fit into one
    // extension. I think I'm winning.
    setTimeout(function(){
        var $alert_box = $player_li.querySelector('.error-message');
        var name_taken = $alert_box.textContent;
        if(name_taken)
            return;

        with_player_phones([old_player_name], function(data){
            var phone_number =  data[old_player_name] || '';
            if(phone_number){
                set_player_phone(new_player_name, phone_number);
                set_player_phone(old_player_name, '');
            }
        });
    }, 500);
});

dynamic_global_bind($wrapper_div, '#phone_input', 'keyup', function($e, evt){
    var enter_key_pressed = evt.keyCode == ENTER_KEYCODE;
    if(!enter_key_pressed)
        return;

    var player_name = $wrapper_div.querySelector('#player_name').value;
    var phone_number = $e.value;

    // Blank is valid and indicates deletion, so we don't want to confuse this
    // with blank after stripping non numeric characters
    if(phone_number !== ""){
        phone_number = $e.value.replace(/\D+/g, '');
        // Naive US phone validation
        if(phone_number.length != 10){
            display_phone_alert('phone_error', {'number': $e.value });
            return;
        }
    }
    set_player_phone(player_name, phone_number, function(){
        var $phone_input_form = $wrapper_div.querySelector('#phone_submit');
        $phone_input_form.parentElement.removeChild($phone_input_form);
        var template = phone_number === '' ? 'phone_deleted': 'phone_added';
        display_phone_alert(template, {'player': player_name });
    });

});

// =======================================================================
// onload commands
// =======================================================================
reload_phone_icons();

setInterval(function(){
    reload_phone_icons();
}, 2000);

})();
