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
 * 		3 ←	  → 1	 0 = UP, 1 = RIGHT, 2 = DOWN, 3 = LEFT
 * 		|	↓	|	-1 = EMPTY
 * 		+---2---+	 5 = BURROWING, 6 = SURFACING, 7 = COMPLETELY BURROWED
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

var entities = [];			// array of snakes (& player at position 0)
var size = 20;				// logical field size
var field;					// field above ground - data for moving snakes around.
var snakes;					// field mask for snakes - each field holds 0 if empty and 1 if a snake is on it.
var levelup = true;			// level just changed, spawn snakes.
var level = 0;				// current game level
var levelDuration = 3;		// level duration in seconds
var nextLevelTime;			// the time of next levelup
var snakePrediction = 4;	// represents the number of turns that snakes plan in advance. It can set down
							//	turn arrows for one cell less than this number (so it doesn't turn and
							//	smack its face into a wall).
var maxSnakes = 15;			// maximum number of snakes to exist on field at any time

var fieldSize = 10;						// physical field size
var cellSize = fieldSize / size;		// physical size of a cell
var halfCell = cellSize/2;				// just because it's often needed
var modelScale = cellSize;				// scale models down by this amount so that they fit nicely
var snakeDistanceRelative = 0.4;		// distance between snake pieces relative to model size. 0.35 = seamless, more 2 see movement
var snakeDistance = modelScale * snakeDistanceRelative;	// distance between snake pieces. 

var playerLoaded = false;	// tells if player object is loaded & added into entities array
var playerDelay = 500;		// delay between player moves in miliseconds
var playerStun = 3000;		// how long the player is stunned if he runs into a snake or wall

var head, tail, dummy;		// model holders for original snake models
var rabbit;					// model holder for player character
var arrow;					// model holder for arrow

var loaded = 0;				// counts loaded models
var renderID;				// holds a reference to requestAnimationFrame. Kill it with cancelAnimationFrame() on game over.
var gameStartTime;			// the time that game started

var DEAD = false;			// doesn't get more self explainatory than this.

var cube;					// a handy cube for testing

//HTML elements

var levelDiv;
var scoreDiv;
var positionDiv;


// init()	========================================================================================
//
// Start the whole thing up. Runs on body load.

