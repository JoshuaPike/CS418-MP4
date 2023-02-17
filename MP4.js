/**
 * @file A simple physics engine in WebGL
 * @author Josh Pike <joshuap5@illinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program for the spheres*/
var sphereShaderProgram;

/** @global The Sphere's Modelview matrix */
var mvMatrixSphere = mat4.create();

/** @global The View matrix */
var vMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Sphere's Normal matrix */
var nMatrixSphere = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global Sphere array. Holds spheres to be rendered */
var sphereArray = [];

// Buffers for the shader
/** @global Vertex position buffer for the sphere */
var sphereVertexPositionBuffer;

/** @global Vertex normal buffer for the sphere */
var sphereVertexNormalBuffer;

/** @global Time elapsed between frames */
var elapsedTime = 0;

// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0, 1.0, 13.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,-1.0,-13.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [10, 10, 10];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0.1, 0.1, 0.1];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1., 1., 1.];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[1., 1., 1.];




//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
    var names = ["webgl", "experimental-webgl"];
    var context = null;
    for (var i=0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        } catch(e) {}
        if (context) {
            break;
        }
    }
    if (context) {
        context.viewportWidth = canvas.width;
        context.viewportHeight = canvas.height;
    } else {
        alert("Failed to create WebGL context!");
    }
    return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
    var shaderScript = document.getElementById(id);

    // If we don't find an element with the specified id
    // we do an early exit 
    if (!shaderScript) {
        return null;
    }

    // Loop through the children for the found DOM element and
    // build up the shader source code as a string
    var shaderSource = "";
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
            shaderSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    } 
    return shader;
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 500.0);


    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);

    var xAxis = vec3.fromValues(1.0, 0.0, 0.0);
    vec3.cross(up, xAxis, viewDir);

    // Then generate the lookat matrix and initialize the view matrix to that view
    mat4.lookAt(vMatrix,eyePt,viewPt,up);

    uploadLightsToSphereShader(lightPosition,lAmbient,lDiffuse,lSpecular);
    uploadProjectionMatrixToShader();

    sphereArray.forEach(function(curSphere) {
        curSphere.mvPushMatrix();

        // Translate mvMatrixSphere
        mat4.translate(mvMatrixSphere, mvMatrixSphere, curSphere.position);
        mat4.scale(mvMatrixSphere, mvMatrixSphere, curSphere.scale);

        mat4.multiply(mvMatrixSphere,vMatrix,mvMatrixSphere);

        curSphere.uploadMaterialToSphereShader();
        curSphere.setMatrixUniforms();
        drawSphere();

        curSphere.mvPopMatrix();
    });

}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    setupSphereBuffers();
    setupSphereShaders();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    tick();
}


/**
  * Update any model transformations
  */
function animate() {
    // Update positions and velocites of spheres
    sphereArray.forEach(function(curSphere) {
        //curSphere.updatePosition(0.01);
        curSphere.checkCollision(0.01);
        curSphere.updateVelocity(0.01);
        
        //curSphere.printPos();
    });
}


/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    animate();
    var prevTime = Date.now();
    draw();
    elapsedTime = (Date.now() - prevTime)/100;
}



//------------------- SPHERE SETUP AND DRAW STUFF BELOW -----------------------------------
/**
 * Setup the fragment and vertex shaders for the spheres
 */
