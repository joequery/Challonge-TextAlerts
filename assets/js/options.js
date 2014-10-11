(function(){

var $twilio_form = document.querySelector('#twilio');
var $twilio_api_input = document.querySelector('#twilio_api');
var $twilio_url_input = document.querySelector('#twilio_url');
var $key_visibility_btn = document.querySelector('#api_key_visibility');
var $save = document.querySelector('#save');
var $status_text = document.querySelector('#status');
var $clear_phones_btn = document.querySelector('#clear_phones');

var api_visible = false;

$key_visibility_btn.addEventListener('click', function(){
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

$save.addEventListener('click', function(){
    STORAGE.set({'ACCESS_TOKEN': $twilio_api_input.value}, function(){
        $status_text.textContent = 'Access token saved. ';
        STORAGE.set({'GATEWAY_URL': $twilio_url_input.value}, function(){
            $status_text.textContent += 'Gateway url saved';
        });
    });
});

$clear_phones_btn.addEventListener('click', function(){
    var twilio_api = $twilio_api_input.value || '';
    var twilio_url = $twilio_url_input.value || '';
    // Clear all the data, but hold on to the options
    STORAGE.clear(function(){
        STORAGE.set({'ACCESS_TOKEN': $twilio_api_input.value}, function(){
            STORAGE.set({'GATEWAY_URL': $twilio_url_input.value});
            $status_text.textContent = 'Phone numbers cleared';
        });
    });
});

// Provide the inital twilio settings if available
STORAGE.get(['ACCESS_TOKEN', 'GATEWAY_URL'], function(data){
    var twilio_api = data['ACCESS_TOKEN'] || '';
    var twilio_url = data['GATEWAY_URL'] || '';
    $twilio_api_input.value = twilio_api;
    $twilio_url_input.value = twilio_url;
});

})();
