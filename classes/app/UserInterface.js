import { round, getHashedLocation, getHash, convertHoursToTimeString, getCustomTime, convertDateToShortTime, getUniverseTime, getLocationByName } from '../../HelperFunctions.js';
import Settings from './Preferences.js';
import DB from './Database.js';
import Window from './Window.js';

import SolarSystem from '../SolarSystem.js';
import Star from '../Star.js';


class UserInterface {
    constructor() {
        if (UserInterface.instance) return UserInterface.instance;
		UserInterface.instance = this;

		this.bgElement = document.getElementById('selected-location-bg-image');
		this.bgColor = this.bgElement.style.backgroundColor;

		this.atlasModal = document.getElementById('modal-atlas');
		this.atlasContainer = document.getElementById('atlas-container');
		this.mapModal = document.getElementById('modal-map');
		this.mapContainer = document.getElementById('map-window');
		this.atlasInfobox = document.getElementById('atlas-hoverinfo');

		this.mapHoverLocation = null;
		this.locationSelectedIndex = -1;
		this.visibleButtons = [];

		this.Atlas = new Window('modal-atlas', 'atlas-container', 'createAtlasScene');
		this.Map = new Window('modal-map', 'map-window', 'createMapScene');
		this.Settings = new Window('modal-settings', 'settings-window', null);
		this.Debug = new Window('detailed-info', null, null);
		this.Credits = new Window('modal-credits', null, null);
	}

	getButtons() {
		return document.getElementById('available-locations-list').querySelectorAll('.BUTTON-set-location');
	}

	getVisibleButtons() {
		return document.getElementById('available-locations-list').querySelectorAll('.BUTTON-set-location:not(.hide)');
	}

	getSelectedButton() {
		return document.getElementById('available-locations-list').querySelector('.BUTTON-set-location.selected');
	}

	setupEventListeners() {
		// CLICKS
		this.listen('click', 'BUTTON-toggle-atlas-window', () => { UI.Atlas.toggle(); });
		this.listen('click', 'BUTTON-close-atlas', () => { UI.Atlas.toggle(); });

		this.listen('click', 'BUTTON-toggle-map-window', () => { UI.Map.toggle(); });
		this.listen('click', 'BUTTON-close-map', () => { UI.Map.toggle(); });

		this.listen('click', 'BUTTON-open-settings', () => { UI.Settings.toggle(); UI.el('location-selection-input').focus(); });
		this.listen('click', 'BUTTON-close-settings', () => { UI.Settings.toggle(); });

		this.listen('click', 'BUTTON-toggle-credits-window', () => { UI.Credits.toggle(); });
		this.listen('click', 'BUTTON-close-credits', () => { UI.Credits.toggle(); });

		this.listen('click', 'BUTTON-share-location', this.shareLocation);


		// KEYBOARD TOGGLES
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				if (UI.Atlas.show) UI.Atlas.toggle();
				if (UI.Map.show) UI.Map.toggle();
				if (UI.Settings.show) UI.Settings.toggle();
				if (UI.Credits.show) UI.Credits.toggle();
				if (UI.Debug.show) UI.Debug.toggle();

				return;
			}
			if (UI.Settings.show) {

				// get visible buttons once
				if (this.locationSelectedIndex === -1) {
					this.buttons = this.getVisibleButtons();
				}

				if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
					if (event.key === 'Tab') { event.preventDefault(); }
					if (this.locationSelectedIndex <= 0) {
						event.preventDefault();
						this.locationSelectedIndex = -1;
						this.getSelectedButton()?.classList.remove('selected');
						UI.el('location-selection-input').focus();
						return;
					}
					UI.el('location-selection-input').blur();
					this.getSelectedButton()?.classList.remove('selected');
					this.locationSelectedIndex--;
					this.buttons[this.locationSelectedIndex].classList.add('selected');

					// scroll to button
					UI.el('available-locations-list').scroll(0, this.buttons[this.locationSelectedIndex].offsetTop - 200);
					return;
				}

