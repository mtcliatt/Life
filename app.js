'use strict';



/*
 * @author Matthew Cliatt
 *
 * TODO:
 * - Different geometries & materials
 * - Auto-rotate
 * - Triple equals
 * - consolidate stats
 * - show cam position in status
 * - GitHub readme with gif and wiki quotes
 */
const settings = {

	// Size of each individual cell
	cellSize: 1,

	// Amount of space between each cell
	cellPadding: 0.5,

	// Number of cells along each row/column/layer
	worldSize: 20,

	// Percentage of cells alive when the world is created/reset
  startPercentage: 30,

  // Shape and look of the individual cells
	cellGeometry: THREE.BoxGeometry,
	cellMaterial: THREE.MeshNormalMaterial,

	// True if the cells on one side of the world should count
	// the cells on the opposite side as neighbors
  wrapAround: true,

  // Rules for 'The Game of Life', modified for 3D.
  rules: {

  	// Alive cells 'die' with too many neighbors
    overcrowding: 12,

    // Alive cells 'die' with too few neighbors
    starvation: 6,

    // Dead cells come alive with the right number of neighbors
    birthMin: 6,
    birthMax: 12,

  },

}

// Possible cell states; provides readability over just 0 or 1
const states = {

	alive: 0,
	dead: 1,

}

let cells;
let aliveCells;
let totalCells;

let iterations;
let animationOn;
let isStalled;

// THREE components
let camera;
let scene;
let renderer;
let controls;

/*
 * Set up the scene,
 *) draw the cells,
 * start the animation
 */
(function init() {

  iterations = 0;

  isStalled = false;
  animationOn = true;

	cells = [];
  aliveCells = 0;
  totalCells = Math.pow(settings.worldSize, 3);

	const container = document.getElementById('drawingCanvas');
	const width = container.clientWidth;
	const height = container.clientHeight;

	camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);

	scene = new THREE.Scene();
	scene.add(camera);

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(width, height);
	renderer.setClearColor(new THREE.Color(0, 0.12, 0.2));
	container.appendChild(renderer.domElement);

	controls = new THREE.OrbitControls( camera, renderer.domElement );

	window.addEventListener('resize', () => {
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(container.clientWidth, container.clientHeight);
	});

  setUpControls();
	drawScene();
	animate();

})();

