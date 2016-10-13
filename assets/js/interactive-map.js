(function($) {
    // deBouncer by hnldesign.nl
    // based on code by Paul Irish and the original debouncing function from John Hann
    // http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
    var debounce = function (func, threshold, execAsap) {
        var timeout;
        return function debounced () {
            var obj = this, args = arguments;
            function delayed () {
                if (!execAsap)
                    func.apply(obj, args);
                timeout = null;
            }
            if (timeout)
                clearTimeout(timeout);
            else if (execAsap)
                func.apply(obj, args);
            timeout = setTimeout(delayed, threshold || interval);
        };
    };

    var SearchAutocomplete = function (elem) {
        this.surface = $(elem);
        this.results = this.surface.append('<ul class="autocomplete-results"></ul>');

        this.autocompleteService = new google.maps.places.AutocompleteService();
        this.placeService = new google.maps.places.PlacesService($('.interactive-map__canvas')[0]);

        this.addEventListeners();
    };

    SearchAutocomplete.prototype.addEventListeners = function() {
        var _this = this;

        this.surface.find('.search').on('keyup', function (event) {
            var searchTerm = $(this).val();

            var request = {
                input: searchTerm,
                offset: searchTerm.length,
            };

            _this.autocompleteService.getPlacePredictions(request, function (predictions, status) {
                if (status != google.maps.places.PlacesServiceStatus.OK) {
                    alert(status);
                    return;
                }

                _this.displaySuggestions(predictions);
            });
        });
    };

    SearchAutocomplete.prototype.displaySuggestions = function(predictions) {
        var _this = this;

        var template = [
            '<li class="autocomplete-results__item">',
                '<div class="prediction">',
                '</div>',
            '</li>',
        ];

        $.each(predictions, function (index, prediction) {
            if (index === 0) {
                _this.placeService.getDetails({
                    placeId: prediction.place_id,
                }, function (place, status) {
                    if (status == google.maps.places.PlacesServiceStatus.OK) {
                        console.log(place);
                        console.log(place.geometry.location.lat());
                        console.log(place.geometry.location.lng());
                    }
                });
            }

            var result = $(template.join(''));
            var description = prediction.description;

            result.find('.prediction').html(description);
        });
    };

    /**
     * Interactive Map
     * @param {Node} elem
     */
    var InteractiveMap = function (elem) {
        this.surface = $(elem);

        this.inputGeoJSON = this.surface.find('.interactive-map__input--geojson');
        this.inputType = this.surface.find('.interactive-map__input--type');

        this.toolsDraw = this.surface.find('.map-tools--draw');
        this.toolsDrawing = this.surface.find('.map-tools--drawing');
        this.toolsDelete = this.surface.find('.map-tools--delete');

        this.searchField = this.surface.find('.interactive-map__search');

        this.shapeOptions = {
            polygon: {
                opacity: 0.9,
                color: '#c21c75',
                fillColor: '#ed51a5',
                fillOpacity: 0.6,
                weight: 1,
            },
            marker: {
                icon: L.icon({
                    iconUrl: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi.png',
                    iconSize: [22, 40],
                    iconAnchor: [11, 40],
                }),
            },
        };

        // Create a new layer group, that our shape will sit in
        this.layerGroup = new L.FeatureGroup();

        this.map = L.map(this.surface.find('.interactive-map__canvas')[0], {
            center: L.latLng(-37.81411, 144.96328),
            zoom: 8,
            zoomControl: false,
            editable: true,
            editOptions: {
                featuresLayer: this.layerGroup,
            },
        });

        this.map.addLayer(this.layerGroup);

        this.currentShapeType = null;

        this.addTiles();
        this.addControls();
        this.addEventBindings();

        // Initialise the auto-complete service. Can't use the full autocomplete tool as we're using
        // Leaflet and it only works with Google Maps
        this.searchAutocomplete = new SearchAutocomplete(this.searchField[0]);

        this.showDrawTools();

        this.addSavedShapeToMap();

        // this.surface.find('.map-tools__button').each(function (index, elem) {
        //     L.DomEvent.disableClickPropagation(elem);
        // });
    };

    InteractiveMap.prototype.addSavedShapeToMap = function() {
        // Get the saved geoJSON and type
        var geoJSON = this.inputGeoJSON.val();
        var type = this.inputType.val();

        // Don't try and add the shape if there's nothing to add
        if (!geoJSON || !type) {
            return;
        }

        this.currentShapeType = type;

        // Convert the json string to an actual object
        geoJSON = JSON.parse(geoJSON);

        // Get the lat/lng for the marker, in the format [lng, lat]
        // Note that geoJSON puts lng as the first item in the array (not lat)
        var coordinates = geoJSON.geometry.coordinates;
        var layer;

        var coordinatesToLatLng = function (lngLat) {
            return L.latLng(lngLat[1], lngLat[0]);
        };

        // Note: Shape options (colours etc) are handled by an event listener when new shapes are made
        if (type === 'polygon') {
            // Converts the array [lng, lat] into a Leaflet latLng object
            // Needed because L.polyline(), L.polygon() etc need an array of L.latLng objects
            // rather than an array of floats
            layer = L.polygon($.map(coordinates[0], coordinatesToLatLng));
        } else if (type === 'marker') {
            layer = L.marker(coordinatesToLatLng(coordinates));
        }

        // Add the layer to the map
        this.layerGroup.addLayer(layer);

        // Make the shape editable. There's no need for it to ever be static
        layer.enableEdit();

        // Center the map around the new shape
        this.map.fitBounds(this.layerGroup, {
            maxZoom: 8,
        });

        this.showDeleteTools();
    };

    /**
     * Show the delete tools, and hide all other tools
     */
    InteractiveMap.prototype.showDeleteTools = function() {
        this.toolsDelete.show();

        this.toolsDraw.hide();
        this.toolsDrawing.hide();
    };

    /**
     * Show the draw tools, and hide all other tools (e.g. polygon, marker)
     */
    InteractiveMap.prototype.showDrawTools = function() {
        this.toolsDraw.show();

        this.toolsDrawing.hide();
        this.toolsDelete.hide();
    };

    /**
     * Show the drawing tools, and hide all other tools (e.g. complete shape)
     */
    InteractiveMap.prototype.showDrawingTools = function() {
        this.toolsDrawing.show();

        this.toolsDraw.hide();
        this.toolsDelete.hide();
    };

    /**
     * Hide all tools
     */
    InteractiveMap.prototype.hideTools = function() {
        this.toolsDrawing.hide();
        this.toolsDraw.hide();
        this.toolsDelete.hide();
    };

    /**
     * Binds all the event listeners
     */
    InteractiveMap.prototype.addEventBindings = function() {
        var _this = this;

        /**
         * Add a marker to the map. Used as a callback when the user has clicked on the map. e.g
         * map.addEventListener('click', addMarker);
         *
         * Defined outside of so we can unbind this function on the map when
         * cancelling drawing too.
         *
         * @param  {Object} event A leaflet map click event
         */
        var addMarker = function (event) {
            _this.map.editTools.startMarker(event.latlng);
            _this.map.removeEventListener('click', addMarker);
        };

        // When the user clicks a button on the map
        this.surface.find('.map-tools__button').click(function (event) {
            event.preventDefault();

            // What type of button is it?
            var type = $(this).data('type');

            // If there's no type, then bail
            if (!type) {
                return false;
            }

            if (type === 'delete') {
                _this.deleteShape();
                return;
            }

            if (type === 'complete') {
                _this.map.editTools._drawingEditor.commitDrawing();
                return;
            }

            // Cache the type, so we know what was drawn once the shape has been completed
            _this.currentShapeType = type;

            if (type === 'polygon') {
                _this.map.editTools.startPolygon();
                _this.showDrawingTools();
            } else if (type === 'marker') {
                // Calling `map.editTools.startMarker();` will put a marker in the center of
                // the map (before you click) - which is bad. Instead, we hijack the next click
                // event on the map and treat that as the user placing the marker.
                _this.map.addEventListener('click', addMarker);
                _this.hideTools();
            }

        });

        // Fired once a marker has been completed
        this.map.on('editable:drawing:commit', function (event) {
            _this.saveShape(event.layer);
            _this.showDeleteTools();
        });

        // Save the shape when any changes are made to it. Debounced, so it doesn't spam
        this.map.on('editable:editing', debounce(function (event) {
            _this.saveShape(event.layer);
        }, 300));

        var markerStyles = function (marker) {
            // Grab the styles for the polygon or marker
            var styles = _this.shapeOptions[_this.currentShapeType];

            if (!styles) {
                return;
            }

            // Merge the styles into the current options for the marker
            marker.options = $.extend({}, marker.options, styles);
        };

        // Add listener to new Polygons and Polylines
        L.Polyline.addInitHook(function () {
            markerStyles(this);
        });

        // Add listener to new Markers
        L.Marker.addInitHook(function () {
            markerStyles(this);
        });
    };

    /**
     * Deletes the shape from the map and empties hidden inputs
     */
    InteractiveMap.prototype.deleteShape = function() {
        // Clear the map
        this.layerGroup.clearLayers();

        // Reset the tools
        this.showDrawTools();

        // Empty the form
        this.inputGeoJSON.val('');
        this.inputType.val('');
    };

    /**
     * Save a completed shape
     * This only updates the hidden inputs on the DOM & won't hit the database until the user
     * hits 'Update' at the post level.
     * @param  {Object} layer Leaflet layer object
     */
    InteractiveMap.prototype.saveShape = function(layer) {
        if (!layer) {
            return;
        }

        this.inputGeoJSON.val(JSON.stringify(layer.toGeoJSON()));
        this.inputType.val(this.currentShapeType);
    };

    /**
     * Add tiles to the map
     */
    InteractiveMap.prototype.addTiles = function() {
        this.streetTiles = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 16,
            detectRetina: false,
        }).addTo(this.map);
    };

    /**
     * Add controls to the map
     */
    InteractiveMap.prototype.addControls = function() {
        // Zoom controls (+/-)
        L.control.zoom({
            position: 'topright',
        }).addTo(this.map);

        // Scale
        L.control.scale({
            position: 'bottomright',
        }).addTo(this.map);
    };

    /*
    *  ready append (ACF5)
    *
    *  These are 2 events which are fired during the page load
    *  ready = on page load similar to $(document).ready()
    *  append = on new DOM elements appended via repeater field
    *
    *  @type    event
    *  @date    20/07/13
    *
    *  @param   $el (jQuery selection) the jQuery element which contains the ACF fields
    *  @return  n/a
    */
    // acf.add_action('ready append', function ($el) {
    // });
    acf.fields.interactive_map = acf.field.extend({
        type: 'interactive_map',
        api: {
            // sensor:     false,
            libraries:  'places'
        },
        actions: {
            'ready': 'beforeInitialize'
        },
        beforeInitialize: function () {
            var _this = this;

            // Wait a short amount of time, to let the google_maps plugin to start initializing
            setTimeout(function () {
                // If there's no google_map plugin on this page, then we can just carry on as normal.
                // Don't need to worry about downloading Google Maps >1 times
                if (acf.fields.google_map.$el.length === 0) {
                    // Download Google Maps. Needed for the Autocomplete stuff. Don't initialize until
                    // it has downloaded
                    if (!_this.is_ready()) {
                        return false;
                    }

                    return _this.initialize();
                }

                var pollCount = 0;
                var pollWaitTime = 100;

                // Now it gets complicated as acf.fields.google_map has already started downloading
                // Google Maps. We don't want to download it again as it can cause issues.
                // There's no callbacks for when google maps has downloaded, or when google_map has
                // finished. So the only thing we can do is poll (every 100ms) and ask:
                // "Has google_map finished loading everything and do we have access to google places now"
                var checkGoogleMaps = setInterval(function () {
                    pollCount += pollWaitTime;

                    var isAcfFieldFinished = acf.fields.google_map.$pending.length === 0;
                    var isGoogleMapsAvailable = acf.isset(window, 'google', 'maps', 'places');

                    // Everything has loaded, so initialize the interactive map
                    if (isAcfFieldFinished && isGoogleMapsAvailable) {
                        clearInterval(checkGoogleMaps);
                        return _this.initialize();
                    }

                    // If we've waited ~2s
                    if (pollCount >= 2000) {
                        clearInterval(checkGoogleMaps);
                        alert('Oops, something has gone wrong. Unable to load the interactive map. Please reload the page and try again.');

                        return false;
                    }
                }, pollWaitTime);

            }, 50);
        },

        initialize: function () {
            return new InteractiveMap(acf.fields.interactive_map.$field);
        },

        is_ready: function () {
            var _this = this;

            if (this.status == 'ready') {
                return true;
            }

            // no google
            if (!acf.isset(window, 'google', 'load')) {
                _this.status = 'loading';

                // load API
                $.getScript('https://www.google.com/jsapi', function(){
                    _this.status = '';
                    _this.initialize();
                });

                return false;
            }

            // no maps or places
            if(!acf.isset(window, 'google', 'maps', 'places')) {
                _this.status = 'loading';

                // load maps
                google.load('maps', '3', {
                    other_params: $.param(_this.api),
                    callback: function () {
                        console.log('callback');
                        _this.status = 'ready';

                        _this.initialize();
                    },
                });

                return false;
            }

            // google must exist already
            this.status = 'ready';

            return true;
        },
    });
})(jQuery);
