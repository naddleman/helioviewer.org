/**
 * @fileoverview Contains the class definition for an TileLayerAccordion class.
 */
/**
 * @author Keith Hughitt keith.hughitt@gmail.com
 * @class TileLayerAccordion
 *
 * syntax: jQuery, Prototype
 *
 * @see LayerManager
 * @requires ui.dynaccordion.js
 */
var TileLayerAccordion = Class.create(Layer, {
	/**
	 * @constructor
	 * @param {LayerManager} Reference to the layerManager.
     * @param {Dom-node} The outermost continer where the layer  manager user interface should be constructed.
	 */
	initialize: function (layerManager, containerId) {
		this.layerManager = layerManager;
		this.container =    jQuery('#' + containerId);
		this.queryURL =     "getLayerAvailability.php";

		// Available layer options
		this.options = {
			observatories: ["SOHO"],
			instruments:   ["EIT",  "LAS", "MDI"],
			detectors:     ["EIT", "0C2", "0C3", "MDI"],
			measurements:  ["171", "195", "284", "304", "int", "mag"]			
		}

		//Setup menu UI components
		this._setupUI();

		//Initialize accordion
		this.domNode = jQuery('#TileLayerAccordion-Container');
		this.domNode.dynaccordion();
		
		//Individual layer menus
		this.layerSettings = new Hash();
	},

	/**
	 * @function
	 * @description Adds a new entry to the tile layer accordion
	 */
	addLayer: function (layer) {
		// Determine what measurements to display
		var processResponse = function(transport){
			// Create accordion entry header
			var visibilityBtn = "<button class='layerManagerBtn visible' id='visibilityBtn-" + layer.id + "' value=true type=button title='toggle layer visibility'></button>";
			var removeBtn = "<button class='layerManagerBtn remove' id='removeBtn-" + layer.id + "' type=button title='remove layer'></button>";
			var head = "<div class=layer-Head><span class=tile-accordion-header-left>" + layer.name + "</span><span class=tile-accordion-header-right><span class=timestamp></span> |" + visibilityBtn + removeBtn + "</span></div>";
			
			// Create accordion entry body
			var body = this._buildEntryBody(layer);

			//Add to accordion
			this.domNode.dynaccordion("addSection", {
				id: layer.id,
				header: head,
				cell: body
			});
			
			// Update allowable choices
			this.options.detectors = transport.responseJSON.detectors;
			this.options.measurements = transport.responseJSON.measurements;
			
			this._updateOptions(layer.id, 'detector', this.options.detectors);
			this._updateOptions(layer.id, 'measurement', this.options.measurements);
			
			// Keep a reference to the dom-node
			//this.menuEntries.push({id: layer.id, header: head, cell: body});
			this.layerSettings.set(layer.id, {
				header: head,
				body: body
			});
			
			// Event-handlers
			this._setupEventHandlers(layer);
			
			// Update timestamp
			this.updateTimeStamp(layer);
		};
		
		//Ajax Request
		var xhr = new Ajax.Request(this.queryURL, {
			method: 'get',
			onSuccess: processResponse.bind(this),
			parameters: {
				observatory: 'none',
				instrument:  'none',
				detector:    layer.detector,
				measurement: 'none',
				format:      "json"
			}
		});
	},

	/**
	 * @function
	 * @description Checks to see if the given layer is listed in the accordion 
	 */
	hasId: function (id) {
		return (this.layerSettings.keys().grep(id).length > 0 ? true : false);
	},
	
	/**
	 * @function
	 * e.g. http://localhost/hv/getLayerAvailability.php?observatory=none&instrument=EIT&detector=EIT&measurement=none&format=json
	 */
	_buildEntryBody: function (layer) {
		var id = layer.id;
		var options = this.options;
		
		// Populate list of available observatories
		var obs = "<div class=layer-select-label>Observatory: </div> ";
		obs += "<select name=observatory class=layer-select id='observatory-select-" + id + "'>";
		jQuery.each(options.observatories, function (i, o) {
			obs += "<option value='" + o + "'";
			if (layer.observatory == o) {
				obs += " selected='selected'";
			}				 
			obs += ">" + o + "</option>";			
		});
		obs += "</select><br>";
		
		// Populate list of available instruments
		var inst = "<div class=layer-select-label>Instrument: </div> ";
		inst += "<select name=instrument class=layer-select id='instrument-select-" + id + "'>";
		jQuery.each(options.instruments, function (i, o) {
			inst += "<option value='" + o + "'";
			if (layer.instrument == o) {
				inst += " selected='selected'";
			}
			inst += ">" + o + "</option>";			
		});
		inst += "</select><br>";
		
		// Populate list of available Detectors
		var det = "<div class=layer-select-label>Detector: </div> ";
		det += "<select name=detector class=layer-select id='detector-select-" + id + "'>";
		jQuery.each(options.detectors, function (i, o) {
			det += "<option value='" + o + "'";
			if (layer.detector == o) {
				det += " selected='selected'";
			}
			det += ">" + o + "</option>";		
		});
		det += "</select><br>";
		
		// Populate list of available Detectors
		var meas = "<div class=layer-select-label>Measurement: </div> ";
		meas += "<select name=measurement class=layer-select id='measurement-select-" + id + "'>";
		jQuery.each(options.measurements, function (i, o) {
			meas += "<option value='" + o + "'";
			if (layer.measurement == o) {
				meas += " selected='selected'";
			}
			meas += ">" + o + "</option>";		
		});
		meas += "</select><br>";
		
		// Set-up event handler to deal with an instrument change
		//Event.observe(inst, 'change', this.onInstrumentChange.curry(layer.id));
		return (obs + inst + det + meas);
	},

	/**
	 * @function _setupUI
	 * This method handles setting up an empty tile layer accordion.
	 */
	_setupUI: function () {
		// Create a top-level header and an "add layer" button
		var title = jQuery('<span>Layers</span>').css({'float': 'left', 'color': 'black', 'font-weight': 'bold'});
		var addLayerBtn = jQuery('<a href=# class=gray>[Add Layer]</a>').css({'margin-right': '14px'});
		this.container.append(jQuery('<div></div>').css('text-align', 'right').append(title).append(addLayerBtn));

		var innerContainer = jQuery('<ul id=TileLayerAccordion></ul>');
		var outerContainer = jQuery('<div id="TileLayerAccordion-Container"></div>').append(innerContainer);
		this.container.append(outerContainer);
		
        // Event-handlers
		var self = this;
		var hv = this.layerManager.controller;
        addLayerBtn.click(function() {
			self.layerManager.addLayer(new TileLayer(hv.viewports[0], { tileUrlPrefix: hv.tileUrlPrefix, observatory: 'soho', instrument: 'LAS', detector: '0C2', measurement: '0WL' }));        	
        });
	},

	/**
	 * @function
	 * @description
	 */
	_setupEventHandlers: function (layer) {
		visibilityBtn = jQuery("#visibilityBtn-" + layer.id);
		removeBtn = jQuery("#removeBtn-" + layer.id);

		// Function for toggling layer visibility
		var toggleVisibility = function (e) {
			var visible = layer.toggleVisible();
			var icon = (visible ? 'LayerManagerButton_Visibility_Visible.png' : 'LayerManagerButton_Visibility_Hidden.png');
			jQuery("#visibilityBtn-" + layer.id).css('background', 'url(images/blackGlass/' + icon + ')' );
			e.stopPropagation();
		};

		// Function for handling layer remove button
		var removeLayer = function (e) {
			var accordion = e.data;
			accordion.layerManager.removeLayer(layer);
			accordion.domNode.dynaccordion('removeSection', {id: layer.id});
			accordion.layerSettings.unset(layer.id);

			//accordion.layers = accordion.layers.without(layer.id);

			e.stopPropagation();
		};
		
		// Event handlers for select items
		var self = this;
		
		jQuery.each(jQuery('#' + layer.id + ' > div > select'), function (i, item) {
			jQuery(item).change(function(e){
				//alert(this.name + "= " + this.value);
				if (this.name === "observatory") {
					layer.observatory = this.value;
				}
				else if (this.name === "instrument") {
					layer.instrument = this.value;
				}
				else if (this.name === "detector") {
					layer.detector = this.value;
				}
				else if (this.name === "measurement") {
					layer.measurement = this.value;
				}
				
				// Validate new settings and reload layer
				self._onLayerSelectChange(layer, this.name, this.value);
			})
		});

		//visibilityBtn.click(toggleVisibility);
		visibilityBtn.bind('click', this, toggleVisibility);
		removeBtn.bind('click', this, removeLayer);
	},
	
	/**
	 * @function
	 * @param {TileLayer} layer 
	 * @param {String} changed
	 * @description Check to make sure the new layer settings are valid. If the new combination of
	 * choices are not compatable, change values to right of most-recently changed parameter to valid
	 * settings. Once the combination is acceptable, reload the tile layer.
	 */
	_onLayerSelectChange: function (layer, changed, value) {
		// Ajax callback function
		var processResponse = function (transport) {
			// Update options
			this.options = transport.responseJSON;

			// Case 1: Observatory changed
			if (changed === "observatory") {
				this._updateOptions(layer.id, "instrument", this.options.instruments);
				
				//Make sure the instrument choice is still valid.
				if ($A(this.options.instruments).grep(layer.instrument).length == 0) {
					layer.instrument = this.options.instruments[0];
				}
			}
			
			// Case 2: Instrument changed
			if ( (changed === "observatory") || (changed === "instrument") ) {
				this._updateOptions(layer.id, "detector", this.options.detectors);
				
				//Make sure the detector choice is still valid.
				if ($A(this.options.detectors).grep(layer.detector).length == 0) {
					layer.detector = this.options.detectors[0];
				}
			}
			
			// Case 3: Detector changed
			if ( (changed === "observatory") || (changed === "instrument") || (changed === "detector") ) {
				this._updateOptions(layer.id, "measurement", this.options.measurements);	
				
				//Make sure the detector choice is still valid.
				if ($A(this.options.measurements).grep(layer.measurement).length == 0) {
					layer.measurement = this.options.measurements[0];
				}
				
				var instVal = $F('instrument-select-' + layer.id);
				if ($A(this.options.instruments).grep(instVal).length == 0) {
					layer.instrument = this.options.instruments[0];
					
					//update selectedIndex
					var self = this;
					$$('#instrument-select-' + layer.id + ' > option').each(function(opt, i) {
						if (opt.value === self.options.instruments[0]) {
							$('instrument-select-' + layer.id).selectedIndex = i;
						}
					});
				}
			}
			
			// Case 4: Measurement changed
			// Do nothing.
			
			//reload layer settings
			layer.reload();
		};
		
		// Update SELECT options
		var obs  = (changed === "observatory" ? value : 'none');				
		var inst = (changed === "instrument" ? value : 'none');
		var det  = (changed === "detector" ? value : 'none');
		var meas = (changed === "measurement" ? value : 'none');
				
		// Ajax Request
		var xhr = new Ajax.Request(this.queryURL, {
			method: 'get',
			onSuccess: processResponse.bind(this),
			parameters: {
				observatory: obs,
				instrument:  inst,
				detector:    det,
				measurement: meas,
				format:      "json"
			}
		});
	},
	
	/**
	 * @function
	 * @description Updates options for a single SELECT element.
	 * @param {String} id
	 * @param {String} field
	 * @param {Array} newOptions
	 */
	_updateOptions: function (id, field, newOptions) {
		//Remove old options
		$$('#' + field + '-select-' + id + ' > option').each(function(o) {
			o.remove();
		});
		
		//Add new options
		var select = $(field + '-select-' + id);
		$A(newOptions).each(function(o) {
			var opt = new Element('option', {value: o}).insert(o);
			select.insert(opt);
		});
		
	},
    
    /**
     * @method updateTimeStamp
     * @param {SunImage}
     * @param {Int}
     */
    updateTimeStamp: function (layer) {
    	//Grab timestamp dom-node
    	var domNode = $(layer.id).select('.timestamp').first();
    	
        //remove any pre-existing styling
        domNode.removeClassName("timeBehind");
        domNode.removeClassName("timeAhead");
        domNode.removeClassName("timeSignificantlyOff");
                
        // Update the timestamp
        var date = new Date(layer.timestamp * 1000);
        var dateString = date.toYmdUTCString() + ' ' + date.toHmUTCString();

        // Calc the time difference
        var timeDiff = layer.timestamp - this.layerManager.controller.date.getTime() / 1000;

        //this.domNode.select(".timestamp").first().update(dateString + ' ' + timeDiffStr);
        domNode.update(dateString);
        
        //get timestep (TODO: create a better accessor)
        var ts = this.layerManager.controller.timeStepSlider.timestep.numSecs;
        
        // Check to see if observation times match the actual time
        if (timeDiff < 0) {
        	if (Math.abs(timeDiff) > (4 * ts)) {
        		domNode.addClassName("timeSignificantlyOff");
        	}
        	else {
        		domNode.addClassName("timeBehind");
        	}
        }
        else if (timeDiff > 0) {
        	if (timeDiff > (4 * ts)) {
        		domNode.addClassName("timeSignificantlyOff");
        	}
        	else {
        		domNode.addClassName("timeAhead");
        	}
        }
    }
    
});
