/*
*       AR Experiments using generic sensors
*/

'use strict';

/* 

--------DISCLAIMER------------

The below code is not using best practices, there is a lot of trial and error, commented codes,
copy-pasted codes, and it is very unstable. 
It is basically a playground that merges several ideas on how to deal with Three.js, 3D models, and the generic sensors APIs.
Don't take anything here too seriously
*/

// Camera constants
const farPlane = 2000, fov = 75;

// Required for a three.js scene
var camera, scene, renderer,

    cube,
    videoTexture, movieMaterial,
    mesh,
    material, texture,

    controls,
    canvas, canvas_context, video, video_canvas;

video = document.getElementById('video');
canvas = document.getElementById('video_canvas');

initWebcam();

function initWebcam() {
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
        init()
    }
}

function init() {

    const container = document.querySelector('#app-view');

    // three.js scene setup below
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, farPlane);
    scene = new THREE.Scene();
    //scene.fog = new THREE.FogExp2(0x000000, 0.0008);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;

    //LIGHT
    var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(-50, 50, -50);
    scene.add(hemiLight);

    //CAMERA STREAM
    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    material = new THREE.MeshBasicMaterial({ map: texture });

    var aspect = video.videoWidth / video.videoHeight
    var width = window.innerWidth * 8
    var videoGeometry = new THREE.PlaneGeometry(width, width / aspect);
    videoGeometry.scale(0.5, 0.5, 0.5);

    mesh = new THREE.Mesh(videoGeometry, material);
    mesh.position.x = -0;
    mesh.position.z = -window.innerWidth * 3.5;

    scene.add(camera)
    camera.add(mesh)

    //TEST CUBE
    cube = new THREE.Mesh(new THREE.CubeGeometry(10, 10, 10), new THREE.MeshNormalMaterial());
    cube.position.y = -35;
    cube.position.x = -100;
    cube.position.z = 0;
    scene.add(cube);

    //PARTICLES
    initParticles()

    //MODELS
    initModels()

    //TEXT
    initText()

    //CAMERA CONTROLS
    controls = new DeviceOrientationController(camera, renderer.domElement);
    controls.connect();
    controls.enableManualDrag = false
    controls.enableManualZoom = false

    container.appendChild(renderer.domElement);


    // On window resize, also resize canvas so it fills the screen
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    render();
}


var materials = [], parameters

function initParticles() {
    var geometry = new THREE.BufferGeometry();
    var vertices = [];

    var textureLoader = new THREE.TextureLoader();

    var sprite1 = textureLoader.load('textures/sprites/snowflake1.png');
    var sprite2 = textureLoader.load('textures/sprites/snowflake2.png');
    var sprite3 = textureLoader.load('textures/sprites/snowflake3.png');
    var sprite4 = textureLoader.load('textures/sprites/snowflake4.png');
    var sprite5 = textureLoader.load('textures/sprites/snowflake5.png');

    for (var i = 0; i < 500; i++) {

        var x = Math.random() * 2000 - 1000;
        var y = Math.random() * 2000 - 1000;
        var z = Math.random() * 2000 - 1000;

        vertices.push(x, y, z);

    }

    geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    parameters = [
        [[1.0, -0.2, 0.5], sprite2, 20],
        [[0.95, -0.1, 0.5], sprite3, 15],
        [[0.90, -0.05, 0.5], sprite1, 10],
        [[0.85, 0, 0.5], sprite5, 8],
        [[0.80, 0, 0.5], sprite4, 5]
    ];

    for (var i = 0; i < parameters.length; i++) {

        var color = parameters[i][0];
        var sprite = parameters[i][1];
        var size = parameters[i][2];

        materials[i] = new THREE.PointsMaterial({ size: size, map: sprite, blending: THREE.AdditiveBlending, depthTest: false, transparent: true });
        materials[i].color.setHSL(color[0], color[1], color[2]);

        var particles = new THREE.Points(geometry, materials[i]);

        particles.rotation.x = Math.random() * 6;
        particles.rotation.y = Math.random() * 6;
        particles.rotation.z = Math.random() * 6;

        scene.add(particles);

    }
}

