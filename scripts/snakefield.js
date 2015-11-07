// Global variables	--------------------------------------------------------------------------------
var canvas;
var gl = null;

// init()	----------------------------------------------------------------------------------------
//
// Start the whole thing up. Runs on body load.

function init() {
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
}
