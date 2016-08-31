'use strict';

/*
 * @author Matthew Cliatt
 *
 * TODO:
 * - Different materials
 * - Triple equals
 * - GitHub readme with gif and wiki quotes
 */
const settings = {

	// Size of each individual cell
	cellSize: 2,

	// Amount of space between each cell
	cellPadding: 1,

	// Number of cells along each row/column/layer
	worldSize: 20,

	// Percentage of cells alive when the world is created/reset
  startPercentage: 30,

  // Look of the individual cells
	cellMaterial: THREE.MeshNormalMaterial,

	// True if the cells on one side of the world should count
	// the cells on the opposite side as neighbors
  wrapAroundOn: true,

  // True if world is iterating through cycles
  animationOn: true,

  // True if the collection of cells should rotate around their midpoint
  rotationOn: true,

  // Controls the speed of rotation.
  rotationSpeed: 0.01,

  // Controls how many milliseconds are between each cycle.
  // Speed is a percentage value with range of 200ms( 0% ) to 1000ms( 100% ).
  speed: 30,

  // Rules for 'The Game of Life', modified for 3D.
  rules: {

	  // Alive cells 'die' with too many neighbors.
	  overcrowding: 12,

	  // Alive cells 'die' with too few neighbors.
	  starvation: 6,

	  // Dead cells come alive with the right number of neighbors.
	  birthMin: 6,
	  birthMax: 12,
  },

};

const stats = {

  aliveCells: 0,
  totalCells: 0,

  // Holds the time when the world last updated to a new cycle.
  lastCycleTime: 0,

  // Iterations refers to the number of cycles since the game began.
  iterations: 0,

  // isStalled is set to true if the game reaches a state it can not leave;
  // i.e. a state that produces itself.
  isStalled: false,

};

// Possible cell states; provides readability over just 0 or 1
const states = {

	alive: 0,
	dead: 1,

};

// THREE components
let camera;
let scene;
let renderer;
let controls;

// All individual cells
let cellArray;
let cellParent;

/*
 * Set up the scene,
 * draw the cells,
 * start the animation
 */
(function init() {

	const container = document.getElementById('drawingCanvas');
	const width = container.clientWidth;
	const height = container.clientHeight;

	camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);

	// Sets the camera up and away from the cells to get a better view.
	camera.startingPosition = getWorldMidpoint().multiply(new THREE.Vector3(0, 3, 6));
	camera.position.copy(camera.startingPosition);
	camera.lookAt(new THREE.Vector3(0, 0, 0));

	scene = new THREE.Scene();
	scene.add(camera);

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(width, height);
	renderer.setClearColor(new THREE.Color(0, 0.12, 0.2));
	container.appendChild(renderer.domElement);

	controls = new THREE.OrbitControls(camera, renderer.domElement);

	window.addEventListener('resize', () => {

		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(container.clientWidth, container.clientHeight);

	});

  resetStats();
  setUpGUIControls();
	createWorld();
	animate();

})();

function getWorldMidpoint() {

	const {worldSize, cellSize, cellPadding} = settings;
	const sizePerCell = cellSize + cellPadding;
	const excessSpace = cellPadding;

	const endpoint = (worldSize * sizePerCell - excessSpace);

	return new THREE.Vector3(endpoint / 2, endpoint / 2, endpoint / 2);

}

// Reset all of the stats to their starting/default values.
function resetStats() {

  stats.isStalled = false;
  stats.iterations = 0;
  stats.frames = 0;
  stats.aliveCells = 0;
  stats.totalCells = Math.pow(settings.worldSize, 3);

}

function writeTextField(textFieldId, value) {

  const textField = document.getElementById(textFieldId);

  if (textField !== null) {

    textField.innerHTML = value;

  }

}

