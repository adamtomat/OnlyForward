<?php
/*
Plugin Name: ACF Interactive Map
Description: ACF plugin that lets you draw on a map
Version: 1.0.0
Author: Rareloop
Author URI: http://www.rareloop.com
*/

// If we haven't loaded this plugin from Composer we need to add our own autoloader
if (!class_exists('Rareloop\RareMap')) {
    $autoloader = require_once('autoload.php');
    $autoloader('Rareloop\\', __DIR__ . '/src/Rareloop/');
}

$rareMap = new \Rareloop\InteractiveMap();
