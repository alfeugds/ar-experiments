/*
*       AR Experiments using generic sensors
*/

'use strict';

/* 

--------DISCLAIMER------------

The below code is not using best practices, there is a lot of trial and error, commented codes,
copy-pasted codes, and it is very unstable. 
It is basically a playground that merges several ideas on how to deal with Three.js, 3D models, and the generic sensors APIs.
Don't take 
*/

// Camera constants
const farPlane = 550, fov = 75;

// Required for a three.js scene
var camera, scene, renderer, oriSensor,

    cube,
    videoTexture, movieMaterial,
    mesh,
    material, texture,
    acl,

    controls,
    mixer,
    dogAnimationsMixer,
    beeModel,

    canvas, canvas_context, video, video_canvas;

video = document.getElementById('video');
canvas = document.getElementById('video_canvas');

window.onerror = function(msg, url, linenumber) {
    console.log('Error message: '+msg+'\nURL: '+url+'\nLine Number: '+linenumber);
    return true;
}

initWebcam();

function initWebcam() {
    console.log('starting camera..')
    video = document.getElementById('video');
    canvas = document.getElementById('video_canvas');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then(function (stream) {
            video.srcObject = stream;;
            video.play();
        })
        .catch(function (err) {
            console.log("An error occured! " + err);
        });

    video.onplaying = () => {
        // video.width = video.videoWidth;
        // video.height = video.videoHeight
        console.log('camera started')
        init()
    }

}

// Service worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        // navigator.serviceWorker.register('sw.js').then(function(registration) {
        // }, function(err) {
        // console.log('ServiceWorker registration failed: ', err);
        // });
    });
}

let speed = {
    x:0,
    y:0,
    z:0,
    ax:0,
    ay:0,
    az:0,
    timestamp:0
}

let i = 0.5
function getDriftValue(x){
    if(x > -i && x < 0){
        return x /2
    }else if(x > 0 && x < i){
        return x /2
    }
    return x
}

var koptions = {R: 0.01, Q: 3}
var kfx = new KalmanFilter(koptions)
var kfy = new KalmanFilter(koptions)
var kfz = new KalmanFilter(koptions)

function setToInitialState() {
    var shaking = false;

    function onreading() {
       
        if(speed.timestamp === 0){
            speed.ax = kfx.filter(acl.x)
            speed.ay = kfx.filter(acl.y)
            speed.az = kfx.filter(acl.z)
            speed.timestamp = speed.timestamp || acl.timestamp
            return;
        }
        // mesh.position.z += -acl.x * m
        // mesh.position.y += -acl.y * m
        // mesh.position.x += -acl.z * m
        speed.timestamp = speed.timestamp || acl.timestamp

        let time = (acl.timestamp - speed.timestamp) * 0.001
        
        const limit = 0.10,
            factor = 0.08
            
        var x = kfx.filter(acl.x),
            y = kfy.filter(acl.y),
            z = kfz.filter(acl.z)

        if ((x >= limit && x <= -limit) ||
        (y => limit && y <= -limit) ||
        (z => limit && z <= -limit)) {

            //console.log(`x, y, z`, x, y, z)
            speed.x = speed.x + (x + speed.ax) / 2 * time
            speed.y = speed.y  + (y + speed.ay) / 2 * time
            speed.z = speed.z + (z + speed.az) / 2 * time

            // speed.x = speed.x + acl.x * time
            // speed.y = speed.y + acl.y * time
            // speed.z = speed.z + acl.z * time

            // speed.x *= factor
            // speed.y *= factor
            // speed.z *= factor

            // speed.x = getDriftValue(speed.x)
            // speed.y = getDriftValue(speed.y)
            // speed.z = getDriftValue(speed.z)
            
            //camera.translateX(speed.x)
            //camera.translateY(speed.y)
            //camera.translateZ(speed.z)
            //console.log(`acl.x, acl.y, acl.z`, acl.x, acl.y, acl.z, acl)
        }
        
        speed.timestamp = acl.timestamp
        speed.ax = x
        speed.ay = y
        speed.az = z
        
    }

    acl.addEventListener('reading', onreading);
}

