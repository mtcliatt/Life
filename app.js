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

function determineNextState() {

	for (let column = 0; column < cells.length; column++) {

		for (let row = 0; row < cells[column].length; row++) {

			for (let layer = 0; layer < cells[column][row].length; layer++) {

				const cell = cells[column][row][layer];
				const {currentState} = cell;

				let nextState = state.tbd;
				let aliveNeighbors = countAliveNeighbors(column, row, layer);

			}

		}

	}



}

function countAliveNeighbors(column, row, layer) {

	let count = 0;
	const directions = [-1, 0, 1];

	for (let xDirection = 0; xDirection < directions.length; xDirection++) {

    for (let yDirection = 0; yDirection < directions.length; yDirection++) {

      for (let zDirection = 0; zDirection < directions.length; zDirection++) {

        if (xDirection == 0 && yDirection == 0 && zDirection == 0) {

        	continue;

        }

        const neighborsRow = row + directions[xDirection];
        const neighborsColumn = column + directions[yDirection];
        const neighborsLayer = layer + directions[zDirection];

        const isRowValid = neighborsRow > 0 && neighborsRow < cells.length;
        const isColumnValid = neighborsColumn > 0 && neighborsColumn < cells[0].length;
        const isLayerValid = neighborsLayer > 0 && neighborsLayer < cells[0][0].length;

        if (isRowValid && isColumnValid && isLayerValid) {

        	const neighbor = cells[neighborsColumn][neighborsRow][neighborsLayer];

        	if (neighbor.currentState == state.alive) {

        		count++;

					}

				}

			}

		}

	}

	return count;

}

function animate() {

	requestAnimationFrame(animate);

	determineNextState();

/*
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
*/
	renderer.render(scene, camera);

}