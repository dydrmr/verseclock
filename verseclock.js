import { DEGREES, RADIANS, MODULO, SQUARE, ROUND, JULIAN_DATE } from './HelperFunctions.js';
import CelestialBody from './CelestialBody.js';
import Location from './Location.js';

window.BODIES = Array();
window.LOCATIONS = Array();
window.ACTIVE_LOCATION = null;


setInterval( update, 1000/24 );
function update() {

	if (!window.ACTIVE_LOCATION) window.ACTIVE_LOCATION = ORISON;
	let location = window.ACTIVE_LOCATION;
	let body = window.ACTIVE_LOCATION ? window.ACTIVE_LOCATION.PARENT : null;

	let col = location.THEME_COLOR;
	document.querySelector(':root').style.setProperty('--theme-color', `rgb(${col.r}, ${col.g}, ${col.b})`);
	document.querySelector(':root').style.setProperty('--theme-color-dark', `rgb(${col.r*0.2}, ${col.g*0.2}, ${col.b*0.2})`);

	document.getElementById('selected-location-bg-image').backgroundColor = `rgb(${col.r}, ${col.g}, ${col.b})`;
	document.getElementById('selected-location-bg-image').style.backgroundImage = `url('${location.THEME_IMAGE}')`;

	//CLOCKS
	document.getElementById('gmt-time').innerHTML = new Date().toUTCString();
	document.getElementById('universe-time').innerHTML = UNIVERSE_TIME(true).replace('GMT', 'SET');
	document.getElementById('unix-time').innerHTML = 'UNIX time: ' + Math.floor(REAL_TIME() / 1000);

	//SELECTED LOCATION CARD
	document.getElementById('local-time').innerHTML = HOURS_TO_TIME_STRING(location.LOCAL_TIME/60/60);
	document.getElementById('location-name').innerHTML = location.NAME;
	document.getElementById('location-body-name').innerHTML = location.PARENT.NAME;
	// document.getElementById('location-body-type').innerHTML = location.PARENT.TYPE;

	document.getElementById('next-rise-countdown').innerHTML = HOURS_TO_TIME_STRING(location.NEXT_STAR_RISE * 24);
	document.getElementById('next-set-countdown').innerHTML = HOURS_TO_TIME_STRING(location.NEXT_STAR_SET * 24);

	let now;

	now = new Date();
	let rise = now.setSeconds(now.getSeconds() + (location.NEXT_STAR_RISE * 24 * 60 * 60));
	document.getElementById('next-rise-time').innerHTML = DATE_TO_SHORT_TIME(new Date(rise));
	
	now = new Date();
	let set = now.setSeconds(now.getSeconds() + (location.NEXT_STAR_SET * 24 * 60 * 60));
	document.getElementById('next-set-time').innerHTML = DATE_TO_SHORT_TIME(new Date(set));


	//DEBUG
	//CELESTIAL BODY
	document.getElementById('body-name').innerHTML = body.NAME;
	document.getElementById('day-length').innerHTML = body.ROTATION_RATE*60*60;// HOURS_TO_TIME_STRING(body.ROTATION_RATE);
	document.getElementById('current-cycle').innerHTML = body.CURRENT_CYCLE().toFixed(5);
	document.getElementById('hour-angle').innerHTML = body.HOUR_ANGLE().toFixed(3);
	document.getElementById('declination').innerHTML = body.DECLINATION(body.PARENT_STAR).toFixed(3);
	document.getElementById('meridian').innerHTML = body.MERIDIAN().toFixed(3);
	document.getElementById('noon-longitude').innerHTML = body.LONGITUDE().toFixed(3);

	//LOCATION
	document.getElementById('db-local-name').innerHTML = location.NAME;
	document.getElementById('db-local-time').innerHTML = HOURS_TO_TIME_STRING(location.LOCAL_TIME/60/60);
	document.getElementById('latitude').innerHTML = location.LATITUDE.toFixed(3);
	document.getElementById('longitude').innerHTML = location.LONGITUDE.toFixed(3);
	document.getElementById('longitude-360').innerHTML = ROUND(location.LONGITUDE_360, 3);
	document.getElementById('elevation').innerHTML = (location.ELEVATION() * 1000).toFixed(1);
	document.getElementById('elevation-degrees').innerHTML = location.ELEVATION_IN_DEGREES().toFixed(3);
	document.getElementById('sunriseset-angle').innerHTML = location.STARRISE_AND_STARSET_ANGLE().toFixed(3);
	document.getElementById('hour-angle-location').innerHTML = location.HOUR_ANGLE().toFixed(3) + '&deg;';
	document.getElementById('star-azimuth').innerHTML = location.STAR_AZIMUTH().toFixed(3) + '&deg;';
	document.getElementById('star-altitude').innerHTML = location.STAR_ALTITUDE().toFixed(3) + '&deg;';
	document.getElementById('max-star-altitude').innerHTML = location.STAR_MAX_ALTITUDE().toFixed(3) + '&deg;';

	now = new Date();
	let next = now.setSeconds(now.getSeconds() + (location.NEXT_STAR_RISE * 24 * 60 * 60));
	next = new Date(next).toLocaleString();
	let remain = HOURS_TO_TIME_STRING(location.NEXT_STAR_RISE * 24);
	document.getElementById('db-next-starrise').innerHTML = location.NEXT_STAR_RISE.toFixed(6);
	document.getElementById('db-next-starrise-countdown').innerHTML = remain;
	document.getElementById('db-next-starrise-date').innerHTML = next;

	now = new Date();
	next = now.setSeconds(now.getSeconds() + (location.NEXT_NOON * 24 * 60 * 60));
	next = new Date(next).toLocaleString();
	remain = HOURS_TO_TIME_STRING(location.NEXT_NOON * 24);
	document.getElementById('next-noon').innerHTML = location.NEXT_NOON.toFixed(6);
	document.getElementById('next-noon-countdown').innerHTML = remain;
	document.getElementById('next-noon-date').innerHTML = next;	

	now = new Date();
	next = now.setSeconds(now.getSeconds() + (location.NEXT_STAR_SET * 24 * 60 * 60));
	next = new Date(next).toLocaleString();
	remain = HOURS_TO_TIME_STRING(location.NEXT_STAR_SET * 24);
	document.getElementById('db-next-starset').innerHTML = location.NEXT_STAR_SET.toFixed(6);
	document.getElementById('db-next-starset-countdown').innerHTML = remain;
	document.getElementById('db-next-starset-date').innerHTML = next;
}

