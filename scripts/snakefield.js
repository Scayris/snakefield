/*
 * +-----------------------------------------------------------------------------------------------+
 * |									   snakefield.js										   |
 * +-----------------------------------------------------------------------------------------------+
 * 
 *	The javascript file holding mechanics for WebGL game Snake Field.
 * 
 * 	Global notes:
 * 		All coordinates are given as [Y,X]. This is to make for loops more clear (coords tend
 * 			to get mixed up in them).
 * 		The field begins with [0,0] coordinate in the LOWER LEFT corner.
 * 
 * 		Direction index:
 * 		+---0---+	This is used for snake and player movement directions. With words:
 * 		|	↑	|	
 * 		3 ←	  → 1	0 = UP, 1 = RIGHT, 2 = DOWN, 3 = LEFT.
 * 		|	↓	|	-1 = EMPTY
 * 		+---2---+	5 = BURROW, 6 = SURFACE
 * 
 * 		The array "snakes" holds the current actual positions of snakes. The problem with having a
 * 			single field and using it for navigation is that snakes plan their moves ahead and if we
 * 			want to stick to only using numbers from 0 to 3 for directional indices we have no way
 * 			of telling a field that a snake plans to move on from a field that a snake has already
 * 			moved on. Therefore, the "snakes" array holds information about occupation of fields.
 * 
 * 		All the models are loaded to originally point left (so toward negative X).
 */

// Global variables	--------------------------------------------------------------------------------
var container;				// div holding 3D renderer
var contWidth = 600;		// container width
var contHeight = 600;		// container height

var scene;					// scene object				
var camera;					// camera object
var renderer;				// renderer

var level = 0;						// current game level
var entities = [];					// array of snakes (& player at position 0)
var size = 20;						// logical field size
var field;							// field above ground - data for moving snakes around.
var snakes;							// field mask for snakes - each field holds 0 if empty and 1 if a snake is on it.
var fieldSize = 10;					// physical field size
var cellSize = fieldSize / size;	// physical size of a cell

var snakePrediction = 4;	// represents the number of turns that snakes plan in advance. It can set down
							//	turn arrows for one cell less than this number (so it doesn't turn and
							//	smack its face into a wall).

var head, tail, dummy;		// model holders for original snake models
var arrow;					// model holder for arrow

var loaded = 0;				// counts loaded models

var cube;	// a handy cube for testing

// init()	========================================================================================
//
// Start the whole thing up. Runs on body load.