function setUpGUIControls() {

  writeTextField('startPercentageTextField', settings.startPercentage + '%');
  writeTextField('speedTextField', settings.speed + '%');
  writeTextField('overcrowdingTextField', settings.rules.overcrowding);
  writeTextField('starvationTextField', settings.rules.starvation);
  writeTextField('birthMinTextField', settings.rules.birthMin);
  writeTextField('birthMaxTextField', settings.rules.birthMax);

	camera.reset = () => {
  	camera.position.copy(camera.startingPosition);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  }

  // bounder returns a function which accepts a single value and returns:
  // value if min < value < max; max if value > max; min if value < min
  const clamper = (min, max) => {

    return value => Math.max(min, Math.min(value, max));

  }

  // updater returns a function which only needs the name of a variable,
  // and the amount to change it by. With currying, the parent of the variable,
  // the acceptable range for the value, and the suffix to add to the text
  // field is adjustable.
  const updater = (parent, lowerBound, upperBound, suffix = '') => {

    return (setting, diff) => {

      parent[setting] = clamper(lowerBound, upperBound)(parent[setting] + diff);
      writeTextField(setting + 'TextField', parent[setting] + '' + suffix);

    };

  };

  const settingUpdater = updater(settings, 0, 100, '%');
  const increaseSetting = setting => settingUpdater(setting, 10);
  const decreaseSetting = setting => settingUpdater(setting, -10);

  const ruleUpdater = updater(settings.rules, 0, 27);
  const increaseRule = rule => ruleUpdater(rule, 1);
  const decreaseRule = rule => ruleUpdater(rule, -1);

  const toggleSetting = (setting) => {

    settings[setting] = !settings[setting];
    const text = settings[setting] ? 'ON' : 'OFF';
    writeTextField(setting + 'Status', text);

  }

	// This function makes it easy to add 'onClick' events
	const addOnClick = (elementId, func) => {

	  const element = document.getElementById(elementId);

	  if (element !== null) {

	  	element.addEventListener('click', func);

	  }

	}

  addOnClick('randomizeButton', randomizeStates);
  addOnClick('resetCameraButton', camera.reset);
  addOnClick('animationOnButton', () => toggleSetting('animationOn'));
  addOnClick('wrapAroundOnButton', () => toggleSetting('wrapAroundOn'));
  addOnClick('rotationOnButton', () => toggleSetting('rotationOn'));

  addOnClick('increaseSpeed', () => increaseSetting('speed'));
  addOnClick('decreaseSpeed', () => decreaseSetting('speed'));
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

/*
 * This function could be made more effecient by keeping track
 * of previous values for these variables.
 * If the values haven't changed, then it shouldn't go to the DOM
 * each frame to grab the elements.
 */
function updateStatusMenu() {

	const cellsText = Math.round(100 * stats.aliveCells / stats.totalCells) + '%'

	writeTextField('iterationsStatus', stats.iterations);
	writeTextField('cellsStatus', cellsText);
	writeTextField('stalledStatus', stats.isStalled ? 'Yes' : 'Nope');

}

function randomizeStates() {

  cellArray.forEach(column => {

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

function createWorld() {

	cellArray = [];
	cellParent = new THREE.Object3D();

	scene.add(cellParent);

	// Grab the cellSize and cellPadding from settings, and store them shorthand
	const {cellSize: size, cellPadding: padding} = settings;

	const createCell = () => {

		const geometry = new THREE.BoxGeometry(size, size, size);
		const material = new settings.cellMaterial();

		return new THREE.Mesh(geometry, material);

	}

	const getOffset = index => index * (size + padding);

	for (let xIndex = 0; xIndex < settings.worldSize; xIndex++) {

		cellArray.push([]);

		for (let yIndex = 0; yIndex < settings.worldSize; yIndex++) {

			cellArray[xIndex].push([]);

			for (let zIndex = 0; zIndex < settings.worldSize; zIndex++) {

				// The position of the cell, moved to it's location, then
				// moved back some so that the group's center is at 0, 0, 0.
				const adjustedPosition = new THREE.Vector3(
						getOffset(xIndex), getOffset(yIndex), getOffset(zIndex)
				).sub(getWorldMidpoint());

				const cell = createCell();
				cell.position.copy(adjustedPosition);

				cellArray[xIndex][yIndex].push(cell);
				cellParent.add(cell);

			}

		}

	}

	randomizeStates();

}

/*
 * Determine and set the nextState for each cell.
 * Does NOT change the cell's currentState.
 */
function determineNextState() {

  let stateChanged = false;

	for (let column = 0; column < cellArray.length; column++) {

		for (let row = 0; row < cellArray[column].length; row++) {

			for (let layer = 0; layer < cellArray[column][row].length; layer++) {

				const cell = cellArray[column][row][layer];

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
        if (cell.currentState === states.dead) {

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

        if (!stateChanged && cell.nextState !== cell.currentState) {

          stateChanged = true;

        }

			}

		}

	}

  stats.isStalled = !stateChanged;

}

function goToNextState() {

  stats.aliveCells = 0;

	cellArray.forEach(column => {

		column.forEach(row => {

			row.forEach(cell => {

        cell.currentState = cell.nextState;
        cell.nextState = null;

        if (cell.currentState === states.alive) {

          cell.visible = true;
          stats.aliveCells++;

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

  const clamper = (min, minReplacement, max, maxReplacement) => {

		return value => {

			if (value < min) {

				return minReplacement;

			} else if (value > max) {

				return maxReplacement;

			} else {

				return value;

			}

		};

	}

	// If settings.wrapAround, use this to count neighbors on opposite sides.
	const wrapClamper = clamper(0, settings.worldSize - 1, settings.worldSize - 1, 0);

	// If !settings.wrapAround, use this to test if value is within cellArray bounds.
	const inBounds = value => value === wrapClamper(value);

	for (let x = 0; x < dirs.length; x++) {

    for (let y = 0; y < dirs.length; y++) {

      for (let z = 0; z < dirs.length; z++) {

        // Don't count the cell itself
        if (x === 0 && y === 0 && z === 0) {

        	continue;

        }

        // Current neighbor coordinates
        let nColumn = column + dirs[x];
        let nRow = row + dirs[y];
        let nLayer = layer + dirs[z];

        if (settings.wrapAroundOn) {

          nColumn = wrapClamper(nColumn);
          nRow = wrapClamper(nRow);
          nLayer = wrapClamper(nLayer);

        } else {

        	// Skip neighbor if isn't next to cell i.e. if wrapping is needed
        	if ( !(inBounds(nColumn) && inBounds(nRow) && inBounds(nLayer)) ) {

        		continue;

        	}

        }

        const currentNeighborCell = cellArray[nColumn][nRow][nLayer];

        if (currentNeighborCell.currentState === states.alive) {

        	count++;

        }

			}

		}

	}

	return count;

}

function animate() {

	requestAnimationFrame(animate);

  if (settings.animationOn) {

  	// Speed is a 0-100 % value resulting in 200-1000ms
  	const timeBetweenCycles = 800 - settings.speed * 8 + 200

    if (performance.now() - stats.lastCycleTime >= timeBetweenCycles) {

      stats.lastCycleTime = performance.now();
      stats.iterations++;

      determineNextState();
      goToNextState();

    }

    if (settings.rotationOn) {

    	cellParent.rotation.y += settings.rotationSpeed;

    }

  }

  controls.update();
  updateStatusMenu();
	renderer.render(scene, camera);

}

