$(document).ready(function() {
    
    const colors = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', 
        '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', 
        '#795548', '#9E9E9E', '#607D8B', '#000000'      
    ];

    updateTaskEditBox();
    updateTaskList();

    $.ajax({
        url: "/fill_calendar",
        type: "GET",
        dataType: "json",
        contentType: "application/json",
        cache: true,
        timeout: 5000,
        complete: function() {
            console.log('process complete');
        },
        success: function(data) {
            console.log('process success');

            if(data.length == 0) {
                document.getElementById("id_div_get_started").style.display="block";
            }

            $('#calendar').fullCalendar({
                header: {
                    left: 'tasksButton',
                    center: 'prev,next today',
                    right: 'agendaWeek, list'
                },
                customButtons: {
                    tasksButton: {
                        text: 'Tasks (unfold)',
                        click: function() {

                            if(this.innerHTML == 'Tasks (unfold)') {
                                this.innerHTML = "Tasks (fold)";
                            } else {
                                this.innerHTML = "Tasks (unfold)";
                            }

                            var form = document.getElementById("id_div_form_update_task");
                            if (form.style.display === "none") {
                                form.style.display = "block";
                            } else {
                                form.style.display = "none";
                            }
                        }
                    }
                },
                defaultView: 'agendaWeek',
                allDaySlot: false,
                minTime: "08:00:00",
                maxTime: "22:00:00",
                navLinks: true,
                editable: true,
                eventLimit: true,
                nowIndicator: true,
                locale: 'nz',
                timeFormat: 'H(:mm)',
                timezone: "local",
                events: data,
                dayClick: function(date, jsEvent, view) {
                    document.getElementById("id_div_get_started").style.display="none";
                    document.getElementById('id_input_create_start').value = date.format('DD/MM/YYYY hh:mm A');
                    document.getElementById("id_div_form_create").style.display="block";
                },
                eventDrop: function(event, delta, revertFunc, jsEvent, ui, view) {
                    updateEvent(event.id, event.title, event.start.toString(), event.end.toString());
                },
                eventResize: function(event, delta, revertFunc, jsEvent, ui, view) {
                    updateEvent(event.id, event.title, event.start.toString(), event.end.toString());
                },
                eventClick: function(event, jsEvent, view) {
                    $('#calendar').fullCalendar('removeEvents', event.id);
                    $.ajax({
                        url: "/remove_event",
                        type: "GET",
                        dataType: "json",
                        data: {
                            id: event.id
                        },
                        contentType: "application/json",
                        cache: true,
                        timeout: 5000,
                        complete: function() {
                            console.log('process complete');
                        },
                        success: function(data) {
                           console.log('process success');
                        },
                        error: function(data) {
                            console.log('process error');
                        }
                    });
                },
                eventMouseover: function(calEvent, jsEvent) {
                    var tooltip = '<div class="tooltipevent" style="color:#ccc;position:absolute;z-index:10001;">' + 'Click event to remove!' + '</div>';
                    var $tooltip = $(tooltip).appendTo('body');
                
                    $(this).mouseover(function(e) {
                        $(this).css('z-index', 10000);
                        $tooltip.fadeIn('500');
                        $tooltip.fadeTo('10', 1.9);
                    }).mousemove(function(e) {
                        $tooltip.css('top', e.pageY + 10);
                        $tooltip.css('left', e.pageX + 20);
                    });
                },
                
                eventMouseout: function(calEvent, jsEvent) {
                    $(this).css('z-index', 8);
                    $('.tooltipevent').remove();
                },
            });
        },
        error: function(data) {
            console.log('process error');
        },
    });

    function updateEvent(id, title, start, end) {
        $.ajax({
            url: "/update_event",
            type: "GET",
            dataType: "json",
            data: {
                id: id,
                title: title,
                start: start,
                end: end
            },
            contentType: "application/json",
            cache: true,
            timeout: 5000,
            complete: function() {
                console.log('process complete');
            },
            success: function(data) {
               console.log('process success');
            },
            error: function(data) {
                console.log('process error');
            }
        });
    }

	$("#id_button_create").click(function(e) {
        e.preventDefault();

        if($("#id_input_create_title").val() == "") {
            $("#id_div_empty_danger").fadeTo(2000, 500).slideUp(500, function() {
                $("#id_div_empty_danger").slideUp(500);
            });
        } else {

            var start = new Date(moment($("#id_input_create_start").val(), 'DD/MM/YYYY hh:mm A'));
            var index = Math.floor((Math.random() * (colors.length - 1)) + 0);
            var color = colors[index];
            $.ajax({
                url: "/create_event",
                type: "GET",
                dataType: "json",
                data: {
                    start: start.toString(),
                    title: $("#id_input_create_title").val(),
                    category: $("#id_input_create_category").val(),
                    color: color
                },
                contentType: "application/json",
                cache: true,
                timeout: 5000,
                complete: function() {
                console.log('process complete');
                document.getElementById("id_div_form_create").style.display="none";
                },
                success: function(data) {
                    console.log('process success');
                    document.getElementById("id_div_create_success").style.display="block";
                    location.reload(true);
                },
                error: function() {
                    console.log('process error');
                    document.getElementById("id_div_create_danger").style.display="block";
                },
            });
        }
    });
    
    function saveTask(inputTitle, inputStart, inputEnd, taskNumber) {
        var title = document.getElementById(inputTitle).value;
        var start = document.getElementById(inputStart).value;
        var end = document.getElementById(inputEnd).value;

        console.log(title);
        console.log(start);
        console.log(end);

        var s = new Date(start);
        var e = new Date(end);

        if((title == "") || (start == "") || (end == "")) {
            $("#id_div_empty_danger").fadeTo(2000, 500).slideUp(500, function() {
                $("#id_div_empty_danger").slideUp(500);
            });
        } else if (s > e) {
            $("#id_div_dates_danger").fadeTo(2000, 500).slideUp(500, function() {
                $("#id_div_dates_danger").slideUp(500);
            });
        } else {
            window.localStorage.setItem("title" + taskNumber, title);
            window.localStorage.setItem("start" + taskNumber, start);
            window.localStorage.setItem("end" + taskNumber, end);
            updateTaskList();
            $("#id_div_create_success").fadeTo(2000, 500).slideUp(500, function() {
                $("#id_div_create_success").slideUp(500);
            });
        }
    }

    function removeTask(inputTitle, inputStart, inputEnd, taskNumber) {
        window.localStorage.setItem("title" + taskNumber, "");
        window.localStorage.setItem("start" + taskNumber, "");
        window.localStorage.setItem("end" + taskNumber, "");
        document.getElementById(inputTitle).value = "";
        document.getElementById(inputStart).value = "";
        document.getElementById(inputEnd).value = "";
        updateTaskList();
        $("#id_div_remove_success").fadeTo(2000, 500).slideUp(500, function() {
            $("#id_div_remove_success").slideUp(500);
        });
    }

    function updateTaskEditBox() {
        document.getElementById("id_input_task_1_title").value = localStorage.getItem("title1");
        document.getElementById("id_input_task_2_title").value = localStorage.getItem("title2");
        document.getElementById("id_input_task_3_title").value = localStorage.getItem("title3");
        document.getElementById("id_input_task_1_start").value = localStorage.getItem("start1");
        document.getElementById("id_input_task_2_start").value = localStorage.getItem("start2");
        document.getElementById("id_input_task_3_start").value = localStorage.getItem("start3");
        document.getElementById("id_input_task_1_end").value = localStorage.getItem("end1");
        document.getElementById("id_input_task_2_end").value = localStorage.getItem("end2");
        document.getElementById("id_input_task_3_end").value = localStorage.getItem("end3");
    }

    function updateTaskList() {
        document.getElementById("id_td_task_1_title").innerHTML = localStorage.getItem("title1");
        document.getElementById("id_td_task_2_title").innerHTML = localStorage.getItem("title2");
        document.getElementById("id_td_task_3_title").innerHTML = localStorage.getItem("title3");
        document.getElementById("id_td_task_1_start").innerHTML = localStorage.getItem("start1");
        document.getElementById("id_td_task_2_start").innerHTML = localStorage.getItem("start2");
        document.getElementById("id_td_task_3_start").innerHTML = localStorage.getItem("start3");
        document.getElementById("id_td_task_1_end").innerHTML = localStorage.getItem("end1");
        document.getElementById("id_td_task_2_end").innerHTML = localStorage.getItem("end2");
        document.getElementById("id_td_task_3_end").innerHTML = localStorage.getItem("end3");
    }

    $("#id_button_task_1_save").click(function(e) {
        e.preventDefault();
        saveTask("id_input_task_1_title", "id_input_task_1_start", "id_input_task_1_end", 1);
    });
    
    $("#id_button_task_2_save").click(function(e) {
        e.preventDefault();
        saveTask("id_input_task_2_title", "id_input_task_2_start", "id_input_task_2_end", 2);
    });
    
    $("#id_button_task_3_save").click(function(e) {
        e.preventDefault();
        saveTask("id_input_task_3_title", "id_input_task_3_start", "id_input_task_3_end", 3);
    });

    $("#id_button_task_1_remove").click(function(e) {
        e.preventDefault();
        removeTask("id_input_task_1_title", "id_input_task_1_start", "id_input_task_1_end", 1);
    });
    
    $("#id_button_task_2_remove").click(function(e) {
        e.preventDefault();
        removeTask("id_input_task_2_title", "id_input_task_2_start", "id_input_task_2_end", 2);
    });
    
    $("#id_button_task_3_remove").click(function(e) {
        e.preventDefault();
        removeTask("id_input_task_3_title", "id_input_task_3_start", "id_input_task_3_end", 3);
    });
});
