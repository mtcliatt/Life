'use strict';

/**
 * @author Matthew Cliatt
 *
 */

/**
 * Settings - Safe-to-customize config variables.
 *
 * cellSize - Size of each individual cell.
 * cellPadding - Space between cells.
 * worldSize - Number of cells per row, column, and layer.
 * startPercentage - Percentage of cells which will be initialized alive.
 *
 * wrapAroundOn - True if world "wraps" around itself, Pac-Man style.
 * animationOn - True if world should be animated (cycles, rotation, etc).
 * rotationOn - True if world should automatically rotate.
 *
 * rotationSpeed - Controls amount of rotation per frame.
 * cycleSpeed - 0-100% = 200ms-1000ms delay in cycles, controllable by user.
 *
 * rules - Rules governing 'The Game of Life', controllable by user.
 * 				 Alive cells die with < 'starvation' or > 'overcrowding' alive neighbors,
 * 				 Dead cells come to life with > 'birthMin' AND < 'birthMax' neighbors.
 *   overcrowding, starvation, birthMin, birthMax
 *
 */
const settings = {

	cellSize: 2,
	cellPadding: 1,
	worldSize: 20,
  startPercentage: 30,

  wrapAroundOn: true,
  animationOn: true,
  rotationOn: true,

  rotationSpeed: 0.01,
  cycleSpeed: 30,

  rules: {

	  overcrowding: 12,
	  starvation: 6,
	  birthMin: 6,
	  birthMax: 12,

  },

};

/**
 * stats - Tracking variables updated by the program itself.
 *
 * aliveCells - Number of cells alive this cycle.
 * totalCells - Gets set to Math.pow(aliveCells, 3).
 * lastCycleTime - Holds the time when the world last updated to a new cycle.
 * iterations - Refers to the number of cycles since the current game began.
 * isStalled - Gets set to true if the game reaches a state that produces itself.
 */
const stats = {

  aliveCells: 0,
  lastCycleTime: 0,
  iterations: 0,
  isStalled: false,

};

/**
 * cellStates - Contains the possible cell states to maintain readability.
 */
const cellStates = {

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

/**
 * init() - Starts the show!
 *
 * 1) Sets up the THREE.js components needed to draw graphics.
 * 2) resetStats() - Sets the tracking variables to their correct starting values.
 * 3) setUpGUIControls() - Sets up the user interface.
 * 4) createWorld() - Creates the cells and adds them to the scene.
 * 5) animate() - Starts rendering the scene and updating the world.
 *
 */
(function init() {

	const container = document.getElementById('drawingCanvas');
	const width = container.clientWidth;
	const height = container.clientHeight;

	camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);

	// Sets the camera up and away from the cells to) get a better view.
	const worldLength = settings.worldSize * (settings.cellSize + settings.cellPadding);
	camera.startingPosition = new THREE.Vector3(0, worldLength * 2, worldLength * 4);
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
  writeTextField('cycleSpeedTextField', settings.cycleSpeed + '%');
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

  addOnClick('increaseSpeed', () => increaseSetting('cycleSpeed'));
  addOnClick('decreaseSpeed', () => decreaseSetting('cycleSpeed'));
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

          cell.currentState = cellStates.alive;
          cell.visible = true;

        } else {

          cell.currentState = cellStates.dead;
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
		const material = new THREE.MeshNormalMaterial();

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

// Determines and sets the nextState for each cell.
function determineNextState() {

  let stateChanged = false;

	for (let column = 0; column < cellArray.length; column++) {

		for (let row = 0; row < cellArray[column].length; row++) {

			for (let layer = 0; layer < cellArray[column][row].length; layer++) {

				const cell = cellArray[column][row][layer];

				let nextState = null;
				let aliveNeighbors = countAliveNeighbors(column, row, layer);

				// This logic is detailed in the comments on settings.rules
        if (cell.currentState === cellStates.dead) {

          const aboveMin = aliveNeighbors > settings.rules.birthMin;
          const belowMax = aliveNeighbors < settings.rules.birthMax;

          if (aboveMin && belowMax) {

            cell.nextState = cellStates.alive;

          } else {

            cell.nextState = cellStates.dead;

          }

        } else {

          const starved = aliveNeighbors < settings.rules.starvation;
          const crowded = aliveNeighbors > settings.rules.overcrowding;

          if (starved || crowded) {

            cell.nextState = cellStates.dead;

          } else {

            cell.nextState = cellStates.alive;

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

// Sets each cell's currentState to their nextState and their nextState to null.
function goToNextState() {

  stats.aliveCells = 0;

	cellArray.forEach(column => {

		column.forEach(row => {

			row.forEach(cell => {

        cell.currentState = cell.nextState;
        cell.nextState = null;

        if (cell.currentState === cellStates.alive) {

          cell.visible = true;
          stats.aliveCells++;

        } else {

          cell.visible = false;

        }

      });

    });

  });

}

//Returns the number of alive cells neighboring the cell at the location given.
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

        if (currentNeighborCell.currentState === cellStates.alive) {

        	count++;

        }

			}

		}

	}

	return count;

}

/**
 * animate() - renders the scene each frame.
 *
 * If animationOn
 * 		1) Cells iterate to next cycle if appropriate amount of time has passed.
 *   	2) Stats update.
 *    3) World rotates if rotationOn has been set to true.
 *
 * Always
 * 		1) User controls update - allows user to move scene with mouse.
 * 		2) Status menu in GUI updates.
 * 		3) An animation frame is requested, passing this method as callback.
 *
 */
function animate() {

	requestAnimationFrame(animate);

  if (settings.animationOn) {

  	// Speed is a 0-100 % value resulting in 200-1000ms
  	const timeBetweenCycles = 800 - settings.cycleSpeed * 8 + 200

    if (performance.now() - stats.lastCycleTime >= timeBetweenCycles) {

      determineNextState();
      goToNextState();

      stats.lastCycleTime = performance.now();
      stats.iterations++;

    }

    if (settings.rotationOn) {

    	cellParent.rotation.y += settings.rotationSpeed;

    }

  }

  controls.update();
  updateStatusMenu();
	renderer.render(scene, camera);

}