function REAL_TIME(formatAsString = false) {
	let now = new Date();
	return (!formatAsString) ? now.valueOf() : now.toLocaleString();
}

function UNIVERSE_TIME(formatAsString = false) {
	let date2020 = new Date('January 1, 2020 00:00:00Z');
	let date2950 = new Date('January 1, 2950 00:00:00Z');
	let universeTime = date2950.getTime() + ( (new Date() - date2020) * 6);
	return (!formatAsString) ? universeTime : new Date(universeTime).toUTCString();
}

function HOURS_TO_TIME_STRING(hours) {
	let h = hours;
	let m = ( h - Math.floor(h) ) * 60;
	let s = ( m - Math.floor(m) ) * 60;

	s = Math.round(s);
	if (s >= 60) {
		s -= 60;
		m += 1;
	}

	m = Math.floor(m);
	if (m >= 60) {
		m -= 60;
		h += 1;
	}

	h = Math.floor(h);

	h = (h < 10) ? '0' + h : h;
	m = (m < 10) ? '0' + m : m;
	s = (s < 10) ? '0' + s : s;

	return h + ':' + m + ':' + s;
}

function DATE_TO_SHORT_TIME(date) {
	let h = date.getHours();
	let m = date.getMinutes();

	h = (h < 10) ? '0' + h : h;
	m = (m < 10) ? '0' + m : m;

	return h + ':' + m;
}



// CELESTIAL BODIES
const STANTON = new CelestialBody(
	'Stanton',
	'Star',
	null,
	null,
	{
		'x' : 136049.870,
		'y' : 1294427.400,
		'z' : 2923345.368
	},
	{
		'w' : 1.00000000,
		'x' : 0.00000000,
		'y' : 0.00000001,
		'z' : 0.00000002
	},
	696000.000,
	0,
	0,
	0,
	0
);

