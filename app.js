'use strict';

/*
 * @author Matthew Cliatt
 *
 *
 *
 */
const settings = {

	cellSize: 1,
	cellPadding: 0.5,
	numRows: 20,
	numColumns: 20,
	numLayers: 20,
  startPercentage: 30,
	cellGeometry: THREE.BoxGeometry,
	cellMaterial: THREE.MeshNormalMaterial,
  wrapAround: true,

  rules: {

    overcrowding: 12,
    starvation: 6,
    birthMin: 6,
    birthMax: 12,

  },

}

// Possible cell states
const state = {

	alive: 0,
	dead: 1,
	tbd: 2,

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
  totalCells = settings.numRows * settings.numColumns * settings.numLayers;

	const container = document.getElementById('drawingCanvas');
	const width = container.clientWidth;
	const height = container.clientHeight;

	camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
	camera.position.set(15, 35, 85);
	camera.lookAt(new THREE.Vector3(15, 5, 0));

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

  const randomizeStates = () => {

    iterations = 0;
    isStalled = false;
    aliveCells = 0;

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
    textField.innerHTML = settings.startPercentage + '%';

  };

  const increaseStartPercentage = () => { updateStartPercentage(10); }
  const decreaseStartPercentage = () => { updateStartPercentage(-10); }

  const updateRule = (rule, diff) => {

    settings.rules[rule] += diff;
    settings.rules[rule] = Math.min(settings.rules[rule], 27);
    settings.rules[rule] = Math.max(settings.rules[rule], 0);

    const textField = document.getElementById(rule + 'TextField');
    textField.innerHTML = settings.rules[rule];

  }

  const increaseOvercrowding = () => { updateRule('overcrowding', 1); }
  const decreaseOvercrowding = () => { updateRule('overcrowding', -1); }
  const increaseStarvation = () => { updateRule('starvation', 1); }
  const decreaseStarvation = () => { updateRule('starvation', -1); }
  const increaseBirthMin = () => { updateRule('birthMin', 1); }
  const decreaseBirthMin = () => { updateRule('birthMin', -1); }
  const increaseBirthMax = () => { updateRule('birthMax', 1); }
  const decreaseBirthMax = () => { updateRule('birthMax', -1); }

  const resetCameraPosition = () => {

    camera.position.set(15, 35, 85);
    camera.lookAt(new THREE.Vector3(15, 5, 0));

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

/*
 * Create the cells in the scene
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

  let stateChanged = false;

	for (let column = 0; column < cells.length; column++) {

		for (let row = 0; row < cells[column].length; row++) {

			for (let layer = 0; layer < cells[column][row].length; layer++) {

				const cell = cells[column][row][layer];

				let nextState = state.tbd;
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
        if (cell.currentState == state.dead) {

          const aboveMin = aliveNeighbors > settings.rules.birthMin;
          const belowMax = aliveNeighbors < settings.rules.birthMax;

          if (aboveMin && belowMax) {

            cell.nextState = state.alive;

          } else {

            cell.nextState = state.dead;

          }

        } else {

          const starved = aliveNeighbors < settings.rules.starvation;
          const crowded = aliveNeighbors > settings.rules.overcrowding;

          if (starved || crowded) {

            cell.nextState = state.dead;

          } else {

            cell.nextState = state.alive;

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
        cell.nextState = state.tbd;

        if (cell.currentState == state.alive) {

          cell.visible = true;
          aliveCells++;

        } else {

          cell.visible = false;

        }

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

        if (neighbor.currentState == state.alive) { count++; }

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

  updateStatus();

	renderer.render(scene, camera);

}