				if (event.key === 'ArrowDown' || event.key === 'Tab') {
					if (event.key === 'Tab') { event.preventDefault(); }
					if (this.locationSelectedIndex >= this.buttons.length - 1) { return; }
					UI.el('location-selection-input').blur();
					this.getSelectedButton()?.classList.remove('selected');
					this.locationSelectedIndex++;
					this.buttons[this.locationSelectedIndex].classList.add('selected');

					// scroll to button
					UI.el('available-locations-list').scroll(0, this.buttons[this.locationSelectedIndex].offsetTop - 200);
					return;
				}
			}

			if (event.target.tagName.toLowerCase() === 'input') return;


			if (event.key === 'a') { UI.Atlas.toggle(); }
			if (event.key === 'm') { UI.Map.toggle(); }

			if (event.key === 'd') {
				UI.Debug.toggle();

				if (UI.Debug.show) {
					DB.getLocationsWithoutImage();
					DB.getLocationsWithoutWikiLink();
				}
			}


			if (event.key === 't') {
				Settings.use24HourTime = !Settings.use24HourTime;
				Settings.save('time24', Settings.use24HourTime);
			}

			if (event.key === 'h') {
				Settings.useHdTextures = !Settings.useHdTextures;
				Settings.save('hdTextures', Settings.useHdTextures);

				if (this.Map.show) {
					document.dispatchEvent(new CustomEvent('redrawMapTexture'));
				}

				if (this.Atlas.show) {
					console.warn('TODO: refresh atlas textures');
				}
			}
		});


		// SUPPRESS FIREFOX QUICKSEARCH
		window.addEventListener('keydown', (event) => {
			if (event.key === '/') {
				event.preventDefault();
			}
		}, { capture: true });

		// KEYBOARD SEARCH
		document.addEventListener('keyup', (event) => {
			if (UI.Settings.show && event.key === 'Enter') {
				let selected = this.getSelectedButton();
				if(selected) {
					UI.setMapLocation(selected.dataset.locationName);
					return;
				}

				let buttons = this.getVisibleButtons();
				if(buttons && buttons.length > 0) {
					UI.setMapLocation(buttons[0].dataset.locationName);
				}
				return;
			}

			if (event.target.tagName.toLowerCase() === 'input') return;

			if (event.key === '/') {
				if (!UI.Settings.show) UI.Settings.toggle();
				this.locationSelectedIndex = -1;
				this.getSelectedButton()?.classList.remove('selected');
				UI.el('location-selection-input').focus();
				return;
			}
		})


		// CUSTOM TIME SELECTION
		this.listen('input', 'time-selection-input', () => {
			const timeInput = UI.el('time-selection-input').value;
			UI.setCustomTime(timeInput);
		})


		// TYPING IN LOCATION SEARCH BOX
		this.el('location-selection-input').addEventListener('input', (event) => {
			const search = UI.el('location-selection-input').value.toLowerCase();
			const searchFragments = search.split('+');
			const buttons = this.getButtons();

			if (search === '') {
				this.locationSelectedIndex = -1;
				this.getSelectedButton()?.classList.remove('selected');
				buttons?.forEach(el => el.classList.remove('hide'));
				return;
			}

			for (const element of buttons) {
				const found = Array();
				for (let [index, fragment] of searchFragments.entries()) {
					if (fragment === '') continue;
					found[index] = (element.innerText.toLowerCase().includes(fragment)) ? true : false;
				}

				const result = found.every((value) => value === true);
				result ? element.classList.remove('hide') : element.classList.add('hide');
			}
		});
	}

	// MAIN UPDATE FUNCTIONS
	update() {
		UI.#update_setColors();
		UI.#update_setThemeImage();
		UI.#update_setLocationInfo();
		UI.#update_setRiseAndSetData();
		UI.#update_setIlluminationStatus();

		if (UI.Settings.show) UI.updateSettingsLocationTimes();
		if (UI.Debug.show) UI.updateDebugUI();
	}

	#update_setColors() {
		const col = Settings.activeLocation.THEME_COLOR;
		const colorMain = `rgb(${col.r}, ${col.g}, ${col.b})`;
		const colorDark = `rgb(${col.r * 0.2}, ${col.g * 0.2}, ${col.b * 0.2})`;

		document.querySelector(':root').style.setProperty('--theme-color', colorMain);
		document.querySelector(':root').style.setProperty('--theme-color-dark', colorDark);

		if (UI.bgColor !== colorMain) UI.bgColor = colorMain;
	}

	#update_setThemeImage() {
		if (Settings.activeLocation.THEME_IMAGE === null) {
			const imgPath = `img/themes/${Settings.activeLocation.NAME.toLowerCase()}.webp`;
			const exists = Settings.imageExists(imgPath);
			Settings.activeLocation.THEME_IMAGE = exists ? imgPath : Settings.activeLocation.PARENT.THEME_IMAGE;
		};
		const url = `url('${Settings.activeLocation.THEME_IMAGE}')`;
		if (UI.bgElement.style.backgroundImage !== url) UI.bgElement.style.backgroundImage = url;
	}

	#update_setLocationInfo() {
		if (
			Settings.activeLocation.ILLUMINATION_STATUS === 'Polar Day' ||
			Settings.activeLocation.ILLUMINATION_STATUS === 'Polar Night' ||
			Settings.activeLocation.LOCAL_TIME.toString() === 'NaN'
		) {
			UI.setText('local-time', Settings.activeLocation.ILLUMINATION_STATUS);
		} else {
			UI.setText('local-time', convertHoursToTimeString(Settings.activeLocation.LOCAL_TIME / 60 / 60, false));
		}
		if (Settings.customTime !== 'now') {
			UI.setText('chosen-time', getCustomTime().toLocaleString());
			UI.setText('chosen-time-sublabel', 'local selected time');
		} else {
			UI.setText('chosen-time', '');
			UI.setText('chosen-time-sublabel', '');
		}
		UI.setText('location-name', Settings.activeLocation.NAME.split(" (")[0]);
		UI.setText('location-body-name', Settings.activeLocation.PARENT.NAME);
	}

	#update_setRiseAndSetData() {
		// COUNTDOWNS
		let nextRise = Settings.activeLocation.NEXT_STAR_RISE;
		if (!nextRise) {
			UI.setText('next-rise-countdown', '---');

		} else {
			nextRise = Settings.activeLocation.IS_STAR_RISING_NOW ? '- NOW -' : convertHoursToTimeString(nextRise * 24, true, false);
			UI.setText('next-rise-countdown', nextRise);
		}

		let nextSet = Settings.activeLocation.NEXT_STAR_SET;
		if (!nextSet) {
			UI.setText('next-set-countdown', '---');

		} else {
			nextSet = Settings.activeLocation.IS_STAR_SETTING_NOW ? '- NOW -' : convertHoursToTimeString(nextSet * 24, true, false);
			UI.setText('next-set-countdown', nextSet);
		}


		// LOCAL TIMES
		if (!nextRise) {
			UI.setText('local-rise-time', '---');
		} else {
			UI.setText('local-rise-time', convertHoursToTimeString(Settings.activeLocation.LOCAL_STAR_RISE_TIME * 24, false, true));
		}

		if (!nextSet) {
			UI.setText('local-set-time', '---');
		} else {
			UI.setText('local-set-time', convertHoursToTimeString(Settings.activeLocation.LOCAL_STAR_SET_TIME * 24, false, true));
		}


		// REAL TIMES
		let now = getCustomTime();
		if (!nextRise) {
			UI.setText('next-rise-time', '---');
		} else {
			const rise = now.setSeconds(now.getSeconds() + (Settings.activeLocation.NEXT_STAR_RISE * 86400));
			UI.setText('next-rise-time', convertDateToShortTime(new Date(rise)));
		}

		now = getCustomTime();
		if (!nextSet) {
			UI.setText('next-set-time', '---');
		} else {
			const set = now.setSeconds(now.getSeconds() + (Settings.activeLocation.NEXT_STAR_SET * 86400));
			UI.setText('next-set-time', convertDateToShortTime(new Date(set)));
		}
	}

	#update_setIlluminationStatus() {
		let scDate = getCustomTime();
		scDate.setFullYear(scDate.getFullYear() + 930);
		let scDateString = scDate.toLocaleString('default', { year: 'numeric', month: 'long', day: 'numeric' });
		UI.setText('illumination-status', Settings.activeLocation.ILLUMINATION_STATUS + '\r\n' + scDateString);
	}



	// GLOBAL FUNCTIONS
	setText(elementID, string) {
		let el = (typeof elementID === 'string') ? document.getElementById(elementID) : elementID;

		if (!el) {
			console.error('Element not found:', elementID);
			return null;
		}

		if (el.textContent !== string) el.textContent = string;
	}

	el(idString) {
		let el = document.getElementById(idString);

		if (!el) {
			console.error('Element not found:', idString);
			return null;
		}

		return el;
	}

	listen(eventType, element, callbackFunction) {
		if (typeof element === 'string') {
			element = document.getElementById(element);
		}

		if (!(element instanceof HTMLElement)) {
			console.error('Element not found:', element);
			return;
		} else if (typeof callbackFunction !== 'function') {
			console.error('Callback parameter is not a function:', callbackFunction);
			return;
		} else if (typeof eventType !== 'string') {
			console.error('Non-string parameter passed as event type:', eventType);
			return;
		}

		element.addEventListener(eventType, callbackFunction);
	}


	// SHARE LOCATION
	shareLocation() {
		const url = location.protocol + '//' + location.host + location.pathname + '#' + getHash();
		navigator.clipboard.writeText(url);

		const msg = UI.el('share-location-message');
		msg.style.transition = '0s ease-out';
		msg.style.opacity = 1;

		setTimeout(() => {
			msg.style.transition = '1s ease-out';
			msg.style.opacity = 0;
		}, 2000)
	}


	// FUNCTIONS FOR LOCATION SELECTION WINDOW
	setCustomTime(inputTime, isUnix = false) {
		let newCustomTime = 'now';
		if (isUnix) {
			newCustomTime = Number.parseInt(inputTime);
		} else {
			let inputDate = new Date(inputTime);
			newCustomTime = inputDate.valueOf() / 1000;
		}

		if (Number.isNaN(newCustomTime) || !Number.isFinite(newCustomTime)) {
			newCustomTime = 'now';
		}

		Settings.customTime = newCustomTime;

		window.suppressReload = true;
		parent.location.hash = getHash();
		setTimeout(() => {
			window.suppressReload = false;
		}, 1000);
	}

	updateSettingsLocationTimes() {
		let buttons = document.getElementsByClassName('BUTTON-set-location');

		for (let element of buttons) {
			const location = getLocationByName(element.dataset.locationName);

			let string = '';
			if (String(location.LOCAL_TIME) === 'NaN') {
				string = location.ILLUMINATION_STATUS;
			} else {
				string = convertHoursToTimeString(location.LOCAL_TIME / 60 / 60, false, true) + '\r\n' + location.ILLUMINATION_STATUS;
			}

			const timeElement = element.querySelector('.set-location-time');
			UI.setText(timeElement, string);
		}
	}

	updateDebugUI() {
		let loc = Settings.activeLocation;
		let bod = Settings.activeLocation ? Settings.activeLocation.PARENT : null;

		UI.setText('db-hash', window.location.hash);

		// CLOCKS
		let unix = Math.floor(getCustomTime().valueOf() / 1000);
		UI.setText('db-unix-time', unix.toLocaleString());
		UI.setText('db-chosen-time', getCustomTime().toUTCString());
		UI.setText('db-gmt-time', new Date().toUTCString());
		UI.setText('db-universe-time', getUniverseTime(true).replace('GMT', 'SET'));

		//CELESTIAL BODY
		if (bod) {
			UI.setText('body-name', bod.NAME);
			UI.setText('body-type', bod.TYPE);
			UI.setText('body-system', bod.PARENT_STAR.NAME);
			UI.setText('body-parent-name', bod.PARENT.NAME);
			UI.setText('body-radius', bod.BODY_RADIUS.toLocaleString());
			UI.setText('day-length', (bod.ROTATION_RATE * 60 * 60).toLocaleString());
			UI.setText('day-length-readable', convertHoursToTimeString(bod.ROTATION_RATE));
			UI.setText('hour-length-readable', convertHoursToTimeString(bod.ROTATION_RATE / 24));
			UI.setText('current-cycle', round(bod.CURRENT_CYCLE(), 3).toLocaleString());
			UI.setText('hour-angle', bod.HOUR_ANGLE().toFixed(3));
			UI.setText('declination', bod.DECLINATION(bod.PARENT_STAR).toFixed(3));
			UI.setText('meridian', bod.STATIC_MERIDIAN().toFixed(3));
			UI.setText('noon-longitude', bod.ROTATING_MERIDIAN().toFixed(3));
		}

		//LOCATION
		UI.setText('db-local-name', loc.NAME);
		UI.setText('db-local-time', convertHoursToTimeString(loc.LOCAL_TIME / 60 / 60));

		let latitude = loc.LATITUDE.toFixed(3);
		if (parseFloat(latitude) < 0) {
			latitude = 'S ' + (parseFloat(latitude) * -1).toFixed(3);
		} else {
			latitude = 'N ' + latitude;
		}
		UI.setText('latitude', latitude);

		let longitude = loc.LONGITUDE.toFixed(3);
		if (parseFloat(longitude) < 0) {
			longitude = 'W ' + (parseFloat(longitude) * -1).toFixed(3);
		} else {
			longitude = 'E ' + longitude;
		}
		UI.setText('longitude', longitude);

		UI.setText('longitude-360', round(loc.LONGITUDE_360, 3));
		UI.setText('elevation', round(loc.ELEVATION * 1000, 1).toLocaleString());
		UI.setText('elevation-degrees', loc.ELEVATION_IN_DEGREES.toFixed(3));
		UI.setText('sunriseset-angle', loc.STARRISE_AND_STARSET_ANGLE.toFixed(3));
		UI.setText('length-of-daylight', convertHoursToTimeString(loc.LENGTH_OF_DAYLIGHT * 24, true, false));
		UI.setText('length-of-night', convertHoursToTimeString((bod.ROTATION_RATE) - (loc.LENGTH_OF_DAYLIGHT * 24), true, false));
		UI.setText('starrise-time', convertHoursToTimeString(loc.LOCAL_STAR_RISE_TIME * 24));
		UI.setText('starset-time', convertHoursToTimeString(loc.LOCAL_STAR_SET_TIME * 24));
		UI.setText('next-starrise-countdown', round(parseFloat(loc.NEXT_STAR_RISE), 6).toFixed(6));
		UI.setText('next-starset-countdown', round(parseFloat(loc.NEXT_STAR_SET), 6).toFixed(6));
		UI.setText('db-illumination-status', loc.ILLUMINATION_STATUS);
		UI.setText('hour-angle-location', loc.HOUR_ANGLE().toFixed(3));
		UI.setText('star-azimuth', loc.STAR_AZIMUTH().toFixed(3));
		UI.setText('star-altitude', loc.STAR_ALTITUDE().toFixed(3));
		UI.setText('max-star-altitude', loc.STAR_MAX_ALTITUDE().toFixed(3));

		let now = getCustomTime();
		now.setMilliseconds(0);
		let next = now.setSeconds(now.getSeconds() + (loc.NEXT_STAR_RISE * 24 * 60 * 60));
		next = new Date(next).toLocaleString();
		let remain = convertHoursToTimeString(loc.NEXT_STAR_RISE * 24, true, false);
		UI.setText('db-next-starrise', (loc.NEXT_STAR_RISE * 24 * 60 * 60).toFixed(0));
		UI.setText('db-next-starrise-countdown', remain);
		UI.setText('db-next-starrise-date', next);

		now = getCustomTime();
		now.setMilliseconds(0);
		next = now.setSeconds(now.getSeconds() + (loc.NEXT_NOON * 24 * 60 * 60));
		next = new Date(next).toLocaleString();
		remain = convertHoursToTimeString(loc.NEXT_NOON * 24, true, false);
		UI.setText('next-noon', (loc.NEXT_NOON * 24 * 60 * 60).toFixed(0));
		UI.setText('next-noon-countdown', remain);
		UI.setText('next-noon-date', next);

		now = getCustomTime();
		now.setMilliseconds(0);
		next = now.setSeconds(now.getSeconds() + (loc.NEXT_STAR_SET * 24 * 60 * 60));
		next = new Date(next).toLocaleString();
		remain = convertHoursToTimeString(loc.NEXT_STAR_SET * 24, true, false);
		UI.setText('db-next-starset', (loc.NEXT_STAR_SET * 24 * 60 * 60).toFixed(0));
		UI.setText('db-next-starset-countdown', remain);
		UI.setText('db-next-starset-date', next);
	}


	// ===============
	// MAIN INTERFACE
	// ===============

	setMapLocation(locationName) {
		const location = getLocationByName(locationName);

		if (!location) {
			console.error('Invalid [locationName] parameter passed to [setLocation] function!\nValue passed: ' + locationName);
			return false;
		}

		const previousLocation = Settings.activeLocation ?? null;

		Settings.activeLocation = location;
		Settings.save('activeLocation', Settings.activeLocation.NAME);
		if (UI.Settings.show) {
			UI.Settings.toggle();
			UI.el('location-selection-input').value = '';
			UI.el('location-selection-input').blur();
			this.locationSelectedIndex = -1;
			this.getSelectedButton()?.classList.remove('selected');
			this.getButtons()?.forEach(el => el.classList.remove('hide'));
			UI.el('available-locations-list').scroll(0, 0);
		}

		if (this.Map.show) {
			if (previousLocation.PARENT !== Settings.activeLocation.PARENT) {
				document.dispatchEvent(new CustomEvent('createMapScene'));
			}
			document.dispatchEvent(new CustomEvent('moveMapCameraAboveActiveLocation'));
		}

		window.suppressReload = true;
		parent.location.hash = getHashedLocation();
		setTimeout(() => {
			window.suppressReload = false;
		}, 1000);

		return true;
	}

	populateLocationList() {
		let container = document.getElementById('available-locations-list');

		for (let loc of DB.locations) {
			if (loc.PARENT?.TYPE === 'Lagrange Point') continue;
			if (loc.TYPE === 'Asteroid cluster') continue;

			let el = document.createElement('div');
			el.className = 'BUTTON-set-location';
			el.addEventListener('click', function (e) { UI.setMapLocation(loc.NAME); });
			el.dataset.locationName = loc.NAME;

			let elName = document.createElement('p');
			elName.className = 'set-location-name';
			elName.innerHTML = loc.NAME;

			let elBody = document.createElement('p');
			elBody.className = 'set-location-body';

			if (loc.PARENT.TYPE === 'Moon') {
				elBody.innerHTML = `${loc.PARENT.PARENT_STAR.NAME} ▸ ${loc.PARENT.PARENT.NAME} ▸ ${loc.PARENT.NAME}`;
			} else {
				elBody.innerHTML = `${loc.PARENT.PARENT_STAR.NAME} ▸ ${loc.PARENT.NAME}`;
			}

			let elTime = document.createElement('p');
			elTime.className = 'set-location-time';
			elTime.innerHTML = 'XX:XX';

			el.appendChild(elName);
			el.appendChild(elBody);
			el.appendChild(elTime);
			container.appendChild(el);
		}
	}

	showMapLocationData(location, triggerElement) {
		UI.mapHoverLocation = location;

		document.getElementById('map-locationinfo-window').style.opacity = 1;

		UI.setText('map-info-locationname', location.NAME);
		UI.setText('map-info-locationtype', location.TYPE);
		UI.setText('map-info-elevation', Math.round(location.ELEVATION * 1000, 1).toLocaleString());
		UI.#updateMapLocationData();
		setInterval(UI.#updateMapLocationData, 250);
	}

	#updateMapLocationData() {
		if (!UI.mapHoverLocation) return;
		UI.setText('map-info-phase', UI.mapHoverLocation.ILLUMINATION_STATUS);

		let nextRise, nextSet;

		const unchanging = ['Polar Day', 'Polar Night', 'Permanent Day', 'Permanent Night'];
		if (unchanging.includes(UI.mapHoverLocation.ILLUMINATION_STATUS)) {
			nextRise = '---';
			nextSet = '---';

		} else {

			if (UI.mapHoverLocation.IS_STAR_RISING_NOW) {
				nextRise = '- NOW -';
			} else {
				nextRise = convertHoursToTimeString(UI.mapHoverLocation.NEXT_STAR_RISE * 24, true, false);
			}

			if (UI.mapHoverLocation.IS_STAR_SETTING_NOW) {
				nextSet = '- NOW -';
			} else {
				nextSet = convertHoursToTimeString(UI.mapHoverLocation.NEXT_STAR_SET * 24, true, false);
			}

		}

		UI.setText('map-info-nextstarrise', nextRise);
		UI.setText('map-info-nextstarset', nextSet);
	}

	hideMapLocationData() {
		UI.el('map-locationinfo-window').style.opacity = 0;
		UI.mapHoverLocation = null;
		clearInterval(UI.#updateMapLocationData);
	}


	// ===============
	// ATLAS
	// ===============

	populateAtlasSidebar(system) {
		const e = UI.el('atlas-treelist');
		e.innerHTML = '';


		// STARS
		const stars = DB.stars.filter((s) => {
			return s.PARENT_SYSTEM === system;
		});

		if (stars.length < 1) {
			const level1 = document.createElement('li');
			level1.innerText = 'System data unavailable';
			e.appendChild(level1);
			return;
		}

		for (const star of stars) {
			const li1 = this.#createAtlasSidebarSelector(e, star);

			// PLANETS
			const planets = DB.bodies.filter((planet) => {
				if (
					planet.PARENT &&
					planet.PARENT.NAME === star.NAME
				) {
					return true;
				}
			});

			planets.sort((a, b) => {
				return (a.ORDINAL < b.ORDINAL) ? -1 : (a.ORDINAL > b.ORDINAL) ? 1 : 0;
			});


			const ul2 = document.createElement('ul');
			if (planets.length > 0) {
				li1.appendChild(ul2);
			}

			for (const planet of planets) {
				const li2 = this.#createAtlasSidebarSelector(ul2, planet);

				// MOONS
				const moons = DB.bodies.filter((moon) => {
					if (
						moon.PARENT &&
						moon.PARENT.NAME === planet.NAME
					) {
						return true;
					}
				});

				moons.sort((a, b) => {
					return (a.ORDINAL < b.ORDINAL) ? -1 : (a.ORDINAL > b.ORDINAL) ? 1 : 0;
				});

				const ul3 = document.createElement('ul');
				if (moons.length > 0) {
					li2.appendChild(ul3);
				}

				for (const moon of moons) {
					this.#createAtlasSidebarSelector(ul3, moon);
				}
			}
		}
	}

	#createAtlasSidebarSelector(parentElement, object) {
		const element = document.createElement('li');
		parentElement.appendChild(element);
		//element.innerText = object.NAME;

		const selector = document.createElement('span');
		selector.innerText = object.NAME;
		//selector.classList.add('selector');
		selector.classList.add('atlas-sidebar-object-selector');
		element.appendChild(selector);

		//element.classList.add('atlas-sidebar-object-selector');
		element.addEventListener('click', (e) => {
			e.stopPropagation();
			let event = new CustomEvent('changeAtlasFocus', {
				'detail': {
					newObject: object
				}
			});
			document.dispatchEvent(event);
		});

		return element;
	}


	updateAtlasHierarchy(focusBody, focusSystem) {
		let textString = '';
		if (focusBody instanceof SolarSystem || focusBody instanceof Star) {
			textString = focusBody.NAME;

		} else if (focusBody.TYPE === 'Planet' || focusBody.TYPE === 'Jump Point') {
			textString = `${focusSystem.NAME} ▸ ${focusBody.NAME}`;

		} else {
			textString = `${focusSystem.NAME} ▸ ${focusBody.PARENT.NAME} ▸ ${focusBody.NAME}`;
		}

		UI.setText('atlas-hierarchy', textString);
	}

	showAtlasInfobox(object, event) {
		this.#moveInfobox(event);
		this.#populateInfobox(object);
		atlasInfobox.style.opacity = '1';
	}

	#moveInfobox(event) {
		console.warn('moveInfobox not implemented');
	}

	#populateInfobox(object) {
		console.warn('populateInfobox not implemented');
	}
}

const UI = new UserInterface();
export default UI;