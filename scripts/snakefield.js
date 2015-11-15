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
 * 		The field begins with [0,0] coordinate in the UPPER LEFT corner. Again, because of
 * 			for loops & printouts.
 * 
 * 		Direction index:
 * 		+---0---+	This is used for snake and player movement directions. With words:
 * 		|	↑	|	
 * 		3 ←	  → 1	0 = UP, 1 = RIGHT, 2 = DOWN, 3 = LEFT.
 * 		|	↓	|	-1 = EMPTY
 * 		+---2---+
 * 
 * 		The array "snakes" holds the current actual positions of snakes. The problem with having a
 * 			single field and using it for navigation is that snakes plan their moves ahead and if we
 * 			want to stick to only using numbers from 0 to 3 for directional indices we have no way
 * 			of telling a field that a snake plans to move on from a field that a snake has already
 * 			moved on. Therefore, the "snakes" array holds information about occupation of fields.
 */

// Global variables	--------------------------------------------------------------------------------
var container;				// div holding 3D renderer
var contWidth = 600;		// container width
var contHeight = 600;		// container height

var scene;					// scene object				
var camera;					// camera object
var renderer;				// renderer

var level = 0;				// current game level
var entities = [];			// array of snakes (& player at position 0)
var height = 20;			// field height
var width = 20;				// field width
var ground;					// field above ground - data for moving snakes around.
var snakes;					// field mask for snakes - each field holds 0 if empty and 1 if a snake is on it.

var snakePrediction = 4;	// represents the number of turns that snakes plan in advance. It can set down
							//	turn arrows for one cell less than this number (so it doesn't turn and
							//	smack its face into a wall).

var cube;	// a handy cube for testing
var head, tail, dummy;

// init()	----------------------------------------------------------------------------------------
//
// Start the whole thing up. Runs on body load.

