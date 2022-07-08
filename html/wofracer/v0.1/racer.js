/*
    WOF Racer script - see README.md for details on usage and latest features.

    Some code incorporated from:   
        distinct(): https://stackoverflow.com/a/58339390
        k_combinations(): https://gist.github.com/axelpale/3118596
        roundTo(): https://stackoverflow.com/questions/10015027/javascript-tofixed-not-rounding/32605063#32605063
        Tabs: https://github.com/mattheworiordan/jquery.infinite.tabs
        Timer: https://css-tricks.com/how-to-create-an-animated-countdown-timer-with-html-css-and-javascript/
        WorldOfFreight: https://worldoffreight.xyz/
*/

/* View Models */
function AdjustableVM(vehicleType, adjustables)
{
    var self = this;

    self.vehicleType = ko.observable(vehicleType);

    self.delays = ko.observable(adjustables.delays);
    self.terrain = ko.observable(adjustables.terrain);
    self.weather = ko.observable(adjustables.weather);
}

function AdjustablesVM()
{
    var self = this;

    self.selectedVehicleType = ko.observable();
    self.setSelectedVehicleType = function(data, event)
    {
        self.selectedVehicleType(data);
    }

    self.vehicleAdjustables = ko.observableArray();
}

function FilterVM(data)
{
    var self = this;

    self.selectedFilterClass = ko.observable();
    self.filterClass = function(whichFilter, data, event)
    {

        var attrExists = $('#spn' + whichFilter).parent().attr('style');
        $('#td' + whichFilter).html($('#spn' + whichFilter + 'Template').clone().prop('id', '#spn' + whichFilter));
    }
}

function JoinedRacesVM(joinedRaces)
{
    if (joinedRaces == null) return;

    var self = this;

    self.terrainIcon = function(terrain)
    {
        return (terrain) ? terrain.substring(0, 2) : '';
    }

    self.joinedRaceList = ko.observableArray(joinedRaces);
}

function MySettingsVM()
{
    var self = this;

    self.authorization_key = ko.observable();
    self.enable_permutations = ko.observable();
    self.excluded_vehicles = ko.observableArray();
    self.participation_threshold = ko.observable();
    self.race_query_result_limit = ko.observable();
    self.refreshRateMilliseconds = ko.pureComputed(function() {return self.refreshRateSeconds()*1000;});
    self.refresh_rate_seconds = ko.observable();
    self.refreshRateSeconds = ko.pureComputed(function() {return (!isNaN(self.refresh_rate_seconds()) && (self.refresh_rate_seconds() >= 30) ) ? self.refresh_rate_seconds() : 30; });
    self.wallet_address = ko.observable();
}

function NextToRaceRacesVM(nextToRaceRaces)
{
    if (nextToRaceRaces == null) return;

    var self = this;

    self.terrainIcon = function(terrain)
    {
        return (terrain) ? terrain.substring(0, 2) : '';
    }

    self.joinedRaceList = ko.observableArray(nextToRaceRaces);
}

function UnjoinedRacesVM(unjoineRaces)
{
    if (unjoinedRaces == null) return;
    
    var self = this;

    self.raceDistance = ko.observable();

    self.selectRace = function(data, event)
    {
    }

    self.terrainIcon = function(terrain)
    {
        return (terrain) ? terrain.substring(0, 2) : '';
    }

    self.unjoinedRaceList = ko.observableArray();
}

function UserInfoVM(username)
{
    var self = this;
    self.ParticipationThreshold = ko.pureComputed(function() { return mySettings.participation_threshold() });
    self.Username = ko.observable(username);
    self.UserVehiclesCount = ko.observable();
    self.UserVehiclesUpgradedCount = ko.observable();
}

/* API calls + data retrieval */
function applyUnapplyUpgrade(tokenId, upgradeId, unOrNot)
{
    apiData = structuredClone(applyUnapplyTemplate);
    apiData.address = mySettings.wallet_address();
    apiData.token_id = tokenId;
    apiData.upgrade = upgradeId;

    $.post(applyUnapplyApi.replace("{un}", unOrNot), JSON.stringify(apiData), function(data) 
        {
            Log('applyUnapplyUpgrade () - Begin post()', 'severity-info', 'Info');
            Log('applyUnapplyUpgrade () - status: ', 'severity-info', 'Info');
            Log('       ' + JSON.stringify(data), 'severity-info', 'Info');
            if (!data.error) 
            {
                Log('       Token {0} - Upgrade #{1} {2}applied.'.replace('{0}', tokenId).replace('{1}', upgradeId).replace('{2}', unOrNot), 'severity-info', 'Info');
            }
            Log('applyUnapplyUpgrade() - End post()', 'severity-info', 'Info');
        }
    , 'json');
}

function getLocalData()
{
    Log('getLocalData() - Start Function', 'severity-info', 'Info');

    $.when(
        $.getJSON('mysettings.json', function(data) 
        {
            Log('getLocalData() - Begin mysettings.json getJSON()', 'severity-info', 'Info');

            if (!bound['mySettingsVM'])
            {
                mySettings = new MySettingsVM();
                ko.applyBindings(mySettings, $('#divNavSettings').get(0));
                bound['mySettingsVM'] = true;
            }

            mySettings.authorization_key(data.authorization_key);
            mySettings.excluded_vehicles(data.excluded_vehicles);
            mySettings.wallet_address(data.wallet_address);
            mySettings.participation_threshold(data.participation_threshold);
            mySettings.refresh_rate_seconds(data.refresh_rate_seconds);
            mySettings.race_query_result_limit((data.race_query_result_limit) ? data.race_query_result_limit : 50);
            mySettings.enable_permutations( (data.enable_permutations == null) ? true : data.enable_permutations);
            joinTemplate.address = mySettings.wallet_address();
            userRacesTemplate.address = mySettings.wallet_address();

            Log('getLocalData() - End mysettings.json getJSON()', 'severity-info', 'Info');
        }, 'json'),
        $.getJSON('postqueries.json', function(data) 
        {
            Log('getLocalData() - Begin postqueries.json getJSON()', 'severity-info', 'Info');
            postQueries = data.postQueries;
            Log('getLocalData() - End postqueries.json getJSON()', 'severity-info', 'Info');
        }, 'json'),
        $.getJSON('adjustables.json', function(data) 
        {
            Log('getLocalData() - Begin adjustables.json getJSON()', 'severity-info', 'Info');
            vehicleAdjustables = data.vehicleAdjustables;
            Log('getLocalData() - End adjustables.json getJSON()', 'severity-info', 'Info');
        }, 'json')
    ).done(
        function()
        {
            Log('getLocalData() - Begin done() ', 'severity-info', 'Info');

            $.ajaxSetup(
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': mySettings.authorization_key()
                    }
                }
            );

            Log('getLocalData() - Call getServerData()', 'severity-info', 'Info');
            getServerData();

            Log('getLocalData() - End done() ', 'severity-info', 'Info');
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });		
}

