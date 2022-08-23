const CURRENT_VERSION = "0.1.9";

/*
    WOF Racer script - see README.md for details on usage and latest features.

    Some code incorporated from:   
        distinct(): https://stackoverflow.com/a/58339390
        getKeyByValue(): https://stackoverflow.com/a/28191966
        k_combinations(): https://gist.github.com/axelpale/3118596
        roundTo(): https://stackoverflow.com/questions/10015027/javascript-tofixed-not-rounding/32605063#32605063
        Tabs: https://github.com/mattheworiordan/jquery.infinite.tabs
        Timer: https://css-tricks.com/how-to-create-an-animated-countdown-timer-with-html-css-and-javascript/
        WorldOfFreight: https://worldoffreight.xyz/
*/

const LogLevel =
{
    None: 0,
    Error: 1,
    Warning: 2,
    Info: 4,
    Debug: 8
}

/* Page On Load */
$(function() {
    Log('document.onload - Start', 'severity-info', LogLevel.Debug);

    $(window).on('unload', function() { saveLog(); } );
    $('#btnSaveLog').click( function() { saveLog(); } );

    setupContent();
    setupTabs();
    setupTooltips();
    setupImages();
    setupStyles();
    setupControlEvents();
    setupFilters();
    setupNavPages();

    getLocalData();

    Log('document.onload - End', 'severity-info', LogLevel.Debug);
});

// Templates and other variables
const applyUnapplyTemplate = {
    "address": "{walletAddress}",
    "token_id": "{tokenId}",
    "upgrade": -1
}

const joinTemplate = {
    'address': '{walletAddress}',
    'raceId': '{raceID}',
    'tokenId': '{vehicleID}'
}

const maxParticipants = {
    'air': 12,
    'ground': 12,
    'space': 8,
    'water': 12
}

const userRacesTemplate = {
    'address': '{walletAddress}',
    'filter': {'raceClass': [], 'vehicleType': [], 'user_status': 'all', 'period': [], 'distance': []},
    'limit': 1,
    'sort': null
}

const upgradeAbbreviations = {
    'High Speed Engine': 'E:HSE',
    'High Power Engine': 'E:HPE',
    'High Efficiency Engine': 'E:HEE',
    'Hybrid Engine': 'E:HE',
    'Cold Fusion Reactor': 'E:CFR',
    'Antimatter Reactor': 'E:AR',
    'Dark Matter Reactor': 'E:DMR',
    'Additional cargo space': 'B:ACS',
    'Racing bodykit': 'B:RB',
    'Weight reduction': 'B:WR',
    'Additional Cargo Bay': 'B:ACB',
    'Reinforced Hull': 'B:RH',
    'Carbonium Frame': 'B:CF',
    'High Speed Transmission': 'T:HST',
    'Optimized Transmission': 'T:OT',
    'High Range Transmission': 'T:HRT',
    'Hyper Drive': 'T:HD',
    'Jump Drive': 'T:JD',
    'Instability Drive': 'T:ID',
    'Turbo': 'P:T',
    'Engine Control Unit: High Performance': 'P:ECU-HP',
    'Engine Control Unit: High Efficiency': 'P:ECU-HE',
    'Exhaust system': 'P:ES',
    'Fuel system': 'P:FS',
    'Differential': 'P:D',
    'Power Conversion Module': 'P:PCM',
    'Subspace Sensor': 'P:SS',
    'Tachyon Sensor': 'P:TS',
    'Energy Distributor': 'P:ED',
    'Impulse Thrusters': 'P:IT',
    'Dark Matter Thrusters': 'P:DMT'
}

const DEFAULT_MAX_LOG_ENTRIES = 10000000;
const FULL_DASH_ARRAY = 283;
const MAX_ALLOWED_PERMUTATIONS = 255;
const ROOT_API_URL = 'https://api.worldoffreight.xyz';
const ROOT_GRAPH_URL = 'https://graph.worldoffreight.xyz/v1';
const STAT_BOUNDARIES = {
    "emission_rate": 
    {
        "min": 1,
        "max": 10
    },
    "fuel_efficiency": 
    {
        "min": 1,
        "max": 10
    },
    "max_capacity": 
    {
        "min": 1,
        "max": 519843277
    },
    "max_range": 
    {
        "min": 1,
        "max": 1000000
    },
    "max_speed": 
    {
        "min": 1,
        "max": 27785
    }
}

const MAX_REFRESH_RATE = 20;
const WOF_WEBSITE = 'https://www.worldoffreight.xyz/';

const garageUrl = WOF_WEBSITE + 'garage?id={id}';


var adjustablesVM = null;
var bound = [];
var isPaused = false;
var joinedRaces = [];
var logCounter = 0;
var maxVehcileBaseStatsTokenId = null;
var messageLog = [];
var mySettings = null;
var nextToRaceRaces = [];
var postQueries = {};
var statusLogVM = null;
var timeoutId = null;
var timerIntervalId = null;
var unjoinedRacesVM = null;
var upcomingFreeRaces = [];
var upcomingPaidRaces = [];
var userInfoVM = null;
var userVehiclesVM  = [];
var vehicleAdjustables = [];
var vehicleBaseStats = [];