function init() {
	// ::: 3D PART ::: ---------------------------
	
	
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
	var geometry = new THREE.BoxGeometry( 1, 1, 1 );
	var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	cube = new THREE.Mesh( geometry, material );
	scene.add( cube );
	cube.position.set(5,8,4);
	
	// instantiate a loader
	var loader = new THREE.OBJMTLLoader();

	// load field
	loader.load(
		'assets/field.obj', 'assets/field.mtl',
		function (field) {	// Function when both resources are loaded
			field.rotation.x = Math.PI/2;
			field.position.set(5,5,0);
			field.scale.set(1.1,1.1,1.1);
			scene.add(field);
		},
		function ( xhr ) {	// Function called when downloads progress
			console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		},
		function ( xhr ) {	// Function called when downloads error
			console.log( 'An error happened' );
		}
	);
	
	
	
	// load snake head
	loader.load(
		'assets/snake_head.obj', 'assets/snake_head.mtl',
		function (head_ld) {	// Function when both resources are loaded
			head_ld.name = ("head");
			head_ld.rotation.x = Math.PI/2;
			head_ld.position.set(0,0,0.5);
			head = head_ld;
			head.scale.set(1,0.8,0.8);
			scene.add(head);
			
			dummy = new THREE.Object3D();
			dummy.position.set(0.4,5,0);
			dummy.add(head);
			scene.add(dummy);
		},
		function ( xhr ) {	// Function called when downloads progress
			console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		},
		function ( xhr ) {	// Function called when downloads error
			console.log( 'An error happened' );
		}
	);
	
	//head = scene.getObjectByName("head");
	
	// load snake body
	loader.load(
		'assets/snake_body.obj', 'assets/snake_body.mtl',
		function (body) {	// Function when both resources are loaded
			body.rotation.x = Math.PI/2;
			body.rotation.y = Math.PI/2;
			body.position.set(0.5,5,0.5);
			body.scale.set(0.8,0.8,1);
			//scene.add(body);
			
			var bodies = [];
			
			
			for (var i = 0; i < 21; i++) {
				bodies.push(body.clone());
				bodies[i].position.set(0.4+(i+1)*0.4,5,0.5);
				scene.add(bodies[i]);
			}
		},
		function ( xhr ) {	// Function called when downloads progress
			console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		},
		function ( xhr ) {	// Function called when downloads error
			console.log( 'An error happened' );
		}
	);
	
	// load snake tail
	loader.load(
		'assets/snake_tail.obj', 'assets/snake_tail.mtl',
		function (tail) {	// Function when both resources are loaded
			tail.name = "tail";
			tail.rotation.y = -Math.PI/2;
			tail.position.set(0.4+22*0.4,5,0.5);
			tail.scale.set(0.8,0.8,1);
			scene.add(tail);
		},
		function ( xhr ) {	// Function called when downloads progress
			console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		},
		function ( xhr ) {	// Function called when downloads error
			console.log( 'An error happened' );
		}
	);
	
	// load arrow
	loader.load(
		'assets/arrow.obj', 'assets/arrow.mtl',
		function (arrow) {	// Function when both resources are loaded
			arrow.name = "arrow";
			arrow.rotation.x = Math.PI/2;
			arrow.position.set(3,3,0.5);
			arrow.scale.set(0.5,0.5,0.5);
			scene.add(arrow);
		},
		function ( xhr ) {	// Function called when downloads progress
			console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		},
		function ( xhr ) {	// Function called when downloads error
			console.log( 'An error happened' );
		}
	);
	
	
	// call the render function
	render();
	
	
	// ::: LOGICS PART :::: ----------------------
	
	// create "ground" and "snakes" arrays and initialise them to all empty.
	ground = new Array(height);
	snakes = new Array(height);
	for (var i = 0; i < height; i++) {
		ground[i] = new Array(width);
		snakes[i] = new Array(width);
		for (var j = 0; j < width; j++) {
			ground[i][j] = -1;
			snakes[i][j] = 0;
		}
	}
	
	// put player entity in 1st spot of entity array
	entities.push("player");	//TODO: make an actual player object
	entities.push(makeSnake());	//	The first snake.
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

/* render()	----------------------------------------------------------------------------------------
 * 
 * Render a frame.
 */
function render() {
	requestAnimationFrame(render);
	
	// rotate the test cube
	cube.rotation.x += 0.1;
	cube.rotation.y += 0.1;
	
	if(tail) {
		tail.rotation.z += 0.1;
	}
	
	if(head) {
		//head.rotation.x += 0.01;
	}
	
	renderer.render(scene, camera);
};

/* makeSnake()	------------------------------------------------------------------------------------
 *
 * The snake constructor method.
 * 
 *	Arguments:	to be decided, all properties could be randomized
 * 	Returns:	a new snake object holding all properties of a new snake for the entities array.
 * 	Other:
 * 
 */
 
function makeSnake() {
	var snPos = getPos();				// Decide the starting position on which snake will begin as [y,x].
	var snLength = 5;					// TODO: calculate snake length based on level and type + randomisation
	var snArray = genField(5);			// Generate a new underground spawn array on which the snake is located.
										// snArray POINTS TO REGULAR FIELD WHEN THE SNAKE MOVES ONTO IT (unburrows).
	var snDir = Math.floor(Math.random()*4);	// Set the snake's movement direction (direction index in global notes)
	var snDelay = getDelay();					// Grab delay needed before snake's next move is calculated.
	var snHead = genModels(snLength, snDir);	// TODO: Pointer to snake's model - specifically its head (which points to the next part, etc).
												// ANIMATION FUNCTION ACCESSES THE MODEL THROUGH THIS POINTER.
	
	var snake = {
		pos:snPos,
		dir:snDir,
		length:snLength,
		delay:snDelay,
		head:snHead,
		planned:0				// how many turns the snake has planned in advance. unless this == snakePrediction
		};						//	the snake won't move yet - it will plan its moves first.
	
	return snake;
}

/*	getPos()																												TODO!!!
 * 
 *		Returns: a random position in the underground array. Used for spawning new snakes.
 */
 
function getPos() {
	return [0,0];
}
 
 
/* genField()
 * 
 * Generates a new field that holds a snake as it spawns underground or when it's burrowing there.
 * 
 * 		Returns: An empty array as long as the snake.
 * 					
 */

function genField() {
	var field = new Array(height);
	for (var i = 0; i < height; i++) {
		field[i] = new Array(width);
		for (var j = 0; j < width; j++) {
			field[i][j] = -1;
		}
	}
	
	return field;
}


/* getDelay()	------------------------------------------------------------------------------------								TODO!!!
 * 
 * Figures out for how long a snake needs to be delayed before its next move is calculated.
 * 
 *	Returns:	A number representing time until snake's next move calculation in miliseconds.
 */

function getDelay() {
	return 1000;
}


/* genModels()	------------------------------------------------------------------------------------								TODO!!!
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
 * 	Returns:	reference to an object that holds the details of snake's head. Details include
 * 				the actual 3D model, texture, 
 */

function genModels(length, dir, field) {
	
	
	return null;
}

/* genPiece()	----
 *
 * Creates a meta object for a model as well as the actual 3D model for a snake piece. Meta
 * object holds the piece's position (on logical field AND its copy of mvMatrix), pointer to the
 * field it's on, the direction it's moving in and of course the actual 3D model.
 */
 
function genPiece() {
	
}

/* move()	----------------------------------------------------------------------------------------
 * 
 */
