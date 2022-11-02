// function loadHtml(divTarget, htmlPath)
// {
//     var dfd = $.Deferred();

//     $(divTarget).load(htmlPath, function()
//     {
//         dfd.resolve();
//     });

//     return dfd.promise();
// }

// function loadIncludes()
// {
//     var callArray = []
//     callArray.push(loadHtml('#divNavSettings', './includes/navsettings.html'));
//     callArray.push(loadHtml('#divNavInfo', './includes/navinfo.html'));
//     $.when.apply($, callArray)
//         .done();
// }

imageVehicleSmallClick = function(action, tokenId)
{
    const userVehicle = userVehiclesVM().find(uv => uv.token_id() == tokenId);
    if (action == 'exclude')
    {
        mySettings.excluded_vehicles.push(tokenId);
    }
    else
    {
        mySettings.excluded_vehicles.remove(i => i == tokenId);
    }
    mySettings.excluded_vehicles().sort();
    refreshExcludedVehiclesLists();
}

function setupContent()
{
    $('.wof-version').html(CURRENT_VERSION);
    $('#logStart').html(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

    $('.wof-website-link').attr('href', WOF_WEBSITE + '/racing-arena/upcoming');
}

function setupControlEvents()
{
    $('#btnSaveSettings').click(function(e)
        {
            const mySettingsJson = ko.mapping.toJS(mySettings);
            mySettingsJson.excludedVehicles = null;
            mySettingsJson.includedVehicles = null;
            console.log(mySettingsJson);
            saveFile('mysettings.json', JSON.stringify(mySettingsJson, (key, value) => { if (value !== null) return value; } ));
            Log('getServerData() - Call updateSettings()', 'severity-info', LogLevel.Info);
            updateSettings();
            $('#divSaved').show(500);
            setTimeout(function() {$('#divSaved').hide(750);}, 5000);
        }
    );

    $('#imgPlayPause')
        .click( () =>
        {
            const playPauseValue = $('#imgPlayPause').attr('value');
            const imgNewSrc = (playPauseValue == 'Enabled') ? './images/play.png' : './images/pause.png';
            const imgNewValue = (playPauseValue == 'Enabled') ? 'Paused' : 'Enabled';
            const contentTooltipWord = (imgNewValue == 'Paused') ? 'Press Play to re-enable the auto-join feature.' : 'Press Pause to pause the auto-join feature.';
            isPaused = (imgNewValue == 'Paused');
            $('#imgPlayPause').attr('src', imgNewSrc);
            $('#imgPlayPause').attr('value', imgNewValue);
            $('#spnPaused').text(imgNewValue);
            $('#imgPlayPause').tooltip('option', 'content', contentTooltipWord);

            $('#tdPanelInfo').removeClass('play-enabled play-disabled');
            if (isPaused)
            {
                $('#tdPanelInfo').addClass('play-disabled');
                clearTimeout(timeoutId);
            }
            else
            {
                $('#tdPanelInfo').addClass('play-enabled');
                updateTimeout(true, (mySettings.refreshRateSeconds() - timePassed)*1000);
            }
        }
    );

    $('#chkEnablePermutations')
        .change( () =>
        {
            if ($('#chkEnablePermutations').is(':checked'))
            {
                if (!confirm("WARNING!  Enabling permutations will cause your vehicle's upgrades to change each time they are entered in a race.  Before continuing, be sure to record your vehicle's set of upgrades.\nDo you wish to continue? (OK = Yes, Cancel = No)"))
                {

                    mySettings.enable_permutations(false);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            refreshUpgradePermutations();
        }
    );
}

function setupFilters()
{
    ko.applyBindings(new FilterVM(), $('#unjoinedRacesFilter').get(0));
}

function setupImages()
{
    $('#img_class_ground').clone().prop('id', 'img_class_filter_ground').appendTo('#spnGround');
    $('#img_class_water').clone().prop('id', 'img_class_filter_water').appendTo('#spnWater');
    $('#img_class_air').clone().prop('id', 'img_class_filter_air').appendTo('#spnAir');
    $('#img_class_space').clone().prop('id', 'img_class_filter_space').appendTo('#spnSpace');
    $('#img_class_ground').clone().prop('id', 'img_class_adustables_filter_ground').appendTo('#spnAdjustablesGround');
    $('#img_class_water').clone().prop('id', 'img_class_adustables_filter_water').appendTo('#spnAdjustablesWater');
    $('#img_class_air').clone().prop('id', 'img_class_adustables_filter_air').appendTo('#spnAdjustablesAir');
    $('#img_class_space').clone().prop('id', 'img_class_adustables_filter_space').appendTo('#spnAdjustablesSpace');
}

function setupNavPages()
{
    Log('setupNavPages() - Begin', 'severity-info', LogLevel.Info);

    $('.nav-icon').click(function()
        {
            Log('setupNavPages() - Begin nav-icon onclick', 'severity-info', LogLevel.Info);

            $('.nav-page').hide();
            var targetNavPage = '#' + $(this).attr('for');
            $(targetNavPage).show();

            $('.nav-icon').removeClass('nav-icon-border');
            $(this).addClass('nav-icon-border');

            Log('setupNavPages() - End nav-icon onclick', 'severity-info', LogLevel.Info);
        }
    );
    $('#linkRaces').click();

    $('.settings-link').click(function()
        {
            Log('setupNavPages() - Begin settings-item onclick', 'severity-info', LogLevel.Info);

            $('.settings-detail').hide();
            var targetSettingsDetail = '#' + $(this).attr('for');
            $(targetSettingsDetail).show();

            Log('setupNavPages() - End settings-item onclick', 'severity-info', LogLevel.Info);
        }
    );
    $('#tdLinkAuthKey').click();

    Log('setupNavPages() - End', 'severity-info', LogLevel.Info);
}

function setupPage()
{
    setupContent();
    setupSliders();
    setupTabs();
    setupTooltips();
    setupImages();
    setupStyles();
    setupControlEvents();
    setupFilters();
    setupNavPages();
}

function setupSliders()
{
    
}

function setupStyles()
{
    $('input:text, input:password, input[type=email]').button().addClass('form-input');
}

function setupTabs()
{
    $('#tabsLeft#target').infiniteTabs();
    $('#tabsMiddle#target').infiniteTabs();
    $('#tabsRight#target').infiniteTabs();
    $('ul.infinite-tabs').find('li.tab').click(function(e) 
        {
            e.preventDefault();
            e.stopPropagation();
            $thisTab = $(this);
            ulId = '#' + $($thisTab).parents('ul.infinite-tabs').attr('id');
            $(ulId).find('li.tab').removeClass("active");
            $($thisTab).addClass("active");
            $(ulId + ' ~ div.tab-content').hide();
            var activeTabContent = '#' + $($thisTab).attr('id').replace('Tab', 'Content');
            $(activeTabContent).show();
        }
    );
    $('#tabsLeft').find('li.tab').first().click();
    $('#tabsMiddle').find('li.tab').first().click();
    $('#tabsRight').find('li.tab').first().click();
}
function setupTooltips()
{
    $('.info-participation-thresholds').tooltip(
        {
            content: `
            While this script will no longer auto-join you into races, the Participation Threshold still has value in that 
            you can set it to identify how many active Free and Paid races meet that threshold, alerting you there are that many races you should enter
            based on the thresholds set in your Settings.
            <p />
            Click the (i) to navigate to the Upcoming Races page in the WOF Website.`,
            track: true
        }
    );

    $('#imgPlayPause').tooltip(
        {
            content: 'Press Pause to pause the auto-join feature.',
            track: true
        }
    );
}