const ARCCORP = new CelestialBody(
	'ArcCorp',
	'Planet',
	STANTON,
	STANTON,
	{
		'x' : 18587664.740,
		'y' : -22151916.920,
		'z' : 0.000
	},
	{
		'w' : 1.00000000,
		'x' : 0.00000000,
		'y' : 0.00000000,
		'z' : 0.00000000
	},
	800.000,
	3.1099999,
	230.73368,
	310.000,
	28917272.576,
	{
		'r' : 172,
		'g' : 102,
		'b' : 90
	}
);

const CRUSADER = new CelestialBody(
	'Crusader',
	'Planet',
	STANTON,
	STANTON,
	{
		'x' : -18962176.000,
		'y' : -2664960.000,
		'z' : 0.000
	},
	{
		'w' : 1.00000000,
		'x' : 0.00000000,
		'y' : 0.00000000,
		'z' : 0.00000000
	},
	7450.010,
	5.0999999,
	300.33377,
	188.000,
	19148527.616,
	{
		'r' : 231,
		'g' : 152,
		'b' : 147
	},
);

const MICROTECH = new CelestialBody(
	'microTech',
	'Planet',
	STANTON,
	STANTON,
	{
		'x' : 22462016.306,
		'y' : 37185625.646,
		'z' : 0.000
	},
	{
		'w' : 1.00000000,
		'x' : 0.00000000,
		'y' : 0.00000000,
		'z' : 0.00000000
	},
	1000.000,
	4.1199999,
	217.11688,
	58.866,
	43443216.384,
	{
		'r' : 167,
		'g' : 184,
		'b' : 193
	}
);

const HURSTON = new CelestialBody(
	'Hurston',
	'Planet',
	STANTON,
	STANTON,
	{
		'x' : 12850457.093,
		'y' : 0.000,
		'z' : 0.000
	},
	{
		'w' : 1.00000000,
		'x' : 0.00000000,
		'y' : 0.00000000,
		'z' : 0.00000000
	},
	1000.000,
	2.4800000,
	19.10777,
	0.000,
	12850457.600,
	{
		'r' : 138,
		'g' : 101,
		'b' : 71
	}
);

window.BODIES.push(STANTON, ARCCORP, CRUSADER, MICROTECH, HURSTON);


// LOCATIONS
const AREA18 = new Location(
	'Area18',
	'Landing Zone',
	ARCCORP,
	STANTON,
	{
		'x' : -747.409,
		'y' : -116.734,
		'z' : -262.094
	},
	null,
	'https://starcitizen.tools/images/thumb/c/c3/Arccorp-area18-skyline-io-north-tower.jpg/1280px-Arccorp-area18-skyline-io-north-tower.jpg'
);

const LORVILLE = new Location(
	'Lorville',
	'Landing Zone',
	HURSTON,
	STANTON,
	{
		'x' : -328.989,
		'y' : -752.435,
		'z' : 572.120
	},
	null,
	'https://starcitizen.tools/images/4/42/Hurston.jpg'
)

const NEW_BABBAGE = new Location(
	'New Babbage',
	'Landing Zone',
	MICROTECH,
	STANTON,
	{
		'x' : 520.723,
		'y' : 419.364,
		'z' : 743.655
	},
	null,
	'https://starcitizen.tools/images/thumb/9/9c/Microtech-new-babbage-cityscape-01.jpg/1280px-Microtech-new-babbage-cityscape-01.jpg'
);

const ORISON = new Location(
	'Orison',
	'Landing Zone',
	CRUSADER,
	STANTON,
	{
		'x' : 5295.517,
		'y' : -863.194,
		'z' : 5282.237
	},
	null,
	'https://starcitizen.tools/images/thumb/c/cf/Crusader-orison-voyager-bar-lookout-daytime-3.14.jpg/1280px-Crusader-orison-voyager-bar-lookout-daytime-3.14.jpg'
)

window.LOCATIONS.push(AREA18, LORVILLE, NEW_BABBAGE, ORISON);