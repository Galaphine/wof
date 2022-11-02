function applyUpgradesNow(raceVm, e)
{
    const self = e.target;
    const vehicle = raceVm.selectedVehicle();
    const upgradedStats = null;
    raceVm.applyingUpgrades = true;

    if (applyUpgradesTimeoutId1 != null) clearTimeout(applyUpgradesTimeoutId1);
    if (applyUpgradesTimeoutId2 != null) clearTimeout(applyUpgradesTimeoutId2);

    var callArray = getUnapplyUpgrades(vehicle);
    vehicle.ApplyUpgradesNowClass('');
    vehicle.ApplyUpgradesNowText('Applying upgrades...');
    applyUpgradesTimeoutId1 = setTimeout(function()
    {
        raceVm.rateLimited = true;
        vehicle.ApplyUpgradesNowClass('');
        vehicle.ApplyUpgradesNowText('You\'ve been rate-limited by the WOF Server; please be patient...');
    }, 20000);
    applyUpgradesTimeoutId2 = setTimeout(function()
    {
        raceVm.rateLimited = true;
        vehicle.ApplyUpgradesNowClass('');
        vehicle.ApplyUpgradesNowText('This should clear up soon - if not, refresh the page!');
    }, 50000);

    $.when.apply($, callArray)
        .done( () =>
            {
                callArray = getApplyUpgrades(vehicle);
                $.when.apply($, callArray)
                    .done( () =>
                        {
                            const userVehicle = userVehiclesVM().find(v => { return v.token_id() == vehicle.vehicleTokenId()});
                            callArray = [getUpgradesAppliedForOne(userVehicle)];
                            $.when.apply($, callArray)
                                .done( () =>
                                    {
                                        raceVm.applyingUpgrades = false;
                                        raceVm.rateLimited = false;
                                        clearTimeout(applyUpgradesTimeoutId1);
                                        clearTimeout(applyUpgradesTimeoutId2);
                                        Log("Upgrades Applied:\n" + ko.mapping.toJSON(userVehicle.UpgradesApplied), 'severity-info', LogLevel.Info);
                                        $(self).off('click', $(self), applyUpgradesNow);
                                        vehicle.ApplyUpgradesNowClass('');
                                        vehicle.ApplyUpgradesNowText('Upgrades set!');
                                        setTimeout(refreshAdjustables.bind(null, raceVm.id));
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

    const checkExit = function(toCheck)
    {
        if (toCheck) 
        {
            clearTimeout(assignUserVehiclesTimeoutId);
            assignUserVehiclesTimeoutId = null;
            setTimeout(refreshAdjustables, 0);
            return true;
        }
        return false;
    }

    if (checkExit(assignedUserVehicles.length == 0)) return;
    const raceId = assignedUserVehicles.shift();
    var unjoinedRace = unjoinedRacesVM.unjoinedRaceList().find(x => x.id === raceId);
    if (checkExit(unjoinedRace == null)) return;

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
    if (debugRaceNames.includes(raceName)) console.log('Race: ' + raceName + ' (' + raceId + '): ', cargoWeight, raceDistance);
    
    var availableVehiclesInClass = [];
    var availableVehiclesToRace = [];
    var selectedVehicle = {};
    var excludedDueToTripsOrRefuels = [];
    var firstTime = true;

    availableVehiclesInClass = userVehiclesVM().filter( uv => (uv.staticAttributes.transportation_mode().toLowerCase() == raceClass) && (mySettings.excluded_vehicles.indexOf(uv.token_id()) == -1) );

    vehiclePermutationFinalTimes = [];
    if (availableVehiclesInClass.length > 0)
    {
        vehiclePermutationFinalTime = {};
        availableVehiclesInClass.forEach(availableVehicle =>
            {
                var alreadyJoinedRace = joinedRaces.filter(race => { return race.participants.filter(participant => { return participant.vehicle.token_id === availableVehicle.token_id() }).length > 0} );
                var alreadyInNextToRace = nextToRaceRaces.filter(race => { return race.participants.filter(participant => { return participant.vehicle.token_id === availableVehicle.token_id() }).length > 0} );
                alreadyJoinedRace.push(...alreadyInNextToRace);
                vehicleName = availableVehicle.name();
                if (alreadyJoinedRace.length > 0)
                {
                    Log('{0} is already joined in a race; eliminating.'.replace('{0}', vehicleName), 'severity-info', LogLevel.Info);
                    allowedVehicle = false;
                    alreadyJoinedRace[0].enteredVehicle.numberOfRefuels = 0;
                    alreadyJoinedRace[0].enteredVehicle.numberOfTrips = 0;
                    if (debugTokenIds.includes(availableVehicle.token_id()) && debugRaceNames.includes(raceName)) console.log('Token #' + availableVehicle.token_id() + ' is already in a race; eliminating.');
                }
                else
                {
                    vehicleType = availableVehicle.staticAttributes.vehicle_type();
                    vehicleClass = availableVehicle.staticAttributes.transportation_mode();
                    vehicleAdjustable = vehicleAdjustables().filter( vehicleAdjustable => {return vehicleAdjustable.vehicleType().toLowerCase() === vehicleType.toLowerCase()})[0];
                    availableVehicle.StatsPermutations.forEach(permutationPreClone =>
                        {
                            var permutation = ko.toJS(permutationPreClone);
                            const vehicleStats = {};
                            statTypes.forEach( statType => { vehicleStats[statType] = permutation[statType]; } );
                            calculatedResults = calculateRaceTime(raceName, raceTerrain, raceWeather, availableVehicle.token_id(), vehicleName, cargoWeight, raceDistance, vehicleStats, vehicleAdjustable);
                            permutationPreClone.numberOfTrips = calculatedResults.numberOfTrips;
                            permutationPreClone.numberOfRefuels = calculatedResults.numberOfRefuels;
                            statTypes.forEach( statType => { permutation[statType] = calculatedResults.vehicleStats[statType]; } );
                            finalAdjustedTime = calculatedResults.finalAdjustedTime;
                            permutation.numberOfTrips = calculatedResults.numberOfTrips;
                            permutation.numberOfRefuels = calculatedResults.numberOfRefuels;

                            if ((calculatedResults.numberOfTrips <= 5) && (calculatedResults.numberOfRefuels <= 5))
                            {
                                permutation.finalAdjustedTime = calculatedResults.finalAdjustedTime;
                                vehicleNameLong = availableVehicle.name() + ' (' + availableVehicle.staticAttributes.vehicle_type() + ', ID_Permutation = '  + permutation.PermutationId + ')';
                                vehiclePermutationFinalTimes.push({'key': permutation.PermutationId, 'val': {'longName': vehicleNameLong, 'time': permutation.finalAdjustedTime, 'comboUpgrades': permutation.comboUpgrades}});
                                if (debugTokenIds.includes(availableVehicle.token_id()) && debugRaceNames.includes(raceName)) console.log('Token #' + availableVehicle.token_id() + ' permutation added:', permutation, 'FinalAdjustedTime:', permutation.finalAdjustedTime);
                            }
                            else
                            {
                                if (debugTokenIds.includes(availableVehicle.token_id()) && debugRaceNames.includes(raceName)) console.log('Token #' + availableVehicle.token_id() + ' has too high numberOfTrips/numberOfRefuels:', availableVehicle.token_id(), raceId, raceName, cargoWeight, raceDistance, vehicleStats, vehicleAdjustable, calculatedResults.numberOfTrips, calculatedResults.numberOfRefuels);
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
        selectedVehicle = ko.mapping.toJS(availableVehiclesInClass.find(vehicle => { return vehicle.token_id() == vehiclePermutationIdWithShortestTime.split('_')[0]; }));
        selectedVehicle.vehicleId = selectedVehicle.token_id;
        selectedVehicle.vehicleType = selectedVehicle.staticAttributes.vehicle_type.toLowerCase();
        selectedVehicle.SelectedPermutation = (selectedVehicle.StatsPermutations == null) ? null : selectedVehicle.StatsPermutations.find(permutation => { return permutation.PermutationId == vehiclePermutationIdWithShortestTime; });
        if (selectedVehicle.SelectedPermutation != null)
        {
            selectedVehicle.SelectedPermutation.max_capacity_display = Number(parseFloat(selectedVehicle.SelectedPermutation.max_capacity)).toLocaleString();
            selectedVehicle.SelectedPermutation.max_range_display = Number(parseFloat(selectedVehicle.SelectedPermutation.max_range)).toLocaleString();
            selectedVehicle.SelectedPermutation.max_speed_display = Number(parseFloat(selectedVehicle.SelectedPermutation.max_speed)).toLocaleString();
            selectedVehicle.numberOfTrips = selectedVehicle.SelectedPermutation.numberOfTrips;
            selectedVehicle.numberOfRefuels = selectedVehicle.SelectedPermutation.numberOfRefuels;
            if (!unjoinedRace.applyingUpgrades)
            {
                selectedVehicle.ApplyUpgradesNowClass = 'link-apply-upgrades';
                selectedVehicle.ApplyUpgradesNowText = 'Apply Upgrades Now';
            }
            else
            {
                selectedVehicle.ApplyUpgradesNowClass = unjoinedRace.selectedVehicle().ApplyUpgradesNowClass();
                selectedVehicle.ApplyUpgradesNowText = unjoinedRace.selectedVehicle().ApplyUpgradesNowText();
            }
        }
        else
        {
            selectedVehicle.ApplyUpgradesNowClass = '';
            selectedVehicle.ApplyUpgradesNowText = 'No Upgrades to Apply';
            selectedVehicle.numberOfRefuels = 0;
            selectedVehicle.numberOfTrips = 0;
            selectedVehicle.vehicleFreightPunkId = 0;
            selectedVehicle.vehicleFreightPunkLevel = 0;
            selectedVehicle.vehicleFreightPunkSkillPoints = 0;
            selectedVehicle.vehicleFreightPunkUrl = '';
            selectedVehicle.vehicleFreightPunkXp = 0;
            selectedVehicle.vehicleId = '';
            selectedVehicle.vehicleImageUrl = '';
            selectedVehicle.vehicleName = 'No suitable permutations from any {0} WOFs.'.replace('{0}', raceClass);
            selectedVehicle.vehicleTokenId = '';
            selectedVehicle.vehicleType = '';
        }
    }
    else
    {
        selectedVehicle.ApplyUpgradesNowClass = '';
        selectedVehicle.ApplyUpgradesNowText = 'No Upgrades to Apply';
        selectedVehicle.numberOfRefuels = 0;
        selectedVehicle.numberOfTrips = 0;
        selectedVehicle.vehicleFreightPunkId = 0;
        selectedVehicle.vehicleFreightPunkLevel = 0;
        selectedVehicle.vehicleFreightPunkSkillPoints = 0;
        selectedVehicle.vehicleFreightPunkUrl = '';
        selectedVehicle.vehicleFreightPunkXp = 0;
        selectedVehicle.vehicleId = '';
        selectedVehicle.vehicleImageUrl = '';
        selectedVehicle.vehicleName = 'No available {0} WOFs in fleet.'.replace('{0}', raceClass);
        selectedVehicle.vehicleTokenId = '';
        selectedVehicle.vehicleType = '';
    }

    ko.mapping.fromJS(selectedVehicle, {}, unjoinedRace.PreSelectedVehicle);
    ko.mapping.fromJS(ko.mapping.toJS(unjoinedRace.PreSelectedVehicle), {}, unjoinedRace.selectedVehicle);
    checkApplyUpgradesNowLink(unjoinedRace, ko.mapping.toJS(unjoinedRace.selectedVehicle));

    Log('assignUserVehicles() - End Selecting Best Vehicle for Race {0}:'.replace('{0}', unjoinedRace.name), 'severity-info', LogLevel.Info);

    Log('assignUserVehicles() - End Function', 'severity-info', LogLevel.Debug);

    assignUserVehiclesTimeoutId = setTimeout(assignUserVehicles, 0);
}

function checkApplyUpgradesNowLink(selectedRace, vehicle)
{
    try
    {
        if (vehicle.SelectedPermutation == null) return;
        const selectedPermutation = vehicle.SelectedPermutation;
        if ((selectedPermutation != null) && (selectedPermutation.comboUpgrades != null))
        {
            const selectedPermutationIds = selectedPermutation.comboUpgrades.map(x => x.upgrade.id).flat(1);
            const appliedUpgradeIds = vehicle.UpgradesApplied.map(x => x.upgrade_id).flat(1);
            if (debugTokenIds.includes(vehicle.vehicleTokenId)) console.log(selectedPermutationIds.sort().toString(), ' :: ', appliedUpgradeIds.sort().toString())
            if ( ((!selectedRace.applyingUpgrades) || (selectedRace.applyingUpgrades && !selectedRace.rateLimited)) && (selectedPermutationIds.sort().toString() === appliedUpgradeIds.sort().toString()) )
            {
                selectedRace.selectedVehicle().ApplyUpgradesNowClass('');
                selectedRace.selectedVehicle().ApplyUpgradesNowText('Upgrades set.');
            }
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

function refreshAssignedUserVehicles()
{
    assignedUserVehicles.push(...unjoinedRacesVM.unjoinedRaceList().map(x => x.id).flat(1));
    if (assignUserVehiclesTimeoutId == null) setTimeout(assignUserVehicles, 0);
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
                vehicleMaxCapacity = enteredVehicle.vehicle.stats.max_capacity;
                vehicleMaxRange = enteredVehicle.vehicle.stats.max_range;
                numberOfTrips = Math.ceil(cargoWeight / vehicleMaxCapacity);
                vehicleAdjustedRaceDistance = raceDistance + ((numberOfTrips-1)*raceDistance*2);
                numberOfRefuels = Math.ceil(vehicleAdjustedRaceDistance / vehicleMaxRange) - 1;
                const userVehicle = userVehiclesVM().find(vehicle => { return vehicle.token_id() == enteredVehicle.vehicle.token_id});
                const leasedVehicle = lesseeVehiclesVM().find(vehicle => { return vehicle.vehicle.metadata.token_id() == enteredVehicle.vehicle.token_id });
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
                    leased: (leasedVehicle != null),
                    SelectedPermutation: { comboUpgrades: ((userVehicle) ? userVehicle.LastAppliedUpgrades : []) },
                    vehicleFreightPunkId: ((userVehicle) ? userVehicle.vehicleFreightPunkId() : null),
                    vehicleFreightPunkLevel: ((userVehicle) ? userVehicle.vehicleFreightPunkLevel() : null),
                    vehicleFreightPunkSkillPoints: ((userVehicle) ? userVehicle.vehicleFreightPunkSkillPoints() : null),
                    vehicleFreightPunkUrl: ((userVehicle) ? userVehicle.vehicleFreightPunkUrl() : null),
                    vehicleFreightPunkXp: ((userVehicle) ? userVehicle.vehicleFreightPunkXp() : null),
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
    const joinedRacesWithDupes = $.merge(upcomingFreeRaces, upcomingPaidRaces).filter(function(race) { return race.participants.some(participant => participant.racer.username === userInfoVM.Username()) });
    joinedRaces = distinct(joinedRacesWithDupes, "id");
    var decimalPlaces = 0;

    unjoinedRaces.forEach( (unjoinedRaceItem, index) =>
        {
            const unjoinedRaceFromVm = (unjoinedRacesVM == null) ? null : unjoinedRacesVM.unjoinedRaceList().find(x => x.id === unjoinedRaceItem.id);
            const participants = ko.mapping.toJS(unjoinedRaces[index].participants);
            Log(unjoinedRaces[index].name + ' :: ' + participants.length, 'severity-debug', LogLevel.Debug)
            if (unjoinedRaceFromVm != null) 
            {
                unjoinedRaces[index] = unjoinedRaceFromVm;
                unjoinedRaces[index].participants(participants);
            }
            else
            {
                unjoinedRaces[index].participants = ko.mapping.fromJS(participants);
            }
            unjoinedRaces[index].PreSelectedVehicle = ko.observable();
            preSelectedVehicle = ko.mapping.fromJS(
                {
                    ApplyUpgradesNowClass: null,
                    ApplyUpgradesNowText: null,
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
                    vehicleType: null, 
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
                    }, 
                    token_id: null
                }
            );
            unjoinedRaces[index].PreSelectedVehicle(preSelectedVehicle);
            unjoinedRaces[index].raceDistance = ko.observable(roundTo(unjoinedRaces[index].distance, decimalPlaces));

            if (unjoinedRaces[index].selectedVehicle == null)
            {
                unjoinedRaces[index].selectedVehicle = ko.observable();
                const selectedVehicle = ko.mapping.fromJS(ko.mapping.toJS(unjoinedRaces[index].PreSelectedVehicle));
                unjoinedRaces[index].selectedVehicle(selectedVehicle);
            }
        }
    );
    Log(' ', 'severity-debug', LogLevel.Debug)

    $.each(joinedRaces, function(index)
        {
            var joinedRace = joinedRaces[index];
            var enteredVehicle = joinedRace.participants.find(function(participant) {return participant.racer.username === userInfoVM.Username()});
            raceDistance = roundTo(joinedRace.distance, 4);
            cargoWeight = joinedRace.weight;
            vehicleMaxCapacity = enteredVehicle.vehicle.stats.max_capacity;
            vehicleMaxRange = enteredVehicle.vehicle.stats.max_range;
            decimalPlaces = (joinedRace.distance < 100) ? 2 : 0;
            numberOfTrips = Math.ceil(cargoWeight / vehicleMaxCapacity);
            vehicleAdjustedRaceDistance = raceDistance + ((numberOfTrips-1)*raceDistance*2);
            numberOfRefuels = Math.ceil(vehicleAdjustedRaceDistance / vehicleMaxRange) - 1;
            const userVehicle = userVehiclesVM().find(vehicle => { return vehicle.token_id() == enteredVehicle.vehicle.token_id});
            const leasedVehicle = lesseeVehiclesVM().find(vehicle => { return vehicle.vehicle.metadata.token_id() == enteredVehicle.vehicle.token_id });
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
                leased: (leasedVehicle != null),
                raceDistance: roundTo(joinedRace.distance, decimalPlaces),
                SelectedPermutation: { comboUpgrades: (userVehicle) ? userVehicle.LastAppliedUpgrades : [] },
                vehicleFreightPunkId: (userVehicle) ? userVehicle.vehicleFreightPunkId() : null,
                vehicleFreightPunkLevel: (userVehicle) ? userVehicle.vehicleFreightPunkLevel() : null,
                vehicleFreightPunkSkillPoints: (userVehicle) ? userVehicle.vehicleFreightPunkSkillPoints() : null,
                vehicleFreightPunkUrl: (userVehicle) ? userVehicle.vehicleFreightPunkUrl() : null,
                vehicleFreightPunkXp: (userVehicle) ? userVehicle.vehicleFreightPunkXp() : null,
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

    unjoinedRaces.sort(function(a, b) {return a.participants().length < b.participants().length ? 1 : -1});
    unjoinedRacesVM.unjoinedRaceList(unjoinedRaces);
    joinedRaces.sort(function(a, b) {return a.participants.length < b.participants.length ? 1 : -1});
    joinedRacesVM.joinedRaceList(joinedRaces);

    setTimeout(cloneImages, 0);

    $('#lastUpdated').html(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

}

function refreshUpgradePermutations()
{
    if ($('#chkEnablePermutations').is(':checked'))
    {
        $('.permutation-warning').show();
        $('.permutation-warning-none').hide();
    }
    else
    {
        $('.permutation-warning-none').show();
        $('.permutation-warning').hide();
    }
    userVehiclesVM().forEach(userVehicle =>
        {
            if (debugTokenIds.includes(userVehicle.token_id())) console.log('Token #' + userVehicle.token_id() + ' upgrade permutations being checked...');
            const baseStatsVehicle = vehicleBaseStats.find(x => x.id == userVehicle.token_id());

            userVehicle.vehicleFreightPunkId = ko.observable(((userVehicle.freightPunk != null) && (userVehicle.freightPunk.punk != null) && (userVehicle.freightPunk.punk.id != null)) ? userVehicle.freightPunk.punk.id() : 0);
            userVehicle.vehicleFreightPunkLevel = ko.observable((userVehicle.vehicleFreightPunkId() > 0) ? userVehicle.freightPunk.punk.level() : '');
            userVehicle.vehicleFreightPunkSkillPoints = ko.observable((userVehicle.vehicleFreightPunkId() > 0) ? userVehicle.freightPunk.punk.skill_points() : '');
            userVehicle.vehicleFreightPunkUrl = ko.observable((userVehicle.vehicleFreightPunkId() > 0) ? userVehicle.freightPunk.punk.image() : '');
            userVehicle.vehicleFreightPunkXp = ko.observable((userVehicle.vehicleFreightPunkId() > 0) ? userVehicle.freightPunk.punk.xp_earned() : '');
            userVehicle.vehicleImageUrl = userVehicle.image();
            userVehicle.vehicleName = userVehicle.name();
            userVehicle.vehicleTokenId = userVehicle.token_id();

            const vehicleType = userVehicle.staticAttributes.vehicle_type();
            const vehicleClass = userVehicle.staticAttributes.transportation_mode();
            const vehicleAdjustable = vehicleAdjustables().filter( vehicleAdjustable => {return vehicleAdjustable.vehicleType().toLowerCase() === vehicleType.toLowerCase()})[0];
            const vehicleTypeMaxRange = vehicleAdjustable.statBoundaries.max_range.max();
            const vehicleTypeMaxSpeed = vehicleAdjustable.statBoundaries.max_speed.max();
            
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
            var InitialStatsPermutation = 
            {
                emission_rate: userVehicle.dynamicStats.emission_rate(),
                fuel_efficiency: userVehicle.dynamicStats.fuel_efficiency(),
                max_capacity: userVehicle.dynamicStats.max_capacity(),
                max_range: userVehicle.dynamicStats.max_range(),
                max_speed: userVehicle.dynamicStats.max_speed(),
                comboUpgrades: []
            }

            InitialStatsPermutation.PermutationId = userVehicle.token_id() + '_Starting';

            var ownedUpgradeIds = [];
            userVehicle.ownedUpgrades = userVehicle.UpgradedStats().filter( stat => { return stat.owned(); });
            var appliedUpgradeIds = ko.mapping.toJS(userVehicle.UpgradesApplied).map(x => x.upgrade_id).flat(1);
            userVehicle.LastAppliedUpgrades = [];

            userVehicle.ownedUpgrades.forEach( ownedUpgrade =>
                {
                    if (appliedUpgradeIds.includes(ownedUpgrade.upgrade.id()))
                    {
                        userVehicle.LastAppliedUpgrades.push(ownedUpgrade);
                        InitialStatsPermutation.comboUpgrades.push(ownedUpgrade);
                    }
                }
            );
            userVehicle.StatsPermutations.push(InitialStatsPermutation);

            /* Add all upgrade permutations */
            if (mySettings.enable_permutations())
            {
                // Add BaseStats as initial permutation with permutations enabled
                var BaseStatsPermutation = 
                {
                    emission_rate: baseStatsVehicle.emission_rate,
                    fuel_efficiency: baseStatsVehicle.fuel_efficiency,
                    max_capacity: baseStatsVehicle.max_capacity,
                    max_range: baseStatsVehicle.max_range,
                    max_speed: baseStatsVehicle.max_speed,
                    comboUpgrades: []
                }

                BaseStatsPermutation.PermutationId = userVehicle.token_id() + '_00';
                Log('BaseStatsPermutation.comboUpgrades.length: ' + BaseStatsPermutation.comboUpgrades.length + '\nBaseStatsPermutation (content):\n' + JSON.stringify(BaseStatsPermutation), 'severity-info', LogLevel.Info);
                userVehicle.StatsPermutations.push(BaseStatsPermutation);

                Log('userVehicle.BaseStats:\n' + ko.mapping.toJSON(userVehicle.BaseStats), 'severity-info', LogLevel.Info);
                i = 1;
                j = 1;
                ownedUpgradeIds = userVehicle.ownedUpgrades.map(x => x.upgrade.id()).flat(1);
                while (i<=ownedUpgradeIds.length)
                {
                    var combos = k_combinations(ownedUpgradeIds, i);
                    combos.forEach( combo =>
                        {
                            var StatsPermutation = 
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
                            countBody = 0;
                            countEngine = 0;
                            countTransmission = 0;
                            combo.forEach(comboItem => 
                                {
                                    ownedUpgrade = userVehicle.ownedUpgrades.find(upgrade => { return upgrade.upgrade.id() == comboItem });
                                    ownedUpgrade.upgrade.abbreviation = upgradeAbbreviations[ownedUpgrade.upgrade.name()];
                                    countBody += (ownedUpgrade.upgrade.abbreviation.substring(0,2).toUpperCase() == 'B:') ? 1 : 0;
                                    countEngine += (ownedUpgrade.upgrade.abbreviation.substring(0,2).toUpperCase() == 'E:') ? 1 : 0;
                                    countTransmission += (ownedUpgrade.upgrade.abbreviation.substring(0,2).toUpperCase() == 'T:') ? 1 : 0;
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

                            StatsPermutation.emission_rate = (StatsPermutation.emission_rate > vehicleAdjustable.statBoundaries.emission_rate.max()) ? vehicleAdjustable.statBoundaries.emission_rate.max() : StatsPermutation.emission_rate;
                            StatsPermutation.fuel_efficiency = (StatsPermutation.fuel_efficiency > vehicleAdjustable.statBoundaries.fuel_efficiency.max()) ? vehicleAdjustable.statBoundaries.fuel_efficiency.max() : StatsPermutation.fuel_efficiency;
                            StatsPermutation.max_capacity = (StatsPermutation.max_capacity > vehicleAdjustable.statBoundaries.max_capacity.max()) ? vehicleAdjustable.statBoundaries.max_capacity.max() : StatsPermutation.max_capacity;
                            StatsPermutation.max_range = (StatsPermutation.max_range > vehicleTypeMaxRange) ? vehicleTypeMaxRange : StatsPermutation.max_range;
                            StatsPermutation.max_speed = (StatsPermutation.max_speed > vehicleTypeMaxSpeed) ? vehicleTypeMaxSpeed : StatsPermutation.max_speed;

                            StatsPermutation.PermutationId = userVehicle.token_id() + '_' + j;

                            if (countBody > 2)
                            {
                                Log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': This permutation has more than 2 body upgrades; eliminating.', 'severity-info', LogLevel.Info);
                                if (debugTokenIds.includes(userVehicle.token_id())) console.log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': This permutation has more than 2 body upgrades; eliminating.');
                            }
                            else if (countEngine > 1)
                            {
                                Log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': This permutation has more than 1 engine upgrades; eliminating.', 'severity-info', LogLevel.Info);
                                if (debugTokenIds.includes(userVehicle.token_id())) console.log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': This permutation has more than 1 engine upgrades; eliminating.');
                            }
                            else if (countTransmission > 1)
                            {
                                Log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': This permutation has more than 1 transmission upgrades; eliminating.', 'severity-info', LogLevel.Info);
                                if (debugTokenIds.includes(userVehicle.token_id())) console.log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': This permutation has more than 1 transmission upgrades; eliminating.');
                            }
                            else if ((hasEcuHp) && (hasEcuHe))
                            {
                                Log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': This permutation has both ECU-HP and ECU-HE; eliminating.', 'severity-info', LogLevel.Info);
                                if (debugTokenIds.includes(userVehicle.token_id())) console.log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': This permutation has both ECU-HP and ECU-HE; eliminating.');
                            }
                            else if ((StatsPermutation.emission_rate < 1) || (StatsPermutation.fuel_efficiency < 1) || (StatsPermutation.max_capacity < 1) || (StatsPermutation.max_range < 1) || (StatsPermutation.max_speed < 1))
                            {
                                Log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': One or more stat is less than 1; eliminating this permutation: ' + JSON.stringify(StatsPermutation), 'severity-info', LogLevel.Info);
                                if (debugTokenIds.includes(userVehicle.token_id())) console.log('Token #' + StatsPermutation.TokenId + ', ID #' + StatsPermutation.PermutationId + ': One or more stat is less than 1; eliminating this permutation: ' + JSON.stringify(StatsPermutation));
                            }
                            else
                            {
                                Log('StatsPermutation.comboUpgrades.length: ' + StatsPermutation.comboUpgrades.length + '\nStatsPermutation (content):\n' + JSON.stringify(StatsPermutation), 'severity-info', LogLevel.Info);
                                userVehicle.StatsPermutations.push(StatsPermutation);
                                if (debugTokenIds.includes(userVehicle.token_id())) console.log('Token #' + userVehicle.token_id(), StatsPermutation);
                            }

                            j++;
                        }
                    );
                    i++;
                }
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

    Log('refreshViewModels() - Call refreshUpgradePermutations()', 'severity-info', LogLevel.Debug);
    refreshUpgradePermutations();
    
    Log('refreshViewModels() - Call refreshNextToRaceRaces()', 'severity-info', LogLevel.Debug);
    refreshNextToRaceRaces();

    Log('refreshViewModels() - Call refreshUpcomingRaces()', 'severity-info', LogLevel.Debug);
    refreshUpcomingRaces();

    Log('refreshViewModels() - Call refreshAssignUserVehicles()', 'severity-info', LogLevel.Debug);
    refreshAssignedUserVehicles();

    Log('refreshAdjustables() - Call refreshAdjustables()', 'severity-info', LogLevel.Debug);
    setTimeout(refreshAdjustables, 0);

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

var applyUpgradesTimeoutId1 = null;
var applyUpgradesTimeoutId2 = null;
var assignUserVehiclesTimeoutId = null;
var assignedUserVehicles = [];
const debugTokenIds = []
const debugRaceNames = []
var joinedRaces = [];
