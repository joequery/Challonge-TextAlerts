(function(){

var $options_link = document.querySelector('#options_link');
$options_link.addEventListener('click', function(){
    var optionsUrl = chrome.extension.getURL('templates/options.html');
    chrome.tabs.query({url: optionsUrl}, function(tabs) {
        if (tabs.length) {
            chrome.tabs.update(tabs[0].id, {active: true});
        } else {
            chrome.tabs.create({url: optionsUrl});
        }
    });
});

})();
