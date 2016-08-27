'use strict';

/*
 * Config vars
 *
 * cellSize - size of each cell (width, height, depth for box,
 *                               radius for sphere)
 * cellPadding - space between cells
 * cellGeometry - A THREE.Geometry class describing the cell's shape
 * cellMaterial - A THREE.Material class describing the cell's appearance
 */
const settings = {

	cellSize: 1,
	cellPadding: 0.5,
	numRows: 15,
	numColumns: 15,
	numLayers: 15,
  startPercentage: 70,
	cellGeometry: THREE.BoxGeometry,
	cellMaterial: THREE.MeshNormalMaterial,

}

// Possible cell states
const state = {

	alive: 0,
	dead: 1,
	tbd: 2,

}

// Grid of cells
let cells;

// To control speed
let time;

// To toggle animation
let animationOn;

// THREE components
let camera;
let scene;
let renderer;

/*
 * Set up the scene,
 *) draw the cells,
 * start the animation
 */
(function init() {

  time = performance.now();
  animationOn = true;
	cells = [];

	const container = document.getElementById('drawingCanvas');
	const width = container.clientWidth;
	const height = container.clientHeight;

	camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
	camera.position.set(10, 15, 75);
	camera.lookAt(new THREE.Vector3(0, 0, 0));

	scene = new THREE.Scene();
	scene.add(camera);

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(width, height);
	renderer.setClearColor(new THREE.Color(0, 0.12, 0.2));

	container.appendChild(renderer.domElement);

	window.addEventListener('resize', () => {
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(container.clientWidth, container.clientHeight);
	});

  setUpControls();
	drawScene();
	animate();

})();

// This function makes it easy to add event listeners to elements
function eventAdder(elementId, event, func) {

  const element = document.getElementById(elementId);

  if (element != null) {

    element.addEventListener(event, func);

  }

}

function setUpControls() {

  const percentageTextField = document.getElementById('randomnessTextField')
  percentageTextField.value = settings.startPercentage + '%';

  const toggleAnimation = () => {

    animationOn = !animationOn;

  };

  const randomizeStates = () => {

    console.log(`Randomness percentage: ${settings.startPercentage}`);

    cells.forEach(column => {

      column.forEach(row => {

        row.forEach(cell => {

          if (Math.random() < (settings.startPercentage / 100)) {

            cell.currentState = state.alive;
            cell.visible = true;

          } else {

            cell.currentState = state.dead;
            cell.visible = false;

          }

          cell.nextState = state.tbd;

        });

      });

    });

  };

  const updateStartPercentage = diff => {

    settings.startPercentage += diff;
    settings.startPercentage = Math.min(settings.startPercentage, 90);
    settings.startPercentage = Math.max(settings.startPercentage, 10);

    const textField = document.getElementById('randomnessTextField');
    textField.value = settings.startPercentage + '%';

  };

  const increaseStartPercentage = () => {

    updateStartPercentage(10);

  }

  const decreaseStartPercentage = () => {

    updateStartPercentage(-10);

  }


  eventAdder('animationButton', 'click', toggleAnimation);
  eventAdder('randomizeButton', 'click', randomizeStates);
  eventAdder('increaseRandomness', 'click', increaseStartPercentage);
  eventAdder('decreaseRandomness', 'click', decreaseStartPercentage);

}

/*
 * Draw the cells in the scene
 */
function drawScene() {

	const spacing = settings.cellSize + settings.cellPadding;

	const createCell = () => {

		const {cellSize: size} = settings;
		const geometry = new settings.cellGeometry(size, size, size);
		const material = new settings.cellMaterial();

		return new THREE.Mesh(geometry, material);

	}

	for (let xIndex = 0; xIndex < settings.numColumns; xIndex++) {

		cells.push([]);

		for (let yIndex = 0; yIndex < settings.numRows; yIndex++) {

			cells[xIndex].push([]);

			for (let zIndex = 0; zIndex < settings.numLayers; zIndex++) {

				const cell = createCell();
				cells[xIndex][yIndex].push(cell);
				scene.add(cell);

				cell.position.set(xIndex * spacing, yIndex * spacing, zIndex * spacing);
				cell.nextState = state.tbd;

        if (Math.random() <= (settings.startPercentage / 100)) {

          cell.currentState = state.alive;

        } else {

          cell.currentState = state.dead;

        }

        if (cell.currentState == state.dead) {

          cell.visible = false;

        }

			}

		}

	}

}

/*
 * Determine and set the nextState for each cell.
 * Does NOT change the cell's currentState.
 */
function determineNextState() {

	for (let column = 0; column < cells.length; column++) {

		for (let row = 0; row < cells[column].length; row++) {

			for (let layer = 0; layer < cells[column][row].length; layer++) {

				const cell = cells[column][row][layer];

				let nextState = state.tbd;
				let aliveNeighbors = countAliveNeighbors(column, row, layer);


        /*
         * If a cell is dead, it becomes alive if it has
         * between XXX and XXX neighbors, otherwise it stays dead.
         *
         * If a cell is alive, it stays alive if it has
         * between XXX and XXX neighbors, otherwise it dies.
         */
        if (cell.currentState == state.dead) {

          if (aliveNeighbors > 7 && aliveNeighbors < 12) {

            cell.nextState = state.alive;

          } else {

            cell.nextState == state.dead;

          }

        } else {

          if (aliveNeighbors > 13 || aliveNeighbors < 6) {

            cell.nextState = state.dead;

          } else {

            cell.nextState = state.alive;

          }

        }

			}

		}

	}

}

/*
 * Returns the number of alive cells neighboring the cell
 * at the given column, row, and layer.
 */
function countAliveNeighbors(column, row, layer) {

  // Directions
	const dirs = [0, 1, -1];
	let count = 0;

	for (let x = 0; x < dirs.length; x++) {

    for (let y = 0; y < dirs.length; y++) {

      for (let z = 0; z < dirs.length; z++) {

        // Don't count the cell itself
        if (x == 0 && y == 0 && z == 0) {

        	continue;

        }

        // Current neighbor coordinates
        const nColumn = column + dirs[x];
        const nRow = row + dirs[y];
        const nLayer = layer + dirs[z];

        // Make sure index is within array bounds.
        if (nColumn < 0 || nColumn >= cells.length ||
            nRow < 0 || nRow >= cells[nColumn].length ||
            nLayer < 0 || nLayer >= cells[nColumn][nRow].length) {

          continue;

        }

        const neighbor = cells[nColumn][nRow][nLayer];

        if (neighbor.currentState == state.alive) {

          count++;

        }

			}

		}

	}

	return count;

}

function goToNextState() {

	cells.forEach(column => {

		column.forEach(row => {

			row.forEach(cell => {

        cell.currentState = cell.nextState;
        cell.nextState = state.tbd;

        if (cell.currentState == state.alive) {

          cell.visible = true;

        } else {

          cell.visible = false;

        }

      });

    });

  });

}


function animate() {

	requestAnimationFrame(animate);

  if (animationOn) {

    determineNextState();
    goToNextState();

  }

	renderer.render(scene, camera);

}