function init() {
	levelDiv = document.getElementById("level");
	scoreDiv = document.getElementById("score");
	positionDiv = document.getElementById("position");
	
	// ::: 3D PART ::: -----------------------------------------------------------------------------
	
	// Grab container reference
	container = document.getElementById("container");
	
	// create scene
	scene = new THREE.Scene();
	
	// set up camera
	camera = new THREE.PerspectiveCamera(45, contWidth / contHeight, 0.1, 200.0);
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
	cube.position.set(5,8,4);
	//scene.add( cube );
	
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
	
	// load rabbit
	loader.load(
		'assets/rabbit.obj', 'assets/rabbit.mtl',
		function (rabbit_ld) {	// Function when both resources are loaded
			rabbit_ld.scale.set(0.4*modelScale,0.4*modelScale,0.4*modelScale);
			rabbit_ld.rotation.set(Math.PI/2,0,Math.PI/2,"ZYX");
			rabbit_ld.position.set(0,0,0);
			rabbit = new THREE.Object3D();
			rabbit.add(rabbit_ld);
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
			head_ld.scale.set(modelScale,0.8*modelScale,0.8*modelScale);
			head_ld.position.set(0,0,0);
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
			body_ld.scale.set(0.8*modelScale,0.8*modelScale,modelScale);//*1.2);
			body_ld.position.set(0,0,0);
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
			tail_ld.scale.set(modelScale,0.8*modelScale,0.8*modelScale);
			tail_ld.position.set(0,0,0);
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
			arrow_ld.scale.set(0.5*modelScale,0.5*modelScale,0.5*modelScale);
			arrow_ld.position.set(0,0,0);
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
	
	var dateObj = new Date();
	gameStartTime = dateObj.getTime();
	
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
	renderID = requestAnimationFrame(render);
	if (loaded === 6) {
		// rotate the test cube
		//cube.rotation.x += 0.1;
		//cube.rotation.y += 0.1;
		
		//load the player & push him into 1st spot of entity array if needed
		if (!playerLoaded) {
			entities.push(initPlayer());		//	player object
			playerLoaded = true;
		}
		
		// check for a levelup
		var dateObj = new Date();
		var currentTime = dateObj.getTime();
		if (currentTime > nextLevelTime) {
			level++;
			levelDiv.innerHTML = level;
			levelup = true;
		}
		
		// handle a levelup (or start of the game)
		if (levelup) {
			for (var i = 0; i < snakesToGen(); i++) {
				entities.push(makeSnake(0));
			}
			nextLevelTime = currentTime + levelDuration * 1000;
			levelup = false;
		}
		
		// handle player and snake turns
		playerHandler();
		for (var i = 1; i < entities.length; i++) {
			snakeHandler(i);
		}
	}
	renderer.render(scene, camera);
};

/* initPlayer()
 * 
 * initiates the player object and returns it to be added to entity array.
 * 
 * Player object itself rotates by itself, but is moved around by its mover.
 */
function initPlayer() {
	//add keydown event listener
	window.addEventListener("keydown", keyHandler);
	
	var posYX = Math.floor(size/2);
	
	var plMod = rabbit.clone();
	var plMoveHelper = new THREE.Object3D();
	plMoveHelper.add(plMod);
	scene.add(plMoveHelper);
	
	var dateObj = new Date();
	var currentTime = dateObj.getTime();
	var nMoveTime = currentTime + playerDelay;
	
	var player = {
		pos:[posYX, posYX],
		dir:2,
		nextDir:2,
		model:plMod,
		mover:plMoveHelper,
		lastMoveTime:currentTime,
		nextMoveTime:nMoveTime,
		stunned:false
	};
	
	player.model.rotation.set(0,0,Math.PI/2,"ZYX");
	player.model.position.set(halfCell,halfCell,halfCell);
	
	player.mover.position.set(player.pos[1]*cellSize, player.pos[0]*cellSize, 0);
	
	return player;
}

/* snakesToGen();
 * 
 * Decide how many snakes to generate on level change.
 */
function snakesToGen() {
	if (level === 0) { return 1; }
	
	var numPicker = Math.random();
	
	if (entities.length-1 < maxSnakes) {
		if (level < 5) {
			if (numPicker < 0.3) { return 0; }
			else { return 1; }
		} else {
			if (numPicker < 0.1) { return 0; }
			else if (numPicker > 0.8 && entities.length-1 < maxSnakes-1) { return 2; }	//return 2 only if we have space for 2
			else { return 1; }
		}
	}
}

/* playerHandler()	--------------------------------------------------------------------------------
 * 
 * Sort out the player's move in each render iteration.
 */
function playerHandler() {
	var player = entities[0];
	
	var dateObj = new Date();
	var currentTime = dateObj.getTime();
	
	// update score
	scoreDiv.innerHTML = currentTime - gameStartTime;
	
	if (snakes[player.pos[0]][player.pos[1]] === 2) {		///========== GAME OVER ==========///
		DEAD = true;	//just note it down and finish moving so he actually runs into the snake
	}
	
	if (currentTime > player.nextMoveTime) {	//player cellchange
		if(DEAD) {
			camera.rotation.set(Math.PI,0,0,"ZYX");
			cancelAnimationFrame(renderID);
			if(window.confirm("GAME OVER. Play again?")) {
				window.location.reload(false);
			}
		}
		
		player.stunned = false;
		
		var exceededTime = currentTime - player.nextMoveTime;
		player.percentMoved = exceededTime / playerDelay;
		player.lastMoveTime = currentTime;
		player.nextMoveTime = currentTime + playerDelay - exceededTime;
		
		player.dir = player.nextDir;
		var relPos = getDir(player.dir);
		
		if (player.pos[0]+relPos[0] < 0 || player.pos[0]+relPos[0] >= size ||	//check if the player ran into a wall...
			player.pos[1]+relPos[1] < 0 || player.pos[1]+relPos[1] >= size ||
			snakes[player.pos[0]+relPos[0]][player.pos[1]+relPos[1]] === 1) {	//...or a snake.
			
			player.stunned = true;
			player.nextMoveTime = currentTime + playerStun;
			
			switch (player.dir) {
			case 0: player.model.rotation.set(0, 0, Math.PI/2, "ZYX");
					break;
			case 1: player.model.rotation.set(0, 0, 0, "ZYX");
					break;
			case 2: player.model.rotation.set(0, 0, -Math.PI/2, "ZYX");
					break;
			case 3: player.model.rotation.set(0, 0, Math.PI, "ZYX");
					break;
			}
			
			player.dir = (player.dir + 2)%4;
			player.nextDir = player.dir;
			
			return false;
		}
		
		// move player on logical array
		player.pos[0] += relPos[0]; player.pos[1] += relPos[1];
		
		// turn player to face the direction that he's moving in
		switch (player.nextDir) {
			case 0: player.model.rotation.set(0, 0, -Math.PI/2, "ZYX");
					break;
			case 1: player.model.rotation.set(0, 0, Math.PI, "ZYX");
					break;
			case 2: player.model.rotation.set(0, 0, Math.PI/2, "ZYX");
					break;
			case 3: player.model.rotation.set(0, 0, 0, "ZYX");
					break;
		}
		positionDiv.innerHTML = "X: "+player.pos[1]+" Y :"+player.pos[0];
	} else {
		player.percentMoved = (currentTime - player.lastMoveTime) / (player.nextMoveTime - player.lastMoveTime);
	}
	
	if (player.stunned) { return false; }	//ignore player move if stunned
	
	switch (player.dir)	{
		case 0: player.mover.position.set(player.pos[1]*cellSize, (player.pos[0]-1+player.percentMoved)*cellSize, 0);
				break;
		case 1:	player.mover.position.set((player.pos[1]-1+player.percentMoved)*cellSize, player.pos[0]*cellSize, 0);
				break;
		case 2:	player.mover.position.set(player.pos[1]*cellSize, (player.pos[0]+1-player.percentMoved)*cellSize, 0);
				break;
		case 3:	player.mover.position.set((player.pos[1]+1-player.percentMoved)*cellSize, player.pos[0]*cellSize, 0);
				break;
	}
}

/* keyHandler()	------------------------------------------------------------------------------------
 * 
 * Handles keydown events such as player movement.
 */
function keyHandler(keyEvent) {
	var player = entities[0];
	
	switch (keyEvent.keyCode) {
		case 38:	player.nextDir = 0;	//UP
					break;
		case 39:	player.nextDir = 1;	//RIGHT
					break;
		case 40:	player.nextDir = 2;	//DOWN
					break;
		case 37:	player.nextDir = 3;	//LEFT
					break;
	}
}

/* snakeHandler()	--------------------------------------------------------------------------------
 * 
 * Sort out the snake's move in each render iteration.
 * 
 * Accepts snake's index in entities array.
 */
function snakeHandler(index) {
	var snake = entities[index];
	
	var piece = snake.head;
	var planNext = move(piece, snake);
	piece = piece.next;
	
	while (piece.next != null) {
		move(piece, snake);
		piece = piece.next;
	}
	move(piece, snake);
	
	if (planNext) {
		snake.pos = planMove(snake, snake.pos);
	}
	
	if (piece.toDestroy) {	//the entire snake moved underground - destroy it and spawn a new one
		var length = snake.length;
		piece = null;
		
		entities[index] = makeSnake(length);
	}
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
	var snArray = genField(snLength,6);					// Generate a new underground spawn array on which the snake is located.
	var snPos = posPlan.slice(0,2);						// Decide the starting position on which snake will begin as [y,x].
	var snDir = posPlan[2];								// Set the snake's movement direction (direction index in global notes)
	var snHead = genModels(snLength, snPos, snDir, snArray);	// Pointer to snake's model - specifically its head (which points to the next part, etc).
																// ANIMATION FUNCTION ACCESSES THE MODEL THROUGH THIS REFERENCE.
	var dPlates = [];									// a QUEUE (meaning USE dirPlates.shift() NOT POP) holding snake turn arrows
	
	var snake = {
		pos:snPos,
		dir:snDir,
		length:snLength,
		head:snHead,
		planned:2,				// how many turns the snake has planned in advance. unless this == snakePrediction
		dirPlates:dPlates		//	the snake won't move yet - it will plan its moves first.
		};
	
	placeArrow(snake, snDir, snPos);
	var tempDir = field[snake.pos[0]][snake.pos[1]];
	tempPos = getDir(tempDir);
	snake.pos[0] += tempPos[0]; snake.pos[1] += tempPos[1];
	
	while (snake.planned < snakePrediction) {
		snake.pos = planMove(snake, snake.pos);
		snake.planned++;
	}
	
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
		y = Math.floor(Math.random()*(size)); if (y===size) {y = size-1;}
		x = Math.floor(Math.random()*(size)); if (x===size) {x = size-1;}
		dir = Math.floor(Math.random()*4);		if (dir>3)	{dir = 3;}
		tempDir = getDir(dir);
		
		if (field[y][x] != -1) {		//check chosen position
			continue;
		} else {
			for (var i = 0; i < 4; i++) {	// check next cell
				tempDir = getDir((dir+i)%4);
				if (y+tempDir[0] < 0 || y+tempDir[0] === size || x+tempDir[1] < 0 || x+tempDir[1] === size) {
					continue;	//continue if next cell would fall out of field
				}
				if (field[y+tempDir[0]][x+tempDir[1]] === -1) {
					dir = (dir+i)%4;
					clear = true;
					break;
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
 * Accepts:	Snake's length and direction (5 -> burrowing, 6 -> surfacing) to fill the array with.
 * Returns: An empty array as long as the snake + 1.
 * 					
 */

function genField(snakeLen, direction) {
	var field = new Array(snakeLen+1);
	for (var i = 0; i < snakeLen+1; i++) { field[i] = direction; }
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
 * Returns: new planner position
 */
function planMove(snake, planPos) {
	if (field[planPos[0]][planPos[1]] === 5) { return planPos; }	//no need to plan if burrowing
	
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
	var leftClear = tryMove(planPos, leftMove);
	var rightClear = tryMove(planPos, rightMove);
	if (!forwardClear || decider > 0.9) {	//turn if not possible to go forward or randomly
		decider = Math.random();
		if (decider < 0.5 && leftClear) {				//try to move left
			field[planPos[0]][planPos[1]] = leftInd;	//set current field to left's direction index
			placeArrow(snake, leftInd, planPos);		//place arrow
			planPos = [planPos[0]+leftMove[0], planPos[1]+leftMove[1]];	//move current to left
			field[planPos[0]][planPos[1]] = leftInd;	//place left's index on left field too
		} else if (rightClear) {						//try to move right
			field[planPos[0]][planPos[1]] = rightInd;
			placeArrow(snake, rightInd, planPos);
			planPos = [planPos[0]+rightMove[0], planPos[1]+rightMove[1]];
			field[planPos[0]][planPos[1]] = rightInd;
		} else if (leftClear) {							//try to move left again, in case it just wasn't chosen
			field[planPos[0]][planPos[1]] = leftInd;
			placeArrow(snake, leftInd, planPos);
			planPos = [planPos[0]+leftMove[0], planPos[1]+leftMove[1]];
			field[planPos[0]][planPos[1]] = leftInd;
		} else if (forwardClear) {						//try to move forward again, in case it just wasn't chosen
			planPos = [planPos[0]+plannedMove[0], planPos[1]+plannedMove[1]];
			field[planPos[0]][planPos[1]] = index;
		} else {										//no moves possible, burrow
			field[planPos[0]][planPos[1]] = 5;
		}
	} else {	//move forward
		planPos = [planPos[0]+plannedMove[0], planPos[1]+plannedMove[1]];
		field[planPos[0]][planPos[1]] = index;
	}
	return(planPos);
}
function tryMove(planPos, plannedMove) {	//check if a given move is possible
	return (planPos[0]+plannedMove[0] >= 0 && planPos[0]+plannedMove[0] < size &&
	planPos[1]+plannedMove[1] >= 0 && planPos[1]+plannedMove[1] < size &&
	field[planPos[0]+plannedMove[0]][planPos[1]+plannedMove[1]] === -1);
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
	newArr.position.set((pos[1]+0.5)*cellSize,(pos[0]+0.5)*cellSize,0.1);
						//^ 1 FIRST, 0 SECOND! Logical=[y,x], physical=[x,y]!!!
	
	snake.dirPlates.push(newArr);
	scene.add(snake.dirPlates[snake.dirPlates.length-1]);
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
	if (dirS === dirE-1 || (dirS === 3 && dirE === 0)) {
		rotDir = -1;
	} else {
		rotDir = 1;
	}
	
	return (rotDir * (Math.PI/2) * percent)
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

/* move() ==========================================================================================
 * 
 * Moves the accepted piece of snake forward by a portion of the field. Portion is calculated from delays.
 * Also handles turning and erasing arrows.
 * 
 * Accepts the model that needs to be moved.
 * Returns true if the piece was moved onto a new cell, false otherwise.
 */
function move(model, snake) {
	if (model.dir === 6) { return digUp(model, snake); }	// if the snake is still surfacing let digUp handle it.
	if (model.toDestroy) { return false; }	// no need to move these. Just return false and move on.
	
	var newCell = false;
	var dateObj = new Date();
	var currentTime = dateObj.getTime();
	
	if (currentTime >= model.nextMoveTime) {	// check if enough time has passed for snake to move to next cell
		newCell = true;
		
		//handle time change
		var delay = getDelay();
		var exceededTime = currentTime - model.nextMoveTime;
		model.percentMoved = exceededTime / delay;
		model.lastMoveTime = currentTime;
		model.nextMoveTime = currentTime + delay - exceededTime;
		
		//get rid of possible turnHelper
		if (model.turnHelper != null) {
			model.turnHelper.remove(model);
			scene.remove(model.turnHelper);
			//scene.add(model);				//model is added to scene, but not yet moved!
			model.turnHelper = null;
		}
		
		if (model.burrowing === true) {		//model just fully burrowed. Mark it to be destroyed and move on.
			if (model.next === null) {		//tail. Clean up the spot where the snake finished burrowing.
				snakes[model.pos[0]][model.pos[1]] = 0;
				field[model.pos[0]][model.pos[1]] = -1;
			}
			
			model.toDestroy = true;
			return false;
		}
		
		//handle model's direction index
		model.dir = field[model.pos[0]][model.pos[1]];
		
		if (model.next === null) {	// tail. Remove 1 from snakes array & clean up field.
			snakes[model.pos[0]][model.pos[1]] = 0;
			field[model.pos[0]][model.pos[1]] = -1;
		}
		
		//change model's position
		//console.log("modelDir: "+model.dir);
		var relPos = getDir(model.dir);
		model.pos[0] += relPos[0]; model.pos[1] += relPos[1];
		
		//set the field to occupied in snakes array
		if (model === snake.head || model === snake.head.next) {	//first 2 kill the player.
			snakes[model.pos[0]][model.pos[1]] = 2;
		} else {
			snakes[model.pos[0]][model.pos[1]] = 1; // just set it every time
		}
	} else {	//just update percentMoved
		model.percentMoved = (currentTime - model.lastMoveTime) / (model.nextMoveTime - model.lastMoveTime);
	}
	
	if (field[model.pos[0]][model.pos[1]] === model.dir) {	//indices on model and field match -> moving straight
		straightMove(model);
	} else if (field[model.pos[0]][model.pos[1]] === 5) {	//field index === 5 -> burrowing
		burrow(model);
	} else {												//indices on model and field don't match -> turning
		turnMove(model, snake);
	}
	
	return newCell;
}

/* straightMove()	------------------------------
 * 
 * Moves a model in a straight line according to its position, direction and percentMoved.
 * 
 * Accepts the model.
 */
function straightMove(model) {
	if(!model.onScene) {
		scene.add(model);
		model.onScene = true;
	}
	
	switch (model.dir) {
		case 0: model.rotation.set(0, 0, -Math.PI/2, "ZYX");	//moving UP
				model.position.set((model.pos[1]+0.5)*cellSize, (model.pos[0]+model.percentMoved)*cellSize, halfCell);
				break;
		case 1: model.rotation.set(0, 0, Math.PI, "ZYX");		//moving RIGHT
				model.position.set((model.pos[1]+model.percentMoved)*cellSize, (model.pos[0]+0.5)*cellSize, halfCell);
				break;
		case 2: model.rotation.set(0, 0, Math.PI/2, "ZYX");		//moving DOWN
				model.position.set((model.pos[1]+0.5)*cellSize, (model.pos[0]+1-model.percentMoved)*cellSize, halfCell);
				break;
		case 3: model.rotation.set(0, 0, 0, "ZYX");				//moving LEFT
				model.position.set((model.pos[1]+1-model.percentMoved)*cellSize, (model.pos[0]+0.5)*cellSize, halfCell);
				break;
	}
}

/* turnMove()	----------------------------------
 * 
 * Moves a model around a corner according to its position, direction and percentMoved.
 * 
 * Accepts the model.
 */
function turnMove(model, snake) {
	if (model.turnHelper === null) {
		if (model === snake.head.next) {
			scene.remove(snake.dirPlates.shift());				//remove directional plate
		}
		
		scene.remove(model);			// remove piece from scene
		model.onScene = false;
		
		turnHelper = new THREE.Object3D();
		model.turnHelper = turnHelper;
		
		switch (model.dir) {
			case 0: model.rotation.set(0, 0, -Math.PI/2, "ZYX");	//moving UP
					if (field[model.pos[0]][model.pos[1]] === 3) {	//turn LEFT
						model.position.set( halfCell, 0, halfCell);
						model.turnHelper.position.set(
							(model.pos[1])*cellSize,
							(model.pos[0])*cellSize, 0);
					} else {										//turn RIGHT
						model.position.set(-halfCell, 0, halfCell);
						model.turnHelper.position.set(
							(model.pos[1]+1)*cellSize,
							(model.pos[0])*cellSize, 0);
					} break;
			case 1: model.rotation.set(0, 0, Math.PI, "ZYX");		//moving RIGHT
					if (field[model.pos[0]][model.pos[1]] === 0) {	//turn LEFT
						model.position.set(0, -halfCell, halfCell);
						model.turnHelper.position.set(
							(model.pos[1])*cellSize,
							(model.pos[0]+1)*cellSize, 0);
					} else {										//turn RIGHT
						model.position.set(0,  halfCell, halfCell);
						model.turnHelper.position.set(
							(model.pos[1])*cellSize,
							(model.pos[0])*cellSize, 0);
					} break;
			case 2: model.rotation.set(0, 0, Math.PI/2, "ZYX");		//moving DOWN
					if (field[model.pos[0]][model.pos[1]] === 1) {	//turn LEFT
						model.position.set(-halfCell, 0, halfCell);
						model.turnHelper.position.set(
							(model.pos[1]+1)*cellSize,
							(model.pos[0]+1)*cellSize, 0);
					} else {										//turn RIGHT
						model.position.set( halfCell, 0, halfCell);
						model.turnHelper.position.set(
							(model.pos[1])*cellSize,
							(model.pos[0]+1)*cellSize, 0);
					} break;
			case 3: model.rotation.set(0, 0, 0, "ZYX");				//moving LEFT
					if (field[model.pos[0]][model.pos[1]] === 2) {	//turn LEFT
						model.position.set(0,  halfCell, halfCell);
						model.turnHelper.position.set(
							(model.pos[1]+1)*cellSize,
							(model.pos[0])*cellSize, 0);
					} else {										//turn RIGHT
						model.position.set(0, -halfCell, halfCell);
						model.turnHelper.position.set(
							(model.pos[1]+1)*cellSize,
							(model.pos[0]+1)*cellSize, 0);
					} break;
		}
		
		model.turnHelper.add(model);	// add piece to turn helper
		scene.add(model.turnHelper);	// add turn helper to scene
	}
	
	model.turnHelper.rotation.set(0, 0, rotateFor(model.dir, field[model.pos[0]][model.pos[1]], model.percentMoved), "ZYX");
}

/* digUp() ---------------------------------------
 * 
 * Move for surfacing.
 */
function digUp(model, snake) {
	newCell = false;
	
	var dateObj = new Date();
	var currentTime = dateObj.getTime();
	var oldPercentMoved = model.percentMoved;
	
	if (currentTime >= model.nextMoveTime) {	//move to next cell
		newCell = true;
		
		//handle time change
		var delay = getDelay();
		var exceededTime = currentTime - model.nextMoveTime;
		model.percentMoved = exceededTime / delay;
		model.lastMoveTime = currentTime;
		model.nextMoveTime = currentTime + delay - exceededTime;
		
		//handle model position
		if (model.pos === 0) {
			/*if (model === snake.head) {
				console.log("Surfacing at X: "+model.spawnPos[1]+" Y: "+model.spawnPos[0]);
				printField(field);
				printField(snakes);
			}*/
			
			if (model === snake.head.next) {
				scene.remove(snake.dirPlates.shift());		//remove directional plate
			}
			
			model.dir = field[model.spawnPos[0]][model.spawnPos[1]];			// set dir to be the same as field where it surfaces
			
			var tempPos = getDir(model.dir);
			model.pos = [model.spawnPos[0]+tempPos[0], model.spawnPos[1]+tempPos[1]];
			
			if (model === snake.head || model === snake.head.next) {
				snakes[model.pos[0]][model.pos[1]] = 2;							// step here and be eaten
			} else {
				snakes[model.pos[0]][model.pos[1]] = 1;							// mark next field as taken
			}
			
			model.field = field;
			
			model.turnHelper.remove(model);
			scene.remove(model.turnHelper);
			//scene.add(model);				//model is added to scene, but not yet moved!
			model.turnHelper = null;
			
			if (model.next === null) {		//this was the tail, clear surfacing point
				snakes[model.spawnPos[0]][model.spawnPos[1]] = 0;
				field[model.spawnPos[0]][model.spawnPos[1]] = -1;
			}
			
			if (field[model.pos[0]][model.pos[1]] === model.dir) {	//moving straight
				straightMove(model);
				return newCell;
			} else if (field[model.pos[0]][model.pos[1]] === 5) {	//burrowing
				burrow(model);																				//--- TODO - burrowing - same as normal move
				return newCell;
			} else {												//turning
				turnMove(model, snake);
				return newCell;
			}
		} else {
			model.pos--;
		}
	} else {	//just update percentMoved
		model.percentMoved = (currentTime - model.lastMoveTime) / (model.nextMoveTime - model.lastMoveTime);
	}
	
	if (model.pos === 0) {		//turn upwards
		snakes[model.spawnPos[0]][model.spawnPos[1]] = 1;	// mark surfacing field as taken (yes even for head, it's mean to get people eaten from below)
		
		if (model.turnHelper === null) {
			turnHelper = new THREE.Object3D();
			model.turnHelper = turnHelper;
			
			switch(field[model.spawnPos[0]][model.spawnPos[1]]) {
				case 0:	model.turnHelper.position.set(	// moving UP
							(model.spawnPos[1]+0.5)*cellSize,
							(model.spawnPos[0]+1)*cellSize, -halfCell);
						model.position.set(0,-cellSize,0);
						break;
				case 1:	model.turnHelper.position.set(	// moving RIGHT
							(model.spawnPos[1]+1)*cellSize,
							(model.spawnPos[0]+0.5)*cellSize, -halfCell);
						model.position.set(-cellSize,0,0);
						break;
				case 2:	model.turnHelper.position.set(	// moving LEFT
							(model.spawnPos[1]+0.5)*cellSize,
							(model.spawnPos[0])*cellSize, -halfCell);
						model.position.set(0,cellSize,0);
						break;
				case 3:	model.turnHelper.position.set(	// moving DOWN
							(model.spawnPos[1])*cellSize,
							(model.spawnPos[0]+0.5)*cellSize, -halfCell);
						model.position.set(cellSize,0,0);
						break;
			}
			
			scene.remove(model);
			model.onScene = false;
			model.turnHelper.add(model);
			scene.add(model.turnHelper);
		}
		
		var rotAmount = model.percentMoved * Math.PI/2;
		
		switch(field[model.spawnPos[0]][model.spawnPos[1]]) {
			case 0:	model.turnHelper.rotation.set(-rotAmount, 0, 0, "ZYX");
					break;
			case 1:	model.turnHelper.rotation.set(0, rotAmount, 0, "ZYX");
					break;
			case 2:	model.turnHelper.rotation.set(rotAmount, 0, 0, "ZYX");
					break;
			case 3:	model.turnHelper.rotation.set(0, -rotAmount, 0, "ZYX");
					break;
		}
	} else {					//move straight up
		model.position.z = -1 * (model.pos * cellSize) + (model.percentMoved * cellSize);
	}
	
	return newCell;
}

/* burrow()	--------------------------------------
 * 
 * Move downwards a cell.
 * 
 * Set a piece's "burrowing" property to true so that once it burrows for more than 1 cell its
 *	"toDestroy" property is se to true as well in move() method. Afterwards it is no longer
 * 	considered for moves and as soon as tail reaches "toDestroy" = true status snakeHandler()
 * 	destroys the snake and spawns a new one.
 */
function burrow(model) {
	var dateObj = new Date();
	var currentTime = dateObj.getTime();
	
	if (model.turnHelper === null) {
		//console.log("burrowing at X: "+model.pos[1]+" Y: "+model.pos[0]);
		//printField(field);
		
		scene.remove(model);
		model.onScene = false;
		
		turnHelper = new THREE.Object3D();
		model.turnHelper = turnHelper;
		
		switch(model.dir) {
			case 0: model.rotation.set(0, 0, -Math.PI/2, "ZYX");	//moving UP
					model.turnHelper.position.set(
						(model.pos[1]+0.5)*cellSize,
						(model.pos[0])*cellSize, -halfCell);
					break;
			case 1: model.rotation.set(0, 0, Math.PI, "ZYX");		//moving RIGHT
					model.turnHelper.position.set(
						(model.pos[1])*cellSize,
						(model.pos[0]+0.5)*cellSize, -halfCell);
					break;
			case 2: model.rotation.set(0, 0, Math.PI/2, "ZYX");		//moving DOWN
					model.turnHelper.position.set(
						(model.pos[1]+0.5)*cellSize,
						(model.pos[0]+1)*cellSize, -halfCell);
					break;
			case 3: model.rotation.set(0, 0, 0, "ZYX");				//moving LEFT
					model.turnHelper.position.set(
						(model.pos[1]+1)*cellSize,
						(model.pos[0]+0.5)*cellSize, -halfCell);
					break;
		}
		
		model.position.set(0,0,cellSize);
		model.turnHelper.add(model);
		scene.add(model.turnHelper);
		
		model.burrowing = true;
	}
	
	var rotAmount = model.percentMoved * Math.PI/2;
	
	switch(model.dir) {
		case 0:	turnHelper.rotation.set(-rotAmount, 0, 0, "ZYX");
				break;
		case 1:	turnHelper.rotation.set(0, rotAmount, 0, "ZYX");
				break;
		case 2:	turnHelper.rotation.set(rotAmount, 0, 0, "ZYX");
				break;
		case 3:	turnHelper.rotation.set(0, -rotAmount, 0, "ZYX");
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


/* genModels()	====================================================================================
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
function genModels(length, pos, dir, field) {
	// Decide how many actual pieces to generate. This number includes head and tail.
	var pieceCount = Math.floor((length - 0.5 - 0.3) / snakeDistanceRelative);
					//^ 0.5 space before head, 0.3 so that tail isn't too far back into the next cell
	var posZ = -1.5;
	
	//time delay
	var delay = getDelay();
	
	//head
	var snakeHead = head.clone();
	spawnRot(snakeHead, dir);
	snakeHead.position.set((pos[1]+0.5)*cellSize, (pos[0]+0.5)*cellSize, posZ*cellSize);
	posZ -= snakeDistanceRelative;
	scene.add(snakeHead);
	snakeHead.onScene = true;
	
	snakeHead.field = field;
	snakeHead.dir = 6;
	snakeHead.pos = 0;				// position in 1D spawn array
	snakeHead.spawnPos = new Array();									// position that the model spawned at. Used for surfacing.
	snakeHead.spawnPos.push(pos[0]); snakeHead.spawnPos.push(pos[1]);	// YES IT HAS TO BE THAT LONG. TOOK ME LIKE 6 HOURS TO FIGURE OUT...
																		//	...THAT IT WAS COPYING THE REFERENCE - NOT VALUE. Damn better be sure.
	snakeHead.turnHelper = null;	// object used for turning snakes. Equals null if not mid-turn.
	
	var dateObj = new Date();
	var currentTime = dateObj.getTime();
	snakeHead.percentMoved = 0;
	snakeHead.lastMoveTime = currentTime;
	snakeHead.nextMoveTime = currentTime+delay*1.5;
	
	snakeHead.burrowing = false;
	snakeHead.toDestroy = false;
	
	//body
	var previous = snakeHead;
	var tempPiece;
	for (var i = 0; i < pieceCount-2; i++) {
		tempPiece = body.clone();
		spawnRot(tempPiece, dir);
		tempPiece.position.set((pos[1]+0.5)*cellSize, (pos[0]+0.5)*cellSize, posZ*cellSize);
		posZ -= snakeDistanceRelative;
		scene.add(tempPiece);
		tempPiece.onScene = true;
		
		tempPiece.field = field;
		tempPiece.dir = 6;
		tempPiece.pos = 1+Math.floor(0.5+(i+1)*snakeDistanceRelative);	//position in 1D spawn array
		tempPiece.spawnPos = new Array();									// position that the model spawned at. Used for surfacing.
		tempPiece.spawnPos.push(pos[0]); tempPiece.spawnPos.push(pos[1]);	// refer to above comment about length.
		tempPiece.turnHelper = null;
		
		dateObj = new Date();
		currentTime = dateObj.getTime();
		tempPiece.percentMoved = 0;
		tempPiece.lastMoveTime = currentTime;
		tempPiece.nextMoveTime = currentTime+delay+(0.5+(i+1)*snakeDistanceRelative-tempPiece.pos)*delay;
		
		tempPiece.burrowing = false;
		tempPiece.toDestroy = false;
		
		previous.next = tempPiece;
		previous = tempPiece;
	}
	
	//tail
	tempPiece = tail.clone();
	spawnRot(tempPiece, dir);
	tempPiece.position.set((pos[1]+0.5)*cellSize, (pos[0]+0.5)*cellSize, posZ*cellSize);
	scene.add(tempPiece);
	tempPiece.onScene = true;
	
	tempPiece.field = field;
	tempPiece.dir = 6;
	tempPiece.pos = 1+Math.floor(0.5+(i+1)*snakeDistanceRelative);	//position in 1D spawn array
	tempPiece.spawnPos = new Array();									// position that the model spawned at. Used for surfacing.
	tempPiece.spawnPos.push(pos[0]); tempPiece.spawnPos.push(pos[1]);	// refer to above comment about length.
	tempPiece.turnHelper = null;
	
	dateObj = new Date();
	currentTime = dateObj.getTime();
	tempPiece.percentMoved = 0;
	tempPiece.lastMoveTime = currentTime;
	tempPiece.nextMoveTime = currentTime+delay+(0.5+(i+1)*snakeDistanceRelative-tempPiece.pos)*delay;
	
	tempPiece.burrowing = false;
	tempPiece.toDestroy = false;
	
	previous.next = tempPiece;
	tempPiece.next = null;		//this allows for simple identification of tail
	
	//return head
	return snakeHead;
}

/* HELPERS	========================================================================================
 * 
 * Mostly used for debugging.
 */

function printField(field) {
	var printout = "";
	for (var i = field.length-1; i >= 0; i--) {
		for (var j = 0; j < field[i].length; j++) {
			if (field[i][j] < 0) {
				printout += (" "+field[i][j]);
			} else {
				printout += ("  "+field[i][j]);
			}
		}
		printout += "\n";
	}
	console.log(printout);
}
