/**
 * @fileoverview Sphere - A class which implements a sphere in WebGL
 * @author Josh Pike <joshuap5@illinois.edu>
 */

/** Class implementing a sphere. */
class Sphere {
    /**
     * Initialize members of a Sphere object
     * @param{Number} initial X location
     * @param{Number} initial Y location
     * @param{Number} initial Z location
     * @param{Number} sphere radius
     * @param{Number} red color value of sphere
     * @param{Number} green color value of sphere
     * @param{Number} blue color value of sphere
     */
    constructor(a, b, c, radius, R, G, B) {
        this.position = glMatrix.vec3.fromValues(a, b, c);
        
        this.velocity = glMatrix.vec3.fromValues(15*Math.random() - 5, 15*Math.random() - 5, 15*Math.random() - 5);
        
        this.acceleration = glMatrix.vec3.fromValues(0.0, -10.0, 0.0);
        
        this.radius = radius;
        this.scale = glMatrix.vec3.fromValues(radius, radius, radius);

        //Material parameters
        this.kAmbient = [R, G, B];
        this.kDiffuse = [R, G, B];
        this.kSpecular = [0.5, 0.5, 0.5];
        this.shininess = 23;


    }

    //-------------------------------------------------------------------------
    /**
    * Sends material information to the shader
    */
    uploadMaterialToSphereShader() {
        gl.uniform3fv(sphereShaderProgram.uniformDiffuseMaterialColor, this.kDiffuse);
        gl.uniform3fv(sphereShaderProgram.uniformAmbientMaterialColor, this.kAmbient);
        gl.uniform3fv(sphereShaderProgram.uniformSpecularMaterialColor, this.kSpecular);
        gl.uniform1f(sphereShaderProgram.uniformShininess, this.shininess);
    }
    
    //-------------------------------------------------------------------------
    /**
    * Sends sphere Modelview matrix to sphere shader
    */
    uploadModelViewMatrixToShader() {
        gl.uniformMatrix4fv(sphereShaderProgram.mvMatrixUniform, false, mvMatrixSphere);
    }

    //-------------------------------------------------------------------------
    /**
    * Generates and sends the sphere normal matrix to the sphere shader
    */
    uploadNormalMatrixToShader() {
        glMatrix.mat3.fromMat4(nMatrixSphere, mvMatrixSphere);
        glMatrix.mat3.transpose(nMatrixSphere, nMatrixSphere);
        glMatrix.mat3.invert(nMatrixSphere, nMatrixSphere);
        gl.uniformMatrix3fv(sphereShaderProgram.nMatrixUniform, false, nMatrixSphere);
    }

    //----------------------------------------------------------------------------------
    /**
    * Pushes matrix onto modelview matrix stack
    */
    mvPushMatrix() {
        var copy = glMatrix.mat4.clone(mvMatrixSphere);
        mvMatrixStack.push(copy);
    }


    //----------------------------------------------------------------------------------
    /**
    * Pops matrix off of modelview matrix stack
    */
    mvPopMatrix() {
        if (mvMatrixStack.length == 0) {
            throw "Invalid popMatrix!";
        }
        mvMatrixSphere = mvMatrixStack.pop();
    }
    
    //----------------------------------------------------------------------------------
    /**
     * Sends projection/modelview matrices to shader
     */
    setMatrixUniforms() {
        this.uploadModelViewMatrixToShader();
        this.uploadNormalMatrixToShader();
        //this.uploadProjectionMatrixToShader();
    }
    
    /**
     * update the position using current velocity
     * @param{Number} Time that has passed
     */
    updatePosition(dt) {
        this.position[0] = this.position[0] + (this.velocity[0] * dt);
        this.position[1] = this.position[1] + (this.velocity[1] * dt);
        this.position[2] = this.position[2] + (this.velocity[2] * dt);
        //var newPos = vec3.fromValues(x, y, z);
        //vec3.copy(this.position, newPos);
    }
    
    /**
     * Update the velocity using current acceleration
     * @param{Number} Time that has passed
     */
    updateVelocity(dt) {
        // set d = 0.2 
        this.velocity[0] = (this.velocity[0] * Math.pow(0.4, dt)) + (this.acceleration[0] * dt);
        this.velocity[1] = (this.velocity[1] * Math.pow(0.4, dt)) + (this.acceleration[1] * dt);
        this.velocity[2] = (this.velocity[2] * Math.pow(0.4, dt)) + (this.acceleration[2] * dt);
        //var newVel = vec3.fromValues(vX, vY, vZ);
        //vec3.copy(this.velocity, newVel);
    }
    
