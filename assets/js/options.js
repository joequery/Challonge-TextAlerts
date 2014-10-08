(function(){

var $twilio_form = document.querySelector('#twilio');
var $twilio_api_input = document.querySelector('#twilio_api');
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
    STORAGE.set({'TWILIO_KEY': $twilio_api_input.value}, function(){
        $status_text.textContent = 'Twilio API Key saved';
    });
});

$clear_phones_btn.addEventListener('click', function(){
    var twilio_api = $twilio_api_input.value || '';
    // Clear all the data, but hold on to the twilio api key
    STORAGE.clear(function(){
        STORAGE.set({'TWILIO_KEY': $twilio_api_input.value}, function(){
            $status_text.textContent = 'Phone numbers cleared';
        });
    });
    delete twilio_api;
});

// Provide the inital twilio api key, if available
STORAGE.get('TWILIO_KEY', function(data){
    var twilio_api = data['TWILIO_KEY'] || '';
    $twilio_api_input.value = twilio_api;
    delete twilio_api;
});

})();
