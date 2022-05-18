from requests import Request, Session
from requests.exceptions import ConnectionError, Timeout, TooManyRedirects
import argparse, datetime, json, logging, math, operator, time

# getData:  Generic function to return JSON data (as a Python dictionary) from a WOF API call
def getData(apiName, apiType, parameters):
	apiUrl = '{0}/{1}'.format(ROOT_API_URL, apiName)
	if (apiType == 'get'):
		response = session.get(apiUrl, params=parameters)
	else:
		response = session.post(apiUrl, data=json.dumps(parameters))

	jsonData = json.loads(response.text)

	return jsonData

# getUserIdFromUserRaces:  Function to get the User ID from the userRaces API call, and save it to the user's mysettings.json file
def getUserIdFromUserRaces(walletAddress):
	userInfo = getData('racing-arena/racer/{0}'.format(walletAddress), 'get', {})
	userId = userInfo['data']['_id']
	mySettings.update({'user_id': userId})
	with open('mysettings.json', 'w') as jsonFile:
		json.dump(mySettings, jsonFile, indent=4, sort_keys=True)
		
	return userId

# setArgParser: Function to get arguments from command line (currently not used)
def setArgParser():
	parser = argparse.ArgumentParser(description='World of Freight Race Auto-Joiner\n')
	return parser.parse_args()

# setLogging: Function to enable logging to a file and to the console (set logging level to 
def setLogging():
	# set up logging to file - see previous section for more details
	logging.basicConfig(level=logging.DEBUG,
						format='%(message)s',
						datefmt='%m-%d %H:%M',
						filename='app.log',
						filemode='a')
	# define a Handler which writes INFO messages or higher to the sys.stderr
	console = logging.StreamHandler()
	console.setLevel(logging.INFO)
	# set a format which is simpler for console use
	formatter = logging.Formatter('%(message)s')
	# tell the handler to use this format
	console.setFormatter(formatter)
	# add the handler to the root logger
	logging.getLogger().addHandler(console)

# Constants
CURRENT_VERSION = "0.3.5"
ROOT_API_URL = 'https://api.worldoffreight.xyz'

# Setup
appArgs = setArgParser()
setLogging()

# Get user settings from JSON as Python dictionary
with open('mysettings.json', 'r') as jsonFile:
	mySettings = json.load(jsonFile)

# List of vehicles user wishes to exclude from consideration for racing (array of WOF NFT token IDs)	
excludedVehicles = mySettings['excluded_vehicles']

# Maximum number of participants in a race for the race to be skipped and considered full.	
maxParticipants = 12
try:
	maxParticipants = mySettings['max_participants']
except:
	pass
	
# User's wallet address from settings
walletAddress = mySettings['wallet_address']

# Template dictionaries and other variables
joinTemplate = {
	'address': walletAddress,
	'raceId': '<raceID>',
	'token_id': '<vehicleID>'
}

userRacesTemplate = {
	'address': walletAddress,
	'filter': {'raceClass': [], 'vehicleType': [], 'user_status': 'all', 'period': [], 'distance': []},
	'limit': 1,
	'sort': None
}

vehicleApiParameters = {
	'address': walletAddress,
	'sortBy': None,
	'vehicleType': []
}

