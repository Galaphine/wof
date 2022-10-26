function applyUnapplyUpgrade(tokenId, upgradeId, unOrNot)
{
    var dfd = $.Deferred();

    apiData = structuredClone(applyUnapplyTemplate);
    apiData.address = mySettings.wallet_address();
    apiData.token_id = tokenId;
    apiData.upgrade = upgradeId;

    //console.log("Calling [" + applyUnapplyApi.replace("{un}", unOrNot) + "]...")

    $.post(applyUnapplyApi.replace("{un}", unOrNot), JSON.stringify(apiData), function(data) 
        {
            Log('applyUnapplyUpgrade () - Begin post()', 'severity-info', LogLevel.Debug);
            //console.log('       ' + JSON.stringify(data), 'severity-info', LogLevel.Info);
            if (!data.error) 
            {
                Log('       Token {0} - Upgrade #{1} {2}applied.'.replace('{0}', tokenId).replace('{1}', upgradeId).replace('{2}', unOrNot), 'severity-info', LogLevel.Info);
            }
            else
            {
                Log(data.error, 'severity-error', LogLevel.Error);
            }
            Log('applyUnapplyUpgrade() - End post()', 'severity-info', LogLevel.Debug);

            dfd.resolve();
        }
    , 'json');

    return dfd.promise();
}

function getApplyUpgrades(vehicle)
{
    Log('getApplyUpgrades: Applying chosen permutation\'s upgrades...', 'severity-info', LogLevel.Debug);
    callArray = []
    if ((vehicle.SelectedPermutation != null) && (vehicle.SelectedPermutation.comboUpgrades != null))
    {
        vehicle.SelectedPermutation.comboUpgrades().forEach(upgradeToApply =>
            {
                callArray.push(applyUnapplyUpgrade(vehicle.vehicleTokenId(), upgradeToApply.upgrade.id(), ''));
            }
        );
    }

    return callArray;
}

function getLeaderboardData()
{

    Log('getServerData() - Start', 'severity-info', LogLevel.Debug);
    const address = mySettings.wallet_address();
    $.when(
        $.getJSON(leaderboardApis.overall.replace('{address}', address), function(data) {
            Log('getLeaderboardData() - Begin leaderboardApis.overall getJSON', 'severity-info', LogLevel.Debug);
            //console.log(JSON.stringify(data));
            Log('getLeaderboardData() - End leaderboardApis.overall getJSON', 'severity-info', LogLevel.Debug);
        }, 'json')
    ).done(
        function() 
        { 
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });		
}

