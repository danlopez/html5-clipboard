$(function() {

    function supports_html5_storage() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    }
    
    /*Only run if html5 storage supported*/
    if(supports_html5_storage()){

        $('#editable').html(localStorage.getItem("myClipboard")).focus();
       
        var saveTimer, lastSaveTime = 0;
        var minSaveTime = 1000;

        function saveProgress() {
            $('#worksave').show().html("Saving...").fadeOut('slow');
            try {
                /*Clean any empty tagss out of the clipboard before saving*/
                $('#editable *:empty').not('br').remove();
                localStorage.setItem("myClipboard", $('#editable').html());
            } catch (e) {
                alert("Current Save Operation failed.  Local storage capacity reached");
            }
        }

        $('#editable').on('input', function() {
   
            var now = new Date().getTime();
    
            if (!saveTimer) {
                if (now - lastSaveTime > (3 * minSaveTime)) {
                    saveProgress();   // fire immediately on first scroll
                    lastSaveTime = now;
                }
        
                saveTimer = setTimeout(function() {
                    saveTimer = null;
                    lastSaveTime = new Date().getTime();
                    saveProgress();
                }, minSaveTime);
            }
        });
    }

});
