let view;
let ctx;
let scene;
let start_time;

const LEFT =   32; // binary 100000
const RIGHT =  16; // binary 010000
const BOTTOM = 8;  // binary 001000
const TOP =    4;  // binary 000100
const FAR =    2;  // binary 000010
const NEAR =   1;  // binary 000001
const FLOAT_EPSILON = 0.000001;

// Initialization function - called when web page loads
function init() {
    let w = 800;
    let h = 600;
    view = document.getElementById('view');
    view.width = w;
    view.height = h;

    ctx = view.getContext('2d');

    // initial scene... feel free to change this
    scene = {
        view: {
            type: 'perspective',
            prp: Vector3(0, 0, 10),
            srp: Vector3(0, 0, 0),
            vup: Vector3(0, 1, 0),
            clip: [-4, 20, -1, 17, 5, 75]
        },
        models: [
            {
                type: 'generic',
                vertices: [
                    Vector4( 0,  0, -30, 1),
                    Vector4(20,  0, -30, 1),
                    Vector4(20, 12, -30, 1),
                    Vector4(10, 20, -30, 1),
                    Vector4( 0, 12, -30, 1),
                    Vector4( 0,  0, -60, 1),
                    Vector4(20,  0, -60, 1),
                    Vector4(20, 12, -60, 1),
                    Vector4(10, 20, -60, 1),
                    Vector4( 0, 12, -60, 1)
                ],
                edges: [
                    [0, 1, 2, 3, 4, 0],
                    [5, 6, 7, 8, 9, 5],
                    [0, 5],
                    [1, 6],
                    [2, 7],
                    [3, 8],
                    [4, 9]
                ],
                matrix: new Matrix(4, 4)
            }
        ]
    };
    /*
    testScene = {
        view: {
            type: 'perspective',
            prp: Vector3(0, 10, -5),
            srp: Vector3(20, 15, -40),
            vup: Vector3(1, 1, 0),
            clip: [-12, 6, -12, 6, 10, 100]
        },
        models: [
            {
                type: 'generic',
                vertices: [
                    Vector4( 0,  0, -30, 1),
                    Vector4(20,  0, -30, 1),
                    Vector4(20, 12, -30, 1),
                    Vector4(10, 20, -30, 1),
                    Vector4( 0, 12, -30, 1),
                    Vector4( 0,  0, -60, 1),
                    Vector4(20,  0, -60, 1),
                    Vector4(20, 12, -60, 1),
                    Vector4(10, 20, -60, 1),
                    Vector4( 0, 12, -60, 1)
                ],
                edges: [
                    [0, 1, 2, 3, 4, 0],
                    [5, 6, 7, 8, 9, 5],
                    [0, 5],
                    [1, 6],
                    [2, 7],
                    [3, 8],
                    [4, 9]
                ],
                matrix: new Matrix(4, 4)
            }
        ]
    };
    */

    // event handler for pressing arrow keys
    document.addEventListener('keydown', onKeyDown, false);

    // start animation loop
    start_time = performance.now(); // current timestamp in milliseconds

    window.requestAnimationFrame(animate);
}

