(function ($) {
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

    var SearchAutocomplete = function (elem, map) {
        this.map = map;
        this.surface = $(elem);
        this.mapCanvas = this.surface.next('.interactive-map__canvas');

        this.results = $('<ul class="autocomplete-results is-hidden"></ul>').prependTo(this.mapCanvas);

        this.autocompleteService = new google.maps.places.AutocompleteService();
        this.placeService = new google.maps.places.PlacesService(this.map);

        this.infowindow = null;
        this.totalResults = 0;

        this.addEventListeners();
    };

    SearchAutocomplete.prototype.findSuggestionsFromGoogle = function(searchTerm) {
        var _this = this;

        if (searchTerm.length === 0) {
            this.clearResults();

            return;
        }

        var request = {
            input: searchTerm,
            offset: searchTerm.length,
        };

        this.autocompleteService.getPlacePredictions(request, function (predictions, status) {
            if (status != google.maps.places.PlacesServiceStatus.OK) {
                _this.clearResults();
                console.log(status);
                return;
            }

            _this.displaySuggestions(predictions);
        });
    };

    SearchAutocomplete.prototype.addEventListeners = function () {
        var _this = this;

        this.surface.on('closeInfoWindow', function () {
            if (!_this.infoWindow) {
                return;
            }

            _this.infoWindow.close();
        });

        this.surface.find('.search').on('focus', function (event) {
            if (_this.totalResults === 0) {
                 return;
             }

            _this.showResults();
        });

        // Hit google's API with the search term when a key is pressed
        // this ignores arrows / ctrl etc.
        this.surface.find('.search').on('keypress', function (event) {
            var searchTerm = $(this).val();

            _this.findSuggestionsFromGoogle(searchTerm);
        });

        this.results.on('click', '.prediction', function (event) {
            event.preventDefault();

            var placeId = $(this).data('place-id');
            var title = $(this).text();

            _this.placeService.getDetails({
                placeId: placeId,
            }, function (place, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    var lat = place.geometry.location.lat();
                    var lng = place.geometry.location.lng();

                    _this.addInfoWindow(lat, lng, title);

                    if ('viewport' in place.geometry) {
                        _this.map.fitBounds(place.geometry.viewport);
                    } else {
                        var latLng = new google.maps.LatLng(lat, lng);

                        _this.map.fitBounds(new google.maps.LatLngBounds(latLng));
                    }

                    _this.hideResults();
                    _this.surface.trigger('hideSearch');
                }
            });
        });

        this.mapCanvas.on('click', '.add-marker', function (event) {
            event.preventDefault();

            var infoWindow = $(this).closest('.info-window');

            _this.surface.trigger('addMarker', {
                lat: infoWindow.data('lat'),
                lng: infoWindow.data('lng'),
            });
        });

        // this.surface.find('.search').on('blur', function (event) {
        //     // Don't hide the results if we clicked on a prediction.
        //     if ($(event.relatedTarget).hasClass('prediction')) {
        //         return;
        //     }

        //     _this.hideResults();
        // });

        this.surface.find('.search').on('keyup', function (event) {
            var validKeys = {
                27: 'escape',
                13: 'enter',
                8: 'backspace',
                46: 'delete',
            };

            var pressedKey = validKeys[event.keyCode] || false;

            if (!pressedKey) {
                return;
            }

            if (pressedKey === 'enter') {
                _this.mapCanvas.find('.is-selected .prediction').trigger('click');
            } else if (pressedKey === 'escape') {
                _this.hideResults();
            } else if (pressedKey === 'backspace' || pressedKey === 'delete') {
                var searchTerm = $(this).val();
                _this.findSuggestionsFromGoogle(searchTerm);
            }
        });

        this.surface.find('.search').on('keydown', function (event) {
            var searchInput = $(this);

            if (_this.totalResults === 0) {
                return;
            }

            // Disable the 'enter' key from submitting the form
            if (event.keyCode === 13) {
                return false;
            }

            var navigationKeys = {
                38: 'up',
                40: 'down',
            };

            var pressedKey = navigationKeys[event.keyCode] || false;

            if (!pressedKey) {
                return;
            }

            var results = _this.results.find('.autocomplete-results__item').toArray();

            // Find the currently selected item
            var selectedIndex = results.findIndex(function (result) {
                return $(result).hasClass('is-selected');
            });

            var currentSelectedIndex = selectedIndex;

            // If nothing is selected, start at the first item
            if (selectedIndex < 0) {
                currentSelectedIndex = 0;
            }

            var newSelectedIndex = currentSelectedIndex;

            var sanitizeIndex = function (index) {
                // Get the index of the last item in the array
                var lastItemIndex = results.length - 1;

                if (index < 0) {
                    index = lastItemIndex;
                } else if (index > lastItemIndex) {
                    index = 0;
                }

                return index;
            }

            _this.deselectResultsKeyboardNav();

            if (pressedKey === 'down') {
                if (selectedIndex >= 0) {
                    newSelectedIndex++;
                }
            } else if (pressedKey === 'up') {
                newSelectedIndex--;
            }

            // Select the row
            newSelectedIndex = sanitizeIndex(newSelectedIndex);
            $(results[newSelectedIndex]).addClass('is-selected');

            event.preventDefault();
        });
    };

    SearchAutocomplete.prototype.deselectResultsKeyboardNav = function() {
        this.mapCanvas.find('.is-selected').removeClass('is-selected');
    };

    SearchAutocomplete.prototype.showResults = function () {
        this.results.removeClass('is-hidden');
    };

    SearchAutocomplete.prototype.hideResults = function () {
        this.results.addClass('is-hidden');
        this.deselectResultsKeyboardNav();
    };

    SearchAutocomplete.prototype.clearResults = function () {
        this.hideResults();

        this.results.html('');
        this.totalResults = 0;
    };

    SearchAutocomplete.prototype.addInfoWindow = function (lat, lng, title) {
        var content = [
            '<div class="info-window" data-lat="'+lat+'" data-lng="'+lng+'">',
                '<div class="info-window__title">',
                    title,
                '</div>',
                '<a href="#" class="info-window__button add-marker">Add marker</a>',
            '</div>'
        ];

        this.infoWindow = new google.maps.InfoWindow({
            content: content.join(''),
        });

        this.infoWindow.setPosition({
            lat: lat,
            lng: lng,
        });

        this.infoWindow.open(this.map);
    };

    SearchAutocomplete.prototype.displaySuggestions = function (predictions) {
        var template = [
            '<li class="autocomplete-results__item">',
                '<a href="#" class="prediction">',
                '</a>',
            '</li>',
        ];

        var predictionElems = [];

        // Loop through each prediction
        $.each(predictions, function (index, prediction) {
            // Create a new Node for our result
            var result = $(template.join(''));
            var terms = prediction.terms;

            var matchedSubStrings = prediction.matched_substrings;

            // If we have any matches in the string, wrap the match in a class to make it bold
            if (matchedSubStrings.length > 0) {
                // Loop over each matched string - in case there are multiple matches in the same string
                $.each(matchedSubStrings, function (index, match) {
                    // Find the term that has the match in
                    var term = terms.find(function (item) {
                        return item.offset === match.offset;
                    });

                    if (!term) {
                        return;
                    }

                    // Wrap match in a span, so we can make it bold
                    var string = '<span class="prediction__match">';
                        string += term.value.substr(0, match.length);
                    string += '</span>';

                    // Glue on the rest of the unmatched term
                    string += term.value.substr(match.length);

                    // Update the original term object's value
                    term.value = string;
                });
            }

            // Add the first term in a span, so it can be styled differently to the rest of the prediction
            // (e.g. bigger)
            var place = '<span class="prediction__title">'+terms[0].value+'</span> ';

            // Comma-separate the remaining terms and glue them onto the end of the place
            // Ignore the first item as we've already added a span around it
            place += terms.filter(function (term, index) {
                return index !== 0;
            }).map(function (current) {
                // Convert object to string
                return current.value;
            }).join(', ');

            // Add the prediction copy to markup
            result.find('.prediction')
                .html(place)
                .data('place-id', prediction.place_id);

            // Add to the list of results
            predictionElems.push(result);
        });

        // Keep track of how many predictions there are
        this.totalResults = predictions.length;

        // Add the results to the DOM
        this.results.html(predictionElems)
            .removeClass('is-hidden');
    };

    /**
     * Interactive Map
     * @param {Node} elem
     */
    var InteractiveMap = function (elem) {
        this.surface = $(elem);

        this.shape = null;
        this.shapeEventListeners = {
            drag: null,
            polygon: {
                editPoints: null,
                addPoints: null,
                removePoints: null,
            },
        };

        this.inputGeoJSON = this.surface.find('.interactive-map__input--geojson');
        this.inputType = this.surface.find('.interactive-map__input--type');

        this.deleteButton = this.surface.find('.interactive-map__button--delete');

        this.searchField = this.surface.find('.interactive-map__search');

        this.map = new google.maps.Map(this.surface.find('.map')[0], {
            center: L.latLng(-37.81411, 144.96328),
            zoom: 8,
            mapTypeControl: false,
            maxZoom: 14,
            streetViewControl: false,
        });

        this.drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_LEFT,
                drawingModes: [
                    'marker',
                    'polygon',
                ],
            },
            polygonOptions: {
                strokeOpacity: 0.9,
                strokeColor: '#c21c75',
                fillColor: '#ed51a5',
                fillOpacity: 0.6,
                editable: true,
                draggable: true,
                weight: 1,
            },
            markerOptions: {
                draggable: true,
            },
        });

        this.drawingManager.setMap(this.map);

        // Initialise the auto-complete service
        this.searchAutocomplete = new SearchAutocomplete(this.searchField[0], this.map);

        this.showDrawTools();
        this.addSavedShapeToMap();
        this.addEventBindings();
    };

    InteractiveMap.prototype.addSavedShapeToMap = function () {
        // Get the saved positionJSON and type
        var positionJSON = this.inputGeoJSON.val();
        var type = this.inputType.val();

        // Don't try and add the shape if there's nothing to add
        if (!positionJSON || !type) {
            return;
        }

        this.currentShapeType = type;

        // Convert the json string to an actual object
        var position = JSON.parse(positionJSON);

        var shapeOptions = {};

        if (this.currentShapeType === 'polygon') {
            // Grab the shape options from the drawingManager and add the map & path info to it
            shapeOptions = $.extend({}, this.drawingManager.get('polygonOptions'), {
                map: this.map,
                paths: position,
            });

            // Draw the polygon on the map
            this.shape = new google.maps.Polygon(shapeOptions);
        } else if (this.currentShapeType === 'marker') {
            this.addMarker(position);
        }

        this.showDeleteTools();
    };

    /**
     * Show the delete tools, and hide all other tools
     */
    InteractiveMap.prototype.showDeleteTools = function () {
        this.deleteButton.show();

        this.drawingManager.setOptions({
            drawingControl: false,
        });
    };

    /**
     * Show the draw tools, and hide all other tools (e.g. polygon, marker)
     */
    InteractiveMap.prototype.showDrawTools = function () {
        this.drawingManager.setOptions({
            drawingControl: true,
        });

        this.deleteButton.hide();
    };

    /**
     * Binds all the event listeners
     */
    InteractiveMap.prototype.addEventBindings = function () {
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
        this.surface.find('.interactive-map__button--delete').click(function (event) {
            event.preventDefault();

            _this.deleteShape();
        });

        this.surface.find('.interactive-map__button--search').click(function (event) {
            event.preventDefault();

            var isVisible = _this.toggleSearch();

            $(this).toggleClass('interactive-map__button--active', isVisible);

            if (isVisible) {
                _this.searchField.find('.search').focus();
            }
        });

        google.maps.event.addListener(this.drawingManager, 'overlaycomplete', function (event) {
            _this.removeShapeEventListeners();

            // Update our shape and type references
            _this.shape = event.overlay;
            _this.currentShapeType = event.type;

            _this.addShapeEventListeners();

            var position = _this.getPositionForOverlay(event.overlay);
            _this.saveShape(position);

            _this.showDeleteTools();

            // Stop the user from drawing any additional shapes
            _this.drawingManager.setOptions({
                drawingMode: null,
            });
        });

        this.searchField.on('addMarker', function (event, data) {
            if (_this.shape) {
                var overwriteShape = confirm('You already have a '+_this.currentShapeType+' on the map. Do you want to overwrite it?');

                if (!overwriteShape) {
                    return;
                }

                _this.deleteShape();
            }

            _this.searchField.trigger('closeInfoWindow');

            _this.addMarker(data);
            _this.addShapeEventListeners();
            _this.showDeleteTools();
        });

        this.searchField.on('hideSearch', function () {
            _this.toggleSearch();
            _this.surface.find('.interactive-map__button--search').removeClass('interactive-map__button--active');
        });

        this.addShapeEventListeners();
    };

    /**
     * Show / hide the search field
     */
    InteractiveMap.prototype.toggleSearch = function () {
        // Is the field already visible?
        var isSearchVisible = !this.searchField.hasClass('is-hidden');

        // If it's visible, add the hidden class..
        this.searchField.toggleClass('is-hidden', isSearchVisible);

        // As we've changed the visibility, return the inverse of isSearchVisible
        return !isSearchVisible;
    };

    InteractiveMap.prototype.addShapeEventListeners = function () {
        var _this = this;

        if (!this.shape) {
            return;
        }

        // Save the shape when it's dragged on the map
        this.shapeEventListeners.drag = google.maps.event.addListener(this.shape, 'drag', debounce(function () {
            // We don't know which shape that got changed (polygon or marker), so we use getPositionForOverlay
            // which can work it out
            var position = _this.getPositionForOverlay(this);

            // Save
            _this.saveShape(position);
        }, 150));

        // Polygons need extra events to handle vertices
        if (this.currentShapeType === 'polygon') {
            // To listen for any changes to the polygon, we have to listen for when anything in its
            // path 'array' changes. Get this path
            var path = this.shape.getPath();

            /**
             * Get the new position data for the polygon and save it
             */
            var updatePolygon = function () {
                var position = _this.getPositionForPolygon(_this.shape);
                _this.saveShape(position);
            };

            // When an existing vertex has been moved...
            this.shapeEventListeners.polygon.editPoints = google.maps.event.addListener(path, 'set_at', updatePolygon);

            // When a new vertex has been added...
            this.shapeEventListeners.polygon.addPoints = google.maps.event.addListener(path, 'insert_at', updatePolygon);

            // When a vertex has been deleted...
            this.shapeEventListeners.polygon.removePoints = google.maps.event.addListener(path, 'remove_at', updatePolygon);
        }
    };

    /**
     * Remove all event listeners on the current shape
     */
    InteractiveMap.prototype.removeShapeEventListeners = function () {
        if (this.shapeEventListeners.drag) {
            this.shapeEventListeners.drag.remove();
            this.shapeEventListeners.drag = null;
        }

        if (this.shapeEventListeners.polygon.editPoints) {
            this.shapeEventListeners.polygon.editPoints.remove();
            this.shapeEventListeners.polygon.editPoints = null;
        }

        if (this.shapeEventListeners.polygon.addPoints) {
            this.shapeEventListeners.polygon.addPoints.remove();
            this.shapeEventListeners.polygon.addPoints = null;
        }

        if (this.shapeEventListeners.polygon.removePoints) {
            this.shapeEventListeners.polygon.removePoints.remove();
            this.shapeEventListeners.polygon.removePoints = null;
        }
    };

    /**
     * Deletes the shape from the map and empties hidden inputs
     */
    InteractiveMap.prototype.deleteShape = function () {
        this.removeShapeEventListeners();

        this.shape.setMap(null);
        this.shape = null;
        this.currentShapeType = null;

        // Reset the tools
        this.showDrawTools();

        // Empty the form
        this.inputGeoJSON.val('');
        this.inputType.val('');
    };

    InteractiveMap.prototype.addMarker = function (position) {
        // Grab the shape options from the drawingManager and add the map & path info to it
        var shapeOptions = $.extend({}, this.drawingManager.get('markerOptions'), {
            map: this.map,
            position: position,
        });

        // Draw the marker on the map
        this.shape = new google.maps.Marker(shapeOptions);
        this.currentShapeType = 'marker';

        this.saveShape(position);
    };

    InteractiveMap.prototype.getPositionForOverlay = function (overlay) {
        if (!overlay) {
            return;
        }

        var position = this.inputGeoJSON.val();

        if ('position' in overlay) {
            position = this.getPositionForMarker(overlay);
        } else if ('getPath' in overlay) {
            position = this.getPositionForPolygon(overlay);
        }

        return position;
    };

    InteractiveMap.prototype.getPositionForPolygon = function (polygon) {
        position = [];

        polygon.getPath().forEach(function (path) {
            position.push(path.toJSON());
        });

        return position;
    };

    InteractiveMap.prototype.getPositionForMarker = function (marker) {
        return marker.position.toJSON();
    };

    /**
     * Save a completed shape
     * This only updates the hidden inputs on the DOM & won't hit the database until the user
     * hits 'Update' at the post level.
     * @param  {Object|array} overlay An object or array of objects containing lat/lng pairs
     *                                e.g. { lat: 51, lng: 0.1 } or [{ lat: 51, lng: 0.1 }, { lat: 52, lng: 0.2 }]
     */
    InteractiveMap.prototype.saveShape = function (position) {
        this.inputGeoJSON.val(JSON.stringify(position));
        this.inputType.val(this.currentShapeType);
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

        // Settings for Google Maps. Basically query parameters as an object
        api: {
            sensor:     false,
            libraries:  'places,drawing'
        },

        // Trigger functions (value) when acf.field fires events (key)
        // e.g. Run beforeInitialise() when acf.field fires the 'ready' event.
        actions: {
            'ready': 'beforeInitialise'
        },

        /**
         * Run before initialisation, as we need to work out what
         * @return {[type]} [description]
         */
        beforeInitialise: function () {
            var _this = this;

            // Update the google_map field's api settings to trick it into downloading the libraries
            // we need too. This saves us downloading Google Maps twice with different libraries
            acf.fields.google_map.api = $.extend({}, acf.fields.google_map.api, _this.api);

            // Wait a short amount of time, to let the google_maps plugin to start initializing
            setTimeout(function () {
                // If there's no google_map plugin on this page, then we can just carry on as normal.
                // Don't need to worry about downloading Google Maps >1 times
                if (!acf.fields.google_map.$el || acf.fields.google_map.$el.length === 0) {
                    // Download Google Maps. Needed for the Autocomplete stuff. Don't initialise until
                    // it has downloaded. isReady will initialise once everything has been downloaded
                    if (!_this.isReady()) {
                        return false;
                    }

                    return _this.initialise();
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

                    var isAcfFieldReady = acf.fields.google_map.$pending.length === 0;
                    var isGoogleMapsReady = acf.isset(window, 'google', 'maps', 'places') && acf.isset(window, 'google', 'maps', 'drawing');

                    // Everything has loaded, so initialise the interactive map
                    if (isAcfFieldReady && isGoogleMapsReady) {
                        clearInterval(checkGoogleMaps);
                        return _this.initialise();
                    }

                    // If we've waited ~2s, bail out so we don't spam the event stack indefinitely
                    if (pollCount >= 2000) {
                        clearInterval(checkGoogleMaps);
                        alert('Oops, something has gone wrong. Unable to load the interactive map. Please reload the page and try again.');

                        return false;
                    }
                }, pollWaitTime);
            }, 50);
        },

        /**
         * Initialise the InteractiveMap. Only call this once we know that google maps & libraries
         * have all downloaded successfully
         * @return {Object} InteractiveMap
         */
        initialise: function () {
            return new InteractiveMap(acf.fields.interactive_map.$field);
        },

        /**
         * Check to see if we are ready to initialise.
         *
         * i.e. do we have Google Maps and libraries downloaded?
         * @return {Boolean}
         */
        isReady: function () {
            var _this = this;

            if (this.status == 'ready') {
                return true;
            }

            // We don't have Google's load library yet, best download it.
            if (!acf.isset(window, 'google', 'load')) {
                _this.status = 'loading';

                // Download Google's load library so we can bring in Google Maps
                _this.downloadGoogleLoad(function () {
                    // Download Google Maps and initialise InteractiveMap
                    _this.downloadGoogleMapsWithLibraries(function () {
                        _this.status = 'ready';
                        _this.initialise();
                    });
                });

                return false;
            }

            // No maps, places or drawing yet. Best download them
            if(!acf.isset(window, 'google', 'maps', 'places') && !acf.isset(window, 'google', 'maps', 'drawing')) {
                _this.status = 'loading';

                // Download Google Maps and initialise InteractiveMap
                _this.downloadGoogleMapsWithLibraries(function () {
                    _this.status = 'ready';
                    _this.initialise();
                });

                return false;
            }

            // google must exist already
            this.status = 'ready';

            return true;
        },

        /**
         * Download Google's load script, which allows for downloading of Google scripts
         * @param  {Function} callback
         */
        downloadGoogleLoad: function (callback) {
            callback = callback || function () {};

            $.getScript('https://www.google.com/jsapi', callback);
        },

        /**
         * Download Google Maps and all libraries
         * @param  {Function} callback
         */
        downloadGoogleMapsWithLibraries: function (callback) {
            callback = callback || function () {};

            google.load('maps', '3', {
                // Add libraries as query parameters
                other_params: $.param(this.api),
                callback: callback,
            });
        },
    });
})(jQuery);
