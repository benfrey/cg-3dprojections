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
            prp: Vector3(44, 20, -16),
            srp: Vector3(20, 20, -40),
            vup: Vector3(0, 1, 0),
            clip: [-19, 5, -10, 8, 12, 100]
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
            },
            {
                type: "cube",
                center: Vector4(8, 6, -20, 1),
                width: 4,
                height: 4,
                depth: 4,
                animation: {
                    axis: "x",
                    rps: 0.1
                }
            },
            {
                type: "cone",
                center: Vector4(8, 30, -20, 1),
                radius: 5,
                height: 10,
                sides: 8,
                animation: {
                    axis: "y",
                    rps: 0.2
                }
            },
            {
                type: "cylinder",
                center: Vector4(10, 40, -45, 1),
                radius: 5,
                height: 10,
                sides: 12,
                animation: {
                    axis: "y",
                    rps: 0.5
                }
            },
            {
                type: "sphere",
                center: Vector4(8, 20, -12, 1),
                radius: 4,
                slices: 12,
                stacks: 8,
                animation: {
                    axis: "y",
                    rps: 0.1
                }
            }
        ]
    };

    // event handler for pressing arrow keys
    document.addEventListener('keydown', onKeyDown, false);

    // start animation loop
    start_time = performance.now(); // current timestamp in milliseconds

    window.requestAnimationFrame(animate);
}

// Animation loop - repeatedly calls rendering code
function animate(timestamp) {
    console.log(scene);
    ctx.clearRect(0, 0, view.width, view.height);
    // step 1: calculate time (time since start)
    let time = timestamp - start_time;

    //For animating by time, it’s probably easiest to explain with an example. Say that I want to have my model take 2 seconds to rotate once.
    // Given a typical monitor with a 60 Hz refresh rate, this would mean incrementing the rotation angle by 3 degrees each frame (360 degrees / 120 frames in 2 seconds).
    // However, if we made this assumption, then someone using a monitor with a faster or slower refresh rate would see the animation going much faster or slower than desired.
    // Therefore, you should calculate how much to rotate the model based on how much time has passed.
    // If someone has a faster refresh rate on their monitor, then less time would have passed since the previous frame and we should not rotate quite as much.
    // step 2: transform models based on time
    for (let i = 0; i < scene.models.length; i++) {
        // If model has animation property, we need to rotate it about the specified axis by theta degrees specified by our rotations per second (rps) and time.
        // More exactly. We are trying to determining how many revolutions have occured (i.e. theta [radians]) = rps [rev/s] x time [ms] x [2 pi rad / rev] * [1 s / 1000 ms].
        // This theta value is used in a trig function (within our rotation transformation matrices), and all trig functions are periodic.
        if (scene.models[i].animation != null) {
            // Calculate theta (see above)
            let theta = scene.models[i].animation.rps * time * 2 * Math.PI / 1000;

            // Declare animation matrix
            let animationMatrix = new Matrix(4, 4);

            // Determine axis of rotation
            if (scene.models[i].animation.axis == "x") {
                mat4x4RotateX(animationMatrix, theta);
            } else if (scene.models[i].animation.axis == "y") {
                mat4x4RotateY(animationMatrix, theta);
            } else if (scene.models[i].animation.axis == "z") {
                mat4x4RotateZ(animationMatrix, theta);
            }

            // Add animation matrix as property of model
            scene.models[i]['matrix'] = animationMatrix;
        }
    }

    // Recalculate vertices and edges for animated models
    calculateVerticesAndEdges();

    // step 3: draw scene
    drawScene();

    // step 4: request next animation frame (recursively calling same function)
    // (may want to leave commented out while debugging initially)
    window.requestAnimationFrame(animate);
}