function getServerData()
{
    Log('getServerData() - Start', 'severity-info', 'Info');
    postQueries.Racers.variables.address = mySettings.wallet_address();
    postQueries.Fleet.variables.address = mySettings.wallet_address();

    $.when(
        $.post(graphQlApi, JSON.stringify(postQueries.Racers), function(data) {
            Log('getServerData() - Begin Racers post()', 'severity-info', 'Info');
            if (!bound['userInfoVM'])
            {
                userInfoVM = new UserInfoVM(data.data.racers[0].username);
                ko.applyBindings(userInfoVM, $('#userInfo').get(0));
                bound['userInfoVM'] = true;
            }
            Log('getServerData() - End Racers post()', 'severity-info', 'Info');
        }, 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.Fleet), function(data) 
            {
                Log('getServerData() - Begin Fleet post()', 'severity-info', 'Info');
                if (!bound['userVehiclesVM'])
                {
                    userVehiclesVM = ko.mapping.fromJS(data.data.token_metadata);
                    ko.applyBindings(userVehiclesVM, $('#divUserVehicles').get(0));
                    $('#divUserVehicles').children().appendTo('#divExcludedUserVehicles');
                    bound['userVehiclesVM'] = true;
                }

                Log('getServerData() - End Fleet post()', 'severity-info', 'Info');
                Log(JSON.stringify(userVehiclesVM), 'severity-info', 'Info');
            }
        , 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.UpcomingRaces_FreeRaces).replace('"{race_query_free_races_result_limit}"', mySettings.race_query_result_limit()), function(data) {
            Log('getServerData() - Begin Free Races post()', 'severity-info', 'Info');

            upcomingFreeRaces = data.data.races;

            Log('getServerData() - End Paid Races post()', 'severity-info', 'Info');
        }, 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.UpcomingRaces_PaidRaces).replace('"{race_query_paid_races_result_limit}"', mySettings.race_query_result_limit()), function(data) {
            Log('getServerData() - Begin Free Races post()', 'severity-info', 'Info');

            upcomingPaidRaces = data.data.races;

            Log('getServerData() - End Paid Races post()', 'severity-info', 'Info');
        }, 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.NextToRaceRaces), function(data) {
            Log('getServerData() - Begin Next-ToRace Races post()', 'severity-info', 'Info');

            nextToRaceRaces = data.data.races;
            if (nextToRaceRaces.length > 0)
            {
                $('#divAtLeast1NextToRaceRaces').show();
                $('#divNoNextToRaceRaces').hide();
            } 
            else
            {
                $('#divAtLeast1NextToRaceRaces').hide();
                $('#divNoNextToRaceRaces').show();
            }

            Log('getServerData() - End Next-To-Race Races post()', 'severity-info', 'Info');
        }, 'json')
    ).done(
        function() 
        { 
            Log('getServerData() - Begin done()', 'severity-info', 'Info');

            var tokenIds = [];
            userVehiclesVM().forEach(userVehicle => {
                tokenIds.push(userVehicle.token_id());
            });
            $.when(
                $.post(graphQlApi, JSON.stringify(postQueries.Upgrades).replace('"{tokenIds}"', "[" + tokenIds + "]"), function(data) {
                    Log('getServerData() - Begin Upgrade List post()', 'severity-info', 'Info');
        
                    userVehiclesVM().forEach(userVehicle =>
                        {
                            userVehicle.UpgradedStats = ko.mapping.fromJS(data.data.upgraded_stats.filter( stat => { return stat.token_id === userVehicle.token_id(); } ));
                        }
                    )
         
                    Log('getServerData() - End Upgrade List post()', 'severity-info', 'Info');
                }, 'json'),
                $.post(graphQlApi, JSON.stringify(postQueries.UpgradesApplied).replace('"{tokenIds}"', "[" + tokenIds + "]"), function(data) {
                    Log('getServerData() - Begin Upgrades Applied post()', 'severity-info', 'Info');
        
                    userVehiclesVM().forEach(userVehicle =>
                        {
                            userVehicle.UpgradesApplied = ko.mapping.fromJS(data.data.upgraded_stats.filter( stat => { return stat.token_id === userVehicle.token_id(); } ));
                        }
                    );

                    userInfoVM.UserVehiclesCount(userVehiclesVM().length);
                    userInfoVM.UserVehiclesUpgradedCount(userVehiclesVM().filter(uv => { return uv.UpgradesApplied().length > 0 }).length);

                    Log('getServerData() - End Upgrades Applied post()', 'severity-info', 'Info');
                }, 'json')
            ).done( 
                function() 
                { 
                    Log('getServerData() - Call setupSettings()', 'severity-info', 'Info')
                    setupSettings();
                    Log('getServerData() - call setupUpgradePermutations()', 'severity-info', 'Info');
                    setupUpgradePermutations();
                    Log('getServerData() - Call afterRaceQuery()', 'severity-info', 'Info')
                    afterRaceQuery(true);
                } 
            );


            Log('getServerData() - End done()', 'severity-info', 'Info'); 
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });		
}

/* Additional Functions */
function afterRaceQuery(doSetTimeout, ignoreJoinRace)
{
    Log('afterRaceQuery() - Begin', 'severity-info', 'Info');

    Log('afterRaceQuery() - Update Last Updated()', 'severity-info', 'Info')
    $('#lastUpdated').html(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));
    updateTimer();
    if (timerIntervalId) clearInterval(timerIntervalId);
    startTimer();

    Log('afterRaceQuery() - Call setupNextToRaceRaces()', 'severity-info', 'Info')
    setupNextToRaceRaces();

    Log('afterRaceQuery() - Call setupUpcomingRaces()', 'severity-info', 'Info')
    setupUpcomingRaces();

    Log('afterRaceQuery() - Call assignUserVehicles()', 'severity-info', 'Info')
    assignUserVehicles();

    if (!ignoreJoinRace)
    {
        Log('afterRaceQuery() - Call joinRace()', 'severity-info', 'Info')
        joinRace();
    }

    if (doSetTimeout)
    {
        timeoutId = setTimeout(function() 
        { 
            refreshData(doSetTimeout); 
        }, mySettings.refreshRateMilliseconds());
    }

    Log('afterRaceQuery() - End', 'severity-info', 'Info'); 
}

