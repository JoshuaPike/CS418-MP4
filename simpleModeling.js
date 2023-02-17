/**
 * @file Functions to generate a sphere mesh
 * @author Josh Pike <joshuap5@illinois.edu>
 */

/**
 * Pushes a vertex to an array
 * @param {Object} A vertex to be pushed
 * @param {Object} The array that will take in the vertex
 */
function pushVertex(v, vArray)
{
 for(i=0;i<3;i++)
 {
     vArray.push(v[i]);
 }  
}

//-----------------------------------------------------------
/*
 * Dividies triangles to be pushed to arrays which generate a sphere mesh
 * @param {Number} Point of a triangle
 * @param {Number} Point of a triangle
 * @param {Number} Point of a triangle
 * @param {Number} number of subdivisions
 * @param {Object} Vertex Array
 * @param {Object} Normal Array
 * @return {Number} Number of times the function has recursed
 */
function sphDivideTriangle(a,b,c,numSubDivs, vertexArray,normalArray)
{
    //Fill this in
    if (numSubDivs > 0) {
        var numT = 0;
        var ab =  glMatrix.vec4.create();
        glMatrix.vec4.lerp(ab,a,b,0.5);
        glMatrix.vec4.normalize(ab, ab);
        var ac =  glMatrix.vec4.create();
        glMatrix.vec4.lerp(ac,a,c,0.5);
        glMatrix.vec4.normalize(ac, ac);
        var bc =  glMatrix.vec4.create();
        glMatrix.vec4.lerp(bc,b,c,0.5);
        glMatrix.vec4.normalize(bc, bc);
        
        numT+=sphDivideTriangle(a,ab,ac,numSubDivs-1, vertexArray, normalArray);
        numT+=sphDivideTriangle(ab,b,bc,numSubDivs-1, vertexArray, normalArray);
        numT+=sphDivideTriangle(bc,c,ac,numSubDivs-1, vertexArray, normalArray);
        numT+=sphDivideTriangle(ab,bc,ac,numSubDivs-1, vertexArray, normalArray);
        return numT;
    } else {
        pushVertex(a,vertexArray);
        pushVertex(b,vertexArray);
        pushVertex(c,vertexArray);
        
        pushVertex(a,normalArray);
        pushVertex(b,normalArray);
        pushVertex(c,normalArray);
        
        return 1;
    }
}

//-------------------------------------------------------------------------
/*
 * Generates a sphere mesh
 * @param {Number} Number of subdivisions
 * @param {Object} Vertex Array
 * @param {Object} Normal Array
 * @return {Number} Number of times the function has recursed
 */
function sphereFromSubdivision(numSubDivs, vertexArray, normalArray)
{
    var numT=0;
    var a = glMatrix.vec4.fromValues(0.0,0.0,-1.0,0);
    var b = glMatrix.vec4.fromValues(0.0,0.942809,0.333333,0);
    var c = glMatrix.vec4.fromValues(-0.816497,-0.471405,0.333333,0);
    var d = glMatrix.vec4.fromValues(0.816497,-0.471405,0.333333,0);
    
    numT+=sphDivideTriangle(a,b,c,numSubDivs, vertexArray, normalArray);
    numT+=sphDivideTriangle(d,c,b,numSubDivs, vertexArray, normalArray);
    numT+=sphDivideTriangle(a,d,b,numSubDivs, vertexArray, normalArray);
    numT+=sphDivideTriangle(a,c,d,numSubDivs, vertexArray, normalArray);
    return numT;
}


    
    
