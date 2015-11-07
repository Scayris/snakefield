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
 * 		Direction index:
 * 		+---0---+	This is used for snake and player movement directions. With words:
 * 		|	↑	|	
 * 		3 ←	  → 1	0 = UP, 1 = RIGHT, 2 = DOWN, 3 = LEFT.
 * 		|	↓	|
 * 		+---2---+
 * 		
 * 
 */

// Global variables	--------------------------------------------------------------------------------
var canvas;					// canvas reference
var gl = null;				// gl context

var level = 0;				// current game level
var entities = [];			// array of snakes (& player at position 0)
var height = 20;			// field height
var width = 20;				// field width
var ground;					// field above ground - holds snake positions etc.
var underground;			// field below ground - holds positions of snakes digging underground

var snakePrediction = 3;	// represents the number of turns that snakes plan in advance.


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
	
	
	// ˇ ENTITY ARRAY ˇ
	
	// put player entity in 1st spot of entity array
	entities.push("player");	//TODO: make an actual player object
	entities.push(makeSnake());	//	The first snake.
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
	var snPos = getFreePos();			// Decide the starting position on which snake will begin as [y,x].
	var snDir = Math.floor(Math.random()*4);	// Set the snake's movement direction (direction index in global notes)
	var snType = 0;						//TODO: decide snake type based on current game level
	var snLength = 5;					//TODO: calculate snake length based on level and type + randomisation
	var snDelay = getDelay();			// Grab delay needed before snake's next move is calculated.
	var snHead = genModels(snLength, snDir);	//TODO: Pointer to snake's model - specifically its head (which points to the next part, etc).
												// ANIMATION FUNCTION ACCESSES THE MODEL THROUGH THIS POINTER.
	
	var snake = {
		pos:snPos,
		dir:snDir,
		type:snType,
		length:snLength,
		delay:snDelay,
		head:snHead,
		planned:0				//how many turns the snake has planned in advance. unless this == snakePrediction
		};						//	the snake won't move yet - it will plan its moves first.
	
	return snake;
}

/*	getFreePos() -----																												TODO!!!
 * 
 *		Returns: a free position in the underground array. Used for spawning new snakes.
 */
 
function getFreePos() {
	return [0,0]; 
}
 
 

/* getDelay()	------------------------------------------------------------------------------------								TODO!!!
 * 
 * Figures out for how long a snake needs to be delayed before its next move is calculated.
 * 
 *	Returns:	A number representing time until snake's next move calculation in seconds.
 */

function getDelay() {
	return 1;
}


/* genModels()	------------------------------------------------------------------------------------								TODO!!!
 * 
 * generates the actual 3D model for the given snake. If the tail would fall out of the field at
 * any point just twist it in any possible direction by 90°.
 * 
 * 	Arguments:	length - the length of the snake to be generated
 * 				dir - the direction that the snake is facing
 * 	Returns:	reference to an object that holds the details of snake's head. Details include
 * 				the actual 3D model, texture, 
 */

function genModels(length, dir) {
	return null;
}