function assignUserVehicles()
{
    Log('assignUserVehicles() - Start Function', 'severity-info', 'Info');

    $.each(unjoinedRacesVM.unjoinedRaceList(), function(index)
        {
            var unjoinedRace = unjoinedRacesVM.unjoinedRaceList()[index];
            Log('assignUserVehicles() - Begin Selecting Best Vehicle for Race {0}:'.replace('{0}', unjoinedRace.name), 'severity-info', 'Info');

            raceClass = unjoinedRace.class.toLowerCase();
            raceDistance = roundTo(unjoinedRace.distance, 4);
            raceName = unjoinedRace.name;
            raceWeather = (unjoinedRace.weather ? unjoinedRace.weather : '');
            raceTerrain = (unjoinedRace.terrain ? unjoinedRace.terrain : '');
            participants = unjoinedRace.participants;
            participantCount = participants.length;
            cargoWeight = unjoinedRace.weight;
       
            Log(
                'Class: {0}\nDistance: {1}\nName: {2}\nWeather: {3}\nTerrain: {4}\nParticipant Count: {5}\nCargo Weight: {6}'
                .replace('{0}', raceClass)
                .replace('{1}', raceDistance)
                .replace('{2}', raceName)
                .replace('{3}', raceWeather)
                .replace('{4}', raceTerrain)
                .replace('{5}', participantCount)
                .replace('{6}', cargoWeight)
                , 'severity-info', 'Info'
            );
            
            var availableVehiclesInClass = [];
            var availableVehiclesToRace = [];
            var excludedDueToTripsOrRefuels = [];
            var firstTime = true;

            userVehiclesVM().forEach(userVehicle =>
                {
                    if ((userVehicle.staticAttributes.transportation_mode().toLowerCase() == raceClass) && (mySettings.excluded_vehicles.indexOf(userVehicle.token_id()) == -1))
                    {
                        userVehicle.vehicleImageUrl = userVehicle.image();
                        userVehicle.vehicleName = userVehicle.name();
                        userVehicle.vehicleTokenId = userVehicle.token_id();
                        availableVehiclesInClass.push(userVehicle);
                    }
                }
            );

            vehiclePermutationFinalTimes = [];
            if (availableVehiclesInClass.length > 0)
            {
                vehiclePermutationFinalTime = {};
                availableVehiclesInClass.forEach(availableVehicle =>
                    {
                        var alreadyJoinedRace = joinedRaces.filter(joinedRace => { return joinedRace.participants.filter(participant => { return participant.vehicle.token_id === availableVehicle.token_id() }).length > 0} );
                        vehicleName = availableVehicle.name();
                        if (alreadyJoinedRace.length > 0)
                        {
                            Log('{0} is already joined in a race; eliminating.'
                                .replace('{0}', vehicleName)
                                , 'severity-info', 'Info'
                            );
                            allowedVehicle = false;
                            alreadyJoinedRace[0].enteredVehicle.numberOfRefuels = 0;
                            alreadyJoinedRace[0].enteredVehicle.numberOfTrips = 0;
                        }
                        else
                        {
                            vehicleType = availableVehicle.staticAttributes.vehicle_type();
                            vehicleClass = availableVehicle.staticAttributes.transportation_mode();
                            availableVehicle.StatsPermutations.forEach(permutation =>
                                {
                                    vehicleMaxCapacity = permutation.max_capacity;
                                    vehicleMaxRange = permutation.max_range;
                                    vehicleStatMaxSpeed = permutation.max_speed;
                                    vehicleEmissionRate = permutation.emission_rate;
                                    vehicleFuelEfficiency = permutation.fuel_efficiency;
                                    numberOfTrips = Math.ceil(cargoWeight / vehicleMaxCapacity);
                                    vehicleAdjustedRaceDistance = raceDistance + ((numberOfTrips-1)*raceDistance*2);
                                    numberOfRefuels = Math.ceil(vehicleAdjustedRaceDistance / vehicleMaxRange);
                                    vehicleAdjustable = vehicleAdjustables.filter(function(vehicleAdjustable) {return vehicleAdjustable.vehicleType.toLowerCase() === vehicleType.toLowerCase()})[0];
                                    boostFactor = ((raceDistance >= vehicleAdjustable.boosts.rangeLimitLower) && (raceDistance <= vehicleAdjustable.boosts.rangeLimitUpper)) ? vehicleAdjustable.boosts.boostFactor : 1;
                                    vehicleMaxSpeed = vehicleAdjustable.maxSpeed;
                                    vehicleAccelerationDelay = vehicleAdjustable.adjustables.delays.accelerationDelay * numberOfRefuels * (1 + (Math.abs(5 - vehicleEmissionRate)/100));
                                    vehicleDecelerationDelay = vehicleAdjustable.adjustables.delays.decelerationDelay * numberOfRefuels * (1 + (Math.abs(5 - vehicleEmissionRate)/100));
                                    vehicleRefuelingDelay = vehicleAdjustable.adjustables.delays.refuelingDelay;
                                    permutation.numberOfTrips = numberOfTrips;
                                    permutation.numberOfRefuels = numberOfRefuels;
                                    permutation.allowed = true;

                                    exclusionReasonShort = (numberOfTrips > 5) ? 'trips' : ( (numberOfRefuels > 5) ? 'refuels' : '' );
                                    if ((numberOfTrips > 5) || (numberOfRefuels > 5))
                                    {
                                        exclusionReason = '{0} will need more than 5 {1} to complete the distance of {2}km for race [{3}]; eliminating.'
                                            .replace('{0}', vehicleName)
                                            .replace('{1}', exclusionReasonShort)
                                            .replace('{2}', raceDistance)
                                            .replace('{3}', raceName);
                                        Log(exclusionReason , 'severity-info', 'Info');
                                        permutation.allowed = false;
                                        permutation.exclusionReason = exclusionReasonShort;
                                        permutation.finalAdjustedTime = 0;
                                    }

                                    if (permutation.allowed)
                                    {
                                        terrainSpeedFactor = (vehicleAdjustable.adjustables.terrainSpeedFactor && raceTerrain.length > 0) ? vehicleAdjustable.adjustables.terrainSpeedFactor[raceTerrain] : 1;
                                        vehicleAdjustedSpeed = vehicleStatMaxSpeed;
                                        if (vehicleStatMaxSpeed > (vehicleMaxSpeed*terrainSpeedFactor))
                                        {
                                            vehicleAdjustedSpeed = 0
                                        }
                                        estimatedTimeToComplete = (vehicleAdjustedRaceDistance / vehicleAdjustedSpeed)*3600 + (vehicleAccelerationDelay + vehicleDecelerationDelay)*(numberOfRefuels + 1); // Extra accel/decel delay for start and stop
                                        terrainAdjustment = (vehicleAdjustable.adjustables.terrain && raceTerrain.length > 0) ? vehicleAdjustable.adjustables.terrain[raceTerrain] : 1;
                                        weatherAdjustment = (vehicleAdjustable.adjustables.weather && raceWeather.length > 0) ? vehicleAdjustable.adjustables.weather[raceWeather] : 1;
                                        terrainAndWeatherAdjustedTime = estimatedTimeToComplete * terrainAdjustment * weatherAdjustment;
                                        boostAdjustedTime = terrainAndWeatherAdjustedTime * boostFactor;
                                        finalAdjustedTime = boostAdjustedTime + ((10 - vehicleFuelEfficiency)*.01) + (Math.abs(5 - vehicleEmissionRate)*.01);
                                        permutation.finalAdjustedTime = finalAdjustedTime;
                                        vehicleNameLong = availableVehicle.name() + ' (' + availableVehicle.staticAttributes.vehicle_type() + ', ID_Permutation = '  + permutation.PermutationId + ')'
                                        vehiclePermutationFinalTimes.push({'key': permutation.PermutationId, 'val': {'longName': vehicleNameLong, 'time': permutation.finalAdjustedTime, 'comboUpgrades': permutation.comboUpgrades}});
                                        Log(
                                            'vehicle: ' + vehicleNameLong
                                            + '\nnumberOfTrips: ' + numberOfTrips 
                                            + '\nnumberOfRefuels: ' + numberOfRefuels 
                                            + '\nvehicleMaxCapacity: ' + vehicleMaxCapacity
                                            + '\nvehicleMaxSpeed: ' + vehicleMaxSpeed
                                            + '\nvehicleAdjustedRaceDistance: ' + vehicleAdjustedRaceDistance 
                                            + '\nvehicleAdjustedSpeed: ' + vehicleAdjustedSpeed
                                            + '\nvehicleAccelerationDelay: ' + vehicleAccelerationDelay
                                            + '\nvehicleDecelerationDelay: ' + vehicleDecelerationDelay
                                            + '\nterrainSpeedFactor: ' + terrainSpeedFactor
                                            + '\nterrainAdjustment: ' + terrainAdjustment
                                            + '\nweatherAdjustment: ' + weatherAdjustment
                                            + '\nboostFactor: ' + boostFactor
                                            + '\nestimatedTimeToComplete: ' + estimatedTimeToComplete
                                            + '\nfinalAdjustedTime: ' + finalAdjustedTime
                                            + '\nraceTerrain, adjustable.terrain: ' + raceTerrain + ', ' + vehicleAdjustable.adjustables.terrain[raceTerrain]
                                            + '\nraceWeather, adjustable.weather: ' + raceWeather + ', ' + vehicleAdjustable.adjustables.weather[raceWeather]
                                            , 'severity-info', 'Info'
                                        );
                                    }
                                }
                            );
                        }
                    }
                );
            }

            if (vehiclePermutationFinalTimes.length > 0)
            {
                finalAdjustedTimes = '';
                vehiclePermutationFinalTimes.sort(function(a, b) {return a.val.time > b.val.time  ? 1 : -1});
                vehiclePermutationFinalTimes.forEach( vehiclePermutation =>
                    {
                        finalAdjustedTimes = finalAdjustedTimes + vehiclePermutation.val.longName + ': ' + vehiclePermutation.val.time + '\n';
                    }
                );
                Log('finalAdjustedTimes:\n' + finalAdjustedTimes, 'severity-info', 'Info');
                selectedVehiclePermutationIds = ko.mapping.toJS(vehiclePermutationFinalTimes[0]).val.comboUpgrades.map(x => x.upgrade.id).flat(1);
                Log('selectedVehiclePermutationIds:\n' + selectedVehiclePermutationIds);

                var vehiclePermutationIdWithShortestTime = vehiclePermutationFinalTimes[0].key;
                var selectedVehicle = availableVehiclesInClass.find(vehicle => { return vehicle.token_id() == vehiclePermutationIdWithShortestTime.split('_')[0]; });
                selectedVehicle.SelectedPermutation = (selectedVehicle.StatsPermutations == null) ? null : selectedVehicle.StatsPermutations.find(permutation => { return permutation.PermutationId == vehiclePermutationIdWithShortestTime; });
                if (selectedVehicle.SelectedPermutation != null)
                {
                    selectedVehicle.SelectedPermutation.max_capacity_display = Number(parseFloat(selectedVehicle.SelectedPermutation.max_capacity)).toLocaleString();
                    selectedVehicle.SelectedPermutation.max_range_display = Number(parseFloat(selectedVehicle.SelectedPermutation.max_range)).toLocaleString();
                    selectedVehicle.SelectedPermutation.max_speed_display = Number(parseFloat(selectedVehicle.SelectedPermutation.max_speed)).toLocaleString();
                    selectedVehicle.numberOfTrips = selectedVehicle.SelectedPermutation.numberOfTrips;
                    selectedVehicle.numberOfRefuels = selectedVehicle.SelectedPermutation.numberOfRefuels;
                    ko.mapping.fromJS(selectedVehicle.SelectedPermutation.comboUpgrades, {}, unjoinedRace.selectedVehicle.SelectedPermutation.comboUpgrades);
                    ko.mapping.fromJS(selectedVehicle.SelectedPermutation, {}, unjoinedRace.selectedVehicle.SelectedPermutation);
                    ko.mapping.fromJS(selectedVehicle, {}, unjoinedRace.selectedVehicle);
                }
                else
                {
                    unjoinedRace.selectedVehicle.numberOfRefuels(0);
                    unjoinedRace.selectedVehicle.numberOfTrips(0);
                    unjoinedRace.selectedVehicle.vehicleId('');
                    unjoinedRace.selectedVehicle.vehicleImageUrl('');
                    unjoinedRace.selectedVehicle.vehicleTokenId('');
                    unjoinedRace.selectedVehicle.vehicleName("No suitable {0} WOFs.".replace('{0}', raceClass));
                }
            }
            else
            {
                unjoinedRace.selectedVehicle.numberOfRefuels(0);
                unjoinedRace.selectedVehicle.numberOfTrips(0);
                unjoinedRace.selectedVehicle.vehicleId('');
                unjoinedRace.selectedVehicle.vehicleImageUrl('');
                unjoinedRace.selectedVehicle.vehicleTokenId('');
                unjoinedRace.selectedVehicle.vehicleName("No available {0} WOFs in fleet.".replace('{0}', raceClass));
            }
            Log('assignUserVehicles() - End Selecting Best Vehicle for Race {0}:'.replace('{0}', unjoinedRace.name), 'severity-info', 'Info');
        }
    );

    Log('assignUserVehicles() - End Function', 'severity-info', 'Info');
}