// Animation loop - repeatedly calls rendering code
function animate(timestamp) {

    ctx.clearRect(0, 0, view.width, view.height);
    // step 1: calculate time (time since start)
    let time = timestamp - start_time;

    //For animating by time, it’s probably easiest to explain with an example. Say that I want to have my model take 2 seconds to rotate once. 
    // Given a typical monitor with a 60 Hz refresh rate, this would mean incrementing the rotation angle by 3 degrees each frame (360 degrees / 120 frames in 2 seconds). 
    // However, if we made this assumption, then someone using a monitor with a faster or slower refresh rate would see the animation going much faster or slower than desired. 
    // Therefore, you should calculate how much to rotate the model based on how much time has passed. 
    // If someone has a faster refresh rate on their monitor, then less time would have passed since the previous frame and we should not rotate quite as much.
    // step 2: transform models based on time
    
    // We will need to find a theta based on the rps of a model and the current time
    //console.log(time % 100);

    //console.log(time % 100 < 10);

    // I KNOW THIS IS INCORRECT!! THE MODELS SHOULD NOT ROTATE ABOUT THE ORIGIN OF THE VIEW VOLUME, BUT RATHER THE MODEL ITSELF.
    // I WILL FIX THIS TOMORROW!!!
    // limit refresh
    for (let i = 0; i < scene.models.length; i++) {
        // If model has animation property, we need to rotate it about the specified axis by theta degrees specified by our rotations per second (rps) and time.
        // More exactly. We are trying to determining how many revolutions have occured (i.e. theta [radians]) = rps [rev/s] x time [ms] x [2 pi rad / rev] * [1 s / 1000 ms]. 
        // This theta value is used in a trig function (within our rotation transformation matrices), and all trig functions are periodic.
        if (scene.models[i].animation != null) {
            // Calculate theta
            //let theta = scene.models[i].animation.rps * time * 2 * Math.PI / 1000;
            // Hardcode small theta for now
            let theta = 0.00005;

            // Declare animation matrix
            let animationMatrix = new Matrix(4, 4);

            // Determine axis of rotation
            if (scene.models[i].animation.axis = "x") {
                mat4x4RotateX(animationMatrix, theta);
            } else if (scene.models[i].animation.axis = "y") {
                mat4x4RotateY(animationMatrix, theta);
            } else if (scene.models[i].animation.axis = "z") {
                mat4x4RotateZ(animationMatrix, theta);
            }

            //console.log(animationMatrix);
            //console.log(scene.models[i].vertices.length);
        
            // Transform the model vertices here. Maybe this should be in draw scene but I didn't want to have to store matrix somewhere.
            for (let k = 0; k < scene.models[i].vertices.length; ++k){
                // new list stores vertex locations within the connical view 
                scene.models[i].vertices[k] = Matrix.multiply([animationMatrix,scene.models[i].vertices[k]]);
            }
        }
    }

    // step 3: draw scene
    drawScene();

    // step 4: request next animation frame (recursively calling same function)
    // (may want to leave commented out while debugging initially)

    window.requestAnimationFrame(animate);
}

