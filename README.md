# Font FOUT
WordPress plugin that allows browsers to show a Flash Of Unstyled Text (FOUT) when using web fonts.

## Setup
1. Load your fonts however ever you would normally (e.g. `<link>` or Google Font Loader etc).
2. Install & activate the plugin
3. Tell the plugin what font families to listen for:

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