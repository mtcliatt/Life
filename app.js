'use strict';

const THREE = require('./three.min.js');
let camera;
let scene;
let renderer;

// Create and set up the camera, scene, and renderer
init();

// Continuously renders scene
animate();

function init() {
	const container = document.getElementById('drawingCanvas');
	const width = container.clientWidth;
	const height = container.clientHeight;

	camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
	scene = new THREE.Scene();
	renderer = new THREE.WebGLRenderer({ antialias: true });

	renderer.setSize(width, height);
	renderer.setClearColor(new THREE.Color(0, 0.12, 0.2));

	scene.add(camera);

	window.addEventListener('resize', () => {
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(container.clientWidth, container.clientHeight);
	});

	container.appendChild(renderer.domElement);
}

function animate() {
	requestAnimationFrame(animate);

	renderer.render(scene, camera);
}