function cloneImages()
{
    $('#td_icon_ground').empty().append($('#img_class_ground').clone().prop('id', 'img_class_ground_clone_nav'));
    $('#td_icon_water').empty().append($('#img_class_water').clone().prop('id', 'img_class_water_clone_nav'));
    $('#td_icon_air').empty().append($('#img_class_air').clone().prop('id', 'img_class_air_clone_nav'));
    $('#td_icon_space').empty().append($('#img_class_space').clone().prop('id', 'img_class_space_clone_nav'));

    $('#td_icon_fleet').empty().append($('#img_garage_performance').clone().prop('id', 'img_garage_performance_nav'));
    
    $('.race-image-class-ground').empty().append($('#img_class_ground').clone().prop('id', 'img_class_ground_clone')).attr({'title': 'Ground'});
    $('.race-image-class-water').empty().append($('#img_class_water').clone().prop('id', 'img_class_water_clone')).attr({'title': 'Water'});
    $('.race-image-class-air').empty().append($('#img_class_air').clone().prop('id', 'img_class_air_clone')).attr({'title': 'Air'});
    $('.race-image-class-space').empty().append($('#img_class_space').clone().prop('id', 'img_class_space_clone')).attr({'title': 'Space'});

    $('.race-image-weather-foggy').empty().append($('#img_weather_foggy').clone().prop('id', 'img_class_weather_foggy_clone')).attr({'title': 'Foggy'});
    $('.race-image-weather-icy').empty().append($('#img_weather_icy').clone().prop('id', 'img_class_weather_icy_clone')).attr({'title': 'Icy'});
    $('.race-image-weather-rainy').empty().append($('#img_weather_rainy').clone().prop('id', 'img_class_weather_rainy_clone')).attr({'title': 'Rainy'});
    $('.race-image-weather-snowy').empty().append($('#img_weather_snowy').clone().prop('id', 'img_class_weather_snowy_clone')).attr({'title': 'Snowy'});
    $('.race-image-weather-sunny').empty().append($('#img_weather_sunny').clone().prop('id', 'img_class_weather_sunny_clone')).attr({'title': 'Sunny'});
    $('.race-image-weather-stormy').empty().append($('#img_weather_stormy').clone().prop('id', 'img_class_weather_stormy_clone')).attr({'title': 'Stormy'});
    $('.race-image-weather-windy').empty().append($('#img_weather_windy').clone().prop('id', 'img_class_weather_windy_clone')).attr({'title': 'Windy'});
}

function distinct(arr, propName) 
{
    var result = arr.reduce(function (arr1, e1) {
        var matches = arr1.filter(function (e2) {
            return e1[propName] == e2[propName];
        })
        if (matches.length == 0)
            arr1.push(e1)
        return arr1;
    }, []);

    return result;
}

