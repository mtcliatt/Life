'use strict';

const settings = {
	cellSize: 1,
	cellPadding: 1,
	numRows: 15,
	numColumns: 15,
	numLayers: 15,
	cellGeometry: THREE.BoxGeometry,
	cellMaterial: THREE.MeshNormalMaterial,
}

const state = {
	alive: 0,
	dead: 1,
	tbd: 2,
}

let cells;

let camera;
let scene;
let renderer;

(function init() {
	const container = document.getElementById('drawingCanvas');
	const width = container.clientWidth;
	const height = container.clientHeight;

	camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
	camera.position.set(10, 10, 50);
	camera.lookAt(new THREE.Vector3(0, 0, 0));

	scene = new THREE.Scene();
	scene.add(camera);

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(width, height);
	renderer.setClearColor(new THREE.Color(0, 0.12, 0.2));

	window.addEventListener('resize', () => {
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(container.clientWidth, container.clientHeight);
	});

	container.appendChild(renderer.domElement);

	drawScene();

	animate();
})();

function drawScene() {

	const createCell = () => {

		const {cellSize: size} = settings;

		const geometry = new settings.cellGeometry(size, size, size);
		const material = new settings.cellMaterial();

		return new THREE.Mesh(geometry, material);

	}

	cells = [];

	const spacing = settings.cellSize + settings.cellPadding;

	for (let xIndex = 0; xIndex < settings.numColumns; xIndex++) {

		cells.push([]);

		for (let yIndex = 0; yIndex < settings.numRows; yIndex++) {

			cells[xIndex].push([]);

			for (let zIndex = 0; zIndex < settings.numLayers; zIndex++) {

				const cell = createCell();
				cells[xIndex][yIndex].push(cell);
				scene.add(cell);

				cell.position.set(xIndex * spacing, yIndex * spacing, zIndex * spacing);

				cell.currentState = state.alive;
				cell.nextState = state.tbd;
			}

		}

	}

}

function animate() {
	requestAnimationFrame(animate);

	cells.forEach(column => {
		column.forEach(row => {
			row.forEach(cell => {

				cell.nextState = Math.floor(Math.random() * 3);

				if (cell.nextState == state.dead) {

					cell.visible = false;
					cell.currentState = state.dead;

				} else {

					cell.visible = true;
					cell.currentState = state.alive;

				}

				cell.nextState = state.tbd;

			})
		})
	});

	renderer.render(scene, camera);
}
