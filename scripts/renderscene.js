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
    origScene = {
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
            }
        ]
    };
    scene = {
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

    //For animating by time, it’s probably easiest to explain with an example. Say that I want to have my model take 2 seconds to rotate once. Given a typical monitor with a 60 Hz refresh rate, this would mean incrementing the rotation angle by 3 degrees each frame (360 degrees / 120 frames in 2 seconds). However, if we made this assumption, then someone using a monitor with a faster or slower refresh rate would see the animation going much faster or slower than desired. Therefore, you should calculate how much to rotate the model based on how much time has passed. If someone has a faster refresh rate on their monitor, then less time would have passed since the previous frame and we should not rotate quite as much.
    // step 2: transform models based on time
    // TODO: implement this! // may need some help friday

    // step 3: draw scene
    drawScene();

    // step 4: request next animation frame (recursively calling same function)
    // (may want to leave commented out while debugging initially)
    //window.requestAnimationFrame(animate);
}

// Main drawing code - use information contained in variable `scene`
function drawScene() {
    console.log(scene);

    // TODO: implement drawing here!
    // For each model, for each edge
    //  * transform to canonical view volume // done
    let transformView = [];
    if (scene.view.type == "perspective") {
        transformView = mat4x4Perspective(scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
    } else if (scene.view.type == "parallel") {
        transformView = mat4x4Parallel(scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
    } else {
        console.log("Error on scene view type");
    }

    //  * clip in 3D // may need some help friday
    let clippingView = [];
    // clipping process here! But for now, just let = transformView
    clippingView = transformView;

    //  * project to 2D // done
    let projectView = [];
    if (scene.view.type == "perspective") {
        projectView = Matrix.multiply([mat4x4MPer(), clippingView]);
    } else if (scene.view.type == "parallel") {
        projectView = Matrix.multiply([mat4x4MPar(), clippingView]);
    } else {
        console.log("Error on scene projection")
    }

    // Print to projection matrix to 2D to log:
    //console.log("Projection to 2D:")
    //console.log(projectView);

    // * project to window view volume
    let windowView = new Matrix(4, 4);
    mat4x4WindowProjection(windowView, view.width, view.height);
    windowView = Matrix.multiply([windowView, projectView]);

    // * draw line - multiply projectView by scene vertices and draw to canvas

    // First create a copy of the scene vertices so that we can project them and divide by w
    let projectedVertices = Object.assign({}, scene.models[0].vertices);
    for (let i = 0; i < Object.entries(projectedVertices).length; i++) {
        //console.log(projectedVertices[i]);

        // Vertex projection - we select index i because we grab the value of the object, not the key
        projectedVertices[i] = Matrix.multiply([windowView, projectedVertices[i]]);

        // Divide each vector component by w
        vec4x1NonHomogeneous(projectedVertices[i]);
    }
    //console.log(projectedVertices);

    // Then draw lines to canvas based on edge connections defined within the scene
    for (let edgeArray of Object.entries(scene.models[0].edges)) {
       // console.log(edgeArray[1]);
        //console.log(edgeArray[1][0]);

        // Iterate thrrough the edge array until we run out of vertex indice pairs
        // Note: Dr. Marrinan already returnes to original vertex index
        // for closed loops (we start at vertex v and end at v), thus we only
        // go through length-1
        for (let i = 0; i < (edgeArray[1].length)-1; i++) {
            // Test indexing
            //console.log(projectedVertices[edgeArray[1][i]].x);
            //console.log(projectedVertices[edgeArray[1][i+1]].x);

            // Drawing line from (v[e[i]].x, v[e[i]].y) to (v[e[i+1]].x, v[e[i+1]].y)
           // console.log("Drawing line from (" + projectedVertices[edgeArray[1][i]].x + " ," + projectedVertices[edgeArray[1][i]].y + ") to (" + projectedVertices[edgeArray[1][i+1]].x + " ," + projectedVertices[edgeArray[1][i+1]].y +")");
            drawLine(projectedVertices[edgeArray[1][i]].x, projectedVertices[edgeArray[1][i]].y, projectedVertices[edgeArray[1][i+1]].x, projectedVertices[edgeArray[1][i+1]].y);
        }//divide by w
    }
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
    let p0 = Vector3(line.pt0.x, line.pt0.y, line.pt0.z);
    let p1 = Vector3(line.pt1.x, line.pt1.y, line.pt1.z);
    let out0 = outcodeParallel(p0);
    let out1 = outcodeParallel(p1);
    let repeat = 1;

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
            return line;
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
            let string_outcode = "" + point_one + "";
            let position =0;
            for(var i = 0; i<string_outcode.length; i++){

                if(string_outcode.charAt(i) == "1"){
                     position = i;
                    break;
                }
            }
            //calculate the intersection point between the line and corresponding edge
            if(position == 0){
                //clip against left edge
                let changey = (point_one.y - point_zero.y);
                let changex = (point_one.x - point_zero.x);
                let b = (point_one.y - ((changey/changex)*point_one.x));
                //no b or y use equations from slides last slide 3D clipping powerpoint
                let y = ((changey/changex)*point_one.x) + b;
                let newPoint = [-(view.width / 2), y]; //left_edge, y - don't know if these are right
            }
            else if(position ==1){
                //clip against right edge
                let changey = (p0.y - p1.y);
                let changex = (p0.x - p1.x);
                let b = (point_one.y - ((changey/changex)*point_one.x));
                let y = ((changey/changex)*point_one.x) + b;
                let newPoint = [view.width / 2, y]; //right_edge, y - don't know if these are right

            }
            else if(position ==2){
                //clip against bottom edge
                let changey = (p0.y - p1.y);
                let changex = (p0.x - p1.x);
                let b = (point_one.y - ((changey/changex)*point_one.x));
                let x = (point_one.y / (changey/changex)) - b;
                let newPoint = [x, -(view.height / 2)]; //x, bottom_edge - don't know if these are right
            }
            else{
                //clip against top edge
                let changey = (p0.y - p1.y);
                let changex = (p0.x - p1.x);
                let b = (point_one.y - ((changey/changex)*point_one.x));
                let x = (point_one.y / (changey/changex)) - b;
                let newPoint = [x, view.height / 2]; //x, top_edge - don't know if these are right
            }
            //add neart and far
            //replace selected endpoint with this intersection point
            if(point_one === p0){
                p0 = newPoint;
                //recalculate enpoint's outcode
                out0 = outcodeParallel(p0);
            }
            else{
                p1 = newPoint;
                //recalculate enpoint's outcode
                out1 = outcodeParallel(p1);
            }
            let newLine = [p0, p1];
            result = newLine;

            //try to accept/reject again (repeat process)
        }

    }

    return result;
}

