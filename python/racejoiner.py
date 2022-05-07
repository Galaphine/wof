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
		json.dump(mySettings, jsonFile)
		
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

vehicleThresholds =  {
	'airship / zeppelin': {'min': 100, 'max': 999999999, 'refuelingDelay': 0.04, 'weather': {'Foggy': 2, 'Icy': 4, 'Rainy': 1.5, 'Snowy': 3, 'Sunny': 1, 'Windy': 4}, 'terrain': {'Asphalt': 1, 'Clay': 1, 'Gravel': 1, 'Ice': 1, 'Sand': 1, 'Snow': 1 } },
	'box truck': {'min': 0, 'max': 999999999, 'refuelingDelay': 0.03, 'weather': {'Foggy': 2.5, 'Icy': 4, 'Rainy': 2, 'Snowy': 3, 'Sunny': 1, 'Windy': 2.5}, 'terrain': {'Asphalt': 1, 'Clay': 1.5, 'Gravel': 1.5, 'Ice': 4, 'Sand': 3, 'Snow': 3 } },
	'cargo ship': {'min': 0, 'max': 999999999, 'refuelingDelay': 0.06, 'weather': {'Foggy': 2.5, 'Icy': 3.5, 'Rainy': 1.5, 'Snowy': 2.5, 'Sunny': 1, 'Windy': 3}, 'terrain': {'Asphalt': 1, 'Clay': 1, 'Gravel': 1, 'Ice': 1, 'Sand': 1, 'Snow': 1 } },
	'delivery robot': {'min': 0, 'max': 20, 'refuelingDelay': 0.02, 'weather': {'Foggy': 2.5, 'Icy': 3, 'Rainy': 2, 'Snowy': 3, 'Sunny': 1, 'Windy': 1.5}, 'terrain': {'Asphalt': 1, 'Clay': 1, 'Gravel': 1.5, 'Ice': 1.5, 'Sand': 3, 'Snow': 1.5 } },
	'drone': {'min': 0, 'max': 1000, 'refuelingDelay': 0.08, 'weather': {'Foggy': 2, 'Icy': 4, 'Rainy': 1.5, 'Snowy': 3, 'Sunny': 1, 'Windy': 4}, 'terrain': {'Asphalt': 1, 'Clay': 1, 'Gravel': 1, 'Ice': 1, 'Sand': 1, 'Snow': 1 } },
	'freight aircraft': {'min': 100, 'max': 999999999, 'refuelingDelay': 0.06, 'weather': {'Foggy': 2, 'Icy': 4, 'Rainy': 1.5, 'Snowy': 3, 'Sunny': 1, 'Windy': 3.5}, 'terrain': {'Asphalt': 1, 'Clay': 1, 'Gravel': 1, 'Ice': 1, 'Sand': 1, 'Snow': 1 } },
	'hot-air balloon': {'min': 0, 'max': 999999999, 'refuelingDelay': 0.02, 'weather': {'Foggy': 2, 'Icy': 4, 'Rainy': 2, 'Snowy': 3, 'Sunny': 1, 'Windy': 5}, 'terrain': {'Asphalt': 1, 'Clay': 1, 'Gravel': 1, 'Ice': 1, 'Sand': 1, 'Snow': 1 } },
	'locomotive / train': {'min': 100, 'max': 999999999, 'refuelingDelay': 0.06, 'weather': {'Foggy': 2, 'Icy': 3, 'Rainy': 1.5, 'Snowy': 3, 'Sunny': 1, 'Windy': 2.5}, 'terrain': {'Asphalt': 1, 'Clay': 1, 'Gravel': 1, 'Ice': 1, 'Sand': 1, 'Snow': 1 } },
	'semi truck': {'min': 2, 'max': 999999999, 'refuelingDelay': 0.04, 'weather': {'Foggy': 3, 'Icy': 5, 'Rainy': 2, 'Snowy': 3.5, 'Sunny': 1, 'Windy': 3}, 'terrain': {'Asphalt': 1, 'Clay': 1.5, 'Gravel': 2, 'Ice': 4, 'Sand': 3, 'Snow': 3 } },
	'van': {'min': 2, 'max': 999999999, 'refuelingDelay': 0.02, 'weather': {'Foggy': 2.5, 'Icy': 4, 'Rainy': 2, 'Snowy': 3, 'Sunny': 1, 'Windy': 2.5}, 'terrain': {'Asphalt': 1, 'Clay': 1.5, 'Gravel': 1.5, 'Ice': 4, 'Sand': 3, 'Snow': 3 } },
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
			logging.info('WOF Racing!  {0}'.format(datetime.datetime.today().strftime('%y-%m-%d %H:%M:%S')))
			
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
				if len(race['participants']) == maxParticipants:
					fullList.append(race)
				elif any([True for elem in race['participants'] if userId in elem.values()]):
					joinedList.append(race)
				else:
					unjoinedList.append(race)

			# Show list of full races.
			logging.info('Full:')
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
					logging.info('	Your WOFs are sitting idle! You are currently not in any race.')
				
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
				raceName = race['name']
				participants = race['participants']
				participantCount = len(participants)
				raceDistance = round(race['distance'], 4)
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
					logging.info('\n		Vehicle; Type; Class; Capacity (kg); Max:Adjusted Range; Max:Normalized Speed; # of trips; # of refuels')
					for vehicle in availableVehiclesInClass:
						allowed = True
						vehicleName = vehicle['name'];
						vehicleType = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Vehicle Type'][0].lower()
						vehicleClass = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Transportation Mode'][0].lower()
						vehicleMaxCapacity = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Capacity'][0]
						vehicleMaxRange = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Range'][0]
						vehicleMaxSpeed = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Speed'][0]
						maxDistanceThreshold = vehicleThresholds[vehicleType]['max']
						minDistanceThreshold = vehicleThresholds[vehicleType]['min']
						refuelingDelay = vehicleThresholds[vehicleType]['refuelingDelay']
						numOfTrips = math.ceil(cargoWeight / vehicleMaxCapacity)
						adjustedRaceDistance = raceDistance + (numOfTrips-1)*raceDistance
						numOfRefuels = math.ceil(adjustedRaceDistance / vehicleMaxRange)
						normalizedSpeed = vehicleMaxSpeed*(1 - ((numOfRefuels-1)*refuelingDelay))
						
						if not any([True for elem in joinedParticipants if vehicle['token_id'] == elem['vehicle']['token_id']]):
							logging.info('			{0}; {1}; {2}; {3}; {4}:{5}; {6}:{7}; {8}; {9}'.format(vehicleName, vehicleType, vehicleClass, vehicleMaxCapacity, vehicleMaxRange, "N/A" if numOfTrips > 5 else adjustedRaceDistance, vehicleMaxSpeed, "N/A" if numOfRefuels > 5 else normalizedSpeed, numOfTrips, numOfRefuels))
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
							availableVehicleRefuelingDelay = vehicleThresholds[vehicleType]['refuelingDelay']
							availableVehicleNumOfTrips = math.ceil(cargoWeight / availableVehicleMaxCapacity)
							availableVehicleAdjustedRaceDistance = raceDistance + (availableVehicleNumOfTrips-1)*raceDistance*2 # Times 2 for round trip
							availableVehicleNumOfRefuels = math.ceil(availableVehicleAdjustedRaceDistance / availableVehicleMaxRange)
							availableVehicleNormalizedSpeed = availableVehicleMaxSpeed*(1 - ((availableVehicleNumOfRefuels-1)*availableVehicleRefuelingDelay))
							estimatedTimeToComplete = (availableVehicleAdjustedRaceDistance / availableVehicleNormalizedSpeed)*3600
							vehicle.update({'estimatedTimeInSeconds': estimatedTimeToComplete, 'speed': availableVehicleNormalizedSpeed, 'emission': availableVehicleEmissionRate })
							logging.info('			{0}; {1}; Est. Time: {2}; Range: {3}:{4}, Speed: {5}:{6}'.format(availableVehicleName, availableVehicleMaxCapacity, round(estimatedTimeToComplete, 4), availableVehicleMaxRange, availableVehicleAdjustedRaceDistance, availableVehicleMaxSpeed, availableVehicleNormalizedSpeed))
						sortedAvailableVehiclesToRace = sorted(availableVehiclesToRace, key = lambda elem: (elem['estimatedTimeInSeconds']))
						selectedVehicle = sortedAvailableVehiclesToRace[0]
						logging.info('		{0} (ID #{1}) has been chosen!  Entering in race now...'.format(selectedVehicle['name'], selectedVehicle['token_id']))
						if selectedVehicle is not None:
							selectedVehicleClass = [tt['value'] for tt in selectedVehicle['attributes'] if tt['trait_type'] == 'Transportation Mode'][0]
							logging.info('			Selected Vehicle: {0} ({1})'.format(selectedVehicle['name'], selectedVehicleClass))
							selectedRaceId = race['_id']
							selectedTokenId = selectedVehicle['token_id']
							selectedVehicleId = selectedVehicle['id']
							joinApiData = joinTemplate.copy()
							joinApiData.update({'raceId': selectedRaceId, 'vehicle': selectedVehicleId, 'token_id': selectedTokenId})
							#logging.info(joinApiData)
							#joinRaceEndpoint = apiDetails[0]['url']
							try:
								jsonData = getData('racing-arena/join', 'post', joinApiData)
								logging.info("			{0}".format(jsonData))
								logging.info('			{0} (ID #{1}) is now in the race - good luck!'.format(selectedVehicle['name'], selectedVehicle['token_id']))
								break;
							except (ConnectionError, Timeout) as exC:
								raise(exC)
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
	