vehicleThresholds = {
        "aa-9 coruscant freighter": {
            "accelerationDelay": 0,
            "decelerationDelay": 0,
            "max": 0,
            "min": 0,
            "refuelingDelay": 0,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "airship / zeppelin": {
            "accelerationDelay": 900,
            "decelerationDelay": 900,
            "max": 999999999,
            "min": 100,
            "refuelingDelay": 300,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "box truck": {
            "accelerationDelay": 0,
            "decelerationDelay": 0,
            "max": 999999999,
            "min": 0,
            "refuelingDelay": 180,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "cargo ship": {
            "accelerationDelay": 55800,
            "decelerationDelay": 55800,
            "max": 999999999,
            "min": 0,
            "refuelingDelay": 3600,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "delivery robot": {
            "accelerationDelay": 0,
            "decelerationDelay": 0,
            "max": 20,
            "min": 0,
            "refuelingDelay": 0,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "drone": {
            "accelerationDelay": 0,
            "decelerationDelay": 0,
            "max": 1000,
            "min": 0,
            "refuelingDelay": 3600,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "flying saucer (ufo)": {
            "accelerationDelay": 0,
            "decelerationDelay": 0,
            "max": 0,
            "min": 0,
            "refuelingDelay": 0,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "freight aircraft": {
            "accelerationDelay": 1800,
            "decelerationDelay": 1800,
            "max": 999999999,
            "min": 100,
            "refuelingDelay": 1800,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "hot-air balloon": {
            "accelerationDelay": 900,
            "decelerationDelay": 900,
            "max": 999999999,
            "min": 0,
            "refuelingDelay": 120,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "locomotive / train": {
            "accelerationDelay": 900,
            "decelerationDelay": 900,
            "max": 999999999,
            "min": 100,
            "refuelingDelay": 1800,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "semi truck": {
            "accelerationDelay": 300,
            "decelerationDelay": 300,
            "max": 999999999,
            "min": 2,
            "refuelingDelay": 600,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "space launcher": {
            "accelerationDelay": 0,
            "decelerationDelay": 0,
            "max": 0,
            "min": 0,
            "refuelingDelay": 0,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "van": {
            "accelerationDelay": 0,
            "decelerationDelay": 0,
            "max": 999999999,
            "min": 2,
            "refuelingDelay": 120,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        },
        "x-wing": {
            "accelerationDelay": 0,
            "decelerationDelay": 0,
            "max": 0,
            "min": 0,
            "refuelingDelay": 0,
            "terrain": {
                "": 1,
                "Asphalt": 1,
                "Clay": 1,
                "Gravel": 1,
                "Ice": 1,
                "Sand": 1,
                "Snow": 1
            },
            "weather": {
                "Foggy": 1,
                "Icy": 1,
                "Rainy": 1,
                "Snowy": 1,
                "Sunny": 1,
                "Windy": 1
            }
        }
    }
#vehicleThresholds = mySettings['vehicle_thresholds']
participationThreshold = mySettings['participation_threshold']

# Session instantiation with headers
# 	IMPORTANT - you MUST user your own authorization_key - it is generated by your browser's interaction with the API and cannot be retrieved from this script.
#	You must set this manually in your mysettings.json file.
headers = {
'Content-Type': 'application/json',
'Authorization': mySettings['authorization_key']
}

session = Session()
session.headers.update(headers)

# This variable will allow the continuous looping of the race check; if at some point a fatal error occurs, this will be set to False and the script will terminate.
active = True

# Get User ID (note this is not the user's wallet address; it is a WOF internal ID)	
userId = getUserIdFromUserRaces(walletAddress)
if len(userId) == 0:
	active = False
	logging.info('Unable to find your User ID on the server - please make sure you are on the Polygon network and try again.')
	exit()
			
try:
	while (active):
		fullList = []
		joinedList = []
		unjoinedList = []
		parameters = {}
		
		try:
			logging.info('WOF Racing v{0} ({1})'.format(CURRENT_VERSION, datetime.datetime.today().strftime('%y-%m-%d %H:%M:%S')))
			
			# Get latest list of user's vehicles, filtering out excluded vehicles.
			try:
				myWofs = getData('vehicles', 'post', vehicleApiParameters)['data']
				if len(myWofs) == 0:
					raise
			except (ConnectionError, Timeout) as exC:
				raise ConnectionError(exC)
			except (Timeout) as exT:
				raise Timeout(exT)
			except:
				active = False
				raise Exception('This wallet does not have any WOF NFTs associated with it; please try another.')
				
			myVehicles = list(filter(lambda i: int(i['token_id']) not in excludedVehicles, myWofs))
			print('Count of upgraded vehicles: ', sum([1 for d in myWofs if 'upgrades' in d]))

			# Get a list of the upcoming games - this includes joined and unjoined races so they need to be bucketed appropriately.
			upcomingRaces = getData('racing-arena/upcomingRaces', 'get', parameters)
			for race in upcomingRaces['data']:
				if len(race['participants']) >= maxParticipants:
					fullList.append(race)
				elif any([True for elem in race['participants'] if userId in elem.values()]):
					joinedList.append(race)
				else:
					unjoinedList.append(race)

			# Show list of full races.
			logging.info('Full / Ready for Racing:')
			if len(fullList) > 0:
				for race in fullList:
					logging.info('	{0} (Type: {1} ; Participant(s): {2})'.format(race['name'], race['class'], str(len(race['participants']))))
					if 'sponsor' in race.keys():
						logging.info('		Sponsor: {0}'.format(race['sponsor']))
					if 'promo_link' in race.keys():
						logging.info('		Promo Link: {0}'.format(race['promo_link']))
			else:
					logging.info('	There are currently no full races.')
			
			# Show list of joined races.
			logging.info('Joined:')
			if len(joinedList) > 0:
				for race in joinedList:
					logging.info('	{0} (Type: {1} ; Participant(s): {2})'.format(race['name'], race['class'], str(len(race['participants']))))
					if 'sponsor' in race.keys():
						logging.info('		Sponsor: {0}'.format(race['sponsor']))
					if 'promo_link' in race.keys():
						logging.info('		Promo Link: {0}'.format(race['promo_link']))
			else:
					logging.info('	Your non-racing WOFs are sitting idle!  There are no races at your given participation threshold of {0}.'.format(participationThreshold))
				
			# Sort the unjoined list of races.
			sortedUnjoinedList = sorted(unjoinedList, key = lambda i: len(i['participants']), reverse = True)
			
			# Inside each race's participants list is the user's selected WOF NFT token ID; put these participants lists in an array for determining if the vehicle is already in a race.
			joinedParticipants = []
			for race in [*joinedList, *fullList]:
				for participant in race['participants']:
					joinedParticipants.append(participant)

			logging.info('Not Joined (Sorted by Participant Count Desc):')
			for race in sortedUnjoinedList:
				raceClass = race['class']
				raceDistance = round(race['distance'], 4)
				raceName = race['name']
				raceWeather = race['weather']
				raceTerrain = '' if 'terrain' not in race else race['terrain']
				participants = race['participants']
				participantCount = len(participants)
				cargoWeight = race['weight']
				
				logging.info('	{0} (Type: {1}; Cargo Wgt (kg): {2}; Distance: {3}; Participant(s): {4})'.format(raceName, raceClass, cargoWeight, raceDistance, participantCount))
				if 'sponsor' in race.keys():
					logging.info('		Sponsor: {0}'.format(race['sponsor']))
				if 'promo_link' in race.keys():
					logging.info('		Promo Link: {0}'.format(race['promo_link']))
				if participantCount >= participationThreshold:
					# Get vehicles with same Transportation Mode as the race's class
					availableVehiclesInClass = []
					for vehicle in myVehicles:
						if [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Transportation Mode'][0].lower() in raceClass.lower():
							availableVehiclesInClass.append(vehicle)
							
					# Put into a list of available vehicles to race those whose max range is >= race distance and above/below the threshold for a given Vehicle Type
					# Thresholds are defined in the dictionaries at the top; you can adjust these and create additional scenarios as needed.
					availableVehiclesToRace = []
					logging.info('\n		Vehicle; Type; Class; Capacity (kg); Max:Adjusted Range; Max Speed; Fuel Eff.; Emm. Rate; # of trips; # of refuels')
					for vehicle in availableVehiclesInClass:
						allowed = True
						vehicleName = vehicle['name'];
						vehicleType = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Vehicle Type'][0].lower()
						vehicleClass = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Transportation Mode'][0].lower()
						vehicleMaxCapacity = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Capacity'][0]
						vehicleMaxRange = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Range'][0]
						vehicleMaxSpeed = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Speed'][0]
						vehicleEmissionRate = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Emission Rate'][0]
						vehicleFuelEfficiency = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Fuel Efficiency'][0]
						maxDistanceThreshold = vehicleThresholds[vehicleType]['max']
						minDistanceThreshold = vehicleThresholds[vehicleType]['min']
						numOfTrips = math.ceil(cargoWeight / vehicleMaxCapacity)
						adjustedRaceDistance = raceDistance + (numOfTrips-1)*raceDistance
						numOfRefuels = math.ceil(adjustedRaceDistance / vehicleMaxRange)
						refuelingDelay = vehicleThresholds[vehicleType]['refuelingDelay']*(numOfRefuels-1)*(vehicleEmissionRate/10)
						
						if not any([True for elem in joinedParticipants if vehicle['token_id'] == elem['vehicle']['token_id']]):
							logging.info('			{0}; {1}; {2}; {3}; {4}:{5}; {6}; {7}; {8}; {9}; {10}'.format(vehicleName, vehicleType, vehicleClass, vehicleMaxCapacity, vehicleMaxRange, "N/A" if numOfTrips > 5 else round(adjustedRaceDistance, 4), vehicleMaxSpeed, vehicleFuelEfficiency, vehicleEmissionRate, numOfTrips, numOfRefuels))
							if (numOfRefuels > 5):
								logging.info('				Number of refuels is > 5; excluding from the race.')
								allowed = False
							elif (numOfTrips > 5):
								logging.info('				Number of trips is greater than 5; excluding from the race.')
								allowed = False
							else:
								if not ((raceDistance >= minDistanceThreshold) and (raceDistance <= maxDistanceThreshold)):
									logging.info('				Distance {0} is outside thresholds {1}-{2} for {3}; excluding.'.format(raceDistance, minDistanceThreshold, maxDistanceThreshold, vehicleType))
									allowed = False
							if allowed:
								availableVehiclesToRace.append(vehicle)

					# If any vehicles are available to race, choose the best one based on speed and emission rate
					if len(availableVehiclesToRace) > 0:
						selectedVehicle = None
						logging.info('		---------------------------------------------------------------------------------------------------')
						logging.info('		There are available Vehicles to race in/on {0}\n		Choosing the best based on quickest estimated time:'.format(race['class']))
						sortedAvailableVehiclesToRace = availableVehiclesToRace
						for vehicle in availableVehiclesToRace:
							availableVehicleName = vehicle['name']
							availableVehicleMaxCapacity = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Capacity'][0]
							availableVehicleMaxRange = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Range'][0]
							availableVehicleMaxSpeed  = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Speed'][0]
							availableVehicleEmissionRate = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Emission Rate'][0]
							availableVehicleFuelEfficiency = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Fuel Efficiency'][0]
							
							availableVehicleAccelerationDelay = vehicleThresholds[vehicleType]['accelerationDelay']
							availableVehicleDecelerationDelay = vehicleThresholds[vehicleType]['decelerationDelay']
							
							availableVehicleNumOfTrips = math.ceil(cargoWeight / availableVehicleMaxCapacity)
							availableVehicleAdjustedRaceDistance = raceDistance + (availableVehicleNumOfTrips-1)*raceDistance*2 # Times 2 for round trip
							availableVehicleNumOfRefuels = math.ceil(availableVehicleAdjustedRaceDistance / availableVehicleMaxRange)

							availableVehicleRefuelingDelay = vehicleThresholds[vehicleType]['refuelingDelay']*(availableVehicleNumOfRefuels-1)*(availableVehicleEmissionRate/10)
							
							estimatedTimeToComplete = (availableVehicleAdjustedRaceDistance / availableVehicleMaxSpeed)*3600 + (availableVehicleAccelerationDelay + availableVehicleDecelerationDelay)*(availableVehicleNumOfRefuels + 1) # Extra accel/decel delay for start and stop
							try:
								terrainAdjustment = vehicleThresholds[vehicleType]['terrain'][raceTerrain]
							except:
								terrainAdjustment = 1
								
							try:
								weatherAdjustment = vehicleThresholds[vehicleType]['weather'][raceWeather]
							except:
								weatherAdjustment = 1
							terrainAndWeatherAdjustedTime = estimatedTimeToComplete * weatherAdjustment * terrainAdjustment
							
							finalAdjustedTime = terrainAndWeatherAdjustedTime
							
							vehicle.update({'estimatedTimeInSeconds': finalAdjustedTime, 'speed': availableVehicleMaxSpeed, 'emission': availableVehicleEmissionRate })
							logging.info('			{0}; {1}; Est. Time: {2}; Range: {3}:{4}, Speed: {5}; FE: {6}; ER: {7}'.format(availableVehicleName, availableVehicleMaxCapacity, round(finalAdjustedTime, 4), availableVehicleMaxRange, availableVehicleAdjustedRaceDistance, availableVehicleMaxSpeed, availableVehicleFuelEfficiency, availableVehicleEmissionRate))
						sortedAvailableVehiclesToRace = sorted(availableVehiclesToRace, key = lambda elem: (elem['estimatedTimeInSeconds']))
						selectedVehicle = sortedAvailableVehiclesToRace[0]
						logging.info('		{0} (ID #{1}) has been chosen!  Attempting to enter race now...'.format(selectedVehicle['name'], selectedVehicle['token_id']))
						if selectedVehicle is not None:
							selectedVehicleClass = [tt['value'] for tt in selectedVehicle['attributes'] if tt['trait_type'] == 'Transportation Mode'][0]
							logging.info('			Selected Vehicle: {0} ({1})'.format(selectedVehicle['name'], selectedVehicleClass))
							selectedRaceId = race['_id']
							selectedTokenId = selectedVehicle['token_id']
							selectedVehicleId = selectedVehicle['id']
							latestRaces = getData('racing-arena/upcomingRaces', 'get', parameters)
							fullRace = next((latestRace for latestRace in latestRaces['data'] if len(latestRace['participants']) >= maxParticipants and race['_id'] == latestRace['_id']), None)
							isFull = not (fullRace is None)
							if (not isFull):
								joinApiData = joinTemplate.copy()
								joinApiData.update({'address': walletAddress, 'raceId': selectedRaceId, 'vehicle': selectedVehicleId, 'token_id': selectedTokenId})
								#logging.info(joinApiData)
								#joinRaceEndpoint = apiDetails[0]['url']
								try:
									jsonData = getData('racing-arena/join', 'post', joinApiData)
									logging.info("			{0}".format(jsonData))
									logging.info('			{0} (ID #{1}) is now in the {1} race - good luck!'.format(selectedVehicle['name'], selectedVehicle['token_id'], race['name']))
									break;
								except (ConnectionError, Timeout) as exC:
									raise(exC)
							else:
								logging.info('			Unfortunately this race filled too quickly and cannot be entered; moving to the next race...')
					else:
						logging.info('		No vehicles in this class available to race.')
			logging.info('\n')
		except (ConnectionError, Timeout) as e:
			logging.error('There was a ConnectionError or Timeout error; unable to get response text. Will try again shortly...')
		except Exception as ex:
			active = False
			raise(ex)
				
		# DO **NOT** MAKE THIS MORE FREQUENT THAN 30 SECONDS!  Respect the WOF web server, please!
		if active:
			time.sleep(30)
	
except Exception as ex:
	logging.info('Unexpected fatal error:\n' + str(ex))
	raise
	