    /**
     * Checks to see if a ball collided with a wall
     * @param{Number} Time that has passed
     */
    checkCollision(dt) {
        var newX = this.position[0] + (this.velocity[0] * dt);
        var newY = this.position[1] + (this.velocity[1] * dt);
        var newZ = this.position[2] + (this.velocity[2] * dt);
        
        
        // Right wall
        var tRight = (2.5 - this.position[0] + this.radius)/this.velocity[0];
        var tRight2 = (2.5 - this.position[0] - this.radius)/this.velocity[0];
        //console.log("tRight: ", tRight);
        //console.log("tRight2: ", tRight2);
        if (tRight > tRight2 && tRight2 >= 0) {tRight = tRight2; }
        
        
        if (tRight <= dt && tRight >= 0) {
            newX = this.position[0] + (this.velocity[0] * tRight);
            newY = this.position[1] + (this.velocity[1] * tRight);
            newZ = this.position[2] + (this.velocity[2] * tRight);
            
            this.velocity[0] = -this.velocity[0];
            
            newX = newX + (this.velocity[0] * (dt - tRight));
            newY = newY + (this.velocity[1] * (dt - tRight));
            newZ = newZ + (this.velocity[2] * (dt - tRight));
        }
        
        // Left wall
        var tLeft = (-2.5 - this.position[0] + this.radius)/this.velocity[0];
        var tLeft2 = (-2.5 - this.position[0] - this.radius)/this.velocity[0];
        
        if (tLeft > tLeft2 && tLeft2 >= 0) {tLeft = tLeft2; }
        
        if (tLeft <= dt && tLeft >= 0) {
            newX = this.position[0] + (this.velocity[0] * tLeft);
            newY = this.position[1] + (this.velocity[1] * tLeft);
            newZ = this.position[2] + (this.velocity[2] * tLeft);
            
            this.velocity[0] = -this.velocity[0];
            
            newX = newX + (this.velocity[0] * (dt - tLeft));
            newY = newY + (this.velocity[1] * (dt - tLeft));
            newZ = newZ + (this.velocity[2] * (dt - tLeft));
        }
        
        // Bottom wall
        var tBot = (-2.5 - this.position[1] + this.radius)/this.velocity[1];
        var tBot2 = (-2.5 - this.position[1] - this.radius)/this.velocity[1];
        //console.log("tBot: ", tBot);
        //console.log("tBot2: ", tBot2);
        if (tBot > tBot2 && tBot2 >= 0) {tBot = tBot2; }
        
        
        if (tBot <= dt && tBot >= 0) {
            newX = this.position[0] + (this.velocity[0] * tBot);
            newY = this.position[1] + (this.velocity[1] * tBot);
            newZ = this.position[2] + (this.velocity[2] * tBot);
            
            this.velocity[1] = -this.velocity[1];
            
            newX = newX + (this.velocity[0] * (dt - tBot));
            newY = newY + (this.velocity[1] * (dt - tBot));
            newZ = newZ + (this.velocity[2] * (dt - tBot));
        }
        
        // Top wall
        var tTop = (3 - this.position[1] + this.radius)/this.velocity[1];
        var tTop2 = (3 - this.position[1] - this.radius)/this.velocity[1];
        //console.log("tTop: ", tTop);
        //console.log("tTop2: ", tTop2);
        if (tTop > tTop2 && tTop2 >= 0) {tTop = tTop2; }
        
        
        if (tTop <= dt && tTop >= 0) {
            newX = this.position[0] + (this.velocity[0] * tTop);
            newY = this.position[1] + (this.velocity[1] * tTop);
            newZ = this.position[2] + (this.velocity[2] * tTop);
            
            this.velocity[1] = -this.velocity[1];
            
            newX = newX + (this.velocity[0] * (dt - tTop));
            newY = newY + (this.velocity[1] * (dt - tTop));
            newZ = newZ + (this.velocity[2] * (dt - tTop));
        }
        
        // Front wall
        var tFront = (2.5 - this.position[2] + this.radius)/this.velocity[2];
        var tFront2 = (2.5 - this.position[2] - this.radius)/this.velocity[2];
        //console.log("tFront: ", tFront);
        //console.log("tFront2: ", tFront2);
        if (tFront > tFront2 && tFront2 >= 0) {tFront = tFront2; }
        
        
        if (tFront <= dt && tFront >= 0) {
            newX = this.position[0] + (this.velocity[0] * tFront);
            newY = this.position[1] + (this.velocity[1] * tFront);
            newZ = this.position[2] + (this.velocity[2] * tFront);
            
            this.velocity[2] = -this.velocity[2];
            
            newX = newX + (this.velocity[0] * (dt - tFront));
            newY = newY + (this.velocity[1] * (dt - tFront));
            newZ = newZ + (this.velocity[2] * (dt - tFront));
        }
        
        // Back wall
        var tBack = (-3 - this.position[2] + this.radius)/this.velocity[2];
        var tBack2 = (-3 - this.position[2] - this.radius)/this.velocity[2];
        //console.log("tBack: ", tBack);
        //console.log("tBack2: ", tBack2);
        if (tBack > tBack2 && tBack2 >= 0) {tBack = tBack2; }
        
        
        if (tBack <= dt && tBack >= 0) {
            newX = this.position[0] + (this.velocity[0] * tBack);
            newY = this.position[1] + (this.velocity[1] * tBack);
            newZ = this.position[2] + (this.velocity[2] * tBack);
            
            this.velocity[2] = -this.velocity[2];
            
            newX = newX + (this.velocity[0] * (dt - tBack));
            newY = newY + (this.velocity[1] * (dt - tBack));
            newZ = newZ + (this.velocity[2] * (dt - tBack));
        }
        
        this.position[0] = newX;
        this.position[1] = newY;
        this.position[2] = newZ;
        
    }
    
    /**
     * Prints the current position of the sphere
     */
    printPos() {
        console.log("Current X: ", this.position[0]);
        console.log("Current Y: ", this.position[1]);
        console.log("Current Z: ", this.position[2]);
    }
}