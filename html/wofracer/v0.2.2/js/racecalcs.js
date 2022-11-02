function calculateRaceTime(raceName, raceTerrain, raceWeather, vehicleTokenId, vehicleName, cargoWeight, raceDistance, vehicleStats, vehicleAdjustableKO)
{
    var calculatedResults = {};
    calculatedResults.finalAdjustedTime = 0;
    calculatedResults.originalMaxSpeed = vehicleStats.max_speed;

    vehicleAdjustable = ko.toJS(vehicleAdjustableKO);

    const vehicleTypeMaxSpeed = vehicleAdjustable.statBoundaries.max_speed.max;
    const vehicleStatBests = vehicleAdjustable.adjustables.statBests;
    const vehicleAdjustableTerrain = (raceTerrain) ? vehicleAdjustable.adjustables.terrain[raceTerrain] : vehicleAdjustable.adjustables.terrain['N_A'];
    const vehicleAdjustableWeather = (raceWeather) ? vehicleAdjustable.adjustables.weather[raceWeather] : vehicleAdjustable.adjustables.weather['N_A'];
    const terrainFactor = 1; //((raceDistance >= vehicleAdjustableTerrain.timeFactor.rangeLimitLower) && (raceDistance <= vehicleAdjustableTerrain.timeFactor.rangeLimitUpper)) ? vehicleAdjustableTerrain.timeFactor.factor : 1;
    const terrainFactorDisqualifier = false; //vehicleAdjustableTerrain.timeFactor.disqualifyOutsideRange;
    const weatherFactor = 1; //((raceDistance >= vehicleAdjustableWeather.timeFactor.rangeLimitLower) && (raceDistance <= vehicleAdjustableWeather.timeFactor.rangeLimitUpper)) ? vehicleAdjustableWeather.timeFactor.factor : 1;
    const weatherFactorDisqualifier = false; //vehicleAdjustableWeather.timeFactor.disqualifyOutsideRange;
    const vehicleRefuelingDelay = vehicleAdjustableTerrain.delays.refuelingDelay + vehicleAdjustableWeather.delays.refuelingDelay;

    var excludeDueToWithinRange = false;
    var excludeDueToWithinSpeed = false;
    vehicleAdjustableTerrain.exclusionLimits.max_ranges.forEach( limit =>
        {
            excludeDueToWithinRange = excludeDueToWithinRange || ((raceDistance >= limit.rangeLimitLower) && (raceDistance <= limit.rangeLimitUpper))
        }
    );
    vehicleAdjustableWeather.exclusionLimits.max_ranges.forEach( limit =>
        {
            excludeDueToWithinRange = excludeDueToWithinRange || ((raceDistance >= limit.rangeLimitLower) && (raceDistance <= limit.rangeLimitUpper))
        }
    );
    vehicleAdjustableTerrain.exclusionLimits.max_speeds.forEach( limit =>
        {
            excludeDueToWithinSpeed = excludeDueToWithinSpeed || ((vehicleStats.max_speed >= limit.rangeLimitLower) && (vehicleStats.max_speed <= limit.rangeLimitUpper))
        }
    );
    vehicleAdjustableWeather.exclusionLimits.max_speeds.forEach( limit =>
        {
            excludeDueToWithinSpeed = excludeDueToWithinSpeed || ((vehicleStats.max_speed >= limit.rangeLimitLower) && (vehicleStats.max_speed <= limit.rangeLimitUpper))
        }
    );

    var includeDueToWithinRange = false;
    var includeDueToWithinSpeed = false;
    vehicleAdjustableTerrain.inclusionLimits.max_ranges.forEach( limit =>
        {
            includeDueToWithinRange = includeDueToWithinRange || ((raceDistance >= limit.rangeLimitLower) && (raceDistance <= limit.rangeLimitUpper))
        }
    );
    vehicleAdjustableWeather.inclusionLimits.max_ranges.forEach( limit =>
        {
            includeDueToWithinRange = includeDueToWithinRange || ((raceDistance >= limit.rangeLimitLower) && (raceDistance <= limit.rangeLimitUpper))
        }
    );
    vehicleAdjustableTerrain.inclusionLimits.max_speeds.forEach( limit =>
        {
            includeDueToWithinSpeed = includeDueToWithinSpeed || ((vehicleStats.max_speed >= limit.rangeLimitLower) && (vehicleStats.max_speed <= limit.rangeLimitUpper))
        }
    );
    vehicleAdjustableWeather.inclusionLimits.max_speeds.forEach( limit =>
        {
            includeDueToWithinSpeed = includeDueToWithinSpeed || ((vehicleStats.max_speed >= limit.rangeLimitLower) && (vehicleStats.max_speed <= limit.rangeLimitUpper))
        }
    );

    var vehicleAccelerationDelay = vehicleAdjustableTerrain.delays.accelerationDelay + vehicleAdjustableWeather.delays.accelerationDelay;
    var vehicleDecelerationDelay = vehicleAdjustableTerrain.delays.decelerationDelay + vehicleAdjustableWeather.delays.decelerationDelay;

    statTypes.forEach( statType => 
        { vehicleStats[statType] = (vehicleStats[statType] > vehicleAdjustable.statBoundaries[statType].max) ? vehicleAdjustable.statBoundaries[statType].max : vehicleStats[statType]; }
    );
    
    const numberOfTrips = Math.ceil(cargoWeight / vehicleStats.max_capacity);
    const numberOfRefuels = Math.ceil( (raceDistance + ((numberOfTrips-1)*raceDistance*2)) / vehicleStats.max_range) - 1;
    const vehicleAdjustedRaceDistance = raceDistance + ((numberOfTrips-1)*raceDistance*2);
    var estimatedTimeToComplete = 0;
    var terrainAdjustment = 1;
    var weatherAdjustment = 1;
    var terrainAndWeatherAdjustedTime = 0;

    if ((numberOfTrips <= 5) && (numberOfRefuels <= 5))
    {
        vehicleAccelerationDelay = vehicleAccelerationDelay * numberOfRefuels * (1 + (Math.abs(vehicleStatBests.emission_rate - vehicleStats.emission_rate)/100));
        vehicleDecelerationDelay = vehicleDecelerationDelay * numberOfRefuels * (1 + (Math.abs(vehicleStatBests.emission_rate - vehicleStats.emission_rate)/100));
        if (
            ((vehicleStats.max_speed > (vehicleTypeMaxSpeed*terrainFactor)) && (terrainFactorDisqualifier))
            ||
            ((vehicleStats.max_speed > (vehicleTypeMaxSpeed*weatherFactor)) && (weatherFactorDisqualifier))
            ||
            ( (excludeDueToWithinRange || excludeDueToWithinSpeed) && ((!includeDueToWithinRange) && (!includeDueToWithinSpeed)) )
        )
        {
            if (debugTokenIds.includes(vehicleTokenId) && debugRaceNames.includes(raceName)) console.log('Token #' + vehicleTokenId + ' permutation has adjustable settings that exclude it:', weatherFactor);
            vehicleStats.max_speed = 0;
        }

        var efficiencyTimePortion = 0;//(vehicleStats.max_speed > 0) ? ((vehicleAdjustedRaceDistance * (vehicleStats.fuel_efficiency/10)) / vehicleStats.max_speed) * 3600 : 0;
        var emissionRateTimePortion = 0;//(vehicleStats.max_speed > 0) ? ((vehicleAdjustedRaceDistance - (vehicleAdjustedRaceDistance * (vehicleStats.fuel_efficiency/10))) / (vehicleStats.max_speed * ((11 - vehicleStats.emission_rate)/10))) * 3600 : 0;
        //estimatedTimeToComplete = efficiencyTimePortion + emissionRateTimePortion + (vehicleAccelerationDelay + vehicleDecelerationDelay)*(numberOfRefuels + 1) + (vehicleRefuelingDelay*numberOfRefuels); // Extra accel/decel delay for start and stop
        estimatedTimeToComplete = (vehicleAdjustedRaceDistance / vehicleStats.max_speed)*3600 + (vehicleAccelerationDelay + vehicleDecelerationDelay)*(numberOfRefuels + 1) + (vehicleRefuelingDelay*numberOfRefuels); // Extra accel/decel delay for start and stop
        calculatedResults.estimatedTimeToComplete = estimatedTimeToComplete;
        calculatedResults.efficiencyTimePortion = efficiencyTimePortion;
        calculatedResults.emissionRateTimePortion = emissionRateTimePortion;
    
        terrainAdjustment = (terrainFactor && raceTerrain.length > 0) ? terrainFactor : 1;
        weatherAdjustment = (weatherFactor && raceWeather.length > 0) ? weatherFactor : 1;
        terrainAndWeatherAdjustedTime = estimatedTimeToComplete * terrainAdjustment * weatherAdjustment;

        calculatedResults.terrainAdjustment = terrainAdjustment;
        calculatedResults.weatherAdjustment = weatherAdjustment;
        calculatedResults.finalAdjustedTime = terrainAndWeatherAdjustedTime * (1 + (vehicleStatBests.fuel_efficiency - vehicleStats.fuel_efficiency)*.001) * (1 + Math.abs(vehicleStatBests.emission_rate - vehicleStats.emission_rate)*.0001);
    }

    calculatedResults.cargoWeight = cargoWeight;
    calculatedResults.excludeDueToWithinRange = excludeDueToWithinRange;
    calculatedResults.excludeDueToWithinSpeed = excludeDueToWithinSpeed;
    calculatedResults.includeDueToWithinRange = includeDueToWithinRange;
    calculatedResults.includeDueToWithinSpeed = includeDueToWithinSpeed;
    calculatedResults.numberOfTrips = numberOfTrips;
    calculatedResults.numberOfRefuels = numberOfRefuels;
    calculatedResults.raceName = raceName;
    calculatedResults.raceDistance = raceDistance;
    calculatedResults.raceTerrain = raceTerrain;
    calculatedResults.raceWeather = raceWeather;
    calculatedResults.terrainAdjustment = terrainAdjustment;
    calculatedResults.terrainFactorDisqualifier = terrainFactorDisqualifier;
    calculatedResults.vehicleAccelerationDelay = vehicleAccelerationDelay;
    calculatedResults.vehicleAdjustedRaceDistance = vehicleAdjustedRaceDistance;
    calculatedResults.vehicleBestStats = vehicleStatBests;
    calculatedResults.vehicleDecelerationDelay = vehicleDecelerationDelay;
    calculatedResults.vehicleRefuelingDelay = vehicleRefuelingDelay;
    calculatedResults.vehicleStats = vehicleStats;
    calculatedResults.vehicleTokenId = vehicleTokenId;
    calculatedResults.vehicleName = vehicleName;
    calculatedResults.weatherAdjustment = weatherAdjustment;
    calculatedResults.weatherFactorDisqualifier = weatherFactorDisqualifier;

//    if ((vehicleTokenId == 2212 || vehicleTokenId == 544) && (raceName == "Waco last mile delivery"))
//    {
//        console.log({raceName, vehicleTokenId, vehicleName, cargoWeight, raceDistance, vehicleStats, vehicleAdjustable, vehicleTypeMaxSpeed, vehicleStatBests, vehicleAdjustableTerrain, vehicleAdjustableWeather, terrainFactor, terrainFactorDisqualifier, weatherFactor, weatherFactorDisqualifier, vehicleRefuelingDelay, vehicleAccelerationDelay, vehicleDecelerationDelay });
//        console.log(JSON.stringify(calculatedResults));
//        console.log(JSON.stringify(vehicleStats));
//    }

    return calculatedResults;
}