function joinRace()
{
    Log('joinRace() - Start function', 'severity-info', 'Info');

    if (unjoinedRacesVM.unjoinedRaceList().length == 0) return;

    joined = false;
    i = 0;
    while ((!joined) && (i < unjoinedRacesVM.unjoinedRaceList().length))
    {
        var unjoinedRace = unjoinedRacesVM.unjoinedRaceList()[i];

        participantCount = unjoinedRace.participants.length;
        i++;
        modifiedParticipationThreshold = (unjoinedRace.class.toLowerCase() == 'space') ? Math.round(userInfoVM.ParticipationThreshold()*.7, 0) : userInfoVM.ParticipationThreshold();
        if ((participantCount >= modifiedParticipationThreshold) && (unjoinedRace.selectedVehicle.vehicleTokenId()) && (unjoinedRace.entry_fee === 0))
        {
            Log('joinApiData: Unapplying all hot-swap upgrades...', 'severity-info', 'Info');
            unjoinedRace.selectedVehicle.ownedUpgrades().forEach(ownedUpgrade =>
                {
                    applyUnapplyUpgrade(unjoinedRace.selectedVehicle.vehicleTokenId(), ownedUpgrade.upgrade.id(), 'un');
                }
            );
            unjoinedRace.selectedVehicle.SelectedPermutation.comboUpgrades().forEach(upgradeToApply =>
                {
                    applyUnapplyUpgrade(unjoinedRace.selectedVehicle.vehicleTokenId(), upgradeToApply.upgrade.id(), '');
                }
            );
            var userVehicle = userVehiclesVM().find(vehicle => { return vehicle.token_id() == unjoinedRace.selectedVehicle.vehicleTokenId()});
            userVehicle.LastAppliedUpgrades = unjoinedRace.selectedVehicle.SelectedPermutation.comboUpgrades();

            joined = true;
            joinApiData = structuredClone(joinTemplate);
            joinApiData.address = mySettings.wallet_address();
            joinApiData.raceId = unjoinedRace.id;
            joinApiData.tokenId = unjoinedRace.selectedVehicle.vehicleTokenId();
            Log('walletAddress: ' + mySettings.wallet_address(), '\nselectedRaceId: ' + joinApiData.raceId + '\nselectedVehicleId: ' + joinApiData.tokenId, 'severity-info', 'Info');
            Log('joinApiData:\n' + JSON.stringify(joinApiData), 'severity-info', 'Info');
            $.when(
                $.post(joinApi, JSON.stringify(joinApiData), function(data) 
                    {
                        Log('joinRace() - Begin post()', 'severity-info', 'Info');
                        Log('joinRace() - status: ', 'severity-info', 'Info');
                        Log('       ' + JSON.stringify(data), 'severity-info', 'Info');
                        if (!data.error) 
                        {
                            Log('       Congratulations, your WOF # {0} is now in the race!'.replace('{0}', joinApiData.tokenId), 'severity-info', 'Info');
                            if (timeoutId)
                            {
                                clearTimeout(timeoutId);
                            }
                            refreshData(true, true);
                        }
                        Log('joinRace() - End post()', 'severity-info', 'Info');
                    }
                , 'json')
            ).done(
                function() 
                { 
                    Log('joinRace() - Begin done()', 'severity-info', 'Info');
                    Log('joinRace() - End done()', 'severity-info', 'Info'); 
                }
            ).fail(function(jqxhr, textStatus, err) {
                console.log(err);
            });
        }
    }
    
    Log('joinRace() - End function', 'severity-info', 'Info');
}

function refreshData(doSetTimeout, ignoreJoinRace)
{
    Log('refreshData() - Start', 'severity-info', 'Info');
    $.when(
        $.post(graphQlApi, JSON.stringify(postQueries.UpcomingRaces_FreeRaces).replace('"{race_query_free_races_result_limit}"', mySettings.race_query_result_limit()), function(data) {
            Log('refreshData() - Begin Free Races post()', 'severity-info', 'Info');

            upcomingFreeRaces = data.data.races;

            Log('refreshData() - End Paid Races post()', 'severity-info', 'Info');
        }, 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.UpcomingRaces_PaidRaces).replace('"{race_query_paid_races_result_limit}"', mySettings.race_query_result_limit()), function(data) {
            Log('refreshData() - Begin Free Races post()', 'severity-info', 'Info');

            upcomingPaidRaces = data.data.races;

            Log('refreshData() - End Paid Races post()', 'severity-info', 'Info');
        }, 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.NextToRaceRaces), function(data) {
            Log('refreshData() - Begin Next-ToRace Races post()', 'severity-info', 'Info');

            nextToRaceRaces = data.data.races;
            if (nextToRaceRaces.length > 0)
            {
                $('#divAtLeast1NextToRaceRaces').show();
                $('#divNoNextToRaceRaces').hide();
            } 
            else
            {
                $('#divAtLeast1NextToRaceRaces').hide();
                $('#divNoNextToRaceRaces').show();
            }

            Log('refreshData() - End Next-to-Race Races post()', 'severity-info', 'Info');
        }, 'json')
    ).done(
        function() 
        { 
            afterRaceQuery(doSetTimeout, ignoreJoinRace);
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });		

    Log('refreshData() - End', 'severity-info', 'Info');
}

function roundTo(n, digits) 
{
    if (digits === undefined) {
        digits = 0;
    }

    var multiplicator = Math.pow(10, digits);
    n = parseFloat((n * multiplicator).toFixed(11));
    return Math.round(n) / multiplicator;
}

function setupNavPages()
{
    Log('setupNavPages() - Begin', 'severity-info', 'Info');

    $('.nav-icon').click(function()
        {
            Log('setupNavPages() - Begin nav-icon onclick', 'severity-info', 'Info');

            $('.nav-page').hide();
            var targetNavPage = '#' + $(this).attr('for');
            $(targetNavPage).show();

            $('.nav-icon').removeClass('nav-icon-border');
            $(this).addClass('nav-icon-border');

            Log('setupNavPages() - End nav-icon onclick', 'severity-info', 'Info');
        }
    );
    $('#linkRaces').click();

    $('.settings-link').click(function()
        {
            Log('setupNavPages() - Begin settings-item onclick', 'severity-info', 'Info');

            $('.settings-detail').hide();
            var targetSettingsDetail = '#' + $(this).attr('for');
            $(targetSettingsDetail).show();

            Log('setupNavPages() - End settings-item onclick', 'severity-info', 'Info');
        }
    );
    $('#tdLinkAuthKey').click();

    Log('setupNavPages() - End', 'severity-info', 'Info');
}