function init() {
	// ::: 3D PART ::: -----------------------------------------------------------------------------
	
	// Grab container reference
	container = document.getElementById('container');
	
	// create scene
	scene = new THREE.Scene();
	
	// set up camera
	camera = new THREE.PerspectiveCamera(45, contWidth / contHeight, 0.1, 150.0);
	camera.position.set(5,5,13.5);
	camera.lookAt(5,5,0);
	scene.add(camera);
	
	// set up ambient light
	var ambient = new THREE.AmbientLight( 0x444444 );
	scene.add( ambient );
	
	//set up directional light
	var directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.set(0, 0.5, 1);
	scene.add(directionalLight);
	
	// Check for WebGL and create appropriate renderer
	if (webglAvailable())
		renderer = new THREE.WebGLRenderer( {antialias:true} );
	else
		renderer = new THREE.CanvasRenderer();
	
	// set renderer size so it fits into container
	renderer.setSize(contWidth, contHeight);
	// attach renderer to the container div
	container.appendChild(renderer.domElement);
	
	
	// add a test cube
	var geometry = new THREE.BoxGeometry(1,1,1);
	var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	cube = new THREE.Mesh( geometry, material );
	scene.add( cube );
	cube.position.set(5,8,4);
	
	// --- LOADERS ---------------------------------------------------------------------------------
	
	// instantiate a loader
	var loader = new THREE.OBJMTLLoader();

	// load ground
	loader.load(
		'assets/field.obj', 'assets/field.mtl',
		function (ground) {	// Set the field into position.
			ground.rotation.x = Math.PI/2;
			ground.position.set(5,5,0);
			ground.scale.set(1.1,1.1,1.1);
			scene.add(ground);
			loaded++;
		},
		function ( xhr ) {	console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );	},	//DL progress
		function ( xhr ) {	console.log( 'An error happened' );								//error
		}
	);
	
	// load snake head
	loader.load(
		'assets/snake_head.obj', 'assets/snake.mtl',
		function (head_ld) {	// Function when both resources are loaded
			head_ld.rotation.x = Math.PI/2;
			head_ld.scale.set(1,0.8,0.8);
			head = new THREE.Object3D();
			head.add(head_ld);
			//scene.add(head);
			loaded++;
		},
		function ( xhr ) {	console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );	},	//DL progress
		function ( xhr ) {	console.log( 'An error happened' );								//error
		}
	);
	
	// load snake body
	loader.load(
		'assets/snake_body.obj', 'assets/snake.mtl',
		function (body_ld) {
			body_ld.rotation.y = Math.PI/2;
			body_ld.scale.set(0.8,0.8,1);
			body = new THREE.Object3D();
			body.add(body_ld);
			//scene.add(body);
			loaded++;
		},
		function ( xhr ) {	console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );	},	//DL progress
		function ( xhr ) {	console.log( 'An error happened' );								//error
		}
	);
	
	// load snake tail
	loader.load(
		'assets/snake_tail.obj', 'assets/snake.mtl',
		function (tail_ld) {
			tail_ld.scale.set(0.8,0.8,1);
			tail = new THREE.Object3D();
			tail.add(tail_ld);
			loaded++;
		},
		function ( xhr ) {	console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );	},	//DL progress
		function ( xhr ) {	console.log( 'An error happened' );								//error
		}
	);
	
	// load arrow
	loader.load(
		'assets/arrow.obj', 'assets/arrow.mtl',
		function (arrow_ld) {	// Function when both resources are loaded
			arrow_ld.rotation.x = Math.PI/2;
			arrow_ld.scale.set(0.5,0.5,0.5);
			arrow = new THREE.Object3D();
			arrow.add(arrow_ld);
			//scene.add(arrow);
			loaded++;
		},
		function ( xhr ) {	console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );	},	//DL progress
		function ( xhr ) {	console.log( 'An error happened' );								//error
		}
	);
	
	// ::: LOGICS PART :::: ------------------------------------------------------------------------
	
	// create "field" and "snakes" arrays and initialise them to all empty.
	field = new Array(size);
	snakes = new Array(size);
	for (var i = 0; i < size; i++) {
		field[i] = new Array(size);
		snakes[i] = new Array(size);
		for (var j = 0; j < size; j++) {
			field[i][j] = -1;
			snakes[i][j] = 0;
		}
	}
	
	// put player entity in 1st spot of entity array
	entities.push(initPlayer());		//	player object
	entities.push(makeSnake());			//	The first snake.
	
	// call the render function
	render();
}


/* webglAvailable()	-----
 * 
 * Check for WebGL support.
 */
function webglAvailable() {
	try {
		var canvas = document.createElement( 'canvas' );
		return !!(window.WebGLRenderingContext && (	canvas.getContext('webgl') ||
													canvas.getContext('experimental-webgl')));
	} catch (e) {
		return false;
	}
}

/* render()	========================================================================================
 * 
 * Render a frame.
 */
function render() {
	requestAnimationFrame(render);
	if (loaded === 5) {
		// rotate the test cube
		cube.rotation.x += 0.1;
		cube.rotation.y += 0.1;
	}
	renderer.render(scene, camera);
};

/* initPlayer()
 * 
 * initiates the player object and returns it to be added to entity array
 */
function initPlayer() {
	var posYX = Math.floor(size/2);
	var player = {
		pos:[posYX, posYX],
		dir:2
	}
	return player;
}


/* makeSnake()	====================================================================================
 *
 * The snake constructor method.
 * 
 *	Arguments:	snake length, random if 0
 * 	Returns:	a new snake object holding all properties of a new snake for the entities array.
 */ 