function setupSphereShaders() {
    vertexShader = loadShaderFromDOM("sphere-shader-vs");
    fragmentShader = loadShaderFromDOM("sphere-shader-fs");

    sphereShaderProgram = gl.createProgram();
    gl.attachShader(sphereShaderProgram, vertexShader);
    gl.attachShader(sphereShaderProgram, fragmentShader);
    gl.linkProgram(sphereShaderProgram);

    if (!gl.getProgramParameter(sphereShaderProgram, gl.LINK_STATUS)) {
        alert("Failed to setup shaders");
    }

    gl.useProgram(sphereShaderProgram);

    sphereShaderProgram.vertexPositionAttribute = gl.getAttribLocation(sphereShaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(sphereShaderProgram.vertexPositionAttribute);

    sphereShaderProgram.vertexNormalAttribute = gl.getAttribLocation(sphereShaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(sphereShaderProgram.vertexNormalAttribute);

    sphereShaderProgram.mvMatrixUniform = gl.getUniformLocation(sphereShaderProgram, "uMVMatrix");
    sphereShaderProgram.pMatrixUniform = gl.getUniformLocation(sphereShaderProgram, "uPMatrix");
    sphereShaderProgram.nMatrixUniform = gl.getUniformLocation(sphereShaderProgram, "uNMatrix");
    sphereShaderProgram.uniformLightPositionLoc = gl.getUniformLocation(sphereShaderProgram, "uLightPosition");    
    sphereShaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(sphereShaderProgram, "uAmbientLightColor");  
    sphereShaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(sphereShaderProgram, "uDiffuseLightColor");
    sphereShaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(sphereShaderProgram, "uSpecularLightColor");
    sphereShaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(sphereShaderProgram, "uKDiffuse");
    sphereShaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(sphereShaderProgram, "uKAmbient");
    sphereShaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(sphereShaderProgram, "uKSpecular");

    sphereShaderProgram.uniformShininess = gl.getUniformLocation(sphereShaderProgram, "uShininess"); 
}

//-------------------------------------------------------------------------
/**
 * Populates buffers with data for spheres
 */
function setupSphereBuffers() {  
    var sphereSoup=[];
    var sphereNormals=[];
    var numT=sphereFromSubdivision(6,sphereSoup,sphereNormals);
    console.log("Generated ", numT, " triangles"); 
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT*3;
    console.log(sphereSoup.length/9);

    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                  gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT*3;

    console.log("Normals ", sphereNormals.length/3);     
}

//-------------------------------------------------------------------------
/**
 * Draws a sphere from the sphere buffer
 */
function drawSphere(){
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.vertexAttribPointer(sphereShaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                           gl.FLOAT, false, 0, 0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.vertexAttribPointer(sphereShaderProgram.vertexNormalAttribute, 
                           sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);      
}

/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToSphereShader(loc,a,d,s) {
    gl.uniform3fv(sphereShaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(sphereShaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(sphereShaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(sphereShaderProgram.uniformSpecularLightColorLoc, s); 
}

/**
 * Sends sphere projection matrix to sphere shader
 */
function uploadProjectionMatrixToShader() {
    gl.uniformMatrix4fv(sphereShaderProgram.pMatrixUniform, 
                        false, pMatrix);
}





//----------------------------------------------------------------------------------
//Code to handle user interaction
/* @global Holds all currently pressed keys */
var currentlyPressedKeys = {};

/**
 * Handles when a key is pressed in the browser
 * @param {Object} Carries information about certain events that are happening in the browser
 */
function handleKeyDown(event) {
    //console.log("Key down ", event.key, " code ", event.code);
    currentlyPressedKeys[event.key] = true;
    if (currentlyPressedKeys["Enter"]) {
        // key Enter
        for (var i = 0; i < 9; i++) {
            var x = (4*Math.random()) - 1.9;
            var y = (4*Math.random()) - 1.9;
            var z = (4*Math.random()) - 1.9;
            
            var r = (0.2 * Math.random()) + 0.1;
            
            var R = Math.random();
            var G = Math.random();
            var B = Math.random();
            
            addSphere = new Sphere(x, y, z, r, R, G, B);
            sphereArray.push(addSphere);
        }
    } 
    if (currentlyPressedKeys["Delete"]) {
        sphereArray = [];
    }

}

/**
 * Handles when a key is released in the browser
 * @param {Object} Carries information about certain events that are happening in the browser
 */
function handleKeyUp(event) {
    //console.log("Key up ", event.key, " code ", event.code);
    currentlyPressedKeys[event.key] = false;
}