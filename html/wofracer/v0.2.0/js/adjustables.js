function calculateAdjustables(race)
{
    race = ko.mapping.toJS(race);
    race.selectedVehicle = ko.mapping.toJS(race.selectedVehicle);
    
    raceClass = race.class.toLowerCase();
    raceDistance = parseFloat(race.distance);
    raceName = race.name;
    raceWeather = (race.weather ? race.weather : 'N_A');
    raceTerrain = (race.terrain ? race.terrain : 'N_A');
    cargoWeight = race.weight;

    var adjustablesLength = vehicleAdjustables().length;
    while(adjustablesLength--)
    {
        if (!vehicleAdjustables()[adjustablesLength].isTemplate()) 
        {
            vehicleAdjustables.splice(adjustablesLength, 1);
        }
    }

    const raceVehicleTypeAdjustable = vehicleAdjustables().find( match => {return (match.vehicleType() === race.selectedVehicle.vehicleType); });

    if (!raceVehicleTypeAdjustable) return;

    const selectedVehicleAdjustable = ko.mapping.fromJS(
        {
            adjustables: raceVehicleTypeAdjustable.adjustables,
            isTemplate: false,
            statBoundaries: raceVehicleTypeAdjustable.statBoundaries,
            vehicleClass: raceClass,
            vehicleIsOneOfOne: false,
            vehicleName: race.selectedVehicle.vehicleName,
            vehicleTemplate: 
            {
                emission_rate: race.selectedVehicle.SelectedPermutation.emission_rate,
                fuel_efficiency: race.selectedVehicle.SelectedPermutation.fuel_efficiency,
                max_capacity: race.selectedVehicle.SelectedPermutation.max_capacity,
                max_range: race.selectedVehicle.SelectedPermutation.max_range,
                max_speed: race.selectedVehicle.SelectedPermutation.max_speed,
                template_id: race.selectedVehicle.vehicleTokenId
            },
            vehicleType: race.selectedVehicle.vehicleType
        }
    );
    vehicleAdjustables.unshift(selectedVehicleAdjustable);

    filteredAdjustables = vehicleAdjustables().filter( vehicleAdjustable => {return vehicleAdjustable.vehicleClass().toLowerCase() === raceClass});

    $(`#tblTerrainWeatherComparisons > tbody > tr.class-${raceClass}`).show();

    const dnfHtml = '<img src="./images/redskull.png" style="verticle-align: middle; width: 20px;" title="DNF">';
    var arrTimes = [];
    var i=0;

    filteredAdjustables.forEach( adjustable =>
        {
            i++;
            const terrainKeys = Object.keys(adjustable.adjustables.terrain);
            const weatherKeys = Object.keys(adjustable.adjustables.weather);
            terrainKeys.forEach( terrainKey =>
                {
                    weatherKeys.forEach( weatherKey =>
                        {
                            const terrainWeatherCell = '#Terrain_' + terrainKey + '_Weather_' + weatherKey + '_' + adjustable.vehicleTemplate.template_id();
                            var vehicleStats = {};
                            statTypes.forEach( statType => 
                                { vehicleStats[statType] = adjustable.vehicleTemplate[statType](); }
                            );
                            calculatedResults = calculateRaceTime(raceName, terrainKey, weatherKey, i, (!adjustable.isTemplate()) ? adjustable.vehicleName : 'Perfect stats ' + adjustable.vehicleType() + ' #' + i, cargoWeight, raceDistance, vehicleStats, adjustable);
                            finalAdjustedTime = roundTo(calculatedResults.finalAdjustedTime, 4);
                            
                            const timeHtml = `<span>${getFormattedTime(finalAdjustedTime)}</span>`;
                            if ((calculatedResults.numberOfTrips > 5) || (calculatedResults.numberOfRefuels > 5) || (finalAdjustedTime === 0 || (finalAdjustedTime === Infinity)))
                            {
                                $(terrainWeatherCell).removeClass().addClass('adjustable-cell').html(dnfHtml);
                            }
                            else
                            {
                                if ($.inArray(finalAdjustedTime, arrTimes) === -1)
                                {
                                    arrTimes.push(finalAdjustedTime);
                                }
                                $(terrainWeatherCell).removeClass().addClass('adjustable-cell time-' + String(finalAdjustedTime).replace('.', '_')).html(timeHtml);
                            }
                            //console.log(calculatedResults);
                        }
                    )
                }
            );
        }
    );
    arrTimes.sort( (a, b) => {return a > b  ? 1 : -1});
    for (var i=1; i<arrTimes.length+1; i++)
    {
        $('.time-' + String(arrTimes[i-1]).replace('.', '_')).addClass('adjustable-cell-speed-' + ((i>9) ? 9 : i));
    }
    $('#tblTerrainWeatherComparisons').show();
    setTimeout(cloneImages, 0);
}

function refreshAdjustables(raceId)
{
    $('#tblTerrainWeatherComparisons > tbody > tr').hide();

    const freeOrPaid = ($('#freeRacesContent').is(':visible')) ? 'free' : 'paid';
    firstRace = unjoinedRacesVM.unjoinedRaceList().filter(race => 
        { 
            const freePaidMatch = (freeOrPaid === 'free') ? (race.entry_fee === 0) : (race.entry_fee > 0);
            const raceIdMatch = ((raceId === race.id) || (raceId == null));
            
            return (freePaidMatch && raceIdMatch);
    })[0]

    if (!firstRace) return;
    var firstRaceClone = ko.mapping.fromJS(ko.mapping.toJS(firstRace));
    selectedRaceToAdjustVM.Race(firstRaceClone);
    selectedRaceToAdjustVM.Race().distance.subscribe(function (newValue) 
        {
            const playPauseValue = $('#imgPlayPause').attr('value');
            if (playPauseValue != 'Paused') $('#imgPlayPause').click();
            calculateAdjustables(selectedRaceToAdjustVM.Race);
        }
    );

    selectedRaceToAdjustVM.Race().weight.subscribe(function (newValue) 
        {
            const playPauseValue = $('#imgPlayPause').attr('value');
            if (playPauseValue != 'Paused') $('#imgPlayPause').click();
            calculateAdjustables(selectedRaceToAdjustVM.Race);
        }
    );
    
    calculateAdjustables(firstRace);
}