function makeSnake(len) {
	var posPlan = getPos();

	if (len != 0) {
		var snLength = len;
	} else {
		var snLength = 5 + Math.floor(Math.random()*20);
	}	
	var snArray = genField(5);							// Generate a new underground spawn array on which the snake is located.
														// snArray POINTS TO REGULAR FIELD WHEN THE SNAKE FULLY MOVES ONTO IT (unburrows).
	var snDelay = getDelay();							// Grab delay needed before snake's next move is calculated.
	var snPos = posPlan.slice(0,1);						// Decide the starting position on which snake will begin as [y,x].
	var snDir = posPlan[2];								// Set the snake's movement direction (direction index in global notes)
	var snHead = genModels(snLength, snDir);			// TODO: Pointer to snake's model - specifically its head (which points to the next part, etc).
														// ANIMATION FUNCTION ACCESSES THE MODEL THROUGH THIS POINTER.
	var dPlates = [];									// a QUEUE (meaning USE dirPlates.shift() NOT POP) holding snake turn arrows
	
	var snake = {
		pos:snPos,
		dir:snDir,
		length:snLength,
		delay:snDelay,
		head:snHead,
		planned:0,				// how many turns the snake has planned in advance. unless this == snakePrediction
		dirPlates:dPlates		//	the snake won't move yet - it will plan its moves first.
		};
	
	return snake;
}

/* reserveSpace()
 * 
 * Reserves 2 cells on the field - the space needed for a new snake on the field. Also decides the snake's position.
 * 
 *		Returns: [y, x, direction].
 */
 
function getPos() {
	var clear = false;
	var x, y, dir, tempDir;
	while (!clear) {
		clear = true;
		y = Math.floor(Math.random()*(size)); if (y===size) {y = size-1;}
		x = Math.floor(Math.random()*(size)); if (x===size) {x = size-1;}
		dir = Math.floor(Math.random()*4);		if (dir>3)	{dir = 3;}
		tempDir = getDir(dir);
		
		if (field[y][x] != -1) {		//check chosen position
			clear = false;
		} else {
			if (field[y+tempDir[0]][x+tempDir[1]] != -1) {	//check next cell
				clear = false;
				for (var i = 1; i < 4; i++) {				//next cell taken, check other 3 directions
					tempDir = getDir((dir+i)%4);
					if (y+tempDir[0] < 0 || y+tempDir[0] === size || x+tempDir[1] < 0 || x+tempDir[1] === size) {
						continue;	//continue if next cell would fall out of field
					}
					if (field[y+tempDir[0]][x+tempDir[1]] == -1) {
						dir = (dir+i)%4;
						clear = true;
						break;
					}
				}
			}
		}
	}
	
	field[y][x] = dir;
	field[y+tempDir[0]][x+tempDir[1]] = dir;	//just temporarily set it to dir, it gets checked again by planMove();
	return([y,x,dir]);
}
 
 
/* genField()
 * 
 * Generates a new field that holds a snake as it spawns underground or when it's burrowing there.
 * 
 * Returns: An empty array as long as the snake + 1.
 * 					
 */

function genField(snakeLen) {
	var field = new Array(snakeLen+1);
	for (var i = 0; i < snakeLen+1; i++) { field[i] = -1;	}
	return field;
}

/* Directional functions ===========================================================================
 *
 * These are used for planning moves & working with directional indices.
 */

/* planMove()
 * 
 * Plans a snake's future move and marks it down on the field. Also places an arrow if needed
 * 
 * Accepts: snake object and planner position as [y,x]
 */
