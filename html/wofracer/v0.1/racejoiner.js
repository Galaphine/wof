joinRace = async (joinApiData) =>
{
    await $.when(
        $.post(joinApi, JSON.stringify(joinApiData), function(data) 
            {
                Log('joinFreeRace() - Begin post()', 'severity-info', 'Info');
                Log('joinFreeRace() - status: ', 'severity-info', 'Info');
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
                Log('joinFreeRace() - End post()', 'severity-info', 'Info');
            }
        , 'json')
    ).done(
        function() 
        { 
            Log('joinFreeRace() - Begin done()', 'severity-info', 'Info');
            Log('joinFreeRace() - End done()', 'severity-info', 'Info'); 
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });
}

function joinFreeRace()
{
    Log('joinFreeRace() - Start function', 'severity-info', 'Info');

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
                Log('joinApiData: Unapplying all hot-swap upgrades...', 'severity-info', 'Info');
                if (unjoinedRace.selectedVehicle.ownedUpgrades != null)
                {
                    unjoinedRace.selectedVehicle.ownedUpgrades().forEach(ownedUpgrade =>
                        {
                            applyUnapplyUpgrade(unjoinedRace.selectedVehicle.vehicleTokenId(), ownedUpgrade.upgrade.id(), 'un');
                        }
                    );
                }
                if ((unjoinedRace.selectedVehicle.SelectedPermutation != null) && (unjoinedRace.selectedVehicle.SelectedPermutation.comboUpgrades != null))
                {
                    unjoinedRace.selectedVehicle.SelectedPermutation.comboUpgrades().forEach(upgradeToApply =>
                        {
                            applyUnapplyUpgrade(unjoinedRace.selectedVehicle.vehicleTokenId(), upgradeToApply.upgrade.id(), '');
                        }
                    );
                }
                var userVehicle = userVehiclesVM().find(vehicle => { return vehicle.token_id() == unjoinedRace.selectedVehicle.vehicleTokenId()});
                userVehicle.LastAppliedUpgrades = ((unjoinedRace.selectedVehicle.SelectedPermutation != null) && (unjoinedRace.selectedVehicle.SelectedPermutation.comboUpgrades != null)) ? unjoinedRace.selectedVehicle.SelectedPermutation.comboUpgrades() : null;

                joinApiData = structuredClone(joinTemplate);
                joinApiData.address = mySettings.wallet_address();
                joinApiData.raceId = unjoinedRace.id;
                joinApiData.tokenId = unjoinedRace.selectedVehicle.vehicleTokenId();
                Log('walletAddress: ' + mySettings.wallet_address(), '\nselectedRaceId: ' + joinApiData.raceId + '\nselectedVehicleId: ' + joinApiData.tokenId, 'severity-info', 'Info');
                Log('joinApiData:\n' + JSON.stringify(joinApiData), 'severity-info', 'Info');
                joinRace(joinApiData);
                break;
            }
        }
        i++;
    }
    
    Log('joinFreeRace() - End function', 'severity-info', 'Info');
}

var joinApi = `${ROOT_API_URL}/racing-arena/join`;
