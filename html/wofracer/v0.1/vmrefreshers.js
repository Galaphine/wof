function applyUpgradesNow(raceVm, e)
{
    const self = e.target;
    const vehicle = raceVm.selectedVehicle;
    const upgradedStats = null;

    var callArray = getUnapplyUpgrades(vehicle);
    raceVm.ApplyUpgradesNowClass('');
    raceVm.ApplyUpgradesNowText('Applying upgrades...');

    $.when.apply($, callArray)
        .done( () =>
            {
                callArray = getApplyUpgrades(vehicle);
                $.when.apply($, callArray)
                    .done( () =>
                        {
                            var userVehicle = userVehiclesVM().find(v => { return v.token_id() == vehicle.vehicleTokenId()});
                            callArray = [getUpgradesAppliedForOne(userVehicle)];
                            $.when.apply($, callArray)
                                .done( () =>
                                    {
                                        Log("Upgrades Applied:\n" + ko.mapping.toJSON(userVehicle.UpgradesApplied), 'severity-info', LogLevel.Info);
                                        $(self).off('click', $(self), applyUpgradesNow);
                                        raceVm.ApplyUpgradesNowClass('');
                                        raceVm.ApplyUpgradesNowText('Upgrades set!');
                                    }
                                );
                            }
                    );
            }
        );
}

