WOF Racer 0.1.2

Download all files from this location:  https://github.com/Galaphine/wof/tree/master/html/wofracer/v0.1

Read the included Instructions.txt file for details on how to set up and run the script.

Version history:

    0.1.2 (2022-06-08):
        * Added navigation menu icons:  Races, My Fleet, and My Settings.
        * Fixed the link in readme.md.
        * Added individual settings from mySettings to the new Settiings page.
            - Adjusting Refresh Rate automatically adjusts current timer; can't adjust below 30 seconds.
            - Added saving of mysettings.json
            - Excluded Vehicles now fully works and is integrated in the best vehicle selection for the races.  
                Changing the excluded vehicles will automagically update the best vehicle selection for the upcoming races.
        * Added numberOfTrips / numberOfRefuels under image of Your Best and Your Entry.
        * Added Next-to-Race details

    0.1.1 (2022-06-05):
        * Added a pretty looking countdown timer to the next refresh. :)
        * Now showing decimal places (with correct values rounded to 2 decimals) for races under 100km.
        * Now showing thousands separator (depends on locale to show either commas or periods).
        * Fixed participation threshold for space races - since space races start with 8 entrants (66% of other races), 
            the threshold for space races is now Math.round(participationThreshold*0.7, 0).
        * Changed the git folder from 0.1.0 (Major.Minor.Revision) to 0.1 (only Major.Minor)
            so that I can increase the Revision number without affecting the download path.
            Only if the Major or Minor version changes will users need to use a different path to download the latest.
            I expect to increase the Minor number at most once per week, whereas I plan to release revisions daily (when feasible).
            Once I get to a certain point, I will create a stable and latest folder.

	0.1.0 (2022-06-02):
        * New UI, with existing functionality ported over to html and javascript+JQuery!

