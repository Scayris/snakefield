/*
 * +-----------------------------------------------------------------------------------------------+
 * |									   snakefield.js										   |
 * +-----------------------------------------------------------------------------------------------+
 * 
 *	The javascript file holding mechanics for WebGL game Snake Field.
 * 
 * 	Global notes:
 * 		All coordinates are given as [Y, X].
 * 		The field begins with [0,0] coordinate in the UPPER LEFT corner.
 * 
 */

// Global variables	--------------------------------------------------------------------------------
var canvas;			// canvas reference
var gl = null;		// gl context

var entities = [];	// array of snakes (& player)
var height = 20;	// field height
var width = 20;		// field width

var ground;			// field above ground - holds snake positions etc.
var underground;	// field below ground - holds positions of snakes digging underground

// init()	----------------------------------------------------------------------------------------
//
// Start the whole thing up. Runs on body load.

function init() {
	// ::: 3D PART :::
	
	// Grab canvas reference
	canvas = document.getElementById("glcanvas");
	// Initialize the GL context
	gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	
	// Check if we have working WebGL
	if (!gl) {
		alert("Unable to initialize WebGL. Your browser may not support it.");
	} else {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);						// Canvas to black
		gl.clearDepth(1.0);                                     // Clear everything
		gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
		gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.
	}
	
	
	
	// ::: LOGICS PART ::::
	
	// ˇ ENTITY ARRAY ˇ
	
	// put player entity in 1st spot of entity array
	entities.push("player");	//TODO: make an actual player object
	
	
	// ˇ FIELD ˇ
	
	// create "ground" and "underground" arrays and initialise them to all zeros
	ground = new Array(height);
	underground = new Array(height);
	for (var i = 0; i < height; i++) {
		ground[i] = new Array(width);
		underground[i] = new Array(width);
		for (var j = 0; j < width; j++) {
			ground[i][j] = 0;
			underground[i][j] = 0;
		}
	}
	
}

/* makeSnake()	------------------------------------------------------------------------------------
 *
 * The snake constructor method.
 * 
 *	Arguments:	to be decided, all properties could be randomized
 * 	Returns:	a new snake object holding all properties of a new snake for the entities array.
 * 	Other:
 * 		Snake types: 0=normal, (TODO: add more)
 */
 
function makeSnake() {
	var snPos = getFreePos();	// Decide the starting position on which snake will begin as [y,x].
	var snType = 0;				//TODO: decide snake type based on level
	var snLength = 5;			//TODO: calculate snake length based on level and type + randomisation
	var snDelay = getDelay();	// Grab delay needed before snake's next move is calculated.
	var snHead = null;			//TODO: Pointer to snake's model - specifically its head (which points to the next part, etc).
	
	var snake = {
		pos:snPos,
		type:snType,
		length:snLength,
		delay:snDelay,
		head:snHead
		};
	
	return snake;
}

/*	getFreePos() -----
 * 
 *		Returns: a free position in the underground array. Used for spawning new snakes.
 */
 
getFreePos() {
	return [0,0]; 
}
 
 

/* getDelay()	------------------------------------------------------------------------------------		TODO!!!
 * 
 * Figures out for how long a snake needs to be delayed before its next move is calculated.
 * 
 *	Returns:	A number representing time until snake's next move calculation in seconds.
 */

function getDelay() {
	return 1;
}


