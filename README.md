Challonge Text Alert
====================

This extenison alters the Challonge UI so you can send text alerts to players
from the bracket page.

Installation
------------

Download from the [Chrome webstore][0].

[0]: https://chrome.google.com/webstore/detail/challonge-notifier/hliaefkciaeklipacgfcpfphpbligpec

Using a custom SMS gateway
--------------------------

If you would like to use your own server for the SMS gateway, follow these
instructions.

### Altering manifest.json

Chrome extensions force the developer to specify which URLs the extension is
allowed to make requests to. This prevents extensions from sending user data to
servers without the users permission. In the "permissions" options in the
`manifest.json` file, you will see

    "permissions": [
        "tabs",
        "storage",
        "http://twilio.joequery.me/sms"
    ]

Change `"http://twilio.joequery.me/sms"` to the url of your endpoint.

### The endpoint

In the extension options, you must specify the endpoint url. The extension sends
a POST request to this endpoint with a `Content-Type` of `application/json`.
There are up to three data values that will be sent with the POST request from
the extension:

`to`: A phone number, or an array of phone numbers, that will receive the text
message

`body`: The text message body

`access_token`: If you have provided an access token in the extension settings
page, this will be sent.

Example:

    {
        'to': ['5555555555', '9999999999'],
        'body': 'This is the text message sent to multiple numbers!',
        'access_token': 'SomeRandomString'
    }

It is advised that your server require an `access_token` so not everyone will be
able to send text messages on behalf of your twilio account in the event they
discover your server url.

### An example sms gateway

Here is an SMS gateway written with Python using the Twilio API:

[https://github.com/joequery/Simple-Twilio-SMS][1]

[1]: https://github.com/joequery/Simple-Twilio-SMS
