WOF Racer v0.2.0

Download all files from this location:  https://github.com/Galaphine/wof/tree/master/html/wofracer/v0.2.0

Read the included Instructions.txt file for details on how to set up and run the script.

TODOs (Priority):
    - (High) Finish adjustables UI
    - (Med-High) Identify 1-of-1 WOFs and exclude them automagically from racing
    - (Med-High) Clean up the logging
    - (Med-High) Create/Save Upgrade Profiles to apply en-masse
    - (Med-High) Refresh Upgrade Count, Fleet + Punk stats either on each race refresh or on manual click
    - (Med) Filtering on Free and Paid race list
    - (Med) Results and Analysis
    - (Med) Fleet and Punk Management Utilities (TBD)
    - (Med) Fleet Perspective of Race-Joining ("I want my WOF #666 to enter first race of this kind/stats to hit N participants, with this Upgrade Profile.")
    - (Med) Update instructions to reflect removal of auto-join as well as addition of Adjustables

Version History:
    0.2.0 (2022-10-14):
        * Ensured leased vehicles entered into races are identified in Joined and Next-to-Race Races
        * Moved Permutations Warning to a warning triangle icon.
        * Removed the note about auto-entry to races (this is well-known now).
        * Refreshing assigned user vehicles is now asynchronous per race.
        * Switched order of Paid and Free races tabs.
        * Fixed threshold count in Free and Paid races tabs to reflect smaller fraction applicable to Space races.
        * Added Dashboard and Adjustables tabs on initial view:
            -   Adjustables tab shows the best WOF chosen in the first race of currently-focused Free or Paid tab, and compares against 
                what would be considered "perfect stats" of each vehicle within its class (Ground, Water, Air, Space).
            -   By selecting any given cell, one can then modify Race Distance and Cargo Weight and see the effects of those changes in real time.
            -   Coming soon, real-time adjustables on:  Acceleration/Deceleration/Refueling delays, inclusion/exclusion limits, and boost/delay factors.
        * Refactored calculated-race-time into reusable function.
        * Made adjustables more granular in preparation for full configuration.
        * Moved the notification about not auto-joining races to top navigation panel and reworded it.
        * Moved Version History, Instructions, and Status Log to separate Info page.
        * Changed the "Auto-Join Enabled|Disabled" text to "Refresh Enabled|Disabled".
    0.1.9 (2022-08-23):
        * Decreased the refresh timer to 20 seconds
        * Removed auto-join race (commented out the line that joins the race and removed the reference to racejoiner.js in the racer.html file)
        * Fixed all the issues with "Apply Upgrades Now".
        * Added missing Impulse Thrusters to list of upgrades
        * Added submarine 1-on-1 to adjustables
        * Fixed a rather tricky bug with the Upgraded Vehicles that also impacted permutations:
            If a user's fleet was larger than about 60 vehicles, the remaining vehicles would not show up as upgraded, 
            causing the Upgraded Vehicles count to be lower than it should, but worse, causing the vehicles later in the list
            to never get any permutations.  This is because GraphQL is limiting resultsets to 1000 records, and each upgrade
            (owned or not) is considered 1 record.  So with 70 vehicles in a fleet, there are potentially 16 upgrades each,
            giving over 1000 records.  This means the query had to be split into multiple calls.
            This was a difficult bug to fix because of the way jQuery's $.when() routines work - 
            the solution was rather involved in using $.Deferred/promise.resolve and $.when.apply().
        * Added an "Apply Upgrades Now" link to Free and Paid races

    0.1.8 (2022-08-03):
        * Updated the initialization to avoid auto-joining the race in the first 30-second interval.
        * Added a Pause/Resume button.
        * Reorganized the top left info panel content.
        * Removed an extraneous slash (/) in the WOF Website URL in each race.
        * Put a max auto-join threshold (per community request) to ensure enough slots are still left open:  
            Non-space are capped at 9 and space races are capped at 5 (the participant auto-joining will be the 10th and 6th, respectively).
            Participants can still manually join races at or above the max threshold up to the max actually allowed for the race class.
        * Split monolithic racer.js into smaller files with functions grouped logically.

    0.1.7 (2022-07-22):
        * Moved (Original) Base Stats to separate file and added mechanism for pulling new-vehicle original/starting base stats from LooksRare
        * Optimized the permutation loop in assigning vehicles to handle max permutations of 2^16 (32768).
            When the # of permutations is greater than a predefined max allowed, logging is disabled in the loop.
        * Added Freight Punk images with XP + Level + Skill Points to Unjoined Free/Paid, Joined, and Next to Race.
        * Fixed some panel formatting/scrolling.
        * Added code for log saving (currently disabled this iteration).
        * Added instructions to the Instructions tab and Readme.MD to a Version History tab.

    0.1.6 (2022-07-08):
        * Fixed an issue with enable_permutations - it would always load with Permutations enabled even when saved as false (disabled).
        * Fixed an issue with StatsPermutations - in some cases this would be nonexistent.

    0.1.5 (2022-07-07):
        * Added permutations!  Now the script will go through all possible permutations, select the best one, and automagically hot-swap to the 
            correct set of upgrades that gives the best time for your vehicle!
        * Fixed some rounding issues.
        * Added Enable Permutations to settings, along with warnings about effects on applied upgrades in the fleet.

    0.1.4 (2022-06-26):
        * Added Upgraded Vehicles count.
        * Factored in Emission Rate and Fuel Efficiency indirectly into sorting by adding a small time factor based on stats.
        * Added Promo/Sponsor with link.
        * Expanded terrain to 2 characters.
        * Retrieving upgrade list (with owned state) and applied upgrades across fleet.
        * Added in terrain as a function of speed (Ice/Snow/Sand will require slower vehicles).
            - Added maxSpeed to adjustables to use in speed limiter function.
        * Added boost factor for some vehicles (box trucks, delivery robot).
            - Applied a "boost factor" modifier to some vehicles to adjust up or down estimated completion times relative to other vehicle classes.
        * Minor UI updates.

    0.1.3 (2022-06-11):
        * Added counts to the Free Races, Paid Races, Joined, and Next To Race tabs.
        * Sorted returned races by Entry Fee, Ascending - this gives preference to Free Races.
            - This can also now be changed under Settings to give preference to Paid Races.
            - Made the result limit configurable under Settings as well.
            - Note that the sorting by Entry Fee will be removed in an upcoming version so that Free and Paid races are separate queries.
        * Additional minor fixes.

    0.1.2 (2022-06-10):
        * Added navigation menu icons:  Races, My Fleet, and My Settings.
        * Fixed the link in readme.md.
        * Added individual settings from mySettings to the new Settiings page.
            - Adjusting Refresh Rate automatically adjusts current timer; can't adjust below 30 seconds.
            - Added saving of mysettings.json.
            - Excluded Vehicles now fully works and is integrated in the best vehicle selection for the races.  
                Changing the excluded vehicles will automagically update the best vehicle selection for the upcoming races.
        * Added numberOfTrips / numberOfRefuels under image of Your Best and Your Entry.
        * Added Next-to-Race details.

    0.1.1 (2022-06-05):
        * Added a pretty looking countdown timer to the next refresh. :)
        * Now showing decimal places (with correct values rounded to 2 decimals) for races under 100km.
        * Now showing thousands separator (depends on locale to show either commas or periods).
        * Fixed participation threshold for space races - since space races start with 8 entrants (66% of other races), 
            the threshold for space races is now Math.round(participationThreshold*0.7, 0).
        * Changed the git folder from 0.1.0 (Major.Minor.Revision) to 0.1 (only Major.Minor).
            so that I can increase the Revision number without affecting the download path.
            Only if the Major or Minor version changes will users need to use a different path to download the latest.
            I expect to increase the Minor number at most once per week, whereas I plan to release revisions daily (when feasible).
            Once I get to a certain point, I will create a stable and latest folder.

	0.1.0 (2022-06-02):
        * New UI, with existing functionality ported over to html and javascript+JQuery!

