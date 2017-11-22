$(document).ready(function() {
    $("#id_button_index_signin").click(function(e) {
        e.preventDefault();
        
        if(document.getElementById('id_checkbox_registered').checked) {
            $.ajax({
                url: "/registered_login",
                type: "GET",
                dataType: "json",
                data: {
                    username: $("#id_input_username").val(),
                    password: MD5($("#id_input_password").val()),
                },
                contentType: "application/json",
                cache: true,
                timeout: 5000,
                complete: function() {
                    console.log('process complete');
                },
                success: function(data) {
                    console.log('process success');
                    if(data.login == "success") {
                        window.location.href = "/login";
                    } else {
                        $("#id_div_login_danger").fadeTo(2000, 500).slideUp(500, function(){
                            $("#id_div_login_danger").slideUp(500);
                        });
                    }
                },
                error: function() {
                    console.log('process error');
                },
            });
        } else {
            window.location.href = "/login";
        }
    });

    $('#id_form_registered :checkbox').change(function() {
        if (this.checked) {
            document.getElementById("id_div_login").style.display="block";
            document.getElementById("id_button_index_signin").innerHTML = "Sign in";
        } else {
            document.getElementById("id_div_login").style.display="none";
            document.getElementById("id_button_index_signin").innerHTML = "Sign up";
        }
    });
});
