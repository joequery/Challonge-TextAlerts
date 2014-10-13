var challonge_ui = function(){
// ===============================================================
// Constants / globals
// ===============================================================
var GENERIC_ERR_MSG = "Something went wrong. Sorry!";

var $MODAL_DIV = document.querySelector('#challonge_tournaments_modal div');
var $TOURNAMENTS = document.querySelector('#challonge_tournaments');
var SEND_BTN_HTML = "<a id='send_text' href='' class='btn'>Send alert</a>";
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

    var alert_li_html = "<li><a href='' data-match-id='" + match_id + "'>Send text alert</a></li>";
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
        send_text_message(send_to, form_data.text_msg, function(request){
            if (request.status == 200){
                resp_data = JSON.parse(request.response);
                if(resp_data.resp.status_code == 200){
                    $alert_form.textContent = "Text successfully sent.";
                }
                else{
                    var err_msg = "There was a problem sending your text. ";
                    err_msg += resp_data.message;
                    $alert_form.textContent = err_msg;
                }
            }
        });
    });
});
}; // end challonge_ui


(function(){
    // Only activate on challonge bracket urls.
    var bracket_re = new RegExp("challonge.com/[^/]+/?$");
    var normalized_url = normalize_url(document.URL);
    var matches_bracket_pattern = bracket_re.test(normalized_url);
    var is_404 = document.title.search("404") != -1;

    var is_bracket_page_candidate = matches_bracket_pattern && !is_404;
    if(!is_bracket_page_candidate)
        return;

    // Challonge does not have anything in the raw HTML that lets us determine
    // if we are the admin of this page. So we will request the settings
    // page and see if we can successfully retreive it. If so, we are a bracket
    // admin. FURTHERMORE, we cannot rely on the HTTP status code to determine
    // success - challonge responds with a 200 regardless. We must check to see
    // if the responseURL matches the URL we are requesting. If not, challonge
    // has redirected us because we are not authorized.
    var settings_url = normalized_url + 'settings';
    var resp = get_request(settings_url);
    if(resp.status != 200)
        return;

    var unauthorized = resp.responseURL != settings_url;
    if(unauthorized)
        return;

    // 'Reset or Delete' in the settings page means the tournament has not
    // been started yet.
    var tourney_has_started = resp.responseText.search('Reset or Delete') != -1;
    if(!tourney_has_started){
        var err = "The tournament must be started before text alerts can be sent."
        display_modal('<p>' + err + '</p>');
        return;
    }
    challonge_ui();
})();