function setupNextToRaceRaces()
{
    $.each(nextToRaceRaces, function(index)
        {
            nextToRace = nextToRaceRaces[index];
            var enteredVehicle = nextToRace.participants.filter(function(participant) {return participant.racer.username === userInfoVM.Username()})[0];
            raceDistance = roundTo(nextToRace.distance, 4);
            cargoWeight = nextToRace.weight;
            decimalPlaces = (nextToRace.distance < 100) ? 2 : 0;
            if (enteredVehicle != null)
            {
                var userVehicle = userVehiclesVM().find(vehicle => { return vehicle.token_id() == enteredVehicle.vehicle.token_id});
                vehicleMaxCapacity = enteredVehicle.vehicle.stats.max_capacity;
                vehicleMaxRange = enteredVehicle.vehicle.stats.max_range;
                numberOfTrips = Math.ceil(cargoWeight / vehicleMaxCapacity);
                vehicleAdjustedRaceDistance = raceDistance + ((numberOfTrips-1)*raceDistance*2);
                numberOfRefuels = Math.ceil(vehicleAdjustedRaceDistance / vehicleMaxRange);
                nextToRace.enteredVehicle = 
                {
                    id:  (enteredVehicle) ? enteredVehicle.vehicle.token_id : 0,
                    image: (enteredVehicle) ? enteredVehicle.vehicle.image : null,
                    emission_rate: (enteredVehicle) ? enteredVehicle.vehicle.stats.emission_rate : '',
                    fuel_efficiency: (enteredVehicle) ? enteredVehicle.vehicle.stats.fuel_efficiency : '',
                    max_capacity_display: (enteredVehicle) ? Number(parseFloat(enteredVehicle.vehicle.stats.max_capacity)).toLocaleString() : '',
                    max_range_display: (enteredVehicle) ? Number(parseFloat(enteredVehicle.vehicle.stats.max_range)).toLocaleString() : '',
                    max_speed_display: (enteredVehicle) ? Number(parseFloat(enteredVehicle.vehicle.stats.max_speed)).toLocaleString() : '',
                    name: (enteredVehicle) ? enteredVehicle.vehicle.name : '',
                    numberOfRefuels: numberOfRefuels,
                    numberOfTrips: numberOfTrips,
                    raceDistance: roundTo(nextToRace.distance, decimalPlaces),
                    SelectedPermutation: { comboUpgrades: userVehicle.LastAppliedUpgrades },
                    weight: cargoWeight
                }
            }
            else
            {
                nextToRace.enteredVehicle = 
                {
                    id: null,
                    image: null,
                    emission_rate: null,
                    fuel_efficiency: null,
                    max_capacity_display: null,
                    max_range_display: null,
                    max_speed_display: null,
                    name: 'You have no WOFs in this race.',
                    numberOfRefuels: null,
                    numberOfTrips: null,
                    raceDistance: roundTo(nextToRace.distance, decimalPlaces),
                    SelectedPermutation: { comboUpgrades: [] },
                    weight: cargoWeight
                }
            }
        }
    );

    $('#spnNextToRaceCount').html(nextToRaceRaces.length);

    if (!bound['nextToRaceRacesVM'])
    {
        nextToRaceRacesVM = new NextToRaceRacesVM(nextToRaceRaces);
        ko.applyBindings(nextToRaceRacesVM, $('#nextToRaceRaces').get(0))
        bound['nextToRaceRacesVM'] = true;
    }

    nextToRaceRacesVM.joinedRaceList(nextToRaceRaces);
}

function setupSettings()
{
    var exclusionsToRemove = []
    $.each(mySettings.excluded_vehicles(), function(index)
        {
            var vehicleImage = $('#vehicle_' + mySettings.excluded_vehicles()[index]);
            if (vehicleImage.length > 0)
            {
                vehicleImage.addClass('image-vehicle-excluded');
                vehicleImage.prop('excluded', true);
            }
            else
            {
                exclusionsToRemove.push(mySettings.excluded_vehicles()[index]);
            }
        }
    );
    while (exclusionsToRemove.length > 0)
    {
        itemToRemove = exclusionsToRemove.pop();
        mySettings.excluded_vehicles.remove(itemToRemove);
    }

    $('.image-vehicle-small').click(function(e)
        {
            e.target.excluded = !e.target.excluded;
            var tokenId = parseInt(e.target.id.replace('vehicle_', ''));
            if (e.target.excluded)
            {
                $('#' + e.target.id).addClass('image-vehicle-excluded');
                mySettings.excluded_vehicles.push(tokenId);
            }
            else
            {
                $('#' + e.target.id).removeClass('image-vehicle-excluded');
                mySettings.excluded_vehicles.remove(tokenId);
            }
            mySettings.excluded_vehicles().sort();
            afterRaceQuery(true, true);
        }
    );
}