function planMove(snake, planPos) {
	//indices
	var index = field[planPos[0]][planPos[1]];
	var leftInd = index - 1;
	if (leftInd < 0) leftInd = 3;
	var rightInd = index + 1;
	if (rightInd > 3) rightInd = 0;
	
	//relative move arrays
	var plannedMove = getDir(index);
	var leftMove = getDir(leftInd);
	var rightMove = getDir(rightInd);
	
	//decide where to move, try if possible and move
	var decider = Math.random();
	var forwardClear = tryMove(planPos, plannedMove);
	if (!forwardClear || decider > 0.9) {	//turn if not possible to go forward or randomly
		decider = Math.random();
		if (decider < 0.5 && tryMove(planPos, leftMove)) {	//try to move left
			field[planPos[0]][planPos[1]] = leftInd;	//set current field to left's direction index
			placeArrow(snake, leftInd, planPos);		//place arrow
			planPos = field[planPos[0]+leftMove[0]][planPos[1]+leftMove[1]];	//move current to left
			field[planPos[0]][planPos[1]] = leftInd;	//place left's index on left field too
		} else if (tryMove(planPos, rightMove)) {			//try to move right
			field[planPos[0]][planPos[1]] = rightInd;
			placeArrow(snake, rightInd, planPos);
			planPos = field[planPos[0]+rightMove[0]][planPos[1]+rightMove[1]];
			field[planPos[0]][planPos[1]] = rightInd;
		} else if (forwardClear) {							//try to move forward
			placeArrow(snake, index, planPos);
			planPos = field[planPos[0]+plannedMove[0]][planPos[1]+plannedMove[1]];
			field[planPos[0]][planPos[1]] = index;
		} else {											//burrow
																																// --------- TODO ----------
		}
	}
}
function tryMove(planPos, plannedMove) {	//check if a given move is possible
	planPos[0]+plannedMove[0] >= 0 && planPos[0]+plannedMove[0] < size &&
	planPos[1]+plannedMove[1] >= 0 && planPos[1]+plannedMove[1] < size &&
	field[planPos[0]+plannedMove[0]][planPos[1]+plannedMove[1]] == -1
}
function placeArrow(snake, dir, pos) {		//place an arrow on field and add it to snake's dirPlates queue
	var newArr = arrow.clone();
	switch (dir) {
		case 0: newArr.rotation.set(0, 0, -Math.PI/2, "ZYX");
				break;
		case 1: newArr.rotation.set(0, 0, Math.PI, "ZYX");
				break;
		case 2: newArr.rotation.set(0, 0, Math.PI/2, "ZYX");
				break;
		case 3: break;
	}
	newArr.position.set(pos[1]*cellSize+0.5,pos[0]*cellSize+0.5,0.1);
						//^ 1 FIRST, 0 SECOND! Logical=[y,x], physical=[x,y]!!!
	
	snake.dirPlates.push(newArr);
	field.add(snake.dirPlates[snake.dirPlates.length-1]);
}

/* getDir()
 * 
 * Accepts a directional index.
 * Returns an array of [y,x] - relative position of the field that the index points to.
 */
function getDir(index) {
	switch (index) {
		case 0: return[ 1, 0];
		case 1: return[ 0, 1];
		case 2: return[-1, 0];
		case 3: return[ 0,-1];
	}
}

/* rotateFor()
 * 
 * Returns a value needed to rotate a 3D object from one directional index to another by a given
 * percentage around Z.
 * 
 * Accepts: current directional index, next one, % to rotate by (0<=percent<=1)
 */
function rotateFor(dirS, dirE, percent) {
	var rotDir;
	if (dirS < dirE || (dirS === 3 && dirE === 0)) {
		rotDir = -1;
	} else {
		rotDir = 1;
	}
	
	return ((Math.PI/2) * percent)
}


/* spawnRot()
 * 
 * Rotate a given model from its initial position (flat facing left) to given direction & facing up
 * 
 * Accepts: the model and direction index
 */
function spawnRot(model, dir) {
	switch (dir) {
		case 0: model.rotation.set(0, Math.PI/2, -Math.PI/2, "ZYX");
				break;
		case 1: model.rotation.set(0, Math.PI/2, Math.PI, "ZYX");
				break;
		case 2: model.rotation.set(0, Math.PI/2, Math.PI/2, "ZYX");
				break;
		case 3: model.rotation.set(0, Math.PI/2, 0, "ZYX");
				break;
	}
}

/* getDelay()	====================================================================================
 * 
 * Figures out for how long a snake needs to be delayed before its next move is calculated.
 * 
 *	Returns:	A number representing time until snake's next move calculation in miliseconds.
 */
function getDelay() {
	return (Math.pow(0.95,level)*1000);
}


/* genModels()	====================================================================================								TODO!!!
 * 
 * Generates the actual 3D models (and their meta objects) for the given snake.
 * 
 * 	Arguments:	length - the length of the snake to be generated
 * 				dir - the direction that the snake is facing. Represented by direction index. This
 * 						argument changes to equal direction argument of a field cell ONCE IT LEAVES
 * 						IT. This is crucial because the diffecences of field and snake indices are
 * 						used for animation of movement on field.
 * 				field - pointer to the field that the snake is currently on
 * 
 * 	Returns:	snake's head (Object3D)
 */
function genModels(length, dir, field) {
	
	
	return null;
}

/* genPiece()
 * 
 */
function genPiece() {
	
}