// Clip line - should either return a new line (with two endpoints inside view volume) or null (if line is completely outside view volume)
function clipLinePerspective(line, z_min) {
    let result = null;
    let p0 = Vector3(line.pt0.x, line.pt0.y, line.pt0.z);
    let p1 = Vector3(line.pt1.x, line.pt1.y, line.pt1.z);
    let out0 = outcodePerspective(p0, z_min);
    let out1 = outcodePerspective(p1, z_min);
    let repeat = 1;

    // TODO: implement clipping here!

    while(repeat == 1){
        //check if both are outside, to reject
        if((out0 | out1) != 0){
            repeat = 0;
            //both points are outside the line, reject by returning null
            return result;
        }
        //check if both are inside, to accept
        else if((out0 & out1 == 1)){
            repeat = 0;
            //both points are inside the line, accept by returning line with same endpoints
            return line;
        }
        else {
            // * everything else
            //Select and endpoint that lies outside the view rectangle
            if(out0 != 0000){
                let point_one = p0;
            }
            else{
                let point_one = p1;
            }
            //find the first bit set to 1 in the selected endpoint's outcode
            let string_outcode = "" + point_one + "";
            for(var i = 0; i<string_outcode.length; i++){
                if(string_outcode.charAt(i) == "1"){
                    let position = i;
                    break;
                }
            }
            //calculate the intersection point between the line and corresponding edge
            if(i == 0){
                //clip against left edge
                let changey = (p0.y - p1.y);
                let changex = (p0.x - p1.x);
                let b = (point_one.y - ((changey/changex)*point_one.x));
                let y = ((changey/changex)*point_one.x) + b;
                let newPoint = [-(view.width / 2), y, point_one.z]; //left_edge, y - don't know if these are right
            }
            else if(i ==1){
                //clip against right edge
                let changey = (p0.y - p1.y);
                let changex = (p0.x - p1.x);
                let b = (point_one.y - ((changey/changex)*point_one.x));
                let y = ((changey/changex)*point_one.x) + b;
                let newPoint = [view.width / 2, y, point_one.z]; //right_edge, y - don't know if these are right

            }
            else if(i ==2){
                //clip against bottom edge
                let changey = (p0.y - p1.y);
                let changex = (p0.x - p1.x);
                let b = (point_one.y - ((changey/changex)*point_one.x));
                let x = (point_one.y / (changey/changex)) - b;
                let newPoint = [x, -(view.height / 2), point_one.z]; //x, bottom_edge - don't know if these are right
            }
            else{
                //clip against top edge
                let changey = (p0.y - p1.y);
                let changex = (p0.x - p1.x);
                let b = (point_one.y - ((changey/changex)*point_one.x));
                let x = (point_one.y / (changey/changex)) - b;
                let newPoint = [x, view.height / 2, point_one.z]; //x, top_edge - don't know if these are right
            }

            //replace selected endpoint with this intersection point
            if(point_one === p0){
                p0 = newPoint;
                //recalculate enpoint's outcode
                out0 = outcodePerspective(p0, z_min);
            }
            else{
                p1 = newPoint;
                //recalculate enpoint's outcode
                out1 = outcodePerspective(p1, z_min);
            }
            let newLine = [p0, p1];
            result = newLine;

            //try to accept/reject again (repeat process)
        }

    }

    return result;

    // TODO: implement clipping here!

    return result;
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
