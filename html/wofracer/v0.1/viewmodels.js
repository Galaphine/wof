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
        return (terrain) ? terrain.substring(0, 2) : '';
    }

    self.joinedRaceList = ko.observableArray(joinedRaces);
}

function MySettingsVM()
{
    var self = this;

    self.authorization_key = ko.observable();
    self.enable_permutations = ko.observable();
    self.excluded_vehicles = ko.observableArray();
    self.log_level = ko.pureComputed( function() { return LogLevel[self.log_level_text()] } );
    self.log_level_text = ko.observable();
    self.max_log_entries = ko.observable();
    self.participation_threshold = ko.observable();
    self.participation_thresholds = ko.observable( {free: null, paid: null} );
    self.race_query_result_limit = ko.observable();
    self.refreshRateMilliseconds = ko.pureComputed(function() {return self.refreshRateSeconds()*1000;});
    self.refresh_rate_seconds = ko.observable();
    self.refreshRateSeconds = ko.pureComputed(function() {return (!isNaN(self.refresh_rate_seconds()) && (self.refresh_rate_seconds() >= MAX_REFRESH_RATE) ) ? self.refresh_rate_seconds() : MAX_REFRESH_RATE; });
    self.wallet_address = ko.observable();
}

function NextToRaceRacesVM(nextToRaceRaces)
{
    if (nextToRaceRaces == null) return;

    var self = this;

    self.terrainIcon = function(terrain)
    {
        return (terrain) ? terrain.substring(0, 2) : '';
    }

    self.joinedRaceList = ko.observableArray(nextToRaceRaces);
}

function StatusLogVM()
{
    var self = this;

    self.LogLevelText = ko.pureComputed(function() 
        { 
            return getKeyByValue(LogLevel, mySettings.log_level());
        } 
    );

    self.LogLevelValue = ko.pureComputed(function() 
        { 
            return mySettings.log_level();
        } 
    );

    self.MaxLogEntries = ko.pureComputed(function() { return mySettings.max_log_entries(); } );
    self.StatusLogLength = ko.pureComputed(function() { return messageLog.length; } );
}

function UnjoinedRacesVM(unjoineRaces)
{
    if (unjoinedRaces == null) return;
    
    var self = this;

    self.CountAtOrAboveThresholds = ko.observable();
    self.CountAtOrAboveThresholds(
        {
            Free: ko.pureComputed(function()
                {
                    return self.unjoinedRaceList().filter( race => { return ((race.entry_fee === 0) && (race.participants.length >= mySettings.participation_thresholds().free)) } ).length;
                }
            ),
            Paid: ko.pureComputed(function()
                {
                    return self.unjoinedRaceList().filter( race => { return ((race.entry_fee > 0) && (race.participants.length >= mySettings.participation_thresholds().paid)) } ).length;
                }
            )
        }
    );

    self.ParticipationThresholds = ko.observable();
    self.ParticipationThresholds(
        {
            Free: ko.pureComputed(function() { return mySettings.participation_thresholds().free }),
            Paid: ko.pureComputed(function() { return mySettings.participation_thresholds().paid })
        }
    );
    
    //self.raceDistance = ko.observable();

    self.selectRace = function(data, event)
    {
    }

    self.terrainIcon = function(terrain)
    {
        return (terrain) ? terrain.substring(0, 2) : '';
    }

    self.unjoinedRaceList = ko.observableArray();
}

function UserInfoVM(username)
{
    var self = this;

    self.LogLevelText = ko.pureComputed(function() 
        { 
            return getKeyByValue(LogLevel, mySettings.log_level());
        } 
    );
    self.ParticipationThresholds = ko.observable(
        {
            Free: ko.observable(mySettings.participation_thresholds().free),
            Paid: ko.observable(mySettings.participation_thresholds().paid)
        }
    );
    self.Username = ko.observable(username);
    self.UserVehiclesCount = ko.observable();
    self.UserVehiclesUpgradedCount = ko.observable();
}