// Main drawing code - use information contained in variable `scene`
function drawScene() {
    //console.log(scene);
    
    // Create transformation matrix
    let transformView;
    if (scene.view.type == "perspective") {
        transformView = mat4x4Perspective(scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
    } else if (scene.view.type == "parallel") {
        transformView = mat4x4Parallel(scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
    } else {
        console.log("Error on scene view type");
    }

    // Create projection matrix and scale to window
    let projectView;
    let windowView = new Matrix(4, 4);
    mat4x4WindowProjection(windowView, view.width, view.height); 
    if (scene.view.type == "perspective") {
        projectView = Matrix.multiply([windowView,mat4x4MPer() ]);
    } else if (scene.view.type == "parallel") {
        projectView = Matrix.multiply([windowView,mat4x4MPar()]);
    } else {
        console.log("Error on scene projection")
    }

    // For each model in the scene, we need to follow this process:
        // Step 1 transform all verts into the connical view volume
        // Step 2 clip all lines against the connonical view volume
        // Step 3 project clipped lines into 2D and scale to match screen coordinates 
    for (let k = 0; k < scene.models.length; k++) {
        //Step 1 transform all verts into the connical view volume
        let transform_vert = [];
        for(let i=0;i<scene.models[k].vertices.length;++i){
            // new list stores vertex locations within the connical view 
            transform_vert.push(Matrix.multiply([transformView,scene.models[k].vertices[i]]));
        }

        // Go through each edge
        for (let i=0;i<scene.models[k].edges.length;++i){
            let edge = scene.models[k].edges[i];
            for (let j = 0; j <edge.length-1; ++j){
                let index_zero = edge[j];
                let index_one = edge[j+1];
                let vertex_zero = transform_vert[index_zero];
                let vertex_one = transform_vert[index_one];
                
                //Step 2 clip all lines against the connonical view volume
                let line = {pt0:vertex_zero,pt1:vertex_one};
                let clippedLine = clipLinePerspective(line,-scene.view.clip[4]/scene.view.clip[5]);
                
                if(clippedLine != null){
                    //Step 3 project clipped lines into 2D and scale to match screen coordinates 
                    let project_vertZero = Matrix.multiply([projectView,clippedLine.pt0]);
                    let project_vertOne = Matrix.multiply([projectView,clippedLine.pt1]);
                    vec4NonHomogeneous(project_vertZero);
                    vec4NonHomogeneous(project_vertOne);
                    drawLine(project_vertZero.x, project_vertZero.y, project_vertOne.x, project_vertOne.y);
                }
            }
        }
    }
}

// Calculate vertices and edges for models loaded in
function calculateVerticesAndEdges() {
    //console.log(scene);
    
    // Go through each model in our scene
    for (let i = 0; i < scene.models.length; i++) {        
        // Check model type, this will indicate if vertices and edges need to be calculated
        if (scene.models[i].type === 'generic') {
            // We have generic model
            
            // Do nothing, generic models already have vertices and edges
        } else if (scene.models[i].type === 'cube') {
            // We have a cube

            // Given a model, append vertex and edge arrays based on center, width, height, and depth 
            calculateCubeVerticesAndEdges(scene.models[i], scene.models[i].center, scene.models[i].width, scene.models[i].height, scene.models[i].depth); 
        } else if (scene.models[i].type === 'cone') {
            // We have a cone

            // Given a model, append vertex and edge arrays based on center, radius, height, and sides 
            calculateConeVerticesAndEdges(scene.models[i], scene.models[i].center, scene.models[i].radius, scene.models[i].height, scene.models[i].sides); 
        } else if (scene.models[i].type === 'cylinder') {
            // We have a cylinder

            // Given a model, append vertex and edge arrays based on center, radius, height, and sides 
            calculateCylinderVerticesAndEdges(scene.models[i], scene.models[i].center, scene.models[i].radius, scene.models[i].height, scene.models[i].sides); 
        } else if (scene.models[i].type === 'sphere') {
            // We have a sphere

            // Given a model, append vertex and edge arrays based on center, radius, slices, and stacks 
            calculateSphereVerticesAndEdges(scene.models[i], scene.models[i].center, scene.models[i].radius, scene.models[i].slices, scene.models[i].stacks); 
        }
    }
}

// Calculate vertices and assign edges for a cubic model
function calculateCubeVerticesAndEdges(myModel, center, width, height, depth) {
    // Build model vertices
    let tempVertices = [new Vector4(0, 0, 0, 1),
                        new Vector4(depth, 0, 0, 1),
                        new Vector4(depth, width, 0, 1),
                        new Vector4(0, width, 0, 1),
                        new Vector4(0, 0, height, 1),
                        new Vector4(depth, 0, height, 1),
                        new Vector4(depth, width, height, 1),
                        new Vector4(0, width, height, 1)];
    
    // Asign model edges
    let tempEdges = [[0, 1, 2, 3, 0],
                     [4, 5, 6, 7, 4],
                     [0, 4],
                     [1, 5],
                     [2, 6],
                     [3, 7]];

    // Translate to center
    let translateMatrix = new Matrix(4, 4);
    mat4x4Translate(translateMatrix, center.x-(depth/2), center.y-(width/2), center.z-(height/2))
    for (let i = 0; i < tempVertices.length; i++) {
        // Vertex translation
        tempVertices[i] = Matrix.multiply([translateMatrix, tempVertices[i]]);
    }

    // Update model in scene
    myModel['vertices'] = tempVertices;
    myModel['edges'] = tempEdges;
}

// Calculate vertices and edges for a cylindrical model
function calculateCylinderVerticesAndEdges(myModel, center, radius, height, sides) {
    // Build model vertices
    let tempEdges = [];
    let tempVertices = [];
    let edgeIndex = 0;
    for (let z = 0; z < 2; z++) { // Want top and bottom cap (only 2 z slices)
        let capEdges = [];
        let curZ = z * height;
        for (let theta = 0; theta < 360; theta = theta + (360/sides)) {
            let curX = radius * Math.cos(theta*Math.PI/180);
            let curY = radius * Math.sin(theta*Math.PI/180);
            tempVertices.push(new Vector4(curX, curY, curZ, 1));
            capEdges.push(edgeIndex);
            edgeIndex++;
        }
        capEdges.push(z*sides); // Need to make the last connection edge in the ring
        tempEdges.push(capEdges); // While we are here, let's add this polygon to our edge list
    }

    // Assign remaining model edges
    for (index of tempEdges[0]) {
        tempEdges.push([index, index+sides]) // Connecting btm and top caps
    }

    // Translate to center
    let translateMatrix = new Matrix(4, 4);
    mat4x4Translate(translateMatrix, center.x-(radius/2), center.y-(radius/2), center.z-(height/2))
    for (let i = 0; i < tempVertices.length; i++) {
        // Vertex translation
        tempVertices[i] = Matrix.multiply([translateMatrix, tempVertices[i]]);
    }

    // Update model in scene
    myModel['vertices'] = tempVertices;
    myModel['edges'] = tempEdges;
}

// Calculate vertices and edges for a conical model
function calculateConeVerticesAndEdges(myModel, center, radius, height, sides) {
    // Build model vertices
    let tempEdges = [];
    let tempVertices = [];
    let edgeIndex = 1; // Start at 1, reserve 0 for tip
    let baseEdges = [];
    tempVertices.push(new Vector4(0, 0, height, 1)); // Append tip vertex
    for (let theta = 0; theta < 360; theta = theta + (360/sides)) { // Want only care about bottom cap, as oppossed to cylindrical
        let curX = radius * Math.cos(theta*Math.PI/180);
        let curY = radius * Math.sin(theta*Math.PI/180);
        tempVertices.push(new Vector4(curX, curY, 0, 1));
        tempEdges.push([0, edgeIndex]); // We are connecting base to tip here
        baseEdges.push(edgeIndex); // We are forming base polygon here
        edgeIndex++;
    }
    baseEdges.push(1); // Need to make the last connection edge in the ring
    tempEdges.push(baseEdges); // Add base polygon to edge list

    // Translate to center
    let translateMatrix = new Matrix(4, 4);
    mat4x4Translate(translateMatrix, center.x-(radius/2), center.y-(radius/2), center.z-(height/2))
    for (let i = 0; i < tempVertices.length; i++) {
        // Vertex translation
        tempVertices[i] = Matrix.multiply([translateMatrix, tempVertices[i]]);
    }

    // Update model in scene
    myModel['vertices'] = tempVertices;
    myModel['edges'] = tempEdges;
}

// Calculate vertices and edges for a spherical model
function calculateSphereVerticesAndEdges(myModel, center, radius, slices, stacks) { // think of slices as longitude lines, stacks as latitude lines
    // Implement later
}

// Get outcode for vertex (parallel view volume)
function outcodeParallel(vertex) {
    let outcode = 0;
    if (vertex.x < (-1.0 - FLOAT_EPSILON)) {
        outcode += LEFT;
    }
    else if (vertex.x > (1.0 + FLOAT_EPSILON)) {
        outcode += RIGHT;
    }
    if (vertex.y < (-1.0 - FLOAT_EPSILON)) {
        outcode += BOTTOM;
    }
    else if (vertex.y > (1.0 + FLOAT_EPSILON)) {
        outcode += TOP;
    }
    if (vertex.z < (-1.0 - FLOAT_EPSILON)) {
        outcode += FAR;
    }
    else if (vertex.z > (0.0 + FLOAT_EPSILON)) {
        outcode += NEAR;
    }
    return outcode;
}

// Get outcode for vertex (perspective view volume)
function outcodePerspective(vertex, z_min) {
    let outcode = 0;
    if (vertex.x < (vertex.z - FLOAT_EPSILON)) {
        outcode += LEFT;
    }
    else if (vertex.x > (-vertex.z + FLOAT_EPSILON)) {
        outcode += RIGHT;
    }
    if (vertex.y < (vertex.z - FLOAT_EPSILON)) {
        outcode += BOTTOM;
    }
    else if (vertex.y > (-vertex.z + FLOAT_EPSILON)) {
        outcode += TOP;
    }
    if (vertex.z < (-1.0 - FLOAT_EPSILON)) {
        outcode += FAR;
    }
    else if (vertex.z > (z_min + FLOAT_EPSILON)) {
        outcode += NEAR;
    }
    return outcode;
}

// Clip line - should either return a new line (with two endpoints inside view volume) or null (if line is completely outside view volume)
function clipLineParallel(line) {

    let result = null;
    let p0 = Vector4(line.pt0.x, line.pt0.y, line.pt0.z,line.pt0.w);
    let p1 = Vector4(line.pt1.x, line.pt1.y, line.pt1.z,line.pt1.w);
    let out0 = outcodePerspective(p0, z_min);
    let out1 = outcodePerspective(p1, z_min);
    let repeat = 1;
    let newPoint;
    let b;
    let y;
    let x;
    let z;
    // TODO: implement clipping here!

    while(repeat == 1){
        //check if both are outside, to reject
        if((out0 & out1) != 0){
            repeat = 0;
            //both points are outside the line, reject by returning null
            return result;
        }
        //check if both are inside, to accept
        else if((out0 | out1) == 0){
            repeat = 0;
            //both points are inside the line, accept by returning line with same endpoints
            return {pt0:p0,pt1:p1};
        }
        else {
            // * everything else
            //Select and endpoint that lies outside the view rectangle
            let point_one,point_zero;
            if(out0 != 0000){
                 point_one = p0;
                 point_zero = p1;
            }
            else{
                 point_one = p1;
                 point_zero = p0;
            }
            //find the first bit set to 1 in the selected endpoint's outcode
            //let string_outcode = "" + point_one + "";
            let outcode_point = outcodePerspective(point_one, z_min);
            var base2 = (outcode_point).toString(2);
            console.log("outcode_point: " + outcode_point);
            for(var i = 0; i < base2.length; i++){
                console.log("base: " + base2[i]);
            }
            //this is a test
            // let position =0;
           // for(var i = 0; i<string_outcode.length; i++){
               // if(string_outcode.charAt(i) == "1"){
                 //    position = i;
                   // break;
               // }
            //}
            //calculate the intersection point between the line and corresponding edge
            let delta_x =  (p1.x - p0.x);
            let delta_y = ( p1.y - p0.y);
            let delta_z = ( p1.z - p0.z);

            if(position == 0){
                //clip against left edge
                    b = (point_one.y - ((delta_y/delta_x)*point_one.x));
                    y = ((delta_y/delta_x)*point_one.x) + b;
                    newPoint = [-(view.width / 2), y, point_one.z]; //left_edge, y - don't know if these are right */                
            }
            else if(position ==1){
                //clip against right edge
                 /*let changey = (p0.y - p1.y);
                let changex = (p0.x - p1.x);
                let b = (point_one.y - ((changey/changex)*point_one.x));
                let y = ((changey/changex)*point_one.x) + b;
                let newPoint = [view.width / 2, y, point_one.z]; //right_edge, y - don't know if these are right*/

                b = (point_one.y - ((delta_y/delta_x)*point_one.x));
                y = ((delta_y/delta_x)*point_one.x) + b;
                newPoint = [view.width / 2, y, point_one.z]; //left_edge, y - don't know if these are right */

            }
            else if(position ==2){
                //clip against bottom edge

                b = (point_one.y - ((delta_y/delta_x)*point_one.x));
                x = (point_one.y / (delta_y/delta_x)) - b;
                newPoint = [x, -(view.height / 2)];//x, bottom_edge - don't know if these are right
                
            }
            else if(position == 3){
                //clip against top edge

                b = (point_one.y - ((delta_y/delta_x)*point_one.x));
                x = (point_one.y / (delta_y/delta_x)) - b;
                newPoint = [x, view.height / 2];//x, top_edge - don't know if these are right
                 
            }else if(position==4){
                //Far
                b = (point_one.z - ((delta_z/delta_x)*point_one.x));
                z = (point_one.z / (delta_z/delta_x)) - b;
                newPoint = [x, -(view.height / 2)];//x, bottom_edge - don't know if these are right
                
            }else if (position == 5){
                //Near 
            }
            
            //add neart and far
            //replace selected endpoint with this intersection point
            if(point_one === p0){
                p0 = newPoint;
                //recalculate enpoint's outcode
                out0 = outcodePerspective(p0);
            }
            else{
                p1 = newPoint;
                //recalculate enpoint's outcode
                out1 = outcodePerspective(p1);
            }
            
        

            //try to accept/reject again (repeat process)
        }

    }
    //console.log(results);
    return result;
}

// Clip line - should either return a new line (with two endpoints inside view volume) or null (if line is completely outside view volume)
function clipLinePerspective(line, z_min) {

    let result = null;
    let p0 = Vector4(line.pt0.x, line.pt0.y, line.pt0.z, line.pt0.w); // end point 0
    let p1 = Vector4(line.pt1.x, line.pt1.y, line.pt1.z, line.pt1.w); // end point 1
    let out0 = outcodePerspective(p0, z_min);
    let out1 = outcodePerspective(p1, z_min);
    let repeat = 1;
    let point_one;

    // TODO: implement clipping here!
    while(repeat == 1){
        if((out0 & out1) != 0){
            //console.log("reject");
            // check if both are outside, to reject TRIVIAL REJECT
            repeat = 0;

            //both points are outside the line, reject by returning null
            return result;
        }
        else if((out0 | out1 == 0)){  
            //console.log("accept");       
            //check if both are inside, to accept TRIVIAL ACCEPT
            repeat = 0;

            //both points are inside the line, accept by returning line with same endpoints
            return {pt0:p0,pt1:p1};
        } else { // everything else
            console.log("else");
            //Select endpoint that lies outside the view rectangle as point_one
            if(out0 != 000000){
                point_one = p0;
                console.log("out0: " + out0);
            }
            else{
                point_one = p1;
                console.log("out1: " + out1);
            }

            // find the first bit set to 1 in the selected endpoint's outcode

            // No, this shouldn't be point_one... why are we trying to convert a Vec4 into a string outcode....
            let string_outcode = "" + outcodePerspective(point_one, z_min) + "";
            //console.log("outcode: " + string_outcode);
            for(var i = 0; i<string_outcode.length; i++){
                //console.log("char: " + string_outcode.charAt(i));
                if(string_outcode.charAt(i) == "1"){
                    let position = i;
                    console.log("position: " + position);
                    break;
                }
            }
            //console.log(point_one)
            //console.log(string_outcode);

            // Find parameters
            let delta_x = (p1.x - p0.x);
            let delta_y = (p1.y - p0.y);
            let delta_z = (p1.z - p0.z);
            let t;

            // Calculate parametric value t
            if(string_outcode == "") {
                t = (-p0.x + p0.z)/(delta_x-delta_z);
            } else if(i == 1) {
                t = (p0.x + p0.z)/(-delta_x-delta_z);
            } else if(i == 2) {
                t = (-p0.y + p0.z)/(delta_x-delta_z);
            } else if (i == 3) {
                t = (p0.y + p0.z)/(-delta_x-delta_z);
            } else if (i == 4) {
                t = (-p0.z - 1)/(delta_z);
            } else if (i == 5) {
                t = (-p0.z + z_min)/(-delta_z);
            }

            // Use parametric equations to find new components
            let new_pointx = (1-t)*p0.x+t*p1.x;
            let new_pointy = (1-t)*p0.y+t*p1.y;
            let new_pointz = (1-t)*p0.z+t*p1.z;
            let new_point = Vector4(new_pointx,new_pointy,new_pointz,1);

            // Replace selected endpoint with this intersection point
            if(point_one === p0){
                p0 = new_point;
                // Recalculate enpoint's outcode
                out0 = outcodePerspective(p0);
            }
            else{
                p1 = new_point;
                //recalculate enpoint's outcode
                out1 = outcodePerspective(p1);
            }   
        }
    }
    return {pt0:p0,pt1:p1}; // return the clipped line
}

// Called when user presses a key on the keyboard down
function onKeyDown(event) {

    let n = scene.view.prp.subtract(scene.view.srp);
    n.normalize();
    let u = scene.view.vup.cross(n);
    u.normalize();

    switch (event.keyCode) {

        case 37: // LEFT Arrow

            console.log("left");
            break;
        case 39: // RIGHT Arrow
            console.log("right");
            break;
        case 65: // A key
        scene.view.prp = u.add(scene.view.prp);
        scene.view.srp = u.add(scene.view.srp);
            console.log("A");
            break;
        case 68: // D key
        scene.view.prp = scene.view.prp.subtract(u);
        scene.view.srp = scene.view.srp.subtract(u);
            console.log("D");
            break;
        case 83: // S key
        scene.view.prp = n.add(scene.view.prp);
        scene.view.srp = n.add(scene.view.srp);
            console.log("S");
            break;
        case 87: // W key
        scene.view.prp = scene.view.prp.subtract(n);
        scene.view.srp = scene.view.srp.subtract(n);
            console.log("W");
            break;
    }
}

///////////////////////////////////////////////////////////////////////////
// No need to edit functions beyond this point
///////////////////////////////////////////////////////////////////////////

// Called when user selects a new scene JSON file
function loadNewScene() {
    let scene_file = document.getElementById('scene_file');

    console.log(scene_file.files[0]);

    let reader = new FileReader();
    reader.onload = (event) => {
        scene = JSON.parse(event.target.result);
        scene.view.prp = Vector3(scene.view.prp[0], scene.view.prp[1], scene.view.prp[2]);
        scene.view.srp = Vector3(scene.view.srp[0], scene.view.srp[1], scene.view.srp[2]);
        scene.view.vup = Vector3(scene.view.vup[0], scene.view.vup[1], scene.view.vup[2]);

        for (let i = 0; i < scene.models.length; i++) {
            if (scene.models[i].type === 'generic') {
                for (let j = 0; j < scene.models[i].vertices.length; j++) {
                    scene.models[i].vertices[j] = Vector4(scene.models[i].vertices[j][0],
                                                          scene.models[i].vertices[j][1],
                                                          scene.models[i].vertices[j][2],
                                                          1);
                }
            }
            else {
                scene.models[i].center = Vector4(scene.models[i].center[0],
                                                 scene.models[i].center[1],
                                                 scene.models[i].center[2],
                                                 1);
            }
            scene.models[i].matrix = new Matrix(4, 4);
        }
        calculateVerticesAndEdges();
        window.requestAnimationFrame(animate);
    };
    reader.readAsText(scene_file.files[0], 'UTF-8');
}

// Draw black 2D line with red endpoints
function drawLine(x1, y1, x2, y2) {
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
    ctx.fillRect(x2 - 2, y2 - 2, 4, 4);
}