function setupUpcomingRaces()
{
    var unjoinedRaces = $.merge(upcomingFreeRaces, upcomingPaidRaces).filter(function(race) { return !(race.participants.some(participant => participant.racer.username === userInfoVM.Username())) });
    joinedRacesWithDupes = $.merge(upcomingFreeRaces, upcomingPaidRaces).filter(function(race) { return race.participants.some(participant => participant.racer.username === userInfoVM.Username()) });
    joinedRaces = distinct(joinedRacesWithDupes, "id");
    
    $.each(unjoinedRaces, function(index)
        {
            unjoinedRaces[index].selectedVehicle = ko.mapping.fromJS(
                {
                    numberOfRefuels: 0, 
                    numberOfTrips: 0, 
                    vehicleId: null, 
                    vehicleName: '(TBD)', 
                    vehicleImageUrl: null, 
                    vehicleTokenId: null, 
                    SelectedPermutation: 
                    {
                        emission_rate: null, 
                        fuel_efficiency: null, 
                        max_capacity: null, 
                        max_capacity_display: null, 
                        max_range: null, 
                        max_range_display: null, 
                        max_speed: null, 
                        max_speed_display: null, 
                        comboUpgrades: null
                    }  
                }
            );
            decimalPlaces = (unjoinedRaces[index].distance < 100) ? 2 : 0;
            unjoinedRaces[index].raceDistance = roundTo(unjoinedRaces[index].distance, decimalPlaces);
        }
    );

    $.each(joinedRaces, function(index)
        {
            var joinedRace = joinedRaces[index];
            var enteredVehicle = joinedRace.participants.filter(function(participant) {return participant.racer.username === userInfoVM.Username()})[0];
            var userVehicle = userVehiclesVM().find(vehicle => { return vehicle.token_id() == enteredVehicle.vehicle.token_id});
            raceDistance = roundTo(joinedRace.distance, 4);
            cargoWeight = joinedRace.weight;
            vehicleMaxCapacity = enteredVehicle.vehicle.stats.max_capacity;
            vehicleMaxRange = enteredVehicle.vehicle.stats.max_range;
            decimalPlaces = (joinedRace.distance < 100) ? 2 : 0;
            numberOfTrips = Math.ceil(cargoWeight / vehicleMaxCapacity);
            vehicleAdjustedRaceDistance = raceDistance + ((numberOfTrips-1)*raceDistance*2);
            numberOfRefuels = Math.ceil(vehicleAdjustedRaceDistance / vehicleMaxRange);
            joinedRaces[index].enteredVehicle = 
            {
                id:  enteredVehicle.vehicle.token_id,
                image: enteredVehicle.vehicle.image,
                emission_rate: (enteredVehicle) ? enteredVehicle.vehicle.stats.emission_rate : '',
                fuel_efficiency: (enteredVehicle) ? enteredVehicle.vehicle.stats.fuel_efficiency : '',
                max_capacity_display: (enteredVehicle) ? Number(parseFloat(enteredVehicle.vehicle.stats.max_capacity)).toLocaleString() : '',
                max_range_display: (enteredVehicle) ? Number(parseFloat(enteredVehicle.vehicle.stats.max_range)).toLocaleString() : '',
                max_speed_display: (enteredVehicle) ? Number(parseFloat(enteredVehicle.vehicle.stats.max_speed)).toLocaleString() : '',
                name: enteredVehicle.vehicle.name,
                numberOfRefuels: numberOfRefuels,
                numberOfTrips: numberOfTrips,
                raceDistance: roundTo(joinedRace.distance, decimalPlaces),
                SelectedPermutation: { comboUpgrades: userVehicle.LastAppliedUpgrades },
                weight: cargoWeight
            }

            //var vehicle = userVehiclesVM().find(vehicle => { return vehicle.token_id() === enteredVehicle.vehicle.token_id });
            //alert(ko.mapping.toJSON(vehicle.StatsPermutations));
            //alert(ko.mapping.toJSON(userVehiclesVM()[0].token_id));
            //alert(JSON.stringify(vehicle))

        }
    );
    $('#spnJoinedRacesCount').html(joinedRaces.length);

    if (!bound['unjoinedRacesVM'])
    {
        unjoinedRacesVM = new UnjoinedRacesVM(unjoinedRaces);
        joinedRacesVM = new JoinedRacesVM(joinedRaces);
        ko.applyBindings(unjoinedRacesVM, $('#unjoinedRaces').get(0))
        ko.applyBindings(joinedRacesVM, $('#joinedRaces').get(0))
        bound['unjoinedRacesVM'] = true;
    }

    unjoinedRaces.sort(function(a, b) {return a.participants.length < b.participants.length ? 1 : -1});
    unjoinedRacesVM.unjoinedRaceList(unjoinedRaces);
    joinedRaces.sort(function(a, b) {return a.participants.length < b.participants.length ? 1 : -1});
    joinedRacesVM.joinedRaceList(joinedRaces);

    cloneImages();

    $('#lastUpdated').html(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

}

function setupUpgradePermutations()
{
    if ($('#chkEnablePermutations').is(':checked'))
    {
        $('#tblPermutationWarning').show();
    }
    else
    {
        $('#tblPermutationWarning').hide();
    }
    userVehiclesVM().forEach(userVehicle =>
        {
            userVehicle.BaseStats = 
            {
                emission_rate: userVehicle.dynamicStats.emission_rate(),
                fuel_efficiency: userVehicle.dynamicStats.fuel_efficiency(),
                max_capacity: userVehicle.dynamicStats.max_capacity(),
                max_range: userVehicle.dynamicStats.max_range(),
                max_speed: userVehicle.dynamicStats.max_speed()
            }

            userVehicle.StatsPermutations = [];
            
            /* Add base vehicle as first permutation */
            StatsPermutation = 
            {
                emission_rate: userVehicle.BaseStats.emission_rate,
                fuel_efficiency: userVehicle.BaseStats.fuel_efficiency,
                max_capacity: userVehicle.BaseStats.max_capacity,
                max_range: userVehicle.BaseStats.max_range,
                max_speed: userVehicle.BaseStats.max_speed,
                comboUpgrades: []
            }
            StatsPermutation.PermutationId = userVehicle.token_id() + '_00';
            userVehicle.StatsPermutations.push(StatsPermutation);

            /* Add all upgrade permutations */
            if (mySettings.enable_permutations())
            {
                var ownedUpgradeIds = [];
                userVehicle.ownedUpgrades = userVehicle.UpgradedStats().filter( stat => { return stat.owned(); });
                var appliedUpgradeIds = ko.mapping.toJS(userVehicle.UpgradesApplied).map(x => x.upgrade_id).flat(1);
                userVehicle.LastAppliedUpgrades = [];
                userVehicle.ownedUpgrades.forEach( ownedUpgrade =>
                    {
                        ownedUpgradeIds.push(ownedUpgrade.upgrade.id());
                        if (appliedUpgradeIds.includes(ownedUpgrade.upgrade.id()))
                        {
                            userVehicle.LastAppliedUpgrades.push(ownedUpgrade);
                            Log('Subtracting out ownedUpgrade stats:\n' + ko.mapping.toJSON(ownedUpgrade), 'severity-info', 'Info');
                            userVehicle.BaseStats.emission_rate -= ownedUpgrade.emission_rate();
                            userVehicle.BaseStats.fuel_efficiency -= ownedUpgrade.fuel_efficiency();
                            userVehicle.BaseStats.max_capacity -= ownedUpgrade.max_capacity();
                            userVehicle.BaseStats.max_range -= ownedUpgrade.max_range();
                            userVehicle.BaseStats.max_speed -= ownedUpgrade.max_speed();
                        }
                    }
                );
    
                Log('userVehicle.BaseStats:\n' + ko.mapping.toJSON(userVehicle.BaseStats), 'severity-info', 'Info');
                i = 1;
                j = 1;
                while (i<=ownedUpgradeIds.length)
                {
                    var combos = k_combinations(ownedUpgradeIds, i);
                    combos.forEach( combo =>
                        {
                            StatsPermutation = 
                            {
                                emission_rate: userVehicle.BaseStats.emission_rate,
                                fuel_efficiency: userVehicle.BaseStats.fuel_efficiency,
                                max_capacity: userVehicle.BaseStats.max_capacity,
                                max_range: userVehicle.BaseStats.max_range,
                                max_speed: userVehicle.BaseStats.max_speed,
                                comboUpgrades: []
                            }
                            hasEcuHp = false;
                            hasEcuHe = false;
                            combo.forEach(comboItem => 
                                {
                                    ownedUpgrade = userVehicle.ownedUpgrades.find(upgrade => { return upgrade.upgrade.id() == comboItem });
                                    ownedUpgrade.upgrade.abbreviation = upgradeAbbreviations[ownedUpgrade.upgrade.name()];
                                    hasEcuHp = hasEcuHp || (ownedUpgrade.upgrade.abbreviation.toUpperCase() == 'P:ECU-HP');
                                    hasEcuHe = hasEcuHe || (ownedUpgrade.upgrade.abbreviation.toUpperCase() == 'P:ECU-HE');
                                    StatsPermutation.comboUpgrades.push(ownedUpgrade);
                                    StatsPermutation.emission_rate += ownedUpgrade.emission_rate();
                                    StatsPermutation.fuel_efficiency += ownedUpgrade.fuel_efficiency();
                                    StatsPermutation.max_capacity += ownedUpgrade.max_capacity();
                                    StatsPermutation.max_range += ownedUpgrade.max_range();
                                    StatsPermutation.max_speed += ownedUpgrade.max_speed();
                                }
                            );
                            StatsPermutation.PermutationId = userVehicle.token_id() + '_' + j;
                            if ((hasEcuHp) && (hasEcuHe))
                            {
                                Log('This permutation has both ECU-HP and ECU-HE; eliminating.', 'severity-info', 'Info')
                            }
                            else if ((StatsPermutation.emission_rate < 1) || (StatsPermutation.emission_rate > 10) || (StatsPermutation.fuel_efficiency < 1) || (StatsPermutation.fuel_efficiency > 10) || (StatsPermutation.max_capacity < 1) || (StatsPermutation.max_range < 1) || (StatsPermutation.max_speed < 1))
                            {
                                Log('One or more stat is less than 0 or outside normal bounds; eliminating this permutation: ' + JSON.stringify(StatsPermutation), 'severity-info', 'Info')
                            }
                            else
                            {
                                Log('StatsPermutation.comboUpgrades.length: ' + StatsPermutation.comboUpgrades.length + '\nStatsPermutation (content):\n' + JSON.stringify(StatsPermutation), 'severity-info', 'Info');
                                userVehicle.StatsPermutations.push(StatsPermutation);
                            }
                            j++;
                        }
                    );
                    i++;
                }
            }
            else
            {
                Log("Permutations are disabled in your settings; Update your settings to enable permutations.")
            }
        }
    );
}

function startTimer() {
    timePassed = 0;
    timeLeft = mySettings.refreshRateSeconds();
    timerIntervalId = setInterval(() => 
    {
      // The amount of time passed increments by one
      timePassed = timePassed += 1;
      timeLeft = mySettings.refreshRateSeconds() - timePassed;
      if (timeLeft < 0) timeLeft = 0;
      
      // The time left label is updated
      $('#spnTimeLeft').html(updateTimer_FormatTimeLeft(timeLeft)); 
      updateTimer_SetCircleDasharray();
      updateTimer_SetRemainingPathColor(timeLeft);
    }, 1000);
}

function updateTimer()
{
    $('#divTimer').html(`
        <div class="base-timer">
            <svg class="base-timer__svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <g class="base-timer__circle">
                    <circle class="base-timer__path-elapsed" cx="50" cy="50" r="45" />
                    <path
                        id="base-timer-path-remaining"
                        stroke-dasharray="283"
                        class="base-timer__path-remaining ${remainingPathColor}"
                        d="
                        M 50, 50
                        m -45, 0
                        a 45,45 0 1,0 90,0
                        a 45,45 0 1,0 -90,0
                        "
                    ></path>
                </g>
            </svg>
            <span class="base-timer__label" id="spnTimeLeft">
                ${updateTimer_FormatTimeLeft(timeLeft)}
            </span>
        </div>
    `);
}

function updateTimer_FormatTimeLeft(time) 
{
    // The largest round integer less than or equal to the result of time divided being by 60.
    const minutes = Math.floor(time / 60);

    // Seconds are the remainder of the time divided by 60 (modulus operator)
    let seconds = time % 60;

    // If the value of seconds is less than 10, then display seconds with a leading zero
    if (seconds < 10) {
        seconds = `0${seconds}`;
    }

    // The output in MM:SS format
    return `${minutes}:${seconds}`;
}

// Update the dasharray value as time passes, starting with 283
function updateTimer_SetCircleDasharray() 
{
    const circleDashArray = `${(
      (timeLeft / mySettings.refreshRateSeconds()) * FULL_DASH_ARRAY
    ).toFixed(0)} 283`;

    $(".base-timer__path-remaining").attr("stroke-dasharray", circleDashArray);
}
  
function updateTimer_SetRemainingPathColor(timeLeft) 
{
    var { alert, warning, info } = colorCodes;
  
    // If the remaining time is less than or equal to 5, remove the "warning" class and apply the "alert" class.
    if (timeLeft <= warning.threshold) {
        $(".base-timer__path-remaining").removeClass(alert.color);
        $(".base-timer__path-remaining").addClass(warning.color);
    } 
    // If the remaining time is less than or equal to 10, remove the base color and apply the "warning" class.
    else if (timeLeft <= alert.threshold) 
    {
        $(".base-timer__path-remaining").removeClass(info.color);
        $(".base-timer__path-remaining").addClass(alert.color);
    }
  }
  
function Log(message, className, severity)
{
    var tdDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    var trMarkup = '<tr><td class="severity-{1} status-content-time">{0}</td><td class="severity-{1} status-content-time">{1}</td><td class="severity-{1} status-content-time">{2}</td></tr>'.replace('{0}', tdDate).replace('{1}', severity).replace('{2}', message);
    console.log(message);
    //$('#statusTable > tr:last').after(trMarkup);
}

/* Page On Load */
$(function() {
    Log('document.onload - Start', 'severity-info', 'Info');
    $('.wof-version').html(CURRENT_VERSION);
    $('#logStart').html(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

    $('#aWofWebsite').attr('href', WOF_WEBSITE + '/racing-arena/upcoming');
    setupNavPages();

    $('#tabsLeft#target').infiniteTabs();
    $('#tabsMiddle#target').infiniteTabs();
    $('#tabsRight#target').infiniteTabs();
    $('ul.infinite-tabs').find('li.tab').click(function(e) 
        {
            e.preventDefault();
            e.stopPropagation();
            $thisTab = $(this);
            ulId = '#' + $($thisTab).parents('ul.infinite-tabs').attr('id');
            $(ulId).find('li.tab').removeClass("active");
            $($thisTab).addClass("active");
            $(ulId + ' ~ div.tab-content').hide();
            var activeTabContent = '#' + $($thisTab).attr('id').replace('Tab', 'Content');
            $(activeTabContent).show();
        }
    );
    $('#tabsLeft').find('li.tab').first().click();
    $('#tabsMiddle').find('li.tab').first().click();
    $('#tabsRight').find('li.tab').first().click();

    $('input:text, input:password, input[type=email]').button().addClass('form-input');
    $('#btnSaveSettings').click(function(e)
        {
            var mySettingsJson = ko.mapping.toJSON(mySettings);
            var a = document.createElement("a");
            var file = new Blob([mySettingsJson], {type: 'text/plain'});
            a.href = URL.createObjectURL(file);
            a.download = 'mysettings.json';
            a.click();
            $('#divSaved').show(500);
            setTimeout(function() {$('#divSaved').hide(750);}, 5000);
            afterRaceQuery(true);
        }
    );

    $('#chkEnablePermutations')
        .change(function()
        {
            if ($('#chkEnablePermutations').is(':checked'))
            {
                if (!confirm("WARNING!  Enabling permutations will cause your vehicle's upgrades to change each time they are entered in a race.  Before continuing, be sure to record your vehicle's set of upgrades.\nDo you wish to continue? (OK = Yes, Cancel = No)"))
                {

                    mySettings.enable_permutations(false);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            setupUpgradePermutations();
        }
    );

    $('#img_class_ground').clone().prop('id', 'img_class_ground_filter').appendTo('#spnGround');
    $('#img_class_water').clone().prop('id', 'img_class_water_filter').appendTo('#spnWater');
    $('#img_class_air').clone().prop('id', 'img_class_air_filter').appendTo('#spnAir');
    $('#img_class_space').clone().prop('id', 'img_class_space_filter').appendTo('#spnSpace');
    ko.applyBindings(new FilterVM(), $('#unjoinedRacesFilter').get(0));
    
    Log('document.onload - getLocalData()', 'severity-info', 'Info');
    getLocalData();
    Log('document.onload - End', 'severity-info', 'Info');
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
    'Dark Matter Thrusters': 'P:DMT'
}

const CURRENT_VERSION = "0.1.6";
const FULL_DASH_ARRAY = 283;
const WOF_WEBSITE = 'https://www.worldoffreight.xyz/';
const ROOT_API_URL = 'https://api.worldoffreight.xyz';
const ROOT_GRAPH_URL = 'https://graph.worldoffreight.xyz/v1';

var adjustablesVM = null;
var bound = [];
var timerIntervalId = null;
var joinedRaces = [];
var mySettings = null;
var nextToRaceRaces = [];
var postQueries = {};
var timeoutId = null;
var unjoinedRacesVM = null;
var upcomingFreeRaces = [];
var upcomingPaidRaces = [];
var userInfoVM = null;
var userVehiclesVM  = [];
var vehicleAdjustables = []

var timerThresholds = {alert: 10, warning: 5}

var colorCodes = {
    info: {
        color: "info"
    },
    warning: {
        color: "warning",
        threshold: timerThresholds.warning
    },
    alert: {
        color: "alert",
        threshold: timerThresholds.alert
    }
};

var graphQlApi = `${ROOT_GRAPH_URL}/graphql`;
var joinApi = `${ROOT_API_URL}/racing-arena/join`;
var applyUnapplyApi = `${ROOT_API_URL}/{un}apply-upgrade`;

var remainingPathColor = colorCodes.info.color;
var timeLeft = 0;
var timePassed = 0;