function renderParticles() {
    var time = Date.now() * 0.00005;

    for (var i = 0; i < scene.children.length; i++) {

        var object = scene.children[i];

        if (object instanceof THREE.Points) {
            object.rotation.y = time * (i < 4 ? i + 1 : - (i + 1));
        }
    }
}

var giftModel
function initModels() {
    var loader = new THREE.GLTFLoader();

    addLoadingMessage()

    //Load a glTF resource
    loader.load(
        'models/Presente.glb',
        function (gltf) {
            hideLoading()
            giftModel = gltf.scene;
            scene.add(gltf.scene);
            gltf.scene.position.y = -25;
            gltf.scene.position.x = 40;
            gltf.scene.position.z = 20;

            gltf.scene.scale.x = 10
            gltf.scene.scale.y = 10
            gltf.scene.scale.z = 10
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            updateLoading(xhr.loaded / xhr.total * 100)
        },
        // called when loading has errors
        function (error) {
            hideLoading()
            console.log('An error happened', error);
        }
    );
}

function renderModels() {
    if (giftModel) {
        //model.position.y += 0.02
        giftModel.rotation.y += 0.02
        //model.position.z += 0.08
        //giftModel.translateZ(0.5)
    }
}

function initText() {
    var loader = new THREE.FontLoader();
    loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
        var xMid, text;
        var color = 0xd43737;
        var matDark = new THREE.LineBasicMaterial({
            color: color,
            side: THREE.DoubleSide
        });

        var matLite = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });

        var message1 = "Look\nBehind you!";
        var shapes1 = font.generateShapes(message1, 100);

        var message = "Merry\nChristmas!";
        var shapes = font.generateShapes(message, 100);

        var geometry = new THREE.ShapeBufferGeometry(shapes1);
        geometry.computeBoundingBox();
        xMid = - 0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
        geometry.translate(xMid, 0, 0);

        // make shape ( N.B. edge view not visible )
        text = new THREE.Mesh(geometry, matLite);
        text.position.z = - 150;
        text.position.x = - 550;
        text.rotation.y += 0.8
        //text.lookAt(camera.position)

        scene.add(text);

        // make line shape ( N.B. edge view remains visible )
        var holeShapes = [];
        for (var i = 0; i < shapes.length; i++) {
            var shape = shapes[i];
            if (shape.holes && shape.holes.length > 0) {
                for (var j = 0; j < shape.holes.length; j++) {
                    var hole = shape.holes[j];
                    holeShapes.push(hole);
                }
            }
        }

        shapes.push.apply(shapes, holeShapes);

        var lineText = new THREE.Object3D();

        for (var i = 0; i < shapes.length; i++) {
            var shape = shapes[i];
            var points = shape.getPoints();
            var geometry = new THREE.BufferGeometry().setFromPoints(points);
            geometry.translate(xMid, 0, 0);
            var lineMesh = new THREE.Line(geometry, matDark);
            lineText.add(lineMesh);
        }

        lineText.position.z = 250;
        lineText.position.x = 450;
        //lineText.rotation.y += 0.8
        lineText.lookAt(camera.position)

        scene.add(lineText);

    }); //end load function
}

var l;

function addLoadingMessage() {
    l = document.createElement('p')
    l.classList.add('loading')
    l.textContent = "Loading..."
    document.body.appendChild(l)
}

function updateLoading(percentage) {
    l.classList.remove('hide')
    //l.textContent = `Loading ${percentage}%`
    l.textContent = `Loading...`
}

function hideLoading() {
    l.classList.add('hide')
}

function render() {
    cube.rotation.x += 0.02;
    cube.rotation.y += 0.0225;
    cube.rotation.z += 0.0175;

    renderParticles()
    renderModels()

    controls.update();
    texture.needsUpdate = true;
    renderer.render(scene, camera);
    requestAnimationFrame(render)
}

//Stats
(function () { var script = document.createElement('script'); script.onload = function () { var stats = new Stats(); document.body.appendChild(stats.dom); requestAnimationFrame(function loop() { stats.update(); requestAnimationFrame(loop) }); }; script.src = '//mrdoob.github.io/stats.js/build/stats.min.js'; document.head.appendChild(script); })()