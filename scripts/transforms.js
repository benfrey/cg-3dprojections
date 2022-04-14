// create a 4x4 matrix to the parallel projection / view matrix
function mat4x4Parallel(prp, srp, vup, clip) {
// 1. translate PRP to origin (see slide 17 of lecture 09)
let translationMatrix = new Matrix(4, 4);
mat4x4Translate(translationMatrix, -prp.x, -prp.y, -prp.z);
//console.log("Here 1")
//console.log(translationMatrix);

// 2. rotate VRC such that (u,v,n) align with (x,y,z) (see slide 18 of lecture 09)
let rotationMatrix = new Matrix(4, 4);
let n = prp.subtract(srp);
n.normalize();
let u = vup.cross(n);
u.normalize();
let v = n.cross(u);
rotationMatrix.values = [[u.x, u.y, u.z, 0],
                         [v.x, v.y, v.z, 0],
                         [n.x, n.y, n.z, 0],
                         [0, 0, 0, 1]];
//console.log("Here 2")
//console.log(rotationMatrix);

// 3. shear such that CW is on the z-axis (see slide 19 of lecture 09)
let shearMatrix = new Matrix(4, 4);
let cw = Vector3((clip[0]+clip[1])/2, (clip[2]+clip[3])/2, -clip[4]); //cw is center of window [(left+right)/2, (btm+top)/2, -near]
let dop = cw.subtract(Vector3(0, 0, 0)); //dop is direction of projection and is defined as cw - prp (note: prp is now at origin)
mat4x4ShearXY(shearMatrix, -dop.x/dop.z, -dop.y/dop.z);
//console.log("Here 3")
//console.log(shearMatrix);


    // 4. translate near clipping plane to origin (see slide 12 of lecture 09)
    let translateClippingMatrix = new Matrix(4, 4);
    mat4x4Translate(translateClippingMatrix, 0, 0, clip[4]);
    //console.log("Here 4")
    console.log(translateClippingMatrix);

    // 5. scale such that view volume bounds are ([-1,1], [-1,1], [-1,0]) (see slide 13 of lecture 09)
    let scaleMatrix = new Matrix(4,4);
    mat4x4Scale(scaleMatrix,2/(clip[1]-clip[0]),2/(clip[3]-clip[2]),1/clip[5]);
    //console.log("Here 5")
    console.log(scaleMatrix);

    // Final transformation by multiplying matrices through (see slide 14 of lecture 09)
    //let transform = Matrix.multiply([translationMatrix, rotationMatrix, shearMatrix, translateClippingMatrix, scaleMatrix]);
    let transform = Matrix.multiply([scaleMatrix, translateClippingMatrix, shearMatrix, rotationMatrix, translationMatrix]);
    console.log(transform);
    return transform;
}

// create a 4x4 matrix to the perspective projection / view matrix
function mat4x4Perspective(prp, srp, vup, clip) {
    // 1. translate PRP to origin (see slide 17 of lecture 09)
    let translationMatrix = new Matrix(4, 4);
    mat4x4Translate(translationMatrix, -prp.x, -prp.y, -prp.z);
    //console.log("Here 1")
    //console.log(translationMatrix);

    // 2. rotate VRC such that (u,v,n) align with (x,y,z) (see slide 18 of lecture 09)
    let rotationMatrix = new Matrix(4, 4);
    let n = prp.subtract(srp);
    n.normalize();
    let u = vup.cross(n);
    u.normalize();
    let v = n.cross(u);
    rotationMatrix.values = [[u.x, u.y, u.z, 0],
                             [v.x, v.y, v.z, 0],
                             [n.x, n.y, n.z, 0],
                             [0, 0, 0, 1]];
    //console.log("Here 2")
    //console.log(rotationMatrix);

    // 3. shear such that CW is on the z-axis (see slide 19 of lecture 09)
    let shearMatrix = new Matrix(4, 4);
    let cw = Vector3((clip[0]+clip[1])/2, (clip[2]+clip[3])/2, -clip[4]); //cw is center of window [(left+right)/2, (btm+top)/2, -near]
    let dop = cw.subtract(Vector3(0, 0, 0)); //dop is direction of projection and is defined as cw - prp (note: prp is now at origin)
    mat4x4ShearXY(shearMatrix, -dop.x/dop.z, -dop.y/dop.z);
    //console.log("Here 3")
    //console.log(shearMatrix);

    // 4. scale such that view volume bounds are ([z,-z], [z,-z], [-1,zmin]) (see slide 20 of lecture 09)
    let scaleMatrix = new Matrix(4,4);
    mat4x4Scale(scaleMatrix, (2*clip[4])/((clip[1]-clip[0])*clip[5]), (2*clip[4])/((clip[3]-clip[2])*clip[5]), 1/clip[5]);
    //console.log("Here 4")
    //console.log(scaleMatrix);

    // Final transformation by multiplying matrices through (see slide 23 of lecture 09)
    let transform = Matrix.multiply([scaleMatrix, shearMatrix, rotationMatrix, translationMatrix]);
    return transform;
}

