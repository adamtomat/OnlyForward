<?php

namespace Rareloop;

use acf_field;

class AcfField extends acf_field
{
    public function __construct(array $settings)
    {
        // Validate the input when the field is being saved.
        // If the map is required, it must have a marker (polygon or pin) and a type
        add_filter('acf/validate_value/type=interactive_map', function ($valid, $value, $field, $input) {
            if (!$field['required']) {
                return $valid;
            }

            if (empty($value) || empty($value['geoJSON']) || empty($value['type'])) {
                return false;
            }

            return $valid;
        }, 10, 4);

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

        wp_enqueue_script('acf-input-test', $settings['url'].'assets/js/interactive-map.js', ['jquery'], false, true);
        wp_enqueue_style('acf-input-test', $settings['url'].'assets/css/interactive-map.css');

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

        $value = $this->migrateFieldValue($field['value']);

        $geoJSON = !empty($value['geoJSON']) ? $value['geoJSON'] : null;
        $type = !empty($value['type']) ? $value['type'] : null;

        $fieldName = esc_attr($field['name']);
        $fieldAddress = !empty($value['address']) ? $value['address'] : null;

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

    /*
    *  format_value()
    *
    *  This filter is appied to the $value after it is loaded from the db and before it is returned to the template
    *
    *  @type    filter
    *  @since   3.6
    *  @date    23/01/13
    *
    *  @param   $value (mixed) the value which was loaded from the database
    *  @param   $post_id (mixed) the $post_id from which the value was loaded
    *  @param   $field (array) the field array holding all the field options
    *
    *  @return  $value (mixed) the modified value
    */
    public function format_value($value, $post_id, $field)
    {
        return $this->migrateFieldValue($value);
    }

    /**
     * Migrate the Google Map field to our field. Convert the lat and lng fields to a geoJSON field
     * which has the lat/lng encoded in json
     * @param $value (mixed) the value which was loaded from the database
     * @return  $value (mixed) the modified value
     */
    protected function migrateFieldValue($value)
    {
        if (!isset($value['geoJSON']) && isset($value['lat']) && isset($value['lng'])) {
            $geoJSON = [
                'lat' => (float) $value['lat'],
                'lng' => (float) $value['lng'],
            ];

            $value['geoJSON'] = json_encode($geoJSON);
            $value['type'] = 'marker';
        }

        return $value;
    }
}