function assignUserVehicles()
{
    Log('assignUserVehicles() - Start Function', 'severity-info', LogLevel.Debug);

    $.each(unjoinedRacesVM.unjoinedRaceList(), function(index)
        {
            var unjoinedRace = unjoinedRacesVM.unjoinedRaceList()[index];
            Log('assignUserVehicles() - Begin Selecting Best Vehicle for Race {0}:'.replace('{0}', unjoinedRace.name), 'severity-info', LogLevel.Info);

            raceClass = unjoinedRace.class.toLowerCase();
            raceDistance = roundTo(unjoinedRace.distance, 4);
            raceName = unjoinedRace.name;
            raceWeather = (unjoinedRace.weather ? unjoinedRace.weather : '');
            raceTerrain = (unjoinedRace.terrain ? unjoinedRace.terrain : '');
            participants = unjoinedRace.participants;
            participantCount = participants.length;
            cargoWeight = unjoinedRace.weight;
       
            Log(
                `Class: ${raceClass}\nDistance: ${raceDistance}\nName: ${raceName}\nWeather: ${raceWeather}\nTerrain: ${raceTerrain}\nParticipant Count: ${participantCount}\nCargo Weight: ${cargoWeight}`
                , 'severity-info', LogLevel.Info
            );
            
            var availableVehiclesInClass = [];
            var availableVehiclesToRace = [];
            var excludedDueToTripsOrRefuels = [];
            var firstTime = true;

            userVehiclesVM().forEach(userVehicle =>
                {
                    if ((userVehicle.staticAttributes.transportation_mode().toLowerCase() == raceClass) && (mySettings.excluded_vehicles.indexOf(userVehicle.token_id()) == -1))
                    {
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
                                , 'severity-info', LogLevel.Info
                            );
                            allowedVehicle = false;
                            alreadyJoinedRace[0].enteredVehicle.numberOfRefuels = 0;
                            alreadyJoinedRace[0].enteredVehicle.numberOfTrips = 0;
                        }
                        else
                        {
                            vehicleType = availableVehicle.staticAttributes.vehicle_type();
                            vehicleClass = availableVehicle.staticAttributes.transportation_mode();
                            vehicleAdjustable = vehicleAdjustables.filter( vehicleAdjustable => {return vehicleAdjustable.vehicleType.toLowerCase() === vehicleType.toLowerCase()})[0];
                            vehicleRefuelingDelay = vehicleAdjustable.adjustables.delays.refuelingDelay;
                            vehicleTypeMaxSpeed = vehicleAdjustable.maxSpeed;
                            availableVehicle.StatsPermutations.forEach(permutation =>
                                {
                                    vehicleStatMaxRange = permutation.max_range;
                                    vehicleMaxCapacity = permutation.max_capacity;
                                    numberOfTrips = Math.ceil(cargoWeight / vehicleMaxCapacity);
                                    numberOfRefuels = Math.ceil( (raceDistance + ((numberOfTrips-1)*raceDistance*2)) / vehicleStatMaxRange);
                                    permutation.numberOfTrips = numberOfTrips;
                                    permutation.numberOfRefuels = numberOfRefuels;

                                    if ((numberOfTrips > 5) || (numberOfRefuels > 5))
                                    {
                                        if (availableVehicle.StatsPermutations.length <= MAX_ALLOWED_PERMUTATIONS)
                                        {
                                            tripsOrRefuels = (numberOfTrips > 5) ? 'trips' : ( (numberOfRefuels > 5) ? 'refuels' : '' );
                                            Log(`${vehicleName} with permutations [{${ko.mapping.toJS(permutation).comboUpgrades.map(x => x.upgrade.id).flat(1)}}] will need more than 5 ${tripsOrRefuels} to complete the distance of ${raceDistance}km for race [${raceName}]; eliminating.`, 'severity-warning', LogLevel.Warning);
                                        }
                                        permutation.finalAdjustedTime = 0;
                                    }
                                    else
                                    {
                                        vehicleStatMaxSpeed = permutation.max_speed;
                                        vehicleFuelEfficiency = permutation.fuel_efficiency;
                                        vehicleEmissionRate = permutation.emission_rate;
                                        vehicleAdjustedRaceDistance = raceDistance + ((numberOfTrips-1)*raceDistance*2);
                                        boostFactor = ((raceDistance >= vehicleAdjustable.boosts.rangeLimitLower) && (raceDistance <= vehicleAdjustable.boosts.rangeLimitUpper)) ? vehicleAdjustable.boosts.boostFactor : 1;
                                        vehicleAccelerationDelay = vehicleAdjustable.adjustables.delays.accelerationDelay * numberOfRefuels * (1 + (Math.abs(5 - vehicleEmissionRate)/100));
                                        vehicleDecelerationDelay = vehicleAdjustable.adjustables.delays.decelerationDelay * numberOfRefuels * (1 + (Math.abs(5 - vehicleEmissionRate)/100));
                                        terrainSpeedFactor = (vehicleAdjustable.adjustables.terrainSpeedFactor && raceTerrain.length > 0) ? vehicleAdjustable.adjustables.terrainSpeedFactor[raceTerrain] : 1;
                                        if (vehicleStatMaxSpeed > (vehicleTypeMaxSpeed*terrainSpeedFactor))
                                        {
                                            vehicleStatMaxSpeed = 0
                                        }
                                        estimatedTimeToComplete = (vehicleAdjustedRaceDistance / vehicleStatMaxSpeed)*3600 + (vehicleAccelerationDelay + vehicleDecelerationDelay)*(numberOfRefuels + 1); // Extra accel/decel delay for start and stop
                                        terrainAdjustment = (vehicleAdjustable.adjustables.terrain && raceTerrain.length > 0) ? vehicleAdjustable.adjustables.terrain[raceTerrain] : 1;
                                        weatherAdjustment = (vehicleAdjustable.adjustables.weather && raceWeather.length > 0) ? vehicleAdjustable.adjustables.weather[raceWeather] : 1;
                                        terrainAndWeatherAdjustedTime = estimatedTimeToComplete * terrainAdjustment * weatherAdjustment;
                                        boostAdjustedTime = terrainAndWeatherAdjustedTime * boostFactor;
                                        finalAdjustedTime = boostAdjustedTime + ((10 - vehicleFuelEfficiency)*.01) + (Math.abs(5 - vehicleEmissionRate)*.01);
                                        permutation.finalAdjustedTime = finalAdjustedTime;
                                        vehicleNameLong = availableVehicle.name() + ' (' + availableVehicle.staticAttributes.vehicle_type() + ', ID_Permutation = '  + permutation.PermutationId + ')'
                                        vehiclePermutationFinalTimes.push({'key': permutation.PermutationId, 'val': {'longName': vehicleNameLong, 'time': permutation.finalAdjustedTime, 'comboUpgrades': permutation.comboUpgrades}});
                                        if (availableVehicle.StatsPermutations.length <= MAX_ALLOWED_PERMUTATIONS)
                                        {
                                            Log(
                                                `vehicle: ${vehicleNameLong}
    numberOfTrips: ${numberOfTrips}
    numberOfRefuels: ${numberOfRefuels}
    vehicleMaxCapacity: ${vehicleMaxCapacity}
    vehicleTypeMaxSpeed: ${vehicleTypeMaxSpeed}
    vehicleStatMaxSpeed: ${vehicleStatMaxSpeed}
    vehicleAdjustedRaceDistance: ${vehicleAdjustedRaceDistance}
    vehicleStatMaxRange: ${vehicleStatMaxRange}
    vehicleAccelerationDelay: ${vehicleAccelerationDelay}
    vehicleDecelerationDelay: ${vehicleDecelerationDelay}
    vehicleRefuelingDelay: ${vehicleRefuelingDelay}
    vehicleFuelEfficiency: ${vehicleFuelEfficiency}
    vehicleEmissionRate: ${vehicleEmissionRate}
    terrainSpeedFactor: ${terrainSpeedFactor}
    terrainAdjustment: ${terrainAdjustment}
    weatherAdjustment: ${weatherAdjustment}
    boostFactor: ${boostFactor}
    estimatedTimeToComplete: ${estimatedTimeToComplete}
    finalAdjustedTime: ${finalAdjustedTime}
    raceTerrain, adjustable.terrain: ${raceTerrain}, ${vehicleAdjustable.adjustables.terrain[raceTerrain]}
    raceWeather, adjustable.weather: ${raceWeather}, ${vehicleAdjustable.adjustables.weather[raceWeather]}`
                                                , 'severity-info', LogLevel.Info
                                            );
                                        }
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
                Log('finalAdjustedTimes:\n' + finalAdjustedTimes, 'severity-info', LogLevel.Info);
                selectedVehiclePermutationIds = ko.mapping.toJS(vehiclePermutationFinalTimes[0]).val.comboUpgrades.map(x => x.upgrade.id).flat(1);
                Log('selectedVehiclePermutationIds:\n' + selectedVehiclePermutationIds, 'severity-info', LogLevel.Info);

                const vehiclePermutationIdWithShortestTime = vehiclePermutationFinalTimes[0].key;
                const selectedVehicle = availableVehiclesInClass.find(vehicle => { return vehicle.token_id() == vehiclePermutationIdWithShortestTime.split('_')[0]; });
                selectedVehicle.vehicleId = ko.observable(selectedVehicle.token_id());
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
                    checkApplyUpgradesNowLink(unjoinedRace, selectedVehicle);
                }
                else
                {
                    unjoinedRace.selectedVehicle.numberOfRefuels(0);
                    unjoinedRace.selectedVehicle.numberOfTrips(0);
                    unjoinedRace.selectedVehicle.vehicleFreightPunkId(0);
                    unjoinedRace.selectedVehicle.vehicleFreightPunkLevel(0);
                    unjoinedRace.selectedVehicle.vehicleFreightPunkSkillPoints(0);
                    unjoinedRace.selectedVehicle.vehicleFreightPunkUrl('');
                    unjoinedRace.selectedVehicle.vehicleFreightPunkXp(0);
                    unjoinedRace.selectedVehicle.vehicleId('');
                    unjoinedRace.selectedVehicle.vehicleImageUrl('');
                    unjoinedRace.selectedVehicle.vehicleName("No suitable {0} WOFs.".replace('{0}', raceClass));
                    unjoinedRace.selectedVehicle.vehicleTokenId('');
                }
            }
            else
            {
                unjoinedRace.selectedVehicle.numberOfRefuels(0);
                unjoinedRace.selectedVehicle.numberOfTrips(0);
                unjoinedRace.selectedVehicle.vehicleFreightPunkId(0);
                unjoinedRace.selectedVehicle.vehicleFreightPunkLevel(0);
                unjoinedRace.selectedVehicle.vehicleFreightPunkSkillPoints(0);
                unjoinedRace.selectedVehicle.vehicleFreightPunkUrl('');
                unjoinedRace.selectedVehicle.vehicleFreightPunkXp(0);
                unjoinedRace.selectedVehicle.vehicleId('');
                unjoinedRace.selectedVehicle.vehicleImageUrl('');
                unjoinedRace.selectedVehicle.vehicleName("No available {0} WOFs in fleet.".replace('{0}', raceClass));
                unjoinedRace.selectedVehicle.vehicleTokenId('');
            }
            Log('assignUserVehicles() - End Selecting Best Vehicle for Race {0}:'.replace('{0}', unjoinedRace.name), 'severity-info', LogLevel.Info);
        }
    );

    Log('assignUserVehicles() - End Function', 'severity-info', LogLevel.Debug);
}

function checkApplyUpgradesNowLink(selectedRace, vehicle)
{
    try
    {
        const selectedPermutationIds = vehicle.SelectedPermutation.comboUpgrades.map(x => x.upgrade.id()).flat(1);
        const appliedUpgradeIds = ko.mapping.toJS(vehicle.UpgradesApplied).map(x => x.upgrade_id).flat(1);
        if (selectedPermutationIds.sort().toString() === appliedUpgradeIds.sort().toString())
        {
            selectedRace.ApplyUpgradesNowClass('');
            selectedRace.ApplyUpgradesNowText('Upgrades set.');
        }
    }
    catch(e)
    {
        console.log(e);
    }
}

function cloneImages()
{
    $('#td_icon_ground').empty().append($('#img_class_ground').clone().prop('id', 'img_class_ground_clone_nav'));
    $('#td_icon_water').empty().append($('#img_class_water').clone().prop('id', 'img_class_water_clone_nav'));
    $('#td_icon_air').empty().append($('#img_class_air').clone().prop('id', 'img_class_air_clone_nav'));
    $('#td_icon_space').empty().append($('#img_class_space').clone().prop('id', 'img_class_space_clone_nav'));

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

function refreshNextToRaceRaces()
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
                    emission_rate: (enteredVehicle) ? enteredVehicle.vehicle.stats.emission_rate : '',
                    fuel_efficiency: (enteredVehicle) ? enteredVehicle.vehicle.stats.fuel_efficiency : '',
                    id:  (enteredVehicle) ? enteredVehicle.vehicle.token_id : 0,
                    image: (enteredVehicle) ? enteredVehicle.vehicle.image : null,
                    max_capacity_display: (enteredVehicle) ? Number(parseFloat(enteredVehicle.vehicle.stats.max_capacity)).toLocaleString() : '',
                    max_range_display: (enteredVehicle) ? Number(parseFloat(enteredVehicle.vehicle.stats.max_range)).toLocaleString() : '',
                    max_speed_display: (enteredVehicle) ? Number(parseFloat(enteredVehicle.vehicle.stats.max_speed)).toLocaleString() : '',
                    name: (enteredVehicle) ? enteredVehicle.vehicle.name : '',
                    numberOfRefuels: numberOfRefuels,
                    numberOfTrips: numberOfTrips,
                    raceDistance: roundTo(nextToRace.distance, decimalPlaces),
                    SelectedPermutation: { comboUpgrades: userVehicle.LastAppliedUpgrades },
                    vehicleFreightPunkId: userVehicle.vehicleFreightPunkId(),
                    vehicleFreightPunkLevel: userVehicle.vehicleFreightPunkLevel(),
                    vehicleFreightPunkSkillPoints: userVehicle.vehicleFreightPunkSkillPoints(),
                    vehicleFreightPunkUrl: userVehicle.vehicleFreightPunkUrl(),
                    vehicleFreightPunkXp: userVehicle.vehicleFreightPunkXp(),
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
                    vehicleFreightPunkId: 0,
                    vehicleFreightPunkLevel: 0,
                    vehicleFreightPunkSkillPoints: 0,
                    vehicleFreightPunkUrl: '',
                    vehicleFreightPunkXp: 0,
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

function refreshUpcomingRaces()
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
                    vehicleFreightPunkId: null, 
                    vehicleFreightPunkLevel: null,
                    vehicleFreightPunkSkillPoints: null,
                    vehicleFreightPunkUrl: null, 
                    vehicleFreightPunkXp: null,
                    vehicleId: null, 
                    vehicleImageUrl: null, 
                    vehicleName: '(TBD)', 
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
            unjoinedRaces[index].ApplyUpgradesNowClass = ko.observable('link-apply-upgrades');
            unjoinedRaces[index].ApplyUpgradesNowText = ko.observable('Apply Upgrades Now');
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
                vehicleFreightPunkId: userVehicle.vehicleFreightPunkId(),
                vehicleFreightPunkLevel: userVehicle.vehicleFreightPunkLevel(),
                vehicleFreightPunkSkillPoints: userVehicle.vehicleFreightPunkSkillPoints(),
                vehicleFreightPunkUrl: userVehicle.vehicleFreightPunkUrl(),
                vehicleFreightPunkXp: userVehicle.vehicleFreightPunkXp(),
                weight: cargoWeight
            }
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

function refreshUpgradePermutations()
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
            baseStatsVehicle = vehicleBaseStats.find(x => x.id == userVehicle.token_id());

            userVehicle.vehicleFreightPunkId = ko.observable(((userVehicle.freightPunk != null) && (userVehicle.freightPunk.punk != null) && (userVehicle.freightPunk.punk.id != null)) ? userVehicle.freightPunk.punk.id() : 0);
            userVehicle.vehicleFreightPunkLevel = ko.observable((userVehicle.vehicleFreightPunkId() > 0) ? userVehicle.freightPunk.punk.level() : '');
            userVehicle.vehicleFreightPunkSkillPoints = ko.observable((userVehicle.vehicleFreightPunkId() > 0) ? userVehicle.freightPunk.punk.skill_points() : '');
            userVehicle.vehicleFreightPunkUrl = ko.observable((userVehicle.vehicleFreightPunkId() > 0) ? userVehicle.freightPunk.punk.image() : '');
            userVehicle.vehicleFreightPunkXp = ko.observable((userVehicle.vehicleFreightPunkId() > 0) ? userVehicle.freightPunk.punk.xp_earned() : '');
            userVehicle.vehicleImageUrl = userVehicle.image();
            userVehicle.vehicleName = userVehicle.name();
            userVehicle.vehicleTokenId = userVehicle.token_id();

            vehicleType = userVehicle.staticAttributes.vehicle_type();
            vehicleClass = userVehicle.staticAttributes.transportation_mode();
            vehicleAdjustable = vehicleAdjustables.filter( vehicleAdjustable => {return vehicleAdjustable.vehicleType.toLowerCase() === vehicleType.toLowerCase()})[0];
            vehicleRefuelingDelay = vehicleAdjustable.adjustables.delays.refuelingDelay;
            vehicleTypeMaxSpeed = vehicleAdjustable.maxSpeed;

            userVehicle.BaseStats = 
            {
                emission_rate: baseStatsVehicle.emission_rate,
                fuel_efficiency: baseStatsVehicle.fuel_efficiency,
                max_capacity: baseStatsVehicle.max_capacity,
                max_range: baseStatsVehicle.max_range,
                max_speed: baseStatsVehicle.max_speed
            }

            userVehicle.StatsPermutations = [];
            
            /* Add current applied permutation as first permutation (in case stats aren't enabled) */
            StatsPermutation = 
            {
                emission_rate: userVehicle.dynamicStats.emission_rate(),
                fuel_efficiency: userVehicle.dynamicStats.fuel_efficiency(),
                max_capacity: userVehicle.dynamicStats.max_capacity(),
                max_range: userVehicle.dynamicStats.max_range(),
                max_speed: userVehicle.dynamicStats.max_speed(),
                comboUpgrades: []
            }

            StatsPermutation.PermutationId = userVehicle.token_id() + '_Starting';

            var ownedUpgradeIds = [];
            userVehicle.ownedUpgrades = userVehicle.UpgradedStats().filter( stat => { return stat.owned(); });
            var appliedUpgradeIds = ko.mapping.toJS(userVehicle.UpgradesApplied).map(x => x.upgrade_id).flat(1);
            userVehicle.LastAppliedUpgrades = [];

            userVehicle.ownedUpgrades.forEach( ownedUpgrade =>
                {
                    if (appliedUpgradeIds.includes(ownedUpgrade.upgrade.id()))
                    {
                        userVehicle.LastAppliedUpgrades.push(ownedUpgrade);
                        StatsPermutation.comboUpgrades.push(ownedUpgrade);
                    }
                }
            );
            userVehicle.StatsPermutations.push(StatsPermutation);

            /* Add all upgrade permutations */
            if (mySettings.enable_permutations())
            {
                // Add BaseStats as initial permutation with permutations enabled
                StatsPermutation = 
                {
                    emission_rate: baseStatsVehicle.emission_rate,
                    fuel_efficiency: baseStatsVehicle.fuel_efficiency,
                    max_capacity: baseStatsVehicle.max_capacity,
                    max_range: baseStatsVehicle.max_range,
                    max_speed: baseStatsVehicle.max_speed,
                    comboUpgrades: []
                }
                StatsPermutation.PermutationId = userVehicle.token_id() + '_00';
                Log('StatsPermutation.comboUpgrades.length: ' + StatsPermutation.comboUpgrades.length + '\nStatsPermutation (content):\n' + JSON.stringify(StatsPermutation), 'severity-info', LogLevel.Info);
                userVehicle.StatsPermutations.push(StatsPermutation);

                Log('userVehicle.BaseStats:\n' + ko.mapping.toJSON(userVehicle.BaseStats), 'severity-info', LogLevel.Info);
                i = 1;
                j = 1;
                ownedUpgradeIds = userVehicle.ownedUpgrades.map(x => x.upgrade.id()).flat(1);
                while (i<=ownedUpgradeIds.length)
                {
                    var combos = k_combinations(ownedUpgradeIds, i);
                    combos.forEach( combo =>
                        {
                            StatsPermutation = 
                            {
                                emission_rate: baseStatsVehicle.emission_rate,
                                fuel_efficiency: baseStatsVehicle.fuel_efficiency,
                                max_capacity: baseStatsVehicle.max_capacity,
                                max_range: baseStatsVehicle.max_range,
                                max_speed: baseStatsVehicle.max_speed,
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

                            StatsPermutation.emission_rate = (StatsPermutation.emission_rate > vehicleAdjustable.statBoundaries.emission_rate.max) ? vehicleAdjustable.statBoundaries.emission_rate.max : StatsPermutation.emission_rate;
                            StatsPermutation.fuel_efficiency = (StatsPermutation.fuel_efficiency > vehicleAdjustable.statBoundaries.fuel_efficiency.max) ? vehicleAdjustable.statBoundaries.fuel_efficiency.max : StatsPermutation.fuel_efficiency;
                            StatsPermutation.max_capacity = (StatsPermutation.max_capacity > vehicleAdjustable.statBoundaries.max_capacity.max) ? vehicleAdjustable.statBoundaries.max_capacity.max : StatsPermutation.max_capacity;
                            StatsPermutation.max_range = (StatsPermutation.max_range > vehicleAdjustable.statBoundaries.max_range.max) ? vehicleAdjustable.statBoundaries.max_range.max : StatsPermutation.max_range;
                            StatsPermutation.max_speed = (StatsPermutation.max_speed > vehicleAdjustable.statBoundaries.max_speed.max) ? vehicleAdjustable.statBoundaries.max_speed.max : StatsPermutation.max_speed;

                            StatsPermutation.PermutationId = userVehicle.token_id() + '_' + j;
                            if ((hasEcuHp) && (hasEcuHe))
                            {
                                Log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': This permutation has both ECU-HP and ECU-HE; eliminating.', 'severity-info', LogLevel.Info);
                            }
                            else if ((StatsPermutation.emission_rate < 1) || (StatsPermutation.fuel_efficiency < 1) || (StatsPermutation.max_capacity < 1) || (StatsPermutation.max_range < 1) || (StatsPermutation.max_speed < 1))
                            {
                                Log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': One or more stat is less than 1; eliminating this permutation: ' + JSON.stringify(StatsPermutation), 'severity-info', LogLevel.Info);
                            }
                            else
                            {
                                Log('StatsPermutation.comboUpgrades.length: ' + StatsPermutation.comboUpgrades.length + '\nStatsPermutation (content):\n' + JSON.stringify(StatsPermutation), 'severity-info', LogLevel.Info);
                                userVehicle.StatsPermutations.push(StatsPermutation);
                            }

                            j++;
                        }
                    );
                    i++;
                }
                /*
                if (userVehicle.StatsPermutations.length > MAX_ALLOWED_PERMUTATIONS)
                {
                    if (userVehicle.StatsPermutations.length > MAX_ALLOWED_PERMUTATIONS)
                    {
                        userVehicle.StatsPermutations.sort(function(a, b) {
                            if (a.max_speed > b.max_speed) return 1;
                            if (a.max_speed < b.max_speed) return -1;
                            if (a.max_capacity > b.max_capacity) return 1;
                            if (a.max_capacity < b.max_capacity) return -1;
                            if (a.fuel_efficiency > b.fuel_efficiency) return 1;
                            if (a.fuel_efficiency < b.fuel_efficiency) return -1;
                            if (a.max_range > b.max_range) return 1;
                            if (a.max_range < b.max_range) return -1;
                            if (Math.abs(5 - a.emission_rate) > Math.abs(5 - b.emission_rate)) return 1;
                            if (Math.abs(5 - a.emission_rate) < Math.abs(5 - b.emission_rate)) return -1;
                        });
                        //userVehicle.StatsPermutations.length = MAX_ALLOWED_PERMUTATIONS;
                    }
                }
                */
            }
            else
            {
                Log('Permutations are disabled in your settings; Update your settings to enable permutations.', 'severity-warning', LogLevel.Warning)
            }
        }
    );

    userInfoVM.UserVehiclesUpgradedCount(userVehiclesVM().filter(uv => { return  uv.UpgradedStats().filter( stat => { return stat.owned(); }).length > 0 }).length);
}

