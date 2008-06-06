/*global Class, $, UIElement, document, Element, Counter,  */
var Layer = Class.create(UIElement, {
    tileSize: 256,
    maxZoomLevel: 20, // ZoomLevel where FullSize = 1px
    minZoomLevel: 10,
    visible: true,

    initialize: function (viewport) {
        this.viewport = viewport;
        this.domNode = $(viewport.movingContainer.appendChild(new Element('div')));
        this.viewport.addObserver('move', this.viewportMove.bind(this));
        this.tiles = [];
        this.id = 'layer' + Counter.getNext.layer;
    },
    
    setZIndex: function (v) {
        this.domNode.setStyle({ zIndex: v });
    },
    
    getStartIndex: function () {
        var ts = this.tileSize;
        var v = {
            x: this.viewport.currentPosition.x - this.viewport.dimensions.width / 2,
            y: this.viewport.currentPosition.y - this.viewport.dimensions.height / 2,
            w: this.viewport.dimensions.width,
            h: this.viewport.dimensions.height
        };

        var borderIndex = {
            left: Math.floor(v.x / ts),
            right: Math.floor((v.x + v.w) / ts),
            top: Math.floor(v.y / ts),
            bottom: Math.floor((v.y + v.h) / ts)
        };
        
        if (borderIndex.right - borderIndex.left < this.numTiles.x - 1) {
            if ((v.x % ts) < (ts - (v.x + v.w) % ts)) {
                borderIndex.left -= 1;
            }
            else {
                borderIndex.right += 1;
            }
        }
        if (borderIndex.bottom - borderIndex.top < this.numTiles.y - 1) {
            if ((v.y % ts) < (ts - (v.y + v.h) % ts)) {
                borderIndex.top -= 1;
            }
            else {
                borderIndex.bottom += 1;
            }
        }

        return { x: borderIndex.left, y: borderIndex.top };
    },
        
    viewportMove: function (position) {
        var oldStartIndex = this.startIndex;
        var m, newTile; //m = direction to add/remove tiles
        var ix, iy;
        
		//Keep track of left-most column x tile-index & top-most y tile-index to be displayed
        this.startIndex = this.getStartIndex();
        
        // has the index of the left / top image changed?
        if (this.startIndex.x !== oldStartIndex.x) {
            var startIx, endIx;
            if (this.startIndex.x > oldStartIndex.x) {
                // case 1: remove left, add right
                startIx = oldStartIndex.x; //startIndexX
                endIx = this.startIndex.x;    
                m = 1;
            } else if (this.startIndex.x < oldStartIndex.x) {
                // case 2: remove right, add left
                startIx = this.startIndex.x + this.numTiles.x;
                endIx = oldStartIndex.x + this.numTiles.x;
                m = -1;
            }

			//Iterate over columns from left -> right
            for (ix = startIx; ix < endIx; ix++) {
            	//For a single column, from top-> bottom ...
                for (iy = oldStartIndex.y; iy < oldStartIndex.y + this.numTiles.y; iy++) {
                	// removes element from dom-node (if parent DNE.. dom-node does not exist)
                    if (this.tiles[ix] && this.tiles[ix][iy] && $(this.tiles[ix][iy]).parentNode) {
                    	$(this.tiles[ix][iy]).remove();
                    }
                    var newIx = ix + m * this.numTiles.x;
                    if (!this.tiles[newIx]) {
                    	this.tiles[newIx] = [];
                    }
                    // get the tile HTML element
                    newTile = this.getTile(newIx, iy, this.viewport.zoomLevel);
                    // plug it into the DOM tree
                    this.tiles[newIx][iy] = $(this.domNode.appendChild(newTile)); 
                    if (this.tiles[ix] && this.tiles[ix][iy]) {
                    	delete this.tiles[ix][iy];
                    }
                }
            }
        }

        if (this.startIndex.y !== oldStartIndex.y) {
            var startIy, endIy;
            if (this.startIndex.y > oldStartIndex.y) {
                // remove top, add bottom
                startIy = oldStartIndex.y;
                endIy = this.startIndex.y;
                m = 1;
            } else if (this.startIndex.y < oldStartIndex.y) {
                // remove bottom, add top
                startIy = this.startIndex.y + this.numTiles.y;
                endIy = oldStartIndex.y + this.numTiles.y;
                m = -1;
            }
            for (iy = startIy; iy < endIy; iy++) {
                for (ix = this.startIndex.x; ix < this.startIndex.x + this.numTiles.x; ix++) {
                    if (this.tiles[ix] && this.tiles[ix][iy] && $(this.tiles[ix][iy]).parentNode) {
                    	$(this.tiles[ix][iy]).remove();
                    }
                    var newIy = iy + m * this.numTiles.y;
                    newTile = this.getTile(ix, newIy, this.viewport.zoomLevel);
                    this.tiles[ix][newIy] = $(this.domNode.appendChild(newTile)); 
                    if (this.tiles[ix] && this.tiles[ix][iy]) {
                    	delete this.tiles[ix][iy];
                    }
                }
            }
        }
    },

    removeTiles: function () {
    	var ix, iy;
    	
        // remove old Tiles (only when loading complete?)
        this.domNode.childElements().each(function (tile) {
        	tile.remove();
        });
        if (this.startIndex) {
            for (ix = this.startIndex.x; ix < this.startIndex.x + this.numTiles.x; ix++) {
                for (iy = this.startIndex.y; iy < this.startIndex.y + this.numTiles.y; iy++) {
                    if (this.tiles[ix][iy]) {
                        //this.tiles[ix][iy].remove();
                        delete this.tiles[ix][iy];
                    }
                }
            }
        }    
    },

    reload: function () {
        this.resetTiles();
    },

    resetTiles: function () {
    	var ix, iy;
    	
		//this.viewport.output(Math.random() + 'resetting tiles');
        this.removeTiles();
            
        this.numTiles = {
            x: Math.ceil(this.viewport.dimensions.width / this.tileSize) + 1,
            y: Math.ceil(this.viewport.dimensions.height / this.tileSize) + 1
        };
        
        this.startIndex = this.getStartIndex();
    
	    // Add tiles
	    for (iy = this.startIndex.y; iy < this.startIndex.y + this.numTiles.y; iy++) {
	    	for (ix = this.startIndex.x; ix < this.startIndex.x + this.numTiles.x; ix++) {
	        	var tile = this.getTile(ix, iy, this.viewport.zoomLevel);
		        if (!this.tiles[ix]) {
		        	this.tiles[ix] = [];
		        }
		        if (this.tiles[ix][iy]) {
		        	this.viewport.output(this.tiles[ix][iy]);
		        }
		        this.tiles[ix][iy] = $(this.domNode.appendChild(tile));
	        }
	    }
    },
  
    setVisible: function (visible) {
	    this.visible = visible;
	    this.domNode.setStyle({ visibility: (visible ? 'visible' : 'hidden') });
	    return this.visible;
    },
  
    toggleVisible: function () {
	    return this.setVisible(!this.visible);
    }
});