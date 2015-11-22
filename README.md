# Font FOUT
WordPress plugin that allows browsers to show a Flash Of Unstyled Text (FOUT) when using web fonts.

## Setup
Install & activate the plugin, then tell the plugin what font families to listen for:

````php
<?php // functions.php

Rareloop\FontFout::init([
    'PT Serif',
    'Open Sans',
]);

````

This will add the required JavaScript inline to the bottom of your `<body>`. When all the fonts have loaded the `fonts-loaded` class will be added to your `<html>` element. You can use this in your CSS to control when your web font is used:

````css
body {
    font-family: 'Georgia, serif';
}

.fonts-loaded body {
    font-family: 'PT Serif, Georgia, serif';
}
````

### More Configuration

The `init` function also take 2 additional arguments that lets you control the cookie that is created to know when fonts are loaded. If you wanted to change the cookie name to `_fonts_cached_in_browser` and make it last 30 days you could do the following:

````php
<?php // functions.php

Rareloop\FontFout::init(['PT Serif'], '_fonts_cached_in_browser', 60 * 60 * 24 * 30);

````

## Optimising for future page views

The JavaScript injected into your page will set a cookie once all fonts are loaded. Once loaded you can assume that your users browser will have cached the font so shouldn't need to download again. In this instance you can have the `fonts-loaded` class added to your `<html>` element before it's sent to the browser.

To add this optimisation you can use the following shortcode in your template:

````html
<!DOCTYPE html>
<html class="no-js [fontfout-htmlclass]">
<head>
    <title>...</title>
</head>
<body>
    ...
</body>
</html>
````

The shortcode will only add the class when the cookie is detected. It will also prevent the inline JavaScript from being injected, reducing the payload of future page loads.

The plugin adds the following cookie: `fonts-loaded`, which you should add to your Cookie/Privacy Policy.