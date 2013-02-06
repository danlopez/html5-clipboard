$(function() {
    function supports_html5_storage() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    }
    if(supports_html5_storage()){
    /***********************************************************************************************/

        /****** ADD OBJECT SUPPORT TO LOCALSTORAGE ********/
        Storage.prototype.setObject = function(key, value) {
            this.setItem(key, JSON.stringify(value));
        }

        Storage.prototype.getObject = function(key) {
            var value = this.getItem(key);
            return value && JSON.parse(value);
        }


        /******
         *  NOTE THIS GLOBAL NAMESPACE OBJECT
         *  In lieu of global variables
         ****************/

         NoteThis = {
            noteIndex :     0,       //Current Note Index
            Incrementer:    0,       //Number Only Ever Goes Up.  Used for note naming
            saveTimer:      null,    //SaveTimer Object
            minSaveTime:    500,      //Minimum Time between Saves
            FireBaseUser:    null
         }

        /******
         *  FUNCTION DECLARATIONS
         *
         ****************/

        function saveProgress() {
            console.log("Called Save Progress");
            $('#worksave').css('display', 'inline-block').fadeOut('slow');
            try {
                /*Clean any empty tagss out of the clipboard before saving*/
                $('#editable *:empty').not('br').remove();
                note_obj = {note: $('#editable').html(), title: $('#title').val()};
                localStorage.setObject("myClipboard" + NoteThis.noteIndex, note_obj);

                if(NoteThis.FireBaseUser){
                    NoteThis.FireBaseUser.child("myClipboard" + NoteThis.noteIndex).update({title: $('#title').val(), content: $('#editable').html()});

                    console.log("Logged in, save to firebase!");
                } else {
                    console.log("Not logged in");
                }
            } catch (e) {
                console.log(e) //Not alerting because alert chokes on arrays
                alert("Current Save Operation failed.");
            }
        }

        function loggedOutSetup(){
            $('#logins').html(
                $("<button />", {
                    class: "btn",
                    id: "facebook_login",
                    html: "Facebook Login"}
                )
            );

            Initialize();
        }

        function loggedInSetup(user){
            $("<span />", {
                class: "facebook login_name",
                html: "Welcome back, " + user.displayName // from an Ajax request or something
            }).appendTo("#welcome");

            $('#logins').html(
                $("<button />", {
                    class: "btn",
                    id: "logout",
                    html: "Logout"})
                );
        }

        function Initialize(){
            //Initialize The Local Note List
            NoteThis.Incrementer = UpdateNoteList();

            if(NoteThis.noteIndex > NoteThis.Incrementer){
                NoteThis.Incrementer = NoteThis.noteIndex;
            }

            if(NoteThis.Incrementer == 0){
                createNote();
            } else {
                loadNote("myClipboard" + NoteThis.noteIndex);
            }

        }

        function export_note(){
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
        }

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



        function createNote(){
            console.log("Creating Note");
            current_note='myClipboard'+ ++NoteThis.Incrementer;
            //create new note
            note_obj = {note: '', title: 'Note ' + NoteThis.Incrementer};
            localStorage.setObject(current_note,note_obj);
            //insert note in drop down with Text / title of Note
            addDropDown(current_note, note_obj['title']);
            loadNote(current_note);
        }

        function UpdateNoteList(){
            var current_num = 0;
            $('#notes_tabs').html('');
            for (var key in localStorage){
                if (key.indexOf('myClipboard') >=0){
                     current_num++;
                     addDropDown(key, localStorage.getObject(key)['title']);
                        if (NoteThis.noteIndex <= parseInt(key.split('myClipboard')[1])){
                        NoteThis.noteIndex = parseInt(key.split('myClipboard')[1]);}
                        //track highest (i.e. current) key      
                }
            }
            return current_num;
        }

        function addDropDown(id, title){
            $('#notes_tabs').append('<li><a href="#" class="switch_note" id="' + id + '"">' + title + '</a></li>');
        }

        function loadNote(note_id){
            $('#editable').html(localStorage.getObject(note_id)['note']).focus();
            $('#title').val(localStorage.getObject(note_id)['title']);
            $('#notes_tabs li.active').removeClass('active');
            $('#'+note_id).parent().addClass('active');
            NoteThis.noteIndex = parseInt(note_id.split('myClipboard')[1]);
        }

        $('#reset').on('click', function(){
            note_obj = {note: '', title: $('#title').val()};
            localStorage.setObject("myClipboard" + NoteThis.noteIndex, note_obj);
            $('#editable').html('');
        });

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


        var myDataReference = new Firebase('https://definedclarity.firebaseio.com/');
        var authClient = new FirebaseAuthClient(myDataReference, function(error, user) {
              if (error) {
                // an error occurred while attempting login
                console.log(error);
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
         *  FireBase Handler
         *
         ****************/

         function setupFireBaseHandlers(user_id){
            NoteThis.FireBaseUser = new Firebase('https://definedclarity.firebaseio.com/users/' + user_id);



            NoteThis.FireBaseUser.once('value', function(snapshot){
              if(snapshot.val() === null) {
                console.log("No values!");
                //No cloud entries
              } else {
                    for(var key in snapshot.val()){
                        console.log("Setting things up");
                        note_obj = {note: snapshot.val()[key]['content'], title: snapshot.val()[key]['title']};
                        localStorage.setObject(key, note_obj);
                    }  
                    Initialize();               
              }

            })
         }

        /******
         *  Save Handler
         *
         ****************/
        $('#editable, #title').on('input', function() {         
            clearTimeout(NoteThis.saveTimer);
            NoteThis.saveTimer = setTimeout(function() {
                saveProgress();
            }, NoteThis.minSaveTime);
        });


        /******
         *  Event Handlers
         *
         ****************/

        $('#logins').on('click', '#facebook_login', function(){
            authClient.login('facebook');
        });

        $('#logins').on("click", '#logout', function(){
            authClient.logout();
            location.reload(); //Force a Reload to reapply loggedin/loggedout setup
        });

        /*Triggers an update on other tabs when noteme is open in multiple windows*/
        $(window).on("storage", function(e){
            UpdateNoteList();   
        })

        //Create A New Note
        $('#new_note').on('click', function(){
            createNote();
        });

        $('#notes_tabs').on('click', '.switch_note', function(e){
            e.preventDefault();
            loadNote($(this).attr('id'));
        });

        $('#delete_note').on('click', function(e){
            e.preventDefault();
            deleteNote("myClipboard" + NoteThis.noteIndex);
        });

        $('#title').on('input', function(){
            $('#myClipboard'+NoteThis.noteIndex).html($(this).val());
        });

         $('#download').on('click', function(){
            export_note();
        });

    /***********************************************************************************************/
    } else {
        //user notification that html5 storage doesn't exist
        alert('noteThis requires a modern browser.  Please try again in Chrome, Firefox or Safari.')
    }
});