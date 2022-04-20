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

# User's wallet address from settings
walletAddress = mySettings['wallet_address']

# Template dictionaries and other variables
joinTemplate = {
	'address': walletAddress,
	'raceId': '<raceID>',
	'token_id': '<vehicleID>'
}

distanceThresholds = {'ground': { 'bot': 1, 'botvan': 10, 'botvantrain': 111, 'semitruck': 782 }, 'air': {'drone': 10}}

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

# Get User ID (note this is not the user's wallet address; it is a WOF internal ID)	
try:
	userId = mySettings['user_id']
	if len(userId) == 0:
		userId = getUserIdFromUserRaces(walletAddress)
		if len(userId) == 0:
			raise
except:
	active = False
	logging.info('Unable to find any races you have entered; therefore unable to find your User ID (note this is NOT your wallet address).  Please enter at least 1 race before running this script.')
	exit()
			
# This variable will allow the continuous looping of the race check; if at some point a fatal error occurs, this will be set to False and the script will terminate.
active = True
try:
	while (active):
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
				if any([True for elem in race['participants'] if userId in elem.values()]):
					joinedList.append(race)
				else:
					unjoinedList.append(race)

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
			for race in joinedList:
				for participant in race['participants']:
					joinedParticipants.append(participant)

			logging.info('Not Joined (Sorted by Participant Count Desc):')
			for race in sortedUnjoinedList:
				participants = race['participants']
				participantCount = len(participants)
				distance = race['distance']/1000
				logging.info('	{0} (Type: {1} ; Distance: {2}; Participant(s): {3})'.format(race['name'], race['class'], str(distance), str(participantCount)))
				if 'sponsor' in race.keys():
					logging.info('		Sponsor: {0}'.format(race['sponsor']))
				if 'promo_link' in race.keys():
					logging.info('		Promo Link: {0}'.format(race['promo_link']))
				if participantCount >= participationThreshold:
					# Get vehicles with same Transportation Mode as the race's class
					availableVehiclesInClass = []
					for vehicle in myVehicles:
						if [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Transportation Mode'][0].lower() in race['class'].lower():
							availableVehiclesInClass.append(vehicle)
							
					# Put into a list of available vehicles to race those whose max range is >= race distance and above/below the threshold for a given Vehicle Type
					# Thresholds are defined in the dictionaries at the top; you can adjust these and create additional scenarios as needed.
					availableVehiclesToRace = []
					for vehicle in availableVehiclesInClass:
						allowed = True
						vehicleType = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Vehicle Type'][0].lower()
						vehicleMaxRange = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Range'][0]
						vehicleMaxSpeed = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Speed'][0]
						vehicleClass = [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Transportation Mode'][0].lower()
						
						if not any([True for elem in joinedParticipants if vehicle['token_id'] == elem['vehicle']['token_id']]):
							logging.info('		Distance: {0}, Vehicle: {1} ; Type: {2} ; Range: {3} ; Speed: {4} '.format(str(distance), vehicle['name'], vehicleType, vehicleMaxRange, vehicleMaxSpeed))
							if (distance > vehicleMaxRange):
								logging.info('			Distance is greater than vehicle\'s range; excluding from the race.')
								allowed = False
							else:
								if vehicleClass == 'ground':
									if (distance < distanceThresholds['ground']['bot'] and vehicleType not in ['delivery robot']):
										logging.info('			Distance is less than {0} and your WOF is not a bot; excluding from the race.'.format(distanceThresholds['ground']['bot']))
										allowed = False
									elif (distance < distanceThresholds['ground']['botvan'] and vehicleType not in ['delivery robot', 'van']):
										logging.info('			Distance is less than {0} and your WOF  is not a bot or van; excluding from the race.'.format(distanceThresholds['ground']['botvan']))
										allowed = False
									elif (distance < distanceThresholds['ground']['botvantrain'] and vehicleType not in ['delivery robot', 'locomotive / train', 'van']):
										logging.info('			Distance is less than {0} and your WOF is not a bot or train or van; excluding from the race.'.format(distanceThresholds['ground']['botvantrain']))
										allowed = False
									elif (distance > distanceThresholds['ground']['semitruck'] and vehicleType != 'semi truck'):
										logging.info('			Distance is greater than {0} and your WOF is not a semi-truck; excluding from the race.'.format(distanceThresholds['ground']['semitruck']))
										allowed = False
								elif vehicleClass == 'air':
									if (distance < distanceThresholds['air']['drone'] and vehicleType not in ['drone']):
										logging.info('			Distance is less than {0} and your WOF is not a drone; excluding from the race..'.format(distanceThresholds['air']['drone']))
										allowed = False
							if allowed:
								availableVehiclesToRace.append(vehicle)

					# If any vehicles are available to race, choose the best one based on speed and emission rate
					if len(availableVehiclesToRace) > 0:
						selectedVehicle = None
						logging.info('		---------------------------------------------------------------------------------------------------')
						logging.info('		There are available Vehicles to race in/on {0}; choosing the best based on speed and emission rate:'.format(race['class']))
						sortedAvailableVehiclesToRace = availableVehiclesToRace
						for vehicle in availableVehiclesToRace:
							vehicle.update({'speed': [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Max Speed'][0], 'emission': [tt['value'] for tt in vehicle['attributes'] if tt['trait_type'] == 'Emission Rate'][0] })
						sortedAvailableVehiclesToRace = sorted(availableVehiclesToRace, key = lambda elem: (elem['speed'], elem['emission']), reverse = True)
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
								#joinResponse = session.post(joinRaceEndpoint, data=json.dumps(joinApiData))
								#logging.info(jsonData)
								logging.info('		{0} (ID #{1}) is now in the race - good luck!'.format(selectedVehicle['name'], selectedVehicle['token_id']))
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
	
