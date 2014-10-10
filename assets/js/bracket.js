var challonge_ui = function(){
close_modal();

var not_a_bracket_admin = (function(){
    var $nav_header = document.querySelector('.nav-header');
    if(!$nav_header){
        return true;
    }
    else{
        return $nav_header.innerHTML.search("Administration") == -1;
    }
})();

if(not_a_bracket_admin)
    return;

var tourney_has_started = (function(){
    var $next_step = document.querySelector('.step-body');
    var next_step_txt = $next_step.textContent;
    var phrases_indicating_not_started = [
        'get started',
        'your bracket is looking good'
    ];
    for(var i=0; i<phrases_indicating_not_started.length; i++)
        if(next_step_txt.search(phrases_indicating_not_started[i]) !== -1)
            return false;

    return true;
})();

if(!tourney_has_started){
    var err = "The tournament must be started before text alerts can be sent."
    display_modal('<p>' + err + '</p>');
    return;
}

// ===============================================================
// Constants / globals
// ===============================================================
var GENERIC_ERR_MSG = "Something went wrong. Sorry!";

var $MODAL_DIV = document.querySelector('#challonge_tournaments_modal div');
var $TOURNAMENTS = document.querySelector('#challonge_tournaments');
var SEND_BTN_HTML = "<a id='send_text' href='#' class='btn'>Send alert</a>";
var focused_players = {};

// ===============================================================
// Event handlers
// ===============================================================

/*
 * Insert the send text button into the dropdown ul on an as-needed basis. This
 * lets us not have to deal with figuring out when to remove/insert the send
 * text button for all elements at the same time (which will help scale with
 * larger brackets)
 */
dynamic_child_bind($TOURNAMENTS, ".match_identifier", "mouseenter", function($e, evt){
    var $tr_parent = get_parent($e, 3);
    var $ul = $tr_parent.querySelector('ul.dropdown-menu');
    var $player_spans = $tr_parent.querySelectorAll('span[title]');

    var match_has_players = !!$player_spans.length;
    var ul_has_send_text = !!$ul.querySelector('a[data-match-id]')
    if(ul_has_send_text){
        if(!match_has_players){
            var $send_alert_btn = $ul.querySelector('[data-match-id]');
            $send_alert_btn.parentElement.removeChild($send_alert_btn);
        }
        return;
    }
    else if(!match_has_players){
        return;
    }

    // Even if the game can't be edited, the edit link still appears in the
    // dom. We can still extract the match id from the edit url.
    var $match_edit_a = $ul.querySelector('a[data-href$="/edit"]');
    var match_id = $match_edit_a.getAttribute('data-href').split('/')[2];

    var alert_li_html = "<li><a href='#' data-match-id='" + match_id + "'>Send text alert</a></li>";
    $ul.insertAdjacentHTML('afterbegin', alert_li_html);
});

/*
 * Load alert template into modal when send alert buttons are pushed.
 */
dynamic_child_bind($TOURNAMENTS, "a[data-match-id]", "click", function($el, evt){
    evt.preventDefault();

    // This structure is guaranteed
    var $tr_parent = get_parent($el, 5);
    var $player_spans = $tr_parent.querySelectorAll('span[title]');
    var players = {player1: null, player2: null};
    var $this_btn = $el;

    // Since this Mustache implementation doesn't seem to handle Arrays too
    // well, we need a way to determine whether a person is player1 or player2.
    // So we have to store this data a bit redundantly.
    var name_to_player_num_mapping = {};

    for(var i=0; i<$player_spans.length; i++){
        var $span = $player_spans[i];

        // player1 instead of player0
        players["player"+(i+1)] = {};
        var player = players["player"+(i+1)];
        player.name = $span.getAttribute('title');

        player.phone = null; // we'll get this later
        player.checkbox = "disabled=disabled";// we'll override this later if we find a phone
        player.no_phone_msg = "(No phone provided)";

        name_to_player_num_mapping[player.name] = "player"+(i+1);
    }

    var any_player_has_phone = false;

    focused_players = players;
    with_player_phones(Object.keys(name_to_player_num_mapping), function(data){
        for (var player in data) {
            if (data.hasOwnProperty(player)) {
                var phone_num = data[player];
                players[name_to_player_num_mapping[player]]['phone'] = phone_num;
                if(phone_num){
                    players[name_to_player_num_mapping[player]]['checkbox'] = "checked=checked";
                    players[name_to_player_num_mapping[player]]['no_phone_msg'] = "";
                    any_player_has_phone = true;
                }
            }
        }

        var template = any_player_has_phone ? 'alert' : 'alert-no-phone';
        var match_id = $this_btn.getAttribute('data-match-id');
        var temp_html = render_template(template, {
            match_id: match_id,
            players:players,
            only_one_player: $player_spans.length == 1
        });
        display_modal(temp_html);
    });
});

// ========================================================================
// Alert form!
// ========================================================================

var MESSAGE_TEMPLATE_OPTIONS = {
    match_now: "{{player1}} vs {{player2}} is starting now.",
    match_next: "{{player1}} vs {{player2}} is next. Head to your station",
    match_delayed: "{{player1}} vs {{player2}} has been delayed.",
    custom: ""
};

/*
 * The send alert button shouldn't display unless at least one name is checked
 * and a message template option has been selected.
 */
var show_send_button_in_modal = function(){
    var $send_btn_wrap = $MODAL_DIV.querySelector('#send_text_button_wrap');
    var $modal_player_checkboxs = $MODAL_DIV.querySelectorAll('[id^=player-]');
    var players_checked = 0;
    each_$($modal_player_checkboxs, function($e){
        if($e.checked)
            players_checked++;
    });


    var message_template_selected = 0;
    var $message_template_radios = $MODAL_DIV.querySelectorAll('[name=msg_template]');
    each_$($message_template_radios, function($e){
        if($e.checked)
            message_template_selected++;
    });

    var should_hide_send_btn = !players_checked || !message_template_selected;
    if(should_hide_send_btn)
        $send_btn_wrap.innerHTML = "";
    else
        $send_btn_wrap.innerHTML = SEND_BTN_HTML;
};

/*
 * Handle selecting the form radio buttons. Since this is dynamic content, we
 * have to attch the event to the body.
 */
dynamic_child_bind($MODAL_DIV, "[name=msg_template]", "click", function($el){
    var msg_template = MESSAGE_TEMPLATE_OPTIONS[$el.value];

    // focused players is set when "Send text alert" button is clicked.
    var msg_text = ghetto_mustache(msg_template, {
        player1: focused_players.player1.name,
        player2: focused_players.player2.name
    });
    var $textarea = document.getElementById('text_msg');
    $textarea.value = msg_text;

    show_send_button_in_modal();
});

dynamic_child_bind($MODAL_DIV, "[id^=player-]", "click", function($el){
    show_send_button_in_modal();
});

/*
 * Handle sending the text message
 */
dynamic_child_bind($MODAL_DIV, "#send_text", "click", function($el, evt){
    evt.preventDefault();
    var $alert_form = $MODAL_DIV.querySelector('#text_alert_form');
    var form_data = form2js($alert_form);
    with_player_phones(form_data.players, function(data){
        var send_to = [];
        for (var k in data) {
            if (data.hasOwnProperty(k)) {
                send_to.push(data[k]);
            }
        }
        STORAGE.get('TWILIO_KEY', function(data){
            var account_sid = data['TWILIO_KEY'];
            msg_with_tourney_name = TOURNEY_NAME + ": " + form_data.text_msg;
            post_data = {
                'to': send_to,
                'body': msg_with_tourney_name,
                'account_sid': account_sid
            }
            var request = new XMLHttpRequest();
            request.open('POST', TWILIO_URL, true);
            request.onload = function(){
                if (request.status == 200){
                    resp_data = JSON.parse(request.response);
                    if(resp_data.status_code == 200){
                        $alert_form.textContent = "Text successfully sent.";
                    }
                    else{
                        var err_msg = "There was a problem sending your text. ";
                        err_msg += resp_data.message;
                        $alert_form.textContent = "Text successfully sent.";
                    }
                }
            };
            request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            request.send(JSON.stringify(post_data));
        });
    });
});
}; // end challonge_ui


(function(){
    // Only activate on challonge bracket urls.
    var bracket_re = new RegExp("challonge.com/[^/]+/?$");
    var matches_bracket_pattern = bracket_re.test(document.URL);
    var is_404 = document.title.search("404") != -1;

    var is_bracket_page = matches_bracket_pattern && !is_404;
    if(!is_bracket_page)
        return;

    // Give an arbitrary amount of time for shit to load in and hope for the best.
    // This is already running on document idle, but some ajax calls that challonge
    // does occur even after that. I can't find any non-ajax item I can rely on to
    // tell us if we're a bracket admin.
    display_modal('<p>loading text alert extension...</p>');
    setTimeout(function(){
        STORAGE.get('TWILIO_KEY', function(data){
            var account_sid = data['TWILIO_KEY'];
            if(!account_sid)
                display_modal("<p>Twilio Account SID must be set in options before text alerts can be sent</p>");
            else
                challonge_ui();
        });
    }, 3000);
})();
