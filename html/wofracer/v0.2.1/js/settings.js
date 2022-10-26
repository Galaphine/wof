function refreshExcludedVehiclesLists()
{
    const includedVehicles = ko.mapping.toJS(userVehiclesVM().filter( uv => !mySettings.excluded_vehicles().includes(uv.token_id())));
    const excludedVehicles = ko.mapping.toJS(userVehiclesVM().filter( uv => mySettings.excluded_vehicles().includes(uv.token_id())));
    mySettings.includedVehicles(includedVehicles);
    mySettings.excludedVehicles(excludedVehicles);
}

function updateSettings()
{
    // alert("HERE");
    // var exclusionsToRemove = []
    // $.each(mySettings.excluded_vehicles(), function(index)
    //     {
    //         var vehicleImage = $('#vehicle_' + mySettings.excluded_vehicles()[index]);
    //         if (vehicleImage.length > 0)
    //         {
    //             vehicleImage.addClass('image-vehicle-excluded');
    //             vehicleImage.prop('excluded', true);
    //         }
    //         else
    //         {
    //             exclusionsToRemove.push(mySettings.excluded_vehicles()[index]);
    //         }
    //     }
    // );
    // while (exclusionsToRemove.length > 0)
    // {
    //     itemToRemove = exclusionsToRemove.pop();
    //     mySettings.excluded_vehicles.remove(itemToRemove);
    // }
}