// create a 4x4 matrix to project a parallel image on the z=0 plane
function mat4x4MPar() {
    let mpar = new Matrix(4, 4);

    // 3D project to 2D (see slide 4 of lecture 09)
    mpar.values = [[1, 0, 0, 0],
                   [0, 1, 0, 0],
                   [0, 0, 0, 0],
                   [0, 0, 0, 1]];

    return mpar;
}

// create a 4x4 matrix to project a perspective image on the z=-1 plane
function mat4x4MPer() {
    let mper = new Matrix(4, 4);

    // 3D project to 2D (see slide 7 of lecture 09)
    mper.values = [[1, 0, 0, 0],
                   [0, 1, 0, 0],
                   [0, 0, 1, 0],
                   [0, 0, -1, 0]];

    return mper;
}

///////////////////////////////////////////////////////////////////////////////////
// 4x4 Transform Matrices                                                         //
///////////////////////////////////////////////////////////////////////////////////

// set values of existing 4x4 matrix to the identity matrix
function mat4x4Identity(mat4x4) {
    mat4x4.values = [[1, 0, 0, 0],
                     [0, 1, 0, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the translate matrix
function mat4x4Translate(mat4x4, tx, ty, tz) {
    mat4x4.values = [[1, 0, 0, tx],
                     [0, 1, 0, ty],
                     [0, 0, 1, tz],
                     [0, 0, 0, 1]];
}


// set values of existing 4x4 matrix to the scale matrix
function mat4x4Scale(mat4x4, sx, sy, sz) {
    mat4x4.values = [[sx, 0, 0, 0],
                     [0, sy, 0, 0],
                     [0, 0, sz, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the rotate about x-axis matrix
function mat4x4RotateX(mat4x4, theta) {
    mat4x4.values = [[1, 0, 0, 0],
                     [0, Math.cos(theta), -Math.sin(theta), 0],
                     [0, Math.sin(theta), Math.cos(theta), 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the rotate about y-axis matrix
function mat4x4RotateY(mat4x4, theta) {
    mat4x4.values = [[Math.cos(theta), 0, Math.sin(theta), 0],
                     [0, 1, 0, 0],
                     [-Math.sin(theta), 0, Math.cos(theta), 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the rotate about z-axis matrix
function mat4x4RotateZ(mat4x4, theta) {
    mat4x4.values = [[Math.cos(theta), -Math.sin(theta), 0, 0],
                     [Math.sin(theta), Math.cos(theta), 0, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the shear parallel to the xy-plane matrix
function mat4x4ShearXY(mat4x4, shx, shy) {
    mat4x4.values = [[1, 0, shx, 0],
                     [0, 1, shy, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to fit the view volume of the canvas
function mat4x4WindowProjection(mat4x4, width, height) {
    mat4x4.values = [[width/2, 0, 0, width/2],
                     [0, height/2, 0, height/2],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to return to non-homogenous coordinate system (divide by w)
function vec4NonHomogeneous(vec4) {
    vec4.values = [vec4.x/vec4.w, vec4.y/vec4.w, vec4.z/vec4.w, vec4.w];
}

// set values of existing 4x4 matrix in order to transform SRP about PRP
function mat4x4SwingSRP(rotAxisVec, PRP, theta) {
    let u = rotAxisVec.x;
    let v = rotAxisVec.y;
    let w = rotAxisVec.z;

    let a = PRP.x;
    let b = PRP.y;
    let c = PRP.z;
    
    let outMat = new Matrix(4, 4);
    outMat.values = [[u^2+(v^2+w^2)*Math.cos(theta), u*v*(1-Math.cos(theta))-w*Math.sin(theta), u*w*(1-Math.cos(theta))+v*Math.sin(theta), (a*(v^2+w^2)-u*(b*v+c*w))*(1-Math.cos(theta))+(b*w-c*v)*Math.sin(theta)],
                     [u*v*(1-Math.cos(theta))+w*Math.sin(theta), v^2+(u^2+w^2)*Math.cos(theta), v*w*(1-Math.cos(theta))-u*Math.sin(theta), (b*(u^2+w^2)-v*(a*u+c*w))*(1-Math.cos(theta))+(c*u-a*w)*Math.sin(theta)],
                     [u*w*(1-Math.cos(theta))-v*Math.sin(theta), v*w*(1-Math.cos(theta))+u*Math.sin(theta), w^2+(u^2+v^2)*Math.cos(theta), (c*(u^2+v^2)-w*(a*u+b*v))*(1-Math.cos(theta))+(a*v-b*u)*Math.sin(theta)],
                     [0, 0, 0, 1]];

    return outMat;
}

// create a new 3-component vector with values x,y,z
function Vector3(x, y, z) {
    let vec3 = new Vector(3);
    vec3.values = [x, y, z];
    return vec3;
}

// create a new 4-component vector with values x,y,z,w
function Vector4(x, y, z, w) {
    let vec4 = new Vector(4);
    vec4.values = [x, y, z, w];
    return vec4;

}