function getServerData()
{
    Log('getServerData() - Start', 'severity-info', LogLevel.Debug);
    postQueries.Racers.variables.address = mySettings.wallet_address();
    postQueries.Fleet.variables.address = mySettings.wallet_address();
    postQueries.LeasedVehicles.variables.address = mySettings.wallet_address();

    $.when(
        $.post(graphQlApi, JSON.stringify(postQueries.Racers), function(data) {
            Log('getServerData() - Begin Racers post()', 'severity-info', LogLevel.Debug);
            if (!bound['userInfoVM'])
            {
                userInfoVM = new UserInfoVM(data.data.racers[0].username);
                ko.applyBindings(userInfoVM, $('#dashboardContent').get(0));
                bound['userInfoVM'] = true;
            }
            Log('getServerData() - End Racers post()', 'severity-info', LogLevel.Debug);
        }, 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.Fleet), function(data) 
            {
                Log('getServerData() - Begin Fleet post()', 'severity-info', LogLevel.Debug);
                if (!bound['userVehiclesVM'])
                {
                    userVehiclesVM = ko.mapping.fromJS(data.data.token_metadata.filter(v => v.token.status == 'owned'));
                    maxVehcileBaseStatsTokenId = Math.max(...vehicleBaseStats.map(x => x.id).flat(1));
                    getRemainingFleetStats();
                    ko.applyBindings(userVehiclesVM, $('#divUserVehicles').get(0));
                    bound['userVehiclesVM'] = true;
                }
                refreshExcludedVehiclesLists();

                Log('getServerData() - End Fleet post()', 'severity-info', LogLevel.Debug);
                Log(JSON.stringify(userVehiclesVM), 'severity-info', LogLevel.Info);
            }
        , 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.LeasedVehicles), function(data) 
            {
                Log('getServerData() - Begin LesseeVehicles post()', 'severity-info', LogLevel.Debug);
                if (!bound['lesseeVehiclesVM'])
                {
                    ko.mapping.fromJS(data.data.lease_contracts, {}, lesseeVehiclesVM);
                    //console.log(ko.mapping.toJS(lesseeVehiclesVM));
                    //userInfoVM.LesseeVehiclesCount(lesseeVehiclesVM().length);
                    //ko.applyBindings(lesseeVehiclesVM, $('#divUserVehicles').get(0));
                    bound['lesseeVehiclesVM'] = true;
                }

                Log('getServerData() - End Fleet post()', 'severity-info', LogLevel.Debug);
                Log(JSON.stringify(userVehiclesVM), 'severity-info', LogLevel.Info);
            }
        , 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.UpcomingRaces_FreeRaces).replace('"{race_query_free_races_result_limit}"', mySettings.race_query_result_limit()), function(data) {
            Log('getServerData() - Begin Free Races post()', 'severity-info', LogLevel.Debug);

            upcomingFreeRaces = data.data.races;

            Log('getServerData() - End Paid Races post()', 'severity-info', LogLevel.Debug);
        }, 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.UpcomingRaces_PaidRaces).replace('"{race_query_paid_races_result_limit}"', mySettings.race_query_result_limit()), function(data) {
            Log('getServerData() - Begin Free Races post()', 'severity-info', LogLevel.Debug);

            upcomingPaidRaces = data.data.races;

            Log('getServerData() - End Paid Races post()', 'severity-info', LogLevel.Debug);
        }, 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.NextToRaceRaces), function(data) {
            Log('getServerData() - Begin Next-ToRace Races post()', 'severity-info', LogLevel.Debug);

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

            Log('getServerData() - End Next-To-Race Races post()', 'severity-info', LogLevel.Debug);
        }, 'json')
    ).done(
        function() 
        { 
            userInfoVM.UserVehiclesCount(userVehiclesVM().length);
            userVehiclesVM().forEach(userVehicle => {
                tokenIds.push(userVehicle.token_id());
                if (tokenIds.length % 30 == 0)
                {
                    tokenIdArrays.push(tokenIds);
                    tokenIds = [];
                }
            });
            if (tokenIds.length > 0)
            {
                tokenIdArrays.push(tokenIds);
            }

            callArray = [];

            tokenIdArrays.map(tokenIdList => { callArray.push(getUpgrades(tokenIdList)); callArray.push(getUpgradesApplied(tokenIdList)); } );
            $.when.apply($, callArray)
                .done( function()
                    {
                        userVehiclesVM().forEach( (vehicle, index, arr) =>
                            {
                                arr[index].UpgradedStats = ko.mapping.fromJS(fullUpgradedStatList.filter( stat => { return stat.token_id === vehicle.token_id(); } ));
                                arr[index].UpgradesApplied = ko.mapping.fromJS(fullUpgradesAppliedList.filter( stat => { return stat.token_id === vehicle.token_id(); } ));
                                getLeaderboardData();
                            }
                        );
                        refreshViewModels(true, true);
                    }
                );
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });		
}

function getUnapplyUpgrades(vehicle)
{
    Log('getUnapplyUpgrades: Unapplying all upgrades...', 'severity-info', LogLevel.Debug);
    callArray = []
    if (vehicle.ownedUpgrades != null)
    {
        vehicle.ownedUpgrades().forEach(ownedUpgrade =>
            {
                callArray.push(applyUnapplyUpgrade(vehicle.vehicleTokenId(), ownedUpgrade.upgrade.id(), 'un'));
            }
        );
    }

    return callArray;
}