// Main drawing code - use information contained in variable `scene`
function drawScene() {

    // Create view matrix
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
                let clippedLine;
                if (scene.view.type == "perspective") {
                    clippedLine = clipLinePerspective(line,-scene.view.clip[4]/scene.view.clip[5]);
                } else if (scene.view.type == "parallel") {
                    clippedLine = clipLineParallel(line);
                } else {
                    console.log("Error on scene projection")
                }

                if(clippedLine != null){
                    //Step 3 project clipped lines into 2D and scale to match screen coordinates
                    let project_vertZero = Matrix.multiply([projectView,clippedLine.pt0]);
                    let project_vertOne = Matrix.multiply([projectView,clippedLine.pt1]);
                    //console.log(project_vertZero);
                    //console.log(clippedLine);
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
function calculateCubeVerticesAndEdges(myModel, center, width, height, depth) { // x width, y height, z depth
    // Build model vertices
    let tempVertices = [new Vector4(0, 0, 0, 1),
                        new Vector4(0, 0, depth, 1),
                        new Vector4(width, 0, depth, 1),
                        new Vector4(width, 0, 0, 1),
                        new Vector4(0, height, 0, 1),
                        new Vector4(0, height, depth, 1),
                        new Vector4(width, height, depth, 1),
                        new Vector4(width, height, 0, 1)];

    // Asign model edges
    let tempEdges = [[0, 1, 2, 3, 0],
                     [4, 5, 6, 7, 4],
                     [0, 4],
                     [1, 5],
                     [2, 6],
                     [3, 7]];

    // (1) First apply minor translation so that model is centered about its geometry
    // (2) Then apply animation transformation
    // (3) Then translate to "center"
    let translateOne = new Matrix(4, 4);
    mat4x4Translate(translateOne, -(width/2), -(height/2), -(depth/2))
    let translateTwo = new Matrix(4, 4);
    mat4x4Translate(translateTwo, center.x, center.y, center.z)
    for (let i = 0; i < tempVertices.length; i++) {
        // Vertex rotation and translation
        tempVertices[i] = Matrix.multiply([translateTwo, myModel.matrix, translateOne, tempVertices[i]]);
    }

    // Update model in scene
    myModel['vertices'] = tempVertices;
    myModel['edges'] = tempEdges;
}

// Calculate vertices and edges for a cylindrical model
function calculateCylinderVerticesAndEdges(myModel, center, radius, height, sides) { // y height, x and z radius dimension
    // Build model vertices
    let tempEdges = [];
    let tempVertices = [];
    let edgeIndex = 0;
    for (let y = 0; y < 2; y++) { // Want top and bottom cap (only 2 z slices)
        let capEdges = [];
        let curY = y * height;
        for (let theta = 0; theta < 360; theta = theta + (360/sides)) {
            let curX = radius * Math.cos(theta*Math.PI/180);
            let curZ = radius * Math.sin(theta*Math.PI/180);
            tempVertices.push(new Vector4(curX, curY, curZ, 1));
            capEdges.push(edgeIndex);
            edgeIndex++;
        }
        capEdges.push(y*sides); // Need to make the last connection edge in the ring
        tempEdges.push(capEdges); // While we are here, let's add this polygon to our edge list
    }

    // Assign remaining model edges
    for (index of tempEdges[0]) {
        tempEdges.push([index, index+sides]) // Connecting btm and top caps
    }

    // (1) First apply minor translation so that model is centered about its geometry
    // (2) Then apply animation transformation
    // (3) Then translate to "center"
    let translateOne = new Matrix(4, 4);
    mat4x4Translate(translateOne, 0, -(height/2), 0);
    let translateTwo = new Matrix(4, 4);
    mat4x4Translate(translateTwo, center.x, center.y, center.z);
    for (let i = 0; i < tempVertices.length; i++) {
        // Vertex rotation and translation
        tempVertices[i] = Matrix.multiply([translateTwo, myModel.matrix, translateOne, tempVertices[i]]);
    }

    // Update model in scene
    myModel['vertices'] = tempVertices;
    myModel['edges'] = tempEdges;
}

// Calculate vertices and edges for a conical model
function calculateConeVerticesAndEdges(myModel, center, radius, height, sides) { // y height, x and z radius dimension
    // Build model vertices
    let tempEdges = [];
    let tempVertices = [];
    let edgeIndex = 1; // Start at 1, reserve 0 for tip
    let baseEdges = [];
    tempVertices.push(new Vector4(0, height, 0, 1)); // Append tip vertex
    for (let theta = 0; theta < 360; theta = theta + (360/sides)) { // Want only care about bottom cap, as oppossed to cylindrical
        let curX = radius * Math.cos(theta*Math.PI/180);
        let curZ = radius * Math.sin(theta*Math.PI/180);
        tempVertices.push(new Vector4(curX, 0, curZ, 1));
        tempEdges.push([0, edgeIndex]); // We are connecting base to tip here
        baseEdges.push(edgeIndex); // We are forming base polygon here
        edgeIndex++;
    }
    baseEdges.push(1); // Need to make the last connection edge in the ring
    tempEdges.push(baseEdges); // Add base polygon to edge list

    // (1) First apply minor translation so that model is centered about its geometry
    // (2) Then apply animation transformation
    // (3) Then translate to "center"
    let translateOne = new Matrix(4, 4);
    mat4x4Translate(translateOne, 0, -(height/2), 0);
    let translateTwo = new Matrix(4, 4);
    mat4x4Translate(translateTwo, center.x, center.y, center.z);
    for (let i = 0; i < tempVertices.length; i++) {
        // Vertex rotation and translation
        tempVertices[i] = Matrix.multiply([translateTwo, myModel.matrix, translateOne, tempVertices[i]]);
    }

    // Update model in scene
    myModel['vertices'] = tempVertices;
    myModel['edges'] = tempEdges;
}

// Calculate vertices and edges for a spherical model
function calculateSphereVerticesAndEdges(myModel, center, radius, slices, stacks) { // think of slices as longitude lines, stacks as latitude lines

    let tempVertices = [];
    let tempEdges = [];
    
    let x, y, z, xy; // vertex positions

    let sectorStep = 2 * Math.PI / slices;
    let stackStep = Math.PI / stacks;
    let sectorAngle, stackAngle;

    // Starting edge index
    let edgeIndex = 0;

    // Go through each stack
    for (let i = 0; i <= stacks; ++i) {
        stackAngle = Math.PI / 2 - i * stackStep;  
        xy = radius * Math.cos(stackAngle);             
        z = radius * Math.sin(stackAngle);              

        // For adding stack ring
        let curEdges = [];
        
        // Go through each slice (or sector)
        for(let j = 0; j <= slices; ++j) {
            sectorAngle = j * sectorStep;           

            // vertex position (x, y, z)
            x = xy * Math.cos(sectorAngle);
            y = xy * Math.sin(sectorAngle);
            
            tempVertices.push(new Vector4(x, y, z, 1));
            
            curEdges.push(edgeIndex); // We are building a ring for a single stack here
            
            if (i > 0) { // We are building "backwards" so we can skip the first stack
                tempEdges.push([edgeIndex, edgeIndex-(slices+1)]);     // We are building connection between different stacks here
            }

            edgeIndex++;
        }
        tempEdges.push(curEdges);        
    }

    // (1) Then apply animation transformation
    // (2) Then translate to "center"
    let translateTwo = new Matrix(4, 4);
    mat4x4Translate(translateTwo, center.x, center.y, center.z);
    for (let i = 0; i < tempVertices.length; i++) {
        // Vertex rotation and translation
        tempVertices[i] = Matrix.multiply([translateTwo, myModel.matrix, tempVertices[i]]);
    }

    myModel['vertices'] = tempVertices;
    myModel['edges'] = tempEdges;
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
    let p0 = Vector4(line.pt0.x, line.pt0.y, line.pt0.z, line.pt0.w); // end point 0
    let p1 = Vector4(line.pt1.x, line.pt1.y, line.pt1.z, line.pt1.w); // end point 
    let out0 = outcodeParallel(p0);
    let out1 = outcodeParallel(p1);
    let repeat = 1;
    let point_out, out_codeOut;

    // TODO: implement clipping here!
    while(repeat == 1){
        if((out0 & out1) != 0){
            // check if both are outside, to reject TRIVIAL REJECT
            repeat = 0;
            //both points are outside the line, reject by returning null
            return result;
        }
        else if((out0 | out1) == 0){       
            //check if both are inside, to accept TRIVIAL ACCEPT
            repeat = 0;
            //both points are inside the line, accept by returning line with same endpoints
            return {pt0:p0,pt1:p1};
        } else { // everything else
            //Select endpoint that lies outside the view rectangle as point_one
            if(out0 != 000000){
                point_out = p0;
                out_codeOut = out0;
            }
            else{
                point_out = p1;
                out_codeOut = out1;
            }
            // find the first bit set to 1 in the selected endpoint's outcode
            var base2 = (out_codeOut).toString(2);
            let string_outcode = "" + base2 + "";
            position = 6 - string_outcode.length;

            // Find parameters
            //calculate the intersection point between the line and corresponding edge
            let delta_x =  (p1.x - p0.x);
            let delta_y = ( p1.y - p0.y);
            let delta_z = ( p1.z - p0.z);
            let t;

            //((1-t)*value0)+(t*value1)
            if(position == 0) { 
                t = (-1-p0.x)/delta_x;
            } else if(position == 1) {
                t = (1-p0.x)/delta_x;
            } else if(position == 2) {
                t = (-1-p0.y)/delta_y;
            } else if (position == 3) {
                t = (1-p0.y)/delta_y;
            } else if (position == 4) {
                t = (-p0.z-1)/delta_z;
            } else if (position == 5) {
                t = -p0.z/delta_z;
            }

            // Use parametric equations to find new components
            let new_pointx = (1-t)*p0.x+t*p1.x;
            let new_pointy = (1-t)*p0.y+t*p1.y;
            let new_pointz = (1-t)*p0.z+t*p1.z;
            let new_point = Vector4(new_pointx,new_pointy,new_pointz,1);
            //replace selected endpoint with this intersection point
            if(out_codeOut === out0){
                console.log("Yay!");
                p0 = new_point;
                // Recalculate enpoint's outcode
                out0 = outcodeParallel(p0);
            }
            else{
                p1 = new_point;
                //recalculate enpoint's outcode
                out1 = outcodeParallel(p1);
            } 
            //try to accept/reject again (repeat process)
        }
    }
}

// Clip line - should either return a new line (with two endpoints inside view volume) or null (if line is completely outside view volume)
function clipLinePerspective(line, z_min) {
    let result = null;
    let p0 = Vector4(line.pt0.x, line.pt0.y, line.pt0.z, line.pt0.w); // end point 0
    let p1 = Vector4(line.pt1.x, line.pt1.y, line.pt1.z, line.pt1.w); // end point 1
    let out0 = outcodePerspective(p0, z_min);
    let out1 = outcodePerspective(p1, z_min);
    let repeat = 1;
    let point_out, out_codeOut;

    // TODO: implement clipping here!
    while(repeat == 1){
        if((out0 & out1) != 0){
            //console.log("reject");
            // check if both are outside, to reject TRIVIAL REJECT
            repeat = 0;

            //both points are outside the line, reject by returning null
            return result;
        }
        else if((out0 | out1) == 0){
            //console.log("accept");
            //check if both are inside, to accept TRIVIAL ACCEPT
            repeat = 0;

            //both points are inside the line, accept by returning line with same endpoints
            return {pt0:p0,pt1:p1};
        } else { // everything else
            //console.log("else");
            //Select endpoint that lies outside the view rectangle as point_one
            if(out0 != 000000){
                point_out = p0;
                out_codeOut = out0;
                // console.log("out0: " + out0);
            }
            else{
                point_out = p1;
                out_codeOut = out1;
                //  console.log("out1: " + out1);
            }

            // find the first bit set to 1 in the selected endpoint's outcode
            var base2 = (out_codeOut).toString(2);
            let string_outcode = "" + base2 + "";
            position = 6 - string_outcode.length;

            // Find parameters
            let delta_x = (p1.x - p0.x);
            let delta_y = (p1.y - p0.y);
            let delta_z = (p1.z - p0.z);
            let t;

            // Calculate parametric value t
            if(position == 0) {
                t = (-p0.x + p0.z)/(delta_x-delta_z);
            } else if(position == 1) {
                t = (p0.x + p0.z)/(-delta_x-delta_z);
            } else if(position == 2) {
                t = (-p0.y + p0.z)/(delta_y-delta_z);
            } else if (position == 3) {
                t = (p0.y + p0.z)/(-delta_y-delta_z);
            } else if (position == 4) {
                t = (-p0.z - 1)/(delta_z);
            } else if (position == 5) {
                t = (-p0.z + z_min)/(-delta_z);
            }

            // Use parametric equations to find new components
            let new_pointx = (1-t)*p0.x+t*p1.x;
            let new_pointy = (1-t)*p0.y+t*p1.y;
            let new_pointz = (1-t)*p0.z+t*p1.z;
            let new_point = Vector4(new_pointx,new_pointy,new_pointz,1);

            // Replace selected endpoint with this intersection point
            if(out_codeOut === out0){
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
}

// Called when user presses a key on the keyboard down
function onKeyDown(event) {
    //window.requestAnimationFrame(animate);

    let n = scene.view.prp.subtract(scene.view.srp);
    n.normalize();
    let u = scene.view.vup.cross(n);
    u.normalize();
    let v = n.cross(u);
    v.normalize();

    let theta = 5 * Math.PI/180; // 5 degrees
    let transformView = new Matrix(4, 4);
    let newSRP = new Vector4(scene.view.srp.x, scene.view.srp.y, scene.view.srp.z, 1);

    switch (event.keyCode) {
        case 37: // LEFT Arrow
            // Rotate about v (at scene.view.prp) through angle theta
            transformView = mat4x4SwingSRP(v, scene.view.prp, theta);
            newSRP = Matrix.multiply([transformView, newSRP]);

            // Update scene
            scene.view.srp.x = newSRP.x;
            scene.view.srp.y = newSRP.y;
            scene.view.srp.z = newSRP.z;

            console.log("Left");
            break;
        case 39: // RIGHT Arrow
            // Rotate about v (at scene.view.prp) through angle -theta
            transformView = mat4x4SwingSRP(v, scene.view.prp, -theta);
            newSRP = Matrix.multiply([transformView, newSRP]);

            // Update scene
            scene.view.srp.x = newSRP.x;
            scene.view.srp.y = newSRP.y;
            scene.view.srp.z = newSRP.z;

            console.log("Right");
            break;
        case 65: // A key
            scene.view.prp = scene.view.prp.add(u);
            scene.view.srp = scene.view.srp.add(u);
            console.log("A");
            break;
        case 68: // D key
            scene.view.prp = scene.view.prp.subtract(u);
            scene.view.srp = scene.view.srp.subtract(u);
            console.log("D");
            break;
        case 83: // S key
            scene.view.prp = scene.view.prp.subtract(n);
            scene.view.srp = scene.view.srp.subtract(n);
            console.log("S");
            break;
        case 87: // W key
            scene.view.prp = scene.view.prp.add(n);
            scene.view.srp = scene.view.srp.add(n);
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