function setUpControls() {

  const percentageTextField = document.getElementById('randomnessTextField');
  percentageTextField.innerHTML = settings.startPercentage + '%';

  const overcrowdingTextField = document.getElementById('overcrowdingTextField');
  overcrowdingTextField.innerHTML = settings.rules.overcrowding;

  const starvationTextField = document.getElementById('starvationTextField');
  starvationTextField.innerHTML = settings.rules.starvation;

  const birthMinTextField = document.getElementById('birthMinTextField');
  birthMinTextField.innerHTML = settings.rules.birthMin;

  const birthMaxTextField = document.getElementById('birthMaxTextField');
  birthMaxTextField.innerHTML = settings.rules.birthMax;

  const orientCamera = (position, lookAt) => {

  	return (() => {
  		console.log('reset called');
  		camera.position.copy(position);
  		camera.lookAt(lookAt);
  	});

  }

	const {worldSize, cellSize, cellPadding} = settings;
	const midpoint = (worldSize * (cellSize + cellPadding) - cellPadding) / 2;
	const midpointVector = new THREE.Vector3(midpoint, midpoint, midpoint);
	const cameraPosition = new THREE.Vector3(midpoint, midpoint * 2, midpoint * 6);

  const resetCameraPosition = orientCamera(cameraPosition, midpointVector);
  resetCameraPosition();

  controls.target.copy(midpointVector);

  const toggleAnimation = () => {

    animationOn = !animationOn;
    const textField = document.getElementById('animationStatus');
    textField.innerHTML = animationOn ? 'ON' : 'OFF';

  };

  const toggleWrapAround = () => {

    settings.wrapAround = !settings.wrapAround;
    const textField = document.getElementById('wrapAroundStatus');
    textField.innerHTML = settings.wrapAround ? 'ON' : 'OFF';

  }

  const updateStartPercentage = diff => {

    settings.startPercentage += diff;
    settings.startPercentage = Math.min(settings.startPercentage, 90);
    settings.startPercentage = Math.max(settings.startPercentage, 10);

    const textField = document.getElementById('randomnessTextField');
    textField.innerHTML = settings.startPercentage + '%';

  };

  const updateRule = (rule, diff) => {

    settings.rules[rule] += diff;
    settings.rules[rule] = Math.min(settings.rules[rule], 27);
    settings.rules[rule] = Math.max(settings.rules[rule], 0);

    const textField = document.getElementById(rule + 'TextField');
    textField.innerHTML = settings.rules[rule];

  }

  const increaseStartPercentage = () => { updateStartPercentage(10); }
  const decreaseStartPercentage = () => { updateStartPercentage(-10); }

  const increaseOvercrowding = () => { updateRule('overcrowding', 1); }
  const decreaseOvercrowding = () => { updateRule('overcrowding', -1); }
  const increaseStarvation = () => { updateRule('starvation', 1); }
  const decreaseStarvation = () => { updateRule('starvation', -1); }
  const increaseBirthMin = () => { updateRule('birthMin', 1); }
  const decreaseBirthMin = () => { updateRule('birthMin', -1); }
  const increaseBirthMax = () => { updateRule('birthMax', 1); }
  const decreaseBirthMax = () => { updateRule('birthMax', -1); }

	 // This function makes it easy to add event listeners to elements
	const eventAdder = (elementId, event, func) => {

	  const element = document.getElementById(elementId);

	  if (element != null) {

	  	element.addEventListener(event, func);

	  }

	}

  eventAdder('animationButton', 'click', toggleAnimation);
  eventAdder('wrapAroundButton', 'click', toggleWrapAround);

  eventAdder('randomizeButton', 'click', randomizeStates);
  eventAdder('resetCameraButton', 'click', resetCameraPosition);

  eventAdder('increaseRandomness', 'click', increaseStartPercentage);
  eventAdder('decreaseRandomness', 'click', decreaseStartPercentage);
  eventAdder('increaseOvercrowding', 'click', increaseOvercrowding);
  eventAdder('decreaseOvercrowding', 'click', decreaseOvercrowding);
  eventAdder('increaseStarvation', 'click', increaseStarvation);
  eventAdder('decreaseStarvation', 'click', decreaseStarvation);
  eventAdder('increaseBirthMin', 'click', increaseBirthMin);
  eventAdder('decreaseBirthMin', 'click', decreaseBirthMin);
  eventAdder('increaseBirthMax', 'click', increaseBirthMax);
  eventAdder('decreaseBirthMax', 'click', decreaseBirthMax);

}

function updateStatus() {

  const animationTextField = document.getElementById('animationStatus');
  animationTextField.innerHTML = animationOn ? 'ON' : 'OFF';

  const iterationsTextField = document.getElementById('iterationsStatus');
  iterationsTextField.innerHTML = iterations;

  const cellsTextField = document.getElementById('cellsStatus');
  cellsTextField.innerHTML = Math.round(100 * aliveCells / totalCells) + '%';

  const stalledStatus = document.getElementById('stalledStatus');
  stalledStatus.innerHTML = isStalled ? 'Yes' : 'No';

}

// TODO: Collect stats in one single object
// TODO: make this function
function resetStats() {

}

function randomizeStates() {

	resetStats();

  cells.forEach(column => {

    column.forEach(row => {

      row.forEach(cell => {

        if (Math.random() < (settings.startPercentage / 100)) {

          cell.currentState = states.alive;
          cell.visible = true;

        } else {

          cell.currentState = states.dead;
          cell.visible = false;

        }

        // This should always get reset to a certain value before being used.
        // If this is still null when used later, something went wrong.
        cell.nextState = null;

      });

    });

  });

};

/*
 * TODO: Implement different geometries
 */
