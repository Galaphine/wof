function updateSettings()
{
    var exclusionsToRemove = []
    $.each(mySettings.excluded_vehicles(), function(index)
        {
            var vehicleImage = $('#vehicle_' + mySettings.excluded_vehicles()[index]);
            if (vehicleImage.length > 0)
            {
                vehicleImage.addClass('image-vehicle-excluded');
                vehicleImage.prop('excluded', true);
            }
            else
            {
                exclusionsToRemove.push(mySettings.excluded_vehicles()[index]);
            }
        }
    );
    while (exclusionsToRemove.length > 0)
    {
        itemToRemove = exclusionsToRemove.pop();
        mySettings.excluded_vehicles.remove(itemToRemove);
    }

    $('.image-vehicle-small').click(function(e)
        {
            e.target.excluded = !e.target.excluded;
            var tokenId = parseInt(e.target.id.replace('vehicle_', ''));
            if (e.target.excluded)
            {
                $('#' + e.target.id).addClass('image-vehicle-excluded');
                mySettings.excluded_vehicles.push(tokenId);
            }
            else
            {
                $('#' + e.target.id).removeClass('image-vehicle-excluded');
                mySettings.excluded_vehicles.remove(tokenId);
            }
            mySettings.excluded_vehicles().sort();
            refreshViewModels(true, true);
        }
    );
}

