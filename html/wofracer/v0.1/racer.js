/*
    WOF Racer script - see README.md for details on usage and latest features.

    Some code incorporated from:   
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
        return (terrain) ? terrain.substring(0, 1) : '';
    }

    self.joinedRaceList = ko.observableArray(joinedRaces);
}

function UnjoinedRacesVM(unjoinedRaces)
{
    if (unjoinedRaces == null) return;
    
    var self = this;

    self.raceDistance = ko.observable();

    self.selectRace = function(data, event)
    {
        
    }

    self.terrainIcon = function(terrain)
    {
        return (terrain) ? terrain.substring(0, 1) : '';
    }

    self.unjoinedRaceList = ko.observableArray(unjoinedRaces);
}
function UserInfoVM(username, userParticipationThreshold)
{
    var self = this;
    self.username = ko.observable(username);
    self.participationThreshold = ko.observable(userParticipationThreshold);
}

/* API calls - data retrieval */
function getLocalData()
{
    Log('getLocalData() - Start Function', 'severity-info', 'Info');

    $.when(
        $.getJSON('mysettings.json', function(data) 
        {
            Log('getLocalData() - Begin mysettings.json getJSON()', 'severity-info', 'Info');

            authorizationKey = data.authorization_key;
            walletAddress = data.wallet_address;
            participationThreshold = data.participation_threshold;
            joinTemplate.address = walletAddress;
            userRacesTemplate.address = walletAddress;

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
                        'Authorization': authorizationKey
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
    postQueries.Racers.variables.address = walletAddress;
    postQueries.Fleet.variables.address = walletAddress;

    $.when(
        $.post(graphQlApi, JSON.stringify(postQueries.Racers), function(data) {
            Log('getServerData() - Begin Racers post()', 'severity-info', 'Info');
            if (!bound['userInfoVM'])
            {
                userInfoVM = new UserInfoVM(data.data.racers[0].username, participationThreshold);
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
                    ko.applyBindings(userVehiclesVM, $('#userVehicles').get(0));
                    bound['userVehiclesVM'] = true;
                }
                Log('getServerData() - End Fleet post()', 'severity-info', 'Info');
                Log(JSON.stringify(userVehicles), 'severity-info', 'Info');
            }
        , 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.Races), function(data) {
            Log('getServerData() - Begin Races post()', 'severity-info', 'Info');

            races = data.data.races;

            Log('getServerData() - End Racers post()', 'severity-info', 'Info');
        }, 'json')
    ).done(
        function() 
        { 
            Log('getServerData() - Begin done()', 'severity-info', 'Info');

            Log('getServerData() - Call afterRaceQuery()', 'severity-info', 'Info')
            afterRaceQuery(true);

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

    Log('afterRaceQuery() - Call setupRaces()', 'severity-info', 'Info')
    setupRaces();

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
        }, refreshRate);
    }

    Log('afterRaceQuery() - End', 'severity-info', 'Info'); 
}

function assignUserVehicles()
{
    Log('assignBestVehicles() - Start Function', 'severity-info', 'Info');

    $.each(unjoinedRacesVM.unjoinedRaceList(), function(index)
        {
            var unjoinedRace = unjoinedRacesVM.unjoinedRaceList()[index];
            Log('assignBestVehicles() - Begin Selecting Best Vehicle for Race {0}:'.replace('{0}', unjoinedRace.name), 'severity-info', 'Info');

            raceClass = unjoinedRace.class.toLowerCase();
            raceDistance = Math.round(unjoinedRace.distance, 4);
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

            userVehiclesVM().forEach(userVehicle =>
                {
                    if (userVehicle.staticAttributes.transportation_mode().toLowerCase() == raceClass)
                    {
                        userVehicle.vehicleImageUrl = userVehicle.image();
                        userVehicle.vehicleName = userVehicle.name();
                        userVehicle.vehicleTokenId = userVehicle.token_id();
                        availableVehiclesInClass.push(userVehicle);
                    }
                }
            );

            if (availableVehiclesInClass.length > 0)
            {
                availableVehiclesInClass.forEach(availableVehicle =>
                    {
                        allowedVehicle = true;
                        vehicleName = availableVehicle.name();
                        vehicleType = availableVehicle.staticAttributes.vehicle_type();
                        vehicleClass = availableVehicle.staticAttributes.transportation_mode();
                        vehicleMaxCapacity = availableVehicle.dynamicStats.max_capacity();
                        vehicleMaxRange = availableVehicle.dynamicStats.max_range();
                        vehicleMaxSpeed = availableVehicle.dynamicStats.max_speed();
                        vehicleEmissionRate = availableVehicle.dynamicStats.emission_rate();
                        vehicleFuelEfficiency = availableVehicle.dynamicStats.fuel_efficiency();
                        numberOfTrips = Math.ceil(cargoWeight / vehicleMaxCapacity);
                        vehicleAdjustedRaceDistance = raceDistance + ((numberOfTrips-1)*raceDistance*2);
                        numberOfRefuels = Math.ceil(vehicleAdjustedRaceDistance / vehicleMaxRange);
                        vehicleAdjustable = vehicleAdjustables.filter(function(vehicleAdjustable) {return vehicleAdjustable.vehicleType.toLowerCase() === vehicleType.toLowerCase()})[0];
                        vehicleAccelerationDelay = vehicleAdjustable.adjustables.delays.accelerationDelay;
                        vehicleDecelerationDelay = vehicleAdjustable.adjustables.delays.decelerationDelay;
                        vehicleRefuelingDelay = vehicleAdjustable.adjustables.delays.refuelingDelay * (numberOfRefuels-1) * (vehicleEmissionRate/10);

                        if (joinedRaces.some(joinedRace => joinedRace.participants.filter(participant => { return participant.vehicle.token_id === availableVehicle.token_id() }).length > 0 ))
                        {
                            Log('{0} is already joined in a race; eliminating.'
                                .replace('{0}', vehicleName)
                                , 'severity-info', 'Info'
                            );
                            allowedVehicle = false;
                        }
                        else if (numberOfTrips > 5)
                        {
                            Log('{0} will need more than 5 trips to complete the distance of {1}km for race [{2}]; eliminating.'
                                .replace('{0}', vehicleName)
                                .replace('{1}', raceDistance)
                                .replace('{2}', raceName)
                                , 'severity-info', 'Info'
                            );
                            allowedVehicle = false;
                        }
                        else if (numberOfRefuels > 5)
                        {
                            Log('{0} will need more than 5 refuels to complete the distance of {1}km for race [{2}]; eliminating.'
                                .replace('{0}', vehicleName)
                                .replace('{1}', raceDistance)
                                .replace('{2}', raceName)
                                , 'severity-info', 'Info'
                            );
                            allowedVehicle = false;
                        }

                        if (allowedVehicle)
                        {
							estimatedTimeToComplete = (vehicleAdjustedRaceDistance / vehicleMaxSpeed)*3600 + (vehicleAccelerationDelay + vehicleDecelerationDelay)*(numberOfRefuels + 1); // Extra accel/decel delay for start and stop
                            terrainAdjustment = (vehicleAdjustable.adjustables.terrain && raceTerrain.length > 0) ? vehicleAdjustable.adjustables.terrain[raceTerrain] : 1;
							weatherAdjustment = (vehicleAdjustable.adjustables.weather && raceWeather.length > 0) ? vehicleAdjustable.adjustables.weather[raceWeather] : 1;
							terrainAndWeatherAdjustedTime = estimatedTimeToComplete * weatherAdjustment * terrainAdjustment;
							availableVehicle.finalAdjustedTime = terrainAndWeatherAdjustedTime;
                            availableVehiclesToRace.push(availableVehicle);
                            Log(
                                'vehicleAdjustedRaceDistance: ' + vehicleAdjustedRaceDistance 
                                + '\nvehicleMaxSpeed: ' + vehicleMaxSpeed
                                + '\nvehicleAccelerationDelay: ' + vehicleAccelerationDelay
                                + '\nvehicleDecelerationDelay: ' + numberOfRefuels
                                + '\nterrainAdjustment: ' + terrainAdjustment
                                + '\nweatherAdjustment: ' + weatherAdjustment
                                + '\nestimatedTimeToComplete: ' + estimatedTimeToComplete
                                + '\nraceTerrain, adjustable.terrain: ' + raceTerrain + ', ' + vehicleAdjustable.adjustables.terrain[raceTerrain]
                                + '\nraceWeather, adjustable.weather: ' + raceWeather + ', ' + vehicleAdjustable.adjustables.weather[raceWeather]
                                , 'severity-info', 'Info'
                            );
                        }
                    }
                );
                if (availableVehiclesToRace.length > 0)
                {
                    finalAdjustedTimes = '';
                    availableVehiclesToRace.sort(function(a, b) {return a.finalAdjustedTime > b.finalAdjustedTime ? 1 : -1});
                    availableVehiclesToRace.forEach(availableVehicle =>
                        {
                            finalAdjustedTimes = finalAdjustedTimes + availableVehicle.name() + ': ' + availableVehicle.finalAdjustedTime + '\n';
                        }
                    );
                    Log('finalAdjustedTimes:\n' + finalAdjustedTimes, 'severity-info', 'Info');
                    ko.mapping.fromJS(availableVehiclesToRace[0], unjoinedRace.selectedVehicle);
                }
                else
                {
                    unjoinedRace.selectedVehicle.vehicleId('');
                    unjoinedRace.selectedVehicle.vehicleImageUrl('');
                    unjoinedRace.selectedVehicle.vehicleTokenId('');
                    unjoinedRace.selectedVehicle.vehicleName("No available {0} WOFs.".replace('{0}', raceClass));
                }
            }
            else
            {
                unjoinedRace.selectedVehicle.vehicleId('');
                unjoinedRace.selectedVehicle.vehicleImageUrl('');
                unjoinedRace.selectedVehicle.vehicleTokenId('');
                unjoinedRace.selectedVehicle.vehicleName("No {0} WOFs to race.".replace('{0}', raceClass));
            }
            Log('assignBestVehicles() - End Selecting Best Vehicle for Race {0}:'.replace('{0}', unjoinedRace.name), 'severity-info', 'Info');
        }
    );

    Log('assignBestVehicles() - End Function', 'severity-info', 'Info');
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
        modifiedParticipationThreshold = (unjoinedRace.class.toLowerCase() == 'space') ? Math.round(participationThreshold*.7, 0) : participationThreshold;
        if ((participantCount >= modifiedParticipationThreshold) && (unjoinedRace.selectedVehicle.vehicleTokenId()))
        {
            joined = true;
            joinApiData = structuredClone(joinTemplate);
            joinApiData.address = walletAddress;
            joinApiData.raceId = unjoinedRace.id;
            joinApiData.tokenId = unjoinedRace.selectedVehicle.vehicleTokenId();
            Log('walletAddress: ' + walletAddress, '\nselectedRaceId: ' + joinApiData.raceId + '\nselectedVehicleId: ' + joinApiData.tokenId, 'severity-info', 'Info');
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
        $.post(graphQlApi, JSON.stringify(postQueries.Races), function(data) {
            Log('refreshData() - Begin Races post()', 'severity-info', 'Info');

            races = data.data.races;

            Log('refreshData() - End Racers post()', 'severity-info', 'Info');
        }, 'json')
    ).done(
        function() 
        { 
            afterRaceQuery(doSetTimeout, ignoreJoinRace);
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });		

}

function setupRaces()
{
    var unjoinedRaces = races.filter(function(race) { return !(race.participants.some(participant => participant.racer.username === userInfoVM.username())) });
    joinedRaces = races.filter(function(race) { return race.participants.some(participant => participant.racer.username === userInfoVM.username()) });

    $.each(unjoinedRaces, function(index)
        {
            unjoinedRaces[index].selectedVehicle = ko.mapping.fromJS({vehicleId: null, vehicleName: '(TBD)', vehicleImageUrl: null, vehicleTokenId: null});
            decimalPlaces = (unjoinedRaces[index].distance < 100) ? 2 : 0;
            unjoinedRaces[index].raceDistance = unjoinedRaces[index].distance.toFixed(decimalPlaces);
        }
    );

    $.each(joinedRaces, function(index)
        {
            var enteredVehicle = joinedRaces[index].participants.filter(function(participant) {return participant.racer.username === userInfoVM.username()})[0];
            decimalPlaces = (joinedRaces[index].distance < 100) ? 2 : 0;
            joinedRaces[index].enteredVehicle = 
            {
                id:  enteredVehicle.vehicle.token_id,
                image: enteredVehicle.vehicle.image,
                name: enteredVehicle.vehicle.name,
                raceDistance: joinedRaces[index].distance.toFixed(decimalPlaces)
            }
        }
    );

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

    $('#lastUpdated').html(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

}

function startTimer() {
    timePassed = 0;
    timerIntervalId = setInterval(() => 
    {
      // The amount of time passed increments by one
      timePassed = timePassed += 1;
      timeLeft = TIME_LIMIT - timePassed;
      
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
      (timeLeft / TIME_LIMIT) * FULL_DASH_ARRAY
    ).toFixed(0)} 283`;

    $(".base-timer__path-remaining").attr("stroke-dasharray", circleDashArray);
}
  
function updateTimer_SetRemainingPathColor(timeLeft) 
{
    var { alert, warning, info } = colorCodes;
  
    // If the remaining time is less than or equal to 5, remove the "warning" class and apply the "alert" class.
    if (timeLeft <= alert.threshold) {
        $(".base-timer__path-remaining").removeClass(warning.color);
        $(".base-timer__path-remaining").addClass(alert.color);
    } 
    // If the remaining time is less than or equal to 10, remove the base color and apply the "warning" class.
    else if (timeLeft <= warning.threshold) 
    {
        $(".base-timer__path-remaining").removeClass(info.color);
        $(".base-timer__path-remaining").addClass(warning.color);
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

    //$('ul.infinite-tabs#target').infiniteTabs();
    $('#tabsMiddle#target').infiniteTabs();
    $('#tabsRight#target').infiniteTabs();
    $('ul.infinite-tabs').find('li.tab').click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            $thisTab = $(this);
            ulId = '#' + $($thisTab).parents('ul.infinite-tabs').attr('id');
            $(ulId).find('li.tab').removeClass("active");
            $($thisTab).addClass("active");
            $(ulId + ' ~ div.tab-content').hide();
            var activeTabContent = '#' + $($thisTab).attr('id').replace('Tab', 'Content');
            $(activeTabContent).show();
    });
    $('#tabsMiddle').find('li.tab').first().click();
    $('#tabsRight').find('li.tab').first().click();

    $('input:text, input:password, input[type=email]').button().addClass('form-input');

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
joinTemplate = {
    'address': '{walletAddress}',
    'raceId': '{raceID}',
    'tokenId': '{vehicleID}'
}

userRacesTemplate = {
    'address': '{walletAddress}',
    'filter': {'raceClass': [], 'vehicleType': [], 'user_status': 'all', 'period': [], 'distance': []},
    'limit': 1,
    'sort': null
}

var adjustablesVM = null;
var authorizationKey = '';
var bound = [];
var timerIntervalId = null;
var joinedRaces = [];
var participationThreshold = 8
var postQueries = {};
var races = [];
var refreshRate = 30000;
var timeoutId = null;
var unjoinedRacesVM = null;
var userInfoVM = null;
var userVehiclesVM  = [];
var vehicleAdjustables = []
var walletAddress = '';

const ALERT_THRESHOLD = 5;
const CURRENT_VERSION = "0.1.1";
const FULL_DASH_ARRAY = 283;
const ROOT_API_URL = 'https://api.worldoffreight.xyz';
const ROOT_GRAPH_URL = 'https://graph.worldoffreight.xyz/v1';
const TIME_LIMIT = refreshRate/1000;
const WARNING_THRESHOLD = 10;

var colorCodes = {
    info: {
        color: "info"
    },
    warning: {
        color: "alert",
        threshold: WARNING_THRESHOLD
    },
    alert: {
        color: "warning",
        threshold: ALERT_THRESHOLD
    }
};

var graphQlApi = `${ROOT_GRAPH_URL}/graphql`;
var joinApi = `${ROOT_API_URL}/racing-arena/join`;

var remainingPathColor = colorCodes.info.color;
var timeLeft = TIME_LIMIT;
var timePassed = 0;
