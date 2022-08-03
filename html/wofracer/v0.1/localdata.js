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
            mySettings.enable_logging( (data.enable_logging == null) ? false : data.enable_logging);
            mySettings.enable_permutations( (data.enable_permutations == null) ? true : data.enable_permutations);
            mySettings.excluded_vehicles(data.excluded_vehicles);
            mySettings.max_log_entries((data.max_log_entries) ? data.max_log_entries : DEFAULT_MAX_LOG_ENTRIES);
            mySettings.participation_threshold(data.participation_threshold);
            mySettings.participation_thresholds( {free: (data.participation_thresholds) ? data.participation_thresholds.free : data.participation_threshold, paid: (data.participation_thresholds) ? data.participation_thresholds.paid : data.participation_threshold} );
            mySettings.race_query_result_limit((data.race_query_result_limit) ? data.race_query_result_limit : 50);
            mySettings.refresh_rate_seconds(data.refresh_rate_seconds);
            mySettings.wallet_address(data.wallet_address);
            joinTemplate.address = mySettings.wallet_address();
            userRacesTemplate.address = mySettings.wallet_address();

            if (!bound['statusLogVM'])
            {
                statusLogVM = new StatusLogVM();
                ko.applyBindings(statusLogVM, $('#statusContent').get(0));
                bound['statusLogVM'] = true;
            }

            Log('getLocalData() - End mysettings.json getJSON()', 'severity-info', 'Info');
        }, 'json'),
        $.getJSON('VehicleBaseStats.json', function(data) 
        {
            vehicleBaseStats = data;
        }, 'json'),
        $.get('instructions.txt', function(data) 
        {
            $('#divInstructions').html(data.replace('WOF Racer', 'WOF Racer v' + CURRENT_VERSION));
        }, 'text'),
        $.get('readme.MD', function(data) 
        {
            $('#divVersionHistory').html(data);
        }, 'text'),
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

