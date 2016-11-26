<?php
/*
Plugin Name: ACF Interactive Map
Description: ACF plugin that lets you draw on a map
Version: 1.0.0
Author: Rareloop
Author URI: http://www.rareloop.com
*/

// If we haven't loaded this plugin from Composer we need to add our own autoloader
if (!class_exists('App\OnlyForward')) {
    $autoloader = require_once('autoload.php');
    $autoloader('App\\', __DIR__ . '/src/App/');
}

$settings = [
    'path' => plugin_dir_url(__FILE__),
    'url' => plugin_dir_url(__FILE__),
];

$onlyForward = new \App\OnlyForward($settings);
