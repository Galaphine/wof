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
                    maxVehcileBaseStatsTokenId = Math.max(...vehicleBaseStats.map(x => x.id).flat(1));
                    getRemainingFleetStats();
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

                    Log('getServerData() - End Upgrades Applied post()', 'severity-info', 'Info');
                }, 'json')
            ).done( 
                function() 
                { 
                    Log('getServerData() - Call refreshViewModels()', 'severity-info', 'Info')
                    refreshViewModels(true, true);
                } 
            );


            Log('getServerData() - End done()', 'severity-info', 'Info'); 
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });		
}

function refreshData(doSetTimeout, ignoreJoinFreeRace)
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
            refreshViewModels(doSetTimeout, ignoreJoinFreeRace);
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });		

    Log('refreshData() - End', 'severity-info', 'Info');
}

getRemainingFleetStats = async () =>
{
    vehicleBaseStatIds = vehicleBaseStats.map(x => x.id).flat(1);
    newVehicles = userVehiclesVM().map(x => x.token_id()).flat(1).filter(x => (!vehicleBaseStatIds.includes(x)));
    result = await Promise.all(
        newVehicles.map(i => $.getJSON(`https://api.looksrare.org/api/v1/tokens?collection=0x1a7e29a8c5d2320a1b56735b7654139e7b2860af&tokenId=${i}`))
    );
    changed = false;
    result.forEach( token =>
        {
            item = {
                "id": parseInt(token.data.tokenId, 10),
                "max_speed": parseInt(token.data.attributes.filter(x => x.traitType === 'Max Speed')[0].value, 10),
                "max_range": parseInt(token.data.attributes.filter(x => x.traitType === 'Max Range')[0].value, 10),
                "max_capacity": parseInt(token.data.attributes.filter(x => x.traitType === 'Max Capacity')[0].value, 10),
                "fuel_efficiency": parseInt(token.data.attributes.filter(x => x.traitType === 'Fuel Efficiency')[0].value, 10),
                "emission_rate": parseInt(token.data.attributes.filter(x => x.traitType === 'Emission Rate')[0].value, 10)
            }
            vehicleBaseStats.push(item);
            changed = true;
        }
    );
    if (changed)
    {
        if (confirm("The list of vehicles base stats has changed to include additional vehicles in your fleet. Do you wish to save these changes?\nNote that unless your browser is configured to let you specify where to save files,\nthis file will be saved to your Downloads folder and you will need to manually copy it to where you run this script."))
            saveFile('VehicleBaseStats.json', JSON.stringify(vehicleBaseStats));
    }
}

var graphQlApi = `${ROOT_GRAPH_URL}/graphql`;
var applyUnapplyApi = `${ROOT_API_URL}/{un}apply-upgrade`;

