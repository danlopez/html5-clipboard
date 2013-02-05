
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
        
        /****** ADD OBJECT SUPPORT TO LOCALSTORAGE ********/
        Storage.prototype.setObject = function(key, value) {
            this.setItem(key, JSON.stringify(value));
        }

        Storage.prototype.getObject = function(key) {
            var value = this.getItem(key);
            return value && JSON.parse(value);
        }

        /******** INITIALIZATION **********/
        //initialize by creating a drop down for each note

        var current_num=0;
        var noteNum=0;
        function loadNoteList(){
            for (var key in localStorage){
                if (key.indexOf('myClipboard') >=0){
                    noteNum++;
                    addDropDown(key, localStorage.getObject(key)['title']);
                    //track highest (i.e. current) key
                    if (current_num <= parseInt(key.split('myClipboard')[1])){
                        current_num = parseInt(key.split('myClipboard')[1]);}
                }
            }
        }

        //create new note & set current note to it
        loadNoteList();
        var current_note = 'myClipboard'+current_num;
        if(noteNum<=0){
            createNote();
        }
        loadNote(current_note);
        //refreshNotesList();



        /******* END INITIALIZATION *********/



        function createNote(){
            current_num++;
            current_note='myClipboard'+current_num;
            //create new note
            note_obj = {note: '', title: 'Note '+current_num};

            localStorage.setObject(current_note,note_obj);
            //insert note in drop down with Text / title of Note
            addDropDown(current_note, note_obj['title']);
            loadNote(current_note);
            // //load current note/ first note
            // $('#editable').html(localStorage.getItem(localStorage.getItem('currentNote'))).focus();

        }

        $(window).on("storage", function(e){
            //UpdateNoteList();
            
        })

        function refreshNotesList(){
            //UpdateNoteList();
            setTimeout(function() { refreshNotesList() }, 5000); 
        }


        function UpdateNoteList(){
            $('#notes_tabs').html('');
            for (var key in localStorage){
                if (key.indexOf('myClipboard') >=0){
                     addDropDown(key, localStorage.getObject(key)['title']);
                     //track highest (i.e. current) key
                     if (current_num <= parseInt(key.split('myClipboard')[1]))
                         current_num = parseInt(key.split('myClipboard')[1])+1;
                }
            }
        }

        function addDropDown(id, title){
            $('#notes_tabs').append('<li><a href="#" class="switch_note" id="' + id + '"">' + title + '</a></li>');
        }

        function removeDropDown(id){

        }

        function loadNote(note_id){
            current_note=note_id;
            // localStorage.setItem('currentNote', current_note);
            $('#editable').html(localStorage.getObject(note_id)['note']).focus();
            $('#title').val(localStorage.getObject(note_id)['title']);
            $('#notes_tabs li.active').removeClass('active');
            $('#'+note_id).parent().addClass('active');
        }


        function deleteNote(note_id){
            localStorage.removeItem(note_id);
            for (var key in localStorage){
                if (key.indexOf('myClipboard') >=0){
                    loadNote(key)
                    break;
                }
            }            
            $('#'+note_id).parent().fadeOut();
        }
        function saveProgress() {
            $('#worksave').css('display', 'inline-block').fadeOut('slow');
            try {
                /*Clean any empty tagss out of the clipboard before saving*/
                $('#editable *:empty').not('br').remove();
                note_obj = {note: $('#editable').html(), title: $('#title').val()};
                localStorage.setObject(current_note, note_obj);
            } catch (e) {
                alert("Current Save Operation failed.  Local storage capacity reached");
            }
        }
        /***** SAVE HANDLER *******/
        var saveTimer;
        var minSaveTime = 500;
        $('#editable, #title').on('input', function() {
            
            clearTimeout(saveTimer);
            saveTimer = setTimeout(function() {
                saveProgress();
            }, minSaveTime);
        });
        /****** END SAVE ********/
        function openFile (textToEncode, contentType, newWindow) {
            var encodedText = window.btoa(textToEncode);
            var dataURL = 'data:' + contentType + ';base64,' + encodedText;
            if (newWindow) { // Not useful for application/octet-stream type
                window.open(dataURL); // To open in a new tab/window
            }
            else {
                window.location = dataURL; // To change the current page
            }
        }
        /****** Event Handlers **********/
        $('#download').on('click', function(){
            
            $("#editable *").each(function(){
                $(this).removeAttr("style");
            });

            var html  = $("#editable").html();
            
    
            //now remove all </div> and <br> tags
            html=html.split('</div>').join('');
            html=html.split('<br>').join('');
            //add a new line for each div
            html = html.split('<div>').join('\n');
            //decode html again, in case you pasted that
            var div = document.createElement('div');
            div.innerHTML = html;
            html = div.firstChild.nodeValue;
            openFile(html, "application/octet-stream", false);
        });

        $('#reset').on('click', function(){
            localStorage.setItem(current_note,'');
            $('#editable').html('');
        });

        $('#new_note').on('click', function(){
            createNote();
        });
        $(document).on('click', '.switch_note', function(){
            loadNote($(this).attr('id'));
        });
        $('#delete_note').on('click', function(){
            deleteNote(current_note);
        });
        $('#title').on('input', function(){
            $('#'+current_note).html($(this).val());
        });
        /********* END Event Handlers *********/

    }
    else {
        //user notification that html5 storage doesn't exist
        alert('noteThis requires a modern browser.  Please try again in Chrome, Firefox or Safari.')
    }

});