function getUpgrades(tokenIdList)
{
    var dfd = $.Deferred();

    $.post(graphQlApi, JSON.stringify(postQueries.Upgrades).replace('"{tokenIds}"', "[" + tokenIdList + "]"), function(data)
        {
            fullUpgradedStatList = fullUpgradedStatList.concat(data.data.upgraded_stats);
            dfd.resolve();
        }
    );

    return dfd.promise();
}

function getUpgradesApplied(tokenIdList)
{
    var dfd = $.Deferred();

    $.post(graphQlApi, JSON.stringify(postQueries.UpgradesApplied).replace('"{tokenIds}"', "[" + tokenIdList + "]"), function(data)
        {
            Log('getUpgradesApplied:\n' + JSON.stringify(data.data.upgraded_stats), 'severity-info', LogLevel.Info);
            fullUpgradesAppliedList = fullUpgradesAppliedList.concat(data.data.upgraded_stats);
            dfd.resolve();
        }
    );

    return dfd.promise();
}

function getUpgradesAppliedForOne(vehicle)
{
    var dfd = $.Deferred();

    $.post(graphQlApi, JSON.stringify(postQueries.UpgradesApplied).replace('"{tokenIds}"', "[" + vehicle.token_id() + "]"), function(data)
        {
            Log('getUpgradesAppliedForOne:\n' + JSON.stringify(data.data.upgraded_stats), 'severity-info', LogLevel.Info);
            ko.mapping.fromJS(data.data.upgraded_stats, {}, vehicle.UpgradesApplied);
            dfd.resolve();
        }
    );

    return dfd.promise();
}

function refreshData(doSetTimeout, ignoreJoinFreeRace)
{
    Log('refreshData() - Start', 'severity-info', LogLevel.Debug);
    $.when(
        $.post(graphQlApi, JSON.stringify(postQueries.UpcomingRaces_FreeRaces).replace('"{race_query_free_races_result_limit}"', mySettings.race_query_result_limit()), function(data) {
            Log('refreshData() - Begin Free Races post()', 'severity-info', LogLevel.Debug);

            upcomingFreeRaces = data.data.races;

            Log('refreshData() - End Paid Races post()', 'severity-info', LogLevel.Debug);
        }, 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.UpcomingRaces_PaidRaces).replace('"{race_query_paid_races_result_limit}"', mySettings.race_query_result_limit()), function(data) {
            Log('refreshData() - Begin Free Races post()', 'severity-info', LogLevel.Debug);

            upcomingPaidRaces = data.data.races;

            Log('refreshData() - End Paid Races post()', 'severity-info', LogLevel.Debug);
        }, 'json'),
        $.post(graphQlApi, JSON.stringify(postQueries.NextToRaceRaces), function(data) {
            Log('refreshData() - Begin Next-ToRace Races post()', 'severity-info', LogLevel.Debug);

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

            Log('refreshData() - End Next-to-Race Races post()', 'severity-info', LogLevel.Debug);
        }, 'json')
    ).done(
        function() 
        { 
            refreshViewModels(doSetTimeout, ignoreJoinFreeRace);
        }
    ).fail(function(jqxhr, textStatus, err) {
        console.log(err);
    });		

    Log('refreshData() - End', 'severity-info', LogLevel.Debug);
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
            saveFile('./data/VehicleBaseStats.json', JSON.stringify(vehicleBaseStats));
    }
}

var applyUnapplyApi = `${ROOT_API_URL}/{un}apply-upgrade`;
var fullUpgradedStatList = [];
var fullUpgradesAppliedList = [];
var graphQlApi = `${ROOT_GRAPH_URL}/graphql`;
var leaderboardApis = 
    {
        'overall': `${ROOT_API_URL}/racing-arena/leaderboard/overall/user/10/{address}`
    }
var tokenIds = [];
var tokenIdArrays = [];

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