// This function sets up the three.js scene, initializes the orientation sensor and 
// adds the canvas to the DOM
function init() {

    const container = document.querySelector('#app-view');

    // three.js scene setup below
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, farPlane);
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.gammaOutput = true;
    //renderer.gammaFactor = 2;
    renderer.shadowMap.enabled = true;


    var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 1 );
    hemiLight.color.setHSL( 0.6, 1, 0.6 );
    hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    hemiLight.position.set( -50, 50, -50 );
    scene.add( hemiLight );

    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    material = new THREE.MeshBasicMaterial({ map: texture });

    //var geometry = new THREE.PlaneBufferGeometry( 9, 16 );
    var aspect = video.videoWidth / video.videoHeight
    var width = 660
    var geometry = new THREE.PlaneGeometry( width , width / aspect  );

    geometry.scale(0.5, 0.5, 0.5);

    mesh = new THREE.Mesh(geometry, material);

    mesh.position.x = -0; //y - canvas.height / 2;
    mesh.position.z = -300; //y - canvas.height / 2;
    scene.add(camera)
    camera.add(mesh)

    var loader = new THREE.GLTFLoader();

    addLoadingMessage()

    //Load a glTF resource
    loader.load(
        // resource URL
        'models/bee/Bee.glb',
        // called when the resource is loaded
        function ( gltf ) {
            hideLoading()
            beeModel = gltf.scene;
            scene.add( gltf.scene );
            gltf.scene.position.y = -25;
            gltf.scene.position.x = 0;
            gltf.scene.position.z = -170;

            gltf.scene.rotation.y -= 0.9;

            mixer = new THREE.AnimationMixer( gltf.scene );
            gltf.animations.forEach(( clip ) => {
                mixer.clipAction(clip).play();
            });
            t0 = Date.now();

            //gltf.animations // Array<THREE.AnimationClip>
            // gltf.scene; // THREE.Scene
            // gltf.scenes; // Array<THREE.Scene>
            // gltf.cameras; // Array<THREE.Camera>
            // gltf.asset; // Object
        },
        // called while loading is progressing
        function ( xhr ) {

            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            updateLoading( xhr.loaded / xhr.total * 100 )

        },
        // called when loading has errors
        function ( error ) {
            hideLoading()

            console.log( 'An error happened', error );

        }
    );

    // loader.load(
    //     // resource URL
    //     'models/coke/scene.glb',
    //     // called when the resource is loaded
    //     function ( gltf ) {
    //         hideLoading()
    //         var model = gltf.scene;
    //         scene.add(model);
    //         model.position.y = -35;
    //         model.position.x = -150;
    //         model.position.z = -100;
    //         model.visible = true

    //         model.traverse( function ( object ) {
    //             if ( object.isMesh ) object.castShadow = true;
    //         } );
    //     },
    //     // called while loading is progressing
    //     function ( xhr ) {
    //         console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    //     },
    //     function ( error ) {
    //         console.log( 'An error happened', error );
    //     }
    // );

    loader.load(
        // resource URL
        'models/drone.glb',
        // called when the resource is loaded
        function ( gltf ) {
            hideLoading()
            var model = gltf.scene;
            scene.add(model);
            model.position.y = -15;
            model.position.x = 0;
            model.position.z = -20;

            drone = model
            
            dogAnimationsMixer = new THREE.AnimationMixer( gltf.scene );
            gltf.animations.forEach(( clip ) => {
                dogAnimationsMixer.clipAction(clip).play();
            });

            model.traverse( function ( object ) {
                if ( object.isMesh ) object.castShadow = true;
            } );
        },
        // called while loading is progressing
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        function ( error ) {
            console.log( 'An error happened', error );
        }
    );

    //TEST CUBE
    cube = new THREE.Mesh(new THREE.CubeGeometry(10, 10, 10), new THREE.MeshNormalMaterial());
    cube.position.y = -35;
    cube.position.x = 0;
    cube.position.z = -100;
    scene.add(cube);
    
    controls = new DeviceOrientationController( camera, renderer.domElement );
    controls.connect();
    controls.enableManualDrag = false

    container.appendChild(renderer.domElement);

    // Sensor initialization
    //oriSensor.start();


    // On window resize, also resize canvas so it fills the screen
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    render();
}

var drone;

var t0, t1;
function getDelta(){
    return Math.floor((Date.now() - t0) / 1000)
}

var l;

function addLoadingMessage(){
    l = document.createElement('p')
    l.classList.add('loading')
    l.textContent = "Loading..."
    document.body.appendChild(l)
}

function updateLoading(percentage){
    l.classList.remove('hide')
    //l.textContent = `Loading ${percentage}%`
    l.textContent = `Loading...`
}

function hideLoading(){
    l.classList.add('hide')
}

// Renders the scene, orienting the camera according to the longitude and latitude
function render() {
    cube.rotation.x += 0.02;
    cube.rotation.y += 0.0225;
    cube.rotation.z += 0.0175;

    if(beeModel){
        //model.position.y += 0.02
        beeModel.rotation.y += 0.005
        //model.position.z += 0.08
        beeModel.translateZ(0.5)
    }

    if(drone){
        //drone.rotation.y -= 0.008
        //model.position.z += 0.08
        //drone.translateZ(0.1)
        drone.translateX(0.1)
        drone.lookAt(camera.position)
    }

    controls.update();

    //mixer && mixer.update(getDelta())
    mixer && mixer.update(0.03)
    dogAnimationsMixer && dogAnimationsMixer.update(0.03)

    texture.needsUpdate = true;

    renderer.render(scene, camera);

    requestAnimationFrame(render)
}

THREE.Utils = {
    cameraLookDir: function(camera) {
        var vector = new THREE.Vector3(0, 0, 0);
        //vector.applyEuler(camera.rotation, camera.rotation.order);
        vector.applyQuaternion( camera.quaternion );
        return vector;
    }
};


//Stats
(function () {
    try {
        var stats = new Stats();
        document.body.appendChild(stats.dom);
        console.log('stats done')
        requestAnimationFrame(function loop() {
            stats.update();
            requestAnimationFrame(loop)
        });
    } catch (e) {
        console.log('stat error', e)
    }
})()