/*global $, jQuery, window, Storage, localStorage, alert, document, openFile, Firebase, FirebaseAuthClient, clearTimeout, setTimeout, location */

console.log("Running");

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
          console.log("Size0>" + size);
          return size;
    }

    function setLocalObject(key, value){
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getLocalObject(key){
        var value = localStorage.getItem(key);
        return value && JSON.parse(value);
    }

    function saveProgress() {
        clearTimeout(NoteThis.saveTimer);
        NoteThis.saveTimer = setTimeout(function () {
            delayedSave();
        }, NoteThis.minSaveTime);
    }

    function delayedSave() {
        var content, note_obj;

        //Save Occassionally gets fired when no note is active.  Safely ignore
        if(NoteThis.activeNote === null){
            return;
        }
        
        try {
            content = NoteThis.editor.getCode();
            note_obj = {note: content, title: $('#title').val()};
            //setLocalObject(NoteThis.activeNote, note_obj);
            if (NoteThis.FireBaseUser) {
                console.log("In!");
                if(NoteThis.activeNote.indexOf('myClipboard-') >= 0){
                    pushNewNote(note_obj);
                } else {   
                    console.log("Active note not part of my clipboard!" + NoteThis.activeNote);
                    NoteThis.FireBaseUser.child(NoteThis.activeNote).update(note_obj);
                    setLocalObject(NoteThis.activeNote, note_obj);
                }
            } else {
                if(NoteThis.activeNote.indexOf('fireClip-') >= 0){

                    pushNoteLocal(note_obj);
                    setLocalObject(NoteThis.activeNote, note_obj); //REMOVE THIS ONCE pushNOTE LOCAL IS WRITTEN
                } else {
                    setLocalObject(NoteThis.activeNote, note_obj);
                }                 
            }
        } catch (e) {
            console.log(e);
            alert("Current Save Operation failed.");
        }
        
    }

    /* Take a previously online note, and convert it back to a local note */
    function pushNoteLocal(note_object) {
        //TO DO
        console.log("Unwritten function!");
    }

    /* Generate a NEW Server-Side Note Object*/
    function pushNewNote(note_object) {
        var newNote, newNoteNum;
        if(!NoteThis.userData){
            newNote = "fireClip-1"; // No notes found
        } else {
            newNoteNum = getObjectLength(NoteThis.userData) + 1
            newNote = "fireClip-" + newNoteNum; // Name is 1 more than the rest of the notes
            console.log(newNote);
            console.log(NoteThis.userData);
        }

        NoteThis.FireBaseUser.child(newNote).update(note_object); 
        setLocalObject(newNote, note_object);
        localStorage.removeItem(NoteThis.activeNote);    
        $('#' + NoteThis.activeNote).attr('id', newNote).addClass("cloud");
        NoteThis.activeNote = newNote;        
    }

    function addDropDown(id, title, myClass) {
        var thisClass = myClass || '';
        thisClass = thisClass + " switch_note";
        $('#notes_tabs').append('<li><a href="#" class="' + thisClass + '" id="' + id + '">' + title + '</a></li>');
    }

    function updateNoteList() {
        var exists = false, i, temp, key;

        $('#notes_tabs').html('');
        for (var key in localStorage){
            if(Object.prototype.hasOwnProperty.call(localStorage,key)){
                if (key.indexOf('myClipboard-') >= 0) {
                    temp = getLocalObject(key).title || "untitled";
                    addDropDown(key, temp);
                    exists = key;
                } else if (key.indexOf('myClipboard') >= 0) {     
                    temp = migrateNote(key);
                    exists = key; 
                }
                if (key.indexOf('fireClip-') >= 0) {
                    temp = getLocalObject(key).title || "untitled";
                    addDropDown(key, temp, 'cloud');
                    exists = key;
                }
            }
        }
        return exists;
    }

    function migrateNote(key) {
        var obj, note_obj, next_note;
        console.log("Migrating note");
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

        var thisNote = getLocalObject(note_id);
        
        thisNote.note = thisNote.note || "";
        thisNote.title = thisNote.title || "untitled";
            NoteThis.editor.setCode(thisNote.note);

        //$('#editable').html(localStorage.getObject(note_id).note).focus();
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

        note_obj = {note: '', title: 'Note ' + current_note.split('myClipboard-')[1]};
        setLocalObject(current_note, note_obj);

        //insert note in drop down with Text / title of Note
        addDropDown(current_note, note_obj.title);
        loadNote(current_note);
    }

    function noteExists(note_id) {
        return (note_id in localStorage);
    }

    function createEditor(){
        var buttons = ['html', '|', 'formatting', '|', 'bold', 'italic', 'deleted', '|', 
                        'unorderedlist', 'orderedlist', 'outdent', 'indent', '|',
                        'image', 'video', 'file', 'table', 'link', '|',
                        'fontcolor', 'backcolor', '|', 'alignment'];

        $('#redactor').redactor({
            focus: true,
            buttons: buttons,
            callback: function(obj)
            {
                NoteThis.editor = obj;
            },
            keyupCallback: function(obj, event) {
                saveProgress();
            }
        });
    }

    function initialize() {
        var exists;

        //Load the exitor
        createEditor();

        //Load the NoteList, if any notes exist
        exists = updateNoteList();

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
        $('#logins').html(
            $("<button />", {
                'class': "btn",
                'data-placement': "bottom",
                'rel': "tooltip",
                'title': "Online tool sync still very much in beta.  Please do not login if you're afraid to lose notes!", 
                'id': "facebook_login",
                'html': "Facebook Login"
            })
        );
        initialize();
    }

    function loggedInSetup(user) {
        // $("<span />", {
        //     'class': "facebook login_name",
        //     'html': "Welcome back, " + user.displayName // from an Ajax request or something
        // }).appendTo("#welcome");

        $('#logins').html(
            $("<button />", {
                'class': "btn",
                'id': "logout",
                'html': "Logout"
            })
        );
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
        var i, key;

        localStorage.removeItem(note_id);

        for (var key in localStorage){
            if(Object.prototype.hasOwnProperty.call(localStorage,key)){
                if (key.indexOf('myClipboard-') >= 0 || key.indexOf('fireClip-') >= 0) {
                    loadNote(key);
                    break;
                }
            }
        }
        $('#' + note_id).parent().fadeOut();
    }

    /******
     * FireBase Handler
     *
     ****************/

    function setupFireBaseHandlers(user_id) {
        console.log("Setting up Firebase handlers");
        var key, note_obj;
        NoteThis.FireBaseUser = new Firebase('https://definedclarity.firebaseio.com/users/' + user_id);
        NoteThis.FireBaseUser.once('value', function (snapshot) {
            if (snapshot.val() !== null) {
                for (key in snapshot.val()) {
                    if (snapshot.val().hasOwnProperty(key)) {
                        note_obj = {note: snapshot.val()[key].note, title: snapshot.val()[key].title};
                        setLocalObject(key, note_obj)
                    }
                }   
            }
        });

        initialize();

        NoteThis.FireBaseUser.on('value', function (snapshot) {
            if(snapshot.val() !== null) {
                NoteThis.userData = snapshot.val();
                console.log("OMG FIREBASE EVENT TRIGGARED");
            }
        });
    }

    /***********************************************************************************************/
    if (supports_html5_storage()) {

        /****** ADD OBJECT SUPPORT TO LOCALSTORAGE ********/
        //NOT SUPPORTED IN IE8
        Storage.prototype.setObject = function (key, value) {
            this.setItem(key, JSON.stringify(value));
        };

        Storage.prototype.getObject = function (key) {
            var value = this.getItem(key);
            return value && JSON.parse(value);
        };

        NoteThis.myDataReference = new Firebase('https://definedclarity.firebaseio.com/');
        NoteThis.authClient = new FirebaseAuthClient(NoteThis.myDataReference, function (error, user) {
            if (error) {
                alert("Error during authorization");
            // an error occurred while attempting login
            } else if (user) {
            //User Is Logged In
                loggedInSetup(user);
                setupFireBaseHandlers(user.id);
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

        $('#logins').on('click', '#facebook_login', function () {
            NoteThis.authClient.login('facebook');
        });

        $('#logins').on("click", '#logout', function () {
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
            $('#' + NoteThis.activeNote).html($(this).val());
        });

        $('#download').on('click', function () {
            export_note();
        });

        // $('#reset').on('click', function () {
        //     clearNote();
        // });

        $('#facebook_login').tooltip();



    /***********************************************************************************************/
    } else {
        //user notification that html5 storage doesn't exist
        alert('noteThis requires a modern browser.  Please try again in Chrome, Firefox or Safari.');
    }
});