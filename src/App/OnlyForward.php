<?php

namespace Rareloop;

/**
* This is a high level class that knows about all the overall functionality and glues other bits together
*/
class OnlyForward
{

    public function __construct(array $settings = [])
    {
        $this->settings = array_merge([
            'version' => '1.0.0',
            'url' => plugin_dir_url(__FILE__),
            'path' => plugin_dir_path(__FILE__),
        ], $settings);
    }

    public function hideContentWhenInDraft()
    {
        exit('here');
    }
}
