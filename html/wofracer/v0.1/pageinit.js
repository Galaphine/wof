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
            var mySettingsJson = ko.mapping.toJSON(mySettings);
            saveFile('mysettings.json', mySettingsJson);
            Log('getServerData() - Call updateSettings()', 'severity-info', LogLevel.Info);
            updateSettings();
            $('#divSaved').show(500);
            setTimeout(function() {$('#divSaved').hide(750);}, 5000);
            refreshViewModels(true);
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

            if (isPaused)
            {
                clearTimeout(timeoutId);
            }
            else
            {
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
    $('#img_class_ground').clone().prop('id', 'img_class_ground_filter').appendTo('#spnGround');
    $('#img_class_water').clone().prop('id', 'img_class_water_filter').appendTo('#spnWater');
    $('#img_class_air').clone().prop('id', 'img_class_air_filter').appendTo('#spnAir');
    $('#img_class_space').clone().prop('id', 'img_class_space_filter').appendTo('#spnSpace');
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
            To allow for fairer community involvement, this Utility caps the auto-join participation in Free races as follows:
            <p />
            <ul>
                <li style="list-style-position: outside;">Space Races are capped at 5 (you will auto-join as the 6th but will not auto-join if there are already 6 or more).</li>
                <li style="list-style-position: outside;">All others are capped at 9 (you will auto-join as the 10th but will not auto-join if there are already 10 or more).</li>
            </ul>
            <p />
            You can still manually enter a Free race if a race is above its target participation by using the WOF Website 
            (click the (i) to navigate to the Upcoming Races page in the WOF Website.).`,
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

