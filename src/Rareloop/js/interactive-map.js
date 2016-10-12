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

    var InteractiveMap = function(elem) {
        this.surface = $(elem);

        this.inputGeoJSON = this.surface.find('.interactive-map__input--geojson');
        this.inputType = this.surface.find('.interactive-map__input--type');

        this.toolsDraw = this.surface.find('.map-tools--draw');
        this.toolsDrawing = this.surface.find('.map-tools--drawing');
        this.toolsDelete = this.surface.find('.map-tools--delete');

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

    $(document).ready(function() {
        $('.interactive-map').each(function (index, elem) {
            return new InteractiveMap(elem);
        });
    });
})(jQuery);