function drawScene() {

	// Grab the cellSize and cellPadding from settings, and store them shorthand
	const {cellSize: size, cellPadding: padding} = settings;

	const createCell = () => {

		const geometry = new settings.cellGeometry(size, size, size);
		const material = new settings.cellMaterial();

		return new THREE.Mesh(geometry, material);

	}

	const getOffset = (index) => index * (size + padding);

	for (let xIndex = 0; xIndex < settings.worldSize; xIndex++) {

		cells.push([]);

		for (let yIndex = 0; yIndex < settings.worldSize; yIndex++) {

			cells[xIndex].push([]);

			for (let zIndex = 0; zIndex < settings.worldSize; zIndex++) {

				const cell = createCell();
				cell.position.set(getOffset(xIndex), getOffset(yIndex), getOffset(zIndex));

				cells[xIndex][yIndex].push(cell);
				scene.add(cell)

				randomizeStates();

			}

		}

	}

}

/*
 * Determine and set the nextState for each cell.
 * Does NOT change the cell's currentState.
 */
function determineNextState() {

  let stateChanged = false;

	for (let column = 0; column < cells.length; column++) {

		for (let row = 0; row < cells[column].length; row++) {

			for (let layer = 0; layer < cells[column][row].length; layer++) {

				const cell = cells[column][row][layer];

				let nextState = null;
				let aliveNeighbors = countAliveNeighbors(column, row, layer);

        /*
         * If a cell is dead, it becomes alive if it has
         * between settings.rules.birthMin and settings.rules.birthMax
         * neighbors, otherwise it stays dead.
         *
         * If a cell is alive, it stays alive if it has
         * between settings.rules.starvation and settings.rules.overcrowding
         * neighbors, otherwise it dies.
         */
        if (cell.currentState == states.dead) {

          const aboveMin = aliveNeighbors > settings.rules.birthMin;
          const belowMax = aliveNeighbors < settings.rules.birthMax;

          if (aboveMin && belowMax) {

            cell.nextState = states.alive;

          } else {

            cell.nextState = states.dead;

          }

        } else {

          const starved = aliveNeighbors < settings.rules.starvation;
          const crowded = aliveNeighbors > settings.rules.overcrowding;

          if (starved || crowded) {

            cell.nextState = states.dead;

          } else {

            cell.nextState = states.alive;

          }

        }

        if (!stateChanged && cell.nextState != cell.currentState) {

          stateChanged = true;

        }

			}

		}

	}

  isStalled = !stateChanged;

}

function goToNextState() {

  aliveCells = 0;

	cells.forEach(column => {

		column.forEach(row => {

			row.forEach(cell => {

        cell.currentState = cell.nextState;
        cell.nextState = null;

        if (cell.currentState == states.alive) {

          cell.visible = true;
          aliveCells++;

        } else {

          cell.visible = false;

        }

        //cell.rotateOnAxis(new THREE.Vector3(0.57735, 0.57735, 0.57735), 0.1);

      });

    });

  });

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
        if (x == 0 && y == 0 && z == 0) { continue; }

        // Current neighbor coordinates
        let nColumn = column + dirs[x];
        let nRow = row + dirs[y];
        let nLayer = layer + dirs[z];

        if (settings.wrapAround) {

          if (nColumn < 0) { nColumn = cells.length - 1; }
          if (nColumn >= cells.length) { nColumn = 0; }

          if (nRow < 0) { nRow = cells[nColumn].length - 1; }
          if (nRow >= cells[nColumn].length) { nRow = 0; }

          if (nLayer < 0) { nLayer = cells[nColumn][nRow].length - 1; }
          if (nLayer >= cells[nColumn][nRow].length) { nLayer = 0; }

        } else {

          // Make sure index is within array bounds.
          if (nColumn < 0 || nColumn >= cells.length ||
              nRow < 0 || nRow >= cells[nColumn].length ||
              nLayer < 0 || nLayer >= cells[nColumn][nRow].length) {

            continue;

          }

        }

        const neighbor = cells[nColumn][nRow][nLayer];

        if (neighbor.currentState == states.alive) { count++; }

			}

		}

	}

	return count;

}

function animate() {

	requestAnimationFrame(animate);

  if (animationOn) {

    iterations++;

    determineNextState();
    goToNextState();

    if (isStalled) {

    	animationOn = false;

    }

  }

  controls.update();
  updateStatus();

	renderer.render(scene, camera);

}

