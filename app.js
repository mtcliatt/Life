'use strict';

/*
 * @author Matthew Cliatt
 *
 * TODO:
 * - Different geometries & materials
 * - Auto-rotate
 * - Add speed
 * - Triple equals
 * - consolidate stats
 * - show cam position in status
 * - GitHub readme with gif and wiki quotes
 */
const settings = {

	// Size of each individual cell
	cellSize: 1,

	// Amount of space between each cell
	cellPadding: 1,

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

  // True if world is iterating through cycles
  animationOn: true,

  // True if the collection of cells should rotate around their midpoint
  rotationOn: true,

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
let world;

let iterations;
let isStalled;

// THREE components
let camera;
let scene;
let renderer;
let controls;

/*
 * Set up the scene,
 * draw the cells,
 * start the animation
 */
(function init() {

  settings.animationOn = true;
  settings.rotationOn = true;

  iterations = 0;
  aliveCells = 0;
  isStalled = false;

  //resetStats();

	cells = [];
  aliveCells = 0;
  totalCells = Math.pow(settings.worldSize, 3);

  world = new THREE.Object3D();

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

	window.addEventListener('resize', () => {

		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(container.clientWidth, container.clientHeight);

	});

	const {worldSize, cellSize, cellPadding} = settings;
	const midpoint = (worldSize * (cellSize + cellPadding) - cellPadding) / 2;
	const midpointVector = new THREE.Vector3(midpoint, midpoint, midpoint);
	const cameraPosition = new THREE.Vector3(midpoint, midpoint * 3, midpoint * 6);

  camera.reset = () => {

    camera.position.copy(cameraPosition);
    camera.lookAt(midpointVector);

  }

  camera.reset();

	controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.copy(midpointVector);

  setUpGUIControls();
	createWorld();
	animate();

})();

function setUpGUIControls() {

  const percentageTextField = document.getElementById('startPercentageTextField');
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

    settings.animationOn = !settings.animationOn;
    const textField = document.getElementById('animationStatus');
    textField.innerHTML = settings.animationOn ? 'ON' : 'OFF';

  };

  const toggleWrapAround = () => {

    settings.wrapAround = !settings.wrapAround;
    const textField = document.getElementById('wrapAroundStatus');
    textField.innerHTML = settings.wrapAround ? 'ON' : 'OFF';

  }

  // bounder returns a function which accepts a single value and returns:
  // value if min < value < max; max if value < max; min if value < min
  const bounder = (min, max) => {

    return value => Math.max(min, Math.min(value, max));

  }

  // updater returns a function which only needs the name of a variable,
  // and the amount to change it by. With currying, the parent of the variable,
  // the acceptable range for the value, and the suffix to add to the text
  // field is adjustable.
  const updater = (parent, lowerBound, upperBound, suffix) => {

    return (setting, diff) => {

      console.log('here!');

      parent[setting] = bounder(lowerBound, upperBound)(parent[setting] + diff);

      const textField = document.getElementById(setting + 'TextField');
      textField.innerHTML = parent[setting] + '' + suffix;

    };

  };

  const settingUpdater = updater(settings, 0, 100, '%');
  const increaseSetting = setting => settingUpdater(setting, 10);
  const decreaseSetting = setting => settingUpdater(setting, -10);

  const ruleUpdater = updater(settings.rules, 0, 27, '');
  const increaseRule = rule => ruleUpdater(rule, 1);
  const decreaseRule = rule => ruleUpdater(rule, -1);


	// This function makes it easy to add event
  // listeners (in this case, click events) to elements
	const addOnClick = (elementId, func) => {

	  const element = document.getElementById(elementId);

	  if (element !== null) {

	  	element.addEventListener('click', func);

	  }

	}

  addOnClick('animationButton', toggleAnimation);
  addOnClick('wrapAroundButton', toggleWrapAround);
  addOnClick('randomizeButton', randomizeStates);
  addOnClick('resetCameraButton', camera.reset);

  addOnClick('increaseStartPercentage', () => increaseSetting('startPercentage'));
  addOnClick('decreaseStartPercentage', () => decreaseSetting('startPercentage'));
  addOnClick('increaseOvercrowding', () => increaseRule('overcrowding'));
  addOnClick('decreaseOvercrowding', () => decreaseRule('overcrowding'));
  addOnClick('increaseStarvation', () => increaseRule('starvation'));
  addOnClick('decreaseStarvation', () => decreaseRule('starvation'));
  addOnClick('increaseBirthMin', () => increaseRule('birthMin'));
  addOnClick('decreaseBirthMin', () => decreaseRule('birthMin'));
  addOnClick('increaseBirthMax', () => increaseRule('birthMax'));
  addOnClick('decreaseBirthMax', () => decreaseRule('birthMax'));

}

function updateStatus() {

  const animationTextField = document.getElementById('animationStatus');
  animationTextField.innerHTML = settings.animationOn ? 'ON' : 'OFF';

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
function createWorld() {

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

  if (settings.animationOn) {

    iterations++;

    determineNextState();
    goToNextState();

  }

  controls.update();
  updateStatus();

	renderer.render(scene, camera);

}

