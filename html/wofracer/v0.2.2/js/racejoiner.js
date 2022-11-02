joinRace = async (joinApiData) =>
{
    $.when(
        $.post(joinApi, JSON.stringify(joinApiData), function(data) 
            {
                Log('joinFreeRace() - Begin post()', 'severity-info', LogLevel.Info);
                Log('joinFreeRace() - status: ', 'severity-info', LogLevel.Info);
                Log('       ' + JSON.stringify(data), 'severity-info', LogLevel.Info);
                if (!data.error) 
                {
                    Log('       Congratulations, your WOF # {0} is now in the race!'.replace('{0}', joinApiData.tokenId), 'severity-info', LogLevel.Info);
                    if (timeoutId)
                    {
                        clearTimeout(timeoutId);
                    }
                    refreshData(true, true);
                }
                Log('joinFreeRace() - End post()', 'severity-info', LogLevel.Info);
            }
        , 'json')
    ).done(
        function() 
        { 
            Log('joinFreeRace() - Begin done()', 'severity-info', LogLevel.Info);
            Log('joinFreeRace() - End done()', 'severity-info', LogLevel.Info); 
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });
}

function joinFreeRace()
{
    Log('joinFreeRace() - Start function', 'severity-info', LogLevel.Info);

    if (unjoinedRacesVM.unjoinedRaceList().length == 0) return;

    i = 0;
    const freeParticipationThreshold = parseInt(userInfoVM.ParticipationThresholds().Free(), 10);
    while (i < unjoinedRacesVM.unjoinedRaceList().length)
    {
        var unjoinedRace = unjoinedRacesVM.unjoinedRaceList()[i];
        if (unjoinedRace.entry_fee === 0)
        {
            participantCount = unjoinedRace.participants.length;
            raceClass = unjoinedRace.class.toLowerCase();
            modifiedParticipationMinThreshold = (unjoinedRace.class.toLowerCase() == 'space') ? Math.round(freeParticipationThreshold*.7, 0) : freeParticipationThreshold;
            modifiedParticipationMaxThreshold = (unjoinedRace.class.toLowerCase() == 'space') ? 6 : 10; // <-- DO NOT CHANGE THIS!
            
            if (
                (participantCount >= modifiedParticipationMinThreshold) 
                && (participantCount <= modifiedParticipationMaxThreshold)
                && (unjoinedRace.selectedVehicle.vehicleTokenId()) 
                && (participantCount < maxParticipants[raceClass])
            )
            {
                var callArray = getUnapplyUpgrades(unjoinedRace.selectedVehicle);
                $.when.apply($, callArray)
                    .done( function()
                        {
                            callArray = getApplyUpgrades(unjoinedRace.selectedVehicle)
                            $.when.apply($, callArray)
                                .done( function()
                                    {
                                        var userVehicle = userVehiclesVM().find(vehicle => { return vehicle.token_id() == unjoinedRace.selectedVehicle.vehicleTokenId()});
                                        userVehicle.LastAppliedUpgrades = ((unjoinedRace.selectedVehicle.SelectedPermutation != null) && (unjoinedRace.selectedVehicle.SelectedPermutation.comboUpgrades != null)) ? unjoinedRace.selectedVehicle.SelectedPermutation.comboUpgrades() : null;
                        
                                        joinApiData = structuredClone(joinTemplate);
                                        joinApiData.address = mySettings.wallet_address();
                                        joinApiData.raceId = unjoinedRace.id;
                                        joinApiData.tokenId = unjoinedRace.selectedVehicle.vehicleTokenId();
                                        Log('walletAddress: ' + mySettings.wallet_address() + '\nselectedRaceId: ' + joinApiData.raceId + '\nselectedVehicleId: ' + joinApiData.tokenId, 'severity-info', LogLevel.Info);
                                        Log('joinApiData:\n' + JSON.stringify(joinApiData), 'severity-info', LogLevel.Info);
                                        joinRace(joinApiData);
                                    }
                                );
                        }
                    );
                break;
            }
        }
        i++;
    }
    
    Log('joinFreeRace() - End function', 'severity-info', LogLevel.Info);
}

var joinApi = `${ROOT_API_URL}/racing-arena/join`;
