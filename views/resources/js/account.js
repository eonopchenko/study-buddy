$(document).ready(function() {
    $("#id_button_account_submit").click(function(e) {
        e.preventDefault();

        var name = $("#id_input_account_name").val();
        var username = $("#id_input_account_username").val();
        var password = $("#id_input_account_password").val();
        var picture = $("#id_input_account_picture").val();

        if((name == "") || (username == "") || (password == "") || (picture == "")) {
            $("#id_div_empty_danger").fadeTo(2000, 500).slideUp(500, function() {
                $("#id_div_empty_danger").slideUp(500);
            });
        } else {
            $.ajax({
                url: "/account_submit",
                type: "GET",
                dataType: "json",
                data: {
                    name: name,
                    username: username,
                    password: MD5(password),
                    picture: picture,
                    subscribed: $('#id_input_account_subscribed').is(':checked') ? "checked" : ""
                },
                contentType: "application/json",
                cache: true,
                timeout: 5000,
                complete: function() {
                    console.log('process complete');
                },
                success: function(data) {
                    console.log('process success');
                    document.getElementById("id_div_account_submit_success").style.display="block";
                },
                error: function() {
                    console.log('process error');
                    document.getElementById("id_div_account_submit_danger").style.display="block";
                },
            });
        }
    });

    $("#id_a_goback").click(function(e) {
        e.preventDefault();
        window.location.replace("/");
    })
});
