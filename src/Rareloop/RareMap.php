<?php

namespace Rareloop;

/**
* This is a high level class that knows about all the overall functionality and glues other bits together
*/
class RareMap
{

    public function __construct()
    {
        $this->settings = [
            'version' => '1.0.0',
            'url' => plugin_dir_url(__FILE__),
            'path' => plugin_dir_path(__FILE__),
            'google_api_key' => 'test',
        ];

        add_action('acf/include_field_types', [$this, 'includeFieldType']);
    }

    public function includeFieldType()
    {
        $field = new AcfMapField($this->settings);
    }
}