function refreshViewModels(doSetTimeout, ignoreJoinFreeRace)
{
    Log('refreshViewModels() - Begin', 'severity-info', LogLevel.Debug);

    Log('refreshViewModels() - Update Last Updated()', 'severity-info', LogLevel.Debug);
    $('#lastUpdated').html(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));
    updateTimer();
    if (timerIntervalId) clearInterval(timerIntervalId);
    startTimer();

    Log('getServerData() - call refreshUpgradePermutations()', 'severity-info', LogLevel.Debug);
    refreshUpgradePermutations();
    
    Log('refreshViewModels() - Call refreshNextToRaceRaces()', 'severity-info', LogLevel.Debug);
    refreshNextToRaceRaces();

    Log('refreshViewModels() - Call refreshUpcomingRaces()', 'severity-info', LogLevel.Debug);
    refreshUpcomingRaces();

    Log('refreshViewModels() - Call assignUserVehicles()', 'severity-info', LogLevel.Debug);
    assignUserVehicles();

    // Only commenting out for now - there may come a point in the future where this becomes useful.
    // if (!ignoreJoinFreeRace)
    // {
    //     Log('refreshViewModels() - Call joinFreeRace()', 'severity-info', LogLevel.Debug);
    //     joinFreeRace();
    // }

    if (doSetTimeout)
    {
        updateTimeout(true, mySettings.refreshRateMilliseconds());
    }

    Log('refreshViewModels() - End', 'severity-info', LogLevel.Debug); 
}

function updateTimeout(doSetTimeout, timeoutAmount)
{
    timeoutId = setTimeout(function() 
    { 
        refreshData(doSetTimeout); 
    }, timeoutAmount);
}