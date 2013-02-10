/*global $, jQuery, window, Storage, localStorage, alert, document, openFile, Firebase, FirebaseAuthClient, clearTimeout, setTimeout, location */

$(function () {
    'use strict';

    /******
     *  NOTE THIS GLOBAL NAMESPACE OBJECT
     *  In lieu of global variables
     ****************/
    var NoteThis = {
        activeNote :        null,     //Current Note Index
        saveTimer:          null,     //SaveTimer Object
        minSaveTime:        150,      //Minimum Time between Saves
        FireBaseUser:       null,
        myDataReference:    null,
        authClient:         null,
        editor:             null,
        userData:           null, 
    };

    /******
     *  FUNCTION DECLARATIONS
     *
     ****************/

    function supports_html5_storage() {
        try {
            localStorage.setItem('a', 'a');
            localStorage.removeItem('a');
            return true;
        } catch (e) {
            return false;
        }
    }

    function getObjectLength (obj){
        var size = 0;
        for (var prop in obj) {
            if (hasOwnProperty.call(obj, prop)) size = size + 1;
          }
          return size;
    }

    function setLocalObject(key, value){
        console.log("Called set!");
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getLocalObject(key){
        console.log("Called Get!");
        var value = localStorage.getItem(key);
        return value && JSON.parse(value);
    }

    //Timer function keeps from firing save too often.
    function saveProgress() {
        clearTimeout(NoteThis.saveTimer);
        NoteThis.saveTimer = setTimeout(function () {       
            delayedSave();
        }, NoteThis.minSaveTime);
    }

    //Splits save action depending on context (logged out, logged in),
    //catches storage handling errors.
    function delayedSave(){
        //Safely ignore if no note is active.  
        if(NoteThis.activeNote === null){
            return;
        }
        if (NoteThis.FireBaseUser) {
            try{
                delayedSaveOnline();
            } catch (e){
                alert("Save Operation Failed");
                console.log(e);
            }
        } else {
            try {
                 delayedSaveOffLine();
            } catch (e) {
                if(e.name === 'QUOTA_EXCEEDED_ERR'){
                    $('#storageExceeded').modal('show');
                } else {
                    throw e; // Let any other errors bubble up
                }
            }
        }
    }

    function delayedSaveOnline(){
        var note_obj = {note: NoteThis.editor.getCode(), title: $('#title').val()};  
        if(NoteThis.activeNote.indexOf('myClipboard-') >= 0){
            pushNewNote(note_obj);
        } else {   
            NoteThis.FireBaseUser.child(NoteThis.activeNote).update(note_obj);
            setLocalObject(NoteThis.activeNote, note_obj);
        }
    }

    function delayedSaveOffLine(){
        var note_obj = {note: NoteThis.editor.getCode(), title: $('#title').val()};
        if(NoteThis.activeNote.indexOf('fireClip-') >= 0){
            pushNoteLocal(note_obj);
            setLocalObject(NoteThis.activeNote, note_obj); //REMOVE THIS ONCE pushNOTE LOCAL IS WRITTEN
        } else {
            setLocalObject(NoteThis.activeNote, note_obj);
        }
    }

    /* Take a previously online note, and convert it back to a local note */
    function pushNoteLocal(note_object) {
        //TO DO.  This should ONLY happen when a user's login expires and they still have local copies
        console.log("Unwritten function!");
    }

    /* Generate a NEW Server-Side Note Object*/
    function pushNewNote(note_object) {
        var newNote, newNoteNum = 1;
        do{
            newNote = "fireClip-" + newNoteNum;
            newNoteNum = newNoteNum + 1;
        } while(newNote in NoteThis.userData);

        NoteThis.FireBaseUser.child(newNote).update(note_object); 
        setLocalObject(newNote, note_object);
        localStorage.removeItem(NoteThis.activeNote);    
        $('#' + NoteThis.activeNote).attr('id', newNote).addClass("cloud");
        NoteThis.activeNote = newNote;        
    }

    function addDropDown(id, title, myClass) {
        var thisClass = (myClass || '');
        thisClass = thisClass + " truncate switch_note";
        $('#notes_tabs').append('<li><a title="' + title + '" href="#" class="' + thisClass + '" id="' + id + '">' + title + '</a></li>');
    }

    function updateNoteList(loader) {  

        var exists = false, i, temp, key, noteList;
        loader = loader || false;
        console.log(loader);
        noteList = $('#notes_tabs').html('');

        if(!loader) {
            $('#warningGradientOuterBarG').show();
        }

        for (key in localStorage){
            if(Object.prototype.hasOwnProperty.call(localStorage,key)){
                if (key.indexOf('myClipboard-') >= 0) {
                    temp = getLocalObject(key).title || "untitled";
                    addDropDown(key, temp);
                    exists = key;
                } else if (key.indexOf('myClipboard') >= 0) {     
                    temp = migrateNote(key);
                    exists = key; 
                }
            }
        }
        for (key in NoteThis.userData){
            if(Object.prototype.hasOwnProperty.call(NoteThis.userData,key)){
                if (key.indexOf('fireClip-') >= 0) {
                    temp = NoteThis.userData[key].title || "untitled";
                    addDropDown(key, temp, 'cloud');
                    exists = key;
                }
            }
        }

        if(loader){
            $('#warningGradientOuterBarG').hide();
        }

        return exists;
    }

    function migrateNote(key) {
        var obj, note_obj, next_note;
        if(key !== undefined){
            try{
                obj = getLocalObject(key);
                note_obj = {note: obj.note, title:  obj.title};
            }
            catch(e){//If all else fails, grab the item directly (do not parse), dump the contents in a note
                note_obj = {note: localStorage.getItem(key), title: "untitled"}
            }
            next_note = getNextNote();
            setLocalObject(next_note, note_obj);
            addDropDown(next_note, note_obj.title);
            deleteNote(key);
        }  
    }

    /*  
    **  Switches Active Note, Loads WYSIWYG from LocalStorage                  
    */
    function loadNote(note_id) {
        var thisNote;

        if (note_id.indexOf('fireClip-') >= 0) {
            thisNote = {note: NoteThis.userData[note_id].note, title: NoteThis.userData[note_id].title};
        } else {
            thisNote = getLocalObject(note_id);
        }
        
        thisNote.note = thisNote.note || "";
        thisNote.title = thisNote.title || "untitled";
        
        NoteThis.editor.setCode(thisNote.note);
        $('#title').val(thisNote.title);

        $('#notes_tabs li.active').removeClass('active');
        $('#' + note_id).parent().addClass('active');

        NoteThis.activeNote = note_id;
        localStorage.setItem('activeNote', note_id);
    }

    /*  
    **  Identify next available local note name                                                   
    */   
    function getNextNote() {
        var num = 0, nextNote;
        do{
            num = num + 1;
            nextNote = "myClipboard-" + num;            
        }   while(nextNote in localStorage);
        return nextNote;
    }

    /*
    **  Generates a local note and makes it active
    */
    function createNote() {
        var current_note, note_obj;
        current_note = getNextNote();
        //create new note

        note_obj = {note: '', title: 'New Note '};
        setLocalObject(current_note, note_obj);

        //insert note in drop down with Text / title of Note
        addDropDown(current_note, note_obj.title);
        loadNote(current_note);
    }

    //Check for the note in localstorage, or check if remote data exists, and check for it there.
    function noteExists(note_id) {
        return (note_id in localStorage || (NoteThis.userData && (note_id in NoteThis.userData)));
    }

    function createEditor(){
        var buttons = ['html', '|', 'formatting', '|', 'bold', 'italic', 'deleted', '|', 
                        'unorderedlist', 'orderedlist', 'outdent', 'indent', '|',
                        'image', 'video', 'file', 'table', 'link', '|',
                        'fontcolor', 'backcolor', '|', 'alignment'];

        $('#redactor').redactor({
            focus: true,
            buttons: buttons,
            toolbarExternal: '#toolbar',
            callback: function(obj)
            {
                NoteThis.editor = obj;
                attachScrollObserver();
            },
            keyupCallback: function(obj, event) {
                saveProgress();
            }
        });
    }

    //Lets wysiwyg toolbar scroll with the user
    function attachScrollObserver(){
        var height, $window = $(window);

         $window.scroll(function(e) {
            height = $('#edit_wrapper').offset().top;
             if($window.scrollTop() > height){
                 $("#toolbar, .redactor_box").addClass('scrollfix');   
             } else {
                 $("#toolbar, .redactor_box").removeClass('scrollfix');
             }
        });

    }

    function initialize(updateList) {
        var exists;

        updateList = updateList || false;

        //Load the NoteList, if any notes exist
        exists = updateNoteList(updateList);

        //If no note exists, create one.  Otherwise, check to see if we have an active note, and load it.  Otherwise, just load an existing note.
        if (!exists) {
            createNote();
        } else {
            NoteThis.activeNote = localStorage.getItem('activeNote');
            if (NoteThis.activeNote !== null && noteExists(NoteThis.activeNote)) {
                loadNote(NoteThis.activeNote);
            } else {
                loadNote(exists);
            }
        }

    }

    function loggedOutSetup() {
        $('#logins .dropdown-menu').html('').append(
            $("<li />", {
                    'data-placement': "bottom",
                    'class': "tip facebook_login",
                    'rel': "tooltip",
                    'data-delay': 500,
                    'title': "Login to keep your notes stored online and available anywhere.", 
                    'html': "<a href='#'>Facebook Login</a>"
                })
            ).append(
                $("<li />", {
                    'data-placement': "bottom",
                    'class' : "tip twitter_login",
                    'rel': "tooltip",
                    'data-delay': 500,
                    'title': "Login to keep your notes stored online and available anywhere.", 
                    'html': "<a href='#'>Twitter Login</a>"
                })
            )

        $('.tip').tooltip();


        initialize(true);
        //clear local storage

    }

    function loggedInSetup(user) {
        // $("<span />", {
        //     'class': "facebook login_name",
        //     'html': "Welcome back, " + user.displayName // from an Ajax request or something
        // }).appendTo("#welcome");
        $('#logins .dropdown-toggle').html(user.displayName + '<b class="caret"></b>');
        $('#logins .dropdown-menu').html('').append(
            $("<li />", {
                'id': "logout",
                'html': "<a>Logout</a>"
            })
        ).append(
            $("<li />", {
                'id': "logout_keep_data",
                'html': "<a>Logout and keep data</a>",
                'data-placement': "bottom",
                'rel': "tooltip",
                'title': "Logout but keep local copies of all your notes", 
            })
        );
        $('#logout_keep_data').tooltip();

        initialize();

    }

    function export_note() {
        var html, div;

        $("#editable *").each(function () {
            $(this).removeAttr("style");
        });

        html  = $("#editable").html();

        //now remove all </div> and <br> tags
        html = html.split('</div>').join('');
        html = html.split('<br>').join('');
        //add a new line for each div
        html = html.split('<div>').join('\n');
        //decode html again, in case you pasted that
        div = document.createElement('div');
        div.innerHTML = html;
        html = div.firstChild.nodeValue;
        openFile(html, "application/octet-stream", false);
    }

    function openFile(textToEncode, contentType, newWindow) {
        var encodedText = window.btoa(textToEncode),
            dataURL = 'data:' + contentType + ';base64,' + encodedText;

        if (newWindow) { // Not useful for application/octet-stream type
            window.open(dataURL); // To open in a new tab/window
        } else {
            window.location = dataURL; // To change the current page
        }
    }

    function deleteNote(note_id) {
        var i, key, $parent;

        localStorage.removeItem(note_id);

        if (NoteThis.FireBaseUser) {
            NoteThis.FireBaseUser.child(NoteThis.activeNote).set(null);
        }

        $parent = $('#' + note_id).parent();
        for (key in NoteThis.userData){
            if(Object.prototype.hasOwnProperty.call(NoteThis.userData,key)){
                if (key.indexOf('fireClip-') >= 0) {
                    loadNote(key);
                    $parent.fadeOut(300, function() { $(this).remove(); });
                    return;
                }
            }
        }
        for (key in localStorage){
            if(Object.prototype.hasOwnProperty.call(localStorage,key)){
                if (key.indexOf('myClipboard-') >= 0) {
                    loadNote(key);
                    $parent.fadeOut(300, function() { $(this).remove(); });
                    return;
                }
            }
        }
        $parent = $('#' + note_id).parent();
        $parent.fadeOut(300, function() { $(this).remove(); createNote(); }); 
    }

    /******
     * FireBase Handler
     *
     ****************/

    function setupFireBaseHandlers(user_id) {
        var key, note_obj;
        NoteThis.FireBaseUser = new Firebase('https://definedclarity.firebaseio.com/users/' + user_id);
        NoteThis.FireBaseUser.once('value', function (snapshot) {
            if (snapshot.val() !== null) {
            //     for (key in snapshot.val()) {
            //         if (snapshot.val().hasOwnProperty(key)) {
            //             note_obj = {note: snapshot.val()[key].note, title: snapshot.val()[key].title};
            //             setLocalObject(key, note_obj)
            //         }
                NoteThis.userData = snapshot.val();
            }   
                
            // }
            initialize(true);
        });

        //This is used to keep track of the notes on the server
        NoteThis.FireBaseUser.on('value', function (snapshot) {
            if(snapshot.val() !== null) {
                NoteThis.userData = snapshot.val();
            }
        });

    }

    /***********************************************************************************************/
    if (supports_html5_storage()) {

        //Load the exitor
        createEditor();

        NoteThis.myDataReference = new Firebase('https://definedclarity.firebaseio.com/');
        NoteThis.authClient = new FirebaseAuthClient(NoteThis.myDataReference, function (error, user) {
            if (error) {
                alert("Error during authorization");
            // an error occurred while attempting login
            } else if (user) {
            //User Is Logged In
                setupFireBaseHandlers(user.id);
                loggedInSetup(user);
                
            } else {
            // User Is Logged Out
                loggedOutSetup();
            }
        });

        /******
         *  Save Handler
         *
         ****************/
        $('#title').on('input', function () {
            saveProgress();
        });

        /******
         *  Event Handlers
         *
         ****************/

        $('#logins, #storageExceeded').on('click', '.facebook_login', function (e) {
            e.preventDefault();
            NoteThis.authClient.login('facebook', {
                rememberMe: true
            });
        });

        $('#logins, #storageExceeded').on('click', '.twitter_login', function (e) {
            e.preventDefault();
            NoteThis.authClient.login('twitter', {
                rememberMe: true
            });
        });

        $('#logins').on("click", '#logout', function () {

            NoteThis.authClient.logout();
            localStorage.clear()
            location.reload(); //Force a Reload to reapply loggedin/loggedout setup
        });

        $('#logins').on("click", '#logout_keep_data', function () {
            NoteThis.authClient.logout();
            location.reload(); //Force a Reload to reapply loggedin/loggedout setup
        });
        /*Triggers an update on other tabs when noteme is open in multiple windows*/
        $(window).on("storage", function () {
            updateNoteList();
        });

        //Create A New Note
        $('#new_note').on('click', function () {
            createNote();
        });

        $('#notes_tabs').on('click', '.switch_note', function (e) {
            e.preventDefault();
            loadNote($(this).attr('id'));
        });

        $('#delete_note').on('click', function (e) {
            e.preventDefault();
            deleteNote(NoteThis.activeNote);
        });

        $('#title').on('input', function () {
            $('#' + NoteThis.activeNote).html($(this).val()).attr("title", $(this).val());
        });

        $('#download').on('click', function () {
            export_note();
        });

    /***********************************************************************************************/
    } else {
        //user notification that html5 storage doesn't exist
        alert('noteThis requires a modern browser.  Please try again in Chrome, Firefox or Safari.');
    }
});