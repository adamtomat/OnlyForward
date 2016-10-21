<?php

namespace Rareloop;

use acf_field;

class AcfField extends acf_field
{
    public function __construct(array $settings)
    {
        // name (string) Single word, no spaces. Underscores allowed
        $this->name = 'interactive_map';

        // label (string) Multiple words, can include spaces, visible when selecting a field type
        $this->label = 'Interactive Map';

        // category (string) basic | content | choice | relational | jquery | layout | CUSTOM GROUP NAME
        $this->category = 'jquery';

        // defaults (array) Array of default settings which are merged into the field object. These are used later in settings
        $this->defaults = [
            'center_lat' => '',
            'center_lng' => '',
            'zoom' => '',
            'max_zoom' => '',
        ];

        $this->defaultValues = [
            'center_lat' => '51.508742',
            'center_lng' => '-2.109375',
            'zoom' => '2',
            'max_zoom' => '14',
        ];

        // settings (array) Store plugin settings (url, path, version) as a reference for later use with assets
        // $this->settings = $settings;

        wp_enqueue_script('leaflet', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.js', [], false, true);
        wp_enqueue_script('leaflet-editable', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet-editable/0.6.2/Leaflet.Editable.min.js', [], false, true);

        wp_enqueue_style('leaflet', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.css');

        wp_enqueue_script('acf-input-test', plugins_url('wp-acf-map-drawing/assets/js/interactive-map.js'), ['jquery'], false, true);
        wp_enqueue_style('acf-input-test', plugins_url('wp-acf-map-drawing/assets/css/interactive-map.css'));

        parent::__construct();
    }

    /*
    *  render_field()
    *
    *  Create the HTML interface for your field
    *
    *  @param   $field (array) the $field being rendered
    *
    *  @type    action
    *  @since   3.6
    *  @date    23/01/13
    *
    *  @param   $field (array) the $field being edited
    *  @return  n/a
    */
    public function render_field($field)
    {
        // Use default options if the field doesn't have a value
        foreach ($this->defaultValues as $key => $value) {
            if (empty($field[$key])) {
                $field[$key] = $value;
            }
        }

        $data = $field['value'];

        $geoJSON = !empty($data['geoJSON']) ? $data['geoJSON'] : null;
        $type = !empty($data['type']) ? $data['type'] : null;

        $fieldName = esc_attr($field['name']);
        $fieldAddress = !empty($data['address']) ? $data['address'] : null;

        /*
        *  Create a simple text input using the 'font_size' setting.
        */
        ?>
        <div class="interactive-map">
            <div class="acf-hidden">
                <input type="hidden" class="interactive-map__input interactive-map__input--geojson" name="<?php echo $fieldName; ?>[geoJSON]" value='<?php echo $geoJSON; ?>' />
                <input type="hidden" class="interactive-map__input interactive-map__input--type" name="<?php echo $fieldName; ?>[type]" value="<?php echo $type; ?>" />
            </div>

            <div class="interactive-map__search is-hidden">
                <input class="search" type="text" placeholder="<?php _e("Search for address...", 'acf'); ?>" value="<?php echo $fieldAddress; ?>" />
            </div>


            <div class="interactive-map__canvas">
                <a href="#" class="interactive-map__button interactive-map__button--delete">Delete</a>
                <a href="#" class="interactive-map__button interactive-map__button--search">Search</a>

                <div class="map" data-lat="<?php echo $field['center_lat']; ?>" data-lng="<?php echo $field['center_lng']; ?>" data-zoom="<?php echo $field['zoom']; ?>"  data-max-zoom="<?php echo $field['max_zoom']; ?>"></div>
            </div>
        </div>
        <?php
    }

    /*
    *  render_field_settings()
    *
    *  Create extra options for your field. This is rendered when editing a field.
    *  The value of $field['name'] can be used (like bellow) to save extra data to the $field
    *
    *  @type    action
    *  @since   3.6
    *  @date    23/01/13
    *
    *  @param   $field  - an array holding all the field's data
    */
    public function render_field_settings($field)
    {
        // centerLat
        acf_render_field_setting($field, [
            'label' => __('Center', 'acf'),
            'instructions' => __('Center the initial map', 'acf'),
            'type' => 'text',
            'name' => 'center_lat',
            'prepend' => 'lat',
            'placeholder' => $this->defaultValues['center_lng'],
        ]);

        // centerLng
        acf_render_field_setting($field, [
            'label' => __('Center', 'acf'),
            'instructions' => __('Center the initial map', 'acf'),
            'type' => 'text',
            'name' => 'center_lng',
            'prepend' => 'lng',
            'placeholder' => $this->defaultValues['center_lat'],
            'wrapper' => [
                'data-append' => 'center_lat',
            ],
        ]);

        // zoom
        acf_render_field_setting($field, [
            'label' => __('Zoom', 'acf'),
            'instructions' => __('Set the initial zoom level', 'acf'),
            'type' => 'text',
            'name' => 'zoom',
            'placeholder' => $this->defaultValues['zoom'],
        ]);

        // max zoom
        acf_render_field_setting($field, [
            'label' => __('Maximum Zoom', 'acf'),
            'instructions' => __('Set the maximum zoom level', 'acf'),
            'type' => 'text',
            'name' => 'max_zoom',
            'placeholder' => $this->defaultValues['max_zoom'],
        ]);
    }

    /*
    *  input_admin_footer
    *
    *  description
    *
    *  @type    function
    *  @date    6/03/2014
    *  @since   5.0.0
    *
    *  @param   $post_id (int)
    *  @return  $post_id (int)
    */
    public function input_admin_footer()
    {
        // vars
        $api = [
            'libraries' => 'places',
            'key' => acf_get_setting('google_api_key'),
            'client' => acf_get_setting('google_api_client'),
        ];

        // filter
        $api = apply_filters('acf/fields/google_map/api', $api);

        // remove empty
        if (empty($api['key'])) {
            unset($api['key']);
        }

        if (empty($api['client'])) {
            unset($api['client']);
        }

        ?>

        <script type="text/javascript">
            acf.fields.google_map.api = <?php echo json_encode($api); ?>;
        </script>

        <?php
    